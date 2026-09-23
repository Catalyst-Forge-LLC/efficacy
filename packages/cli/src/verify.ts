import { readFileSync } from "node:fs";
import { verifyChain, type LineResult } from "@efficacy/core";
import { flag, idPaths, optional, readFlags } from "./args.ts";
import { fetchEvidence } from "./fetch.ts";

type ChainLine = { id?: string; kind?: string; url?: string };

function chainLines(text: string): ChainLine[] {
  const lines: ChainLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      const evidence = raw.evidence as Record<string, unknown> | undefined;
      lines.push({
        id: typeof raw.id === "string" ? raw.id : undefined,
        kind: typeof raw.kind === "string" ? raw.kind : undefined,
        url: typeof evidence?.url === "string" ? evidence.url : undefined,
      });
    } catch {
      lines.push({});
    }
  }
  return lines;
}

function print(lines: LineResult[]): void {
  for (const line of lines) {
    const tier = line.tier === null ? "" : ` tier ${line.tier}`;
    if (line.ok) {
      process.stdout.write(`ok ${line.line} ${line.kind} ${line.id}${tier}${line.detail ? ` ${line.detail}` : ""}\n`);
    } else {
      process.stderr.write(`fail ${line.line} ${line.kind} ${line.id} check ${line.check}: ${line.detail}\n`);
    }
  }
}

export async function runVerify(argv: string[]): Promise<void> {
  const values = readFlags(argv, {
    chain: { type: "string" },
    "public-key": { type: "string" },
    "tool-file": { type: "string", multiple: true },
    "evidence-file": { type: "string", multiple: true },
    online: { type: "boolean", default: false },
  });
  const chain = flag(values, "chain");
  const text = readFileSync(chain, "utf8");
  const lines = chainLines(text);
  const useIds = new Set(lines.filter((line) => line.kind === "use" && line.id).map((line) => line.id as string));

  const toolPaths = idPaths(arrayFlag(values["tool-file"]));
  const evidencePaths = idPaths(arrayFlag(values["evidence-file"]));
  for (const [flagName, paths] of [["tool-file", toolPaths], ["evidence-file", evidencePaths]] as const) {
    for (const id of paths.keys()) {
      if (!useIds.has(id)) {
        process.stderr.write(`fail args: --${flagName} ${id}=... matches no use record in ${chain}\n`);
        process.exit(1);
      }
    }
  }
  const toolBodies = new Map<string, Uint8Array>();
  const evidenceBodies = new Map<string, Uint8Array>();
  for (const [id, path] of toolPaths) toolBodies.set(id, readFileSync(path));
  for (const [id, path] of evidencePaths) evidenceBodies.set(id, readFileSync(path));

  const publicKey = optional(values, "public-key");
  const publicKeyPem = publicKey ? readFileSync(publicKey, "utf8") : undefined;
  const online = values.online === true;

  if (online) {
    const preflight = verifyChain(text, { publicKeyPem, toolBodies, evidenceBodies });
    if (!preflight.ok) {
      print(preflight.lines);
      process.stderr.write("fail online: the chain failed offline checks, so no evidence URLs were fetched\n");
      process.exit(1);
    }
    for (const result of preflight.lines) {
      if (result.kind !== "use" || evidenceBodies.has(result.id)) continue;
      const url = lines.find((line) => line.id === result.id)?.url;
      if (!url) continue;
      try {
        evidenceBodies.set(result.id, await fetchEvidence(url));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        process.stderr.write(`fail evidence: ${result.id}: ${detail}\n`);
        process.exit(1);
      }
    }
  }

  const report = verifyChain(text, { publicKeyPem, toolBodies, evidenceBodies, requireEvidence: online });
  print(report.lines);
  if (!report.ok) process.exit(1);

  const uses = report.lines.filter((line) => line.kind === "use");
  const current = uses.filter((line) => line.tier !== null && line.tier >= 3).map((line) => `${line.id} tier ${line.tier}`);
  const retracted = uses.filter((line) => line.retractedBy).length;
  const weak = uses.length - current.length - retracted;
  process.stdout.write(
    `summary: ${current.length} current evidence${current.length ? ` (${current.join(", ")})` : ""}, ${weak} below tier 3, ${retracted} retracted\n`,
  );
  if (uses.length > 0) {
    process.stdout.write("note: integrity and binding only; verdict and measurement claims were not evaluated against the evidence\n");
  }
}

function arrayFlag(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return [value];
  return undefined;
}
