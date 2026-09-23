import { readFileSync } from "node:fs";
import { verifyChain } from "@efficacy/core";
import { flag, idPaths, optional, readFlags } from "./args.ts";

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
  const toolPaths = idPaths(arrayFlag(values["tool-file"]));
  const evidencePaths = idPaths(arrayFlag(values["evidence-file"]));
  const toolBodies = new Map<string, Uint8Array>();
  const evidenceBodies = new Map<string, Uint8Array>();
  for (const [id, path] of toolPaths) toolBodies.set(id, readFileSync(path));
  for (const [id, path] of evidencePaths) evidenceBodies.set(id, readFileSync(path));

  const online = values.online === true;
  if (online) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) {
      let raw: unknown;
      try {
        raw = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const record = raw as Record<string, unknown>;
      if (record.kind !== "use" || typeof record.id !== "string") continue;
      if (evidenceBodies.has(record.id)) continue;
      const evidence = record.evidence;
      const url =
        evidence && typeof evidence === "object" && !Array.isArray(evidence)
          ? (evidence as Record<string, unknown>).url
          : undefined;
      if (typeof url !== "string") continue;
      try {
        evidenceBodies.set(record.id, await fetchHttps(url));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        process.stderr.write(`fail evidence: ${record.id}: ${detail}\n`);
        process.exit(1);
      }
    }
  }

  const publicKey = optional(values, "public-key");
  const report = verifyChain(text, {
    publicKeyPem: publicKey ? readFileSync(publicKey, "utf8") : undefined,
    toolBodies,
    evidenceBodies,
    requireEvidence: online,
  });

  for (const line of report.lines) {
    const tier = line.tier === null ? "" : ` tier ${line.tier}`;
    if (line.ok) {
      process.stdout.write(`ok ${line.line} ${line.kind} ${line.id}${tier}${line.detail ? ` ${line.detail}` : ""}\n`);
    } else {
      process.stderr.write(`fail ${line.line} ${line.kind} ${line.id} check ${line.check}: ${line.detail}\n`);
    }
  }
  if (!report.ok) process.exit(1);

  const uses = report.lines.filter((line) => line.kind === "use");
  const current = uses.filter((line) => line.tier !== null && line.tier >= 3).map((line) => `${line.id} tier ${line.tier}`);
  const retracted = uses.filter((line) => line.retractedBy).length;
  const weak = uses.length - current.length - retracted;
  process.stdout.write(
    `summary: ${current.length} current evidence${current.length ? ` (${current.join(", ")})` : ""}, ${weak} below tier 3, ${retracted} retracted\n`,
  );
}

function arrayFlag(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return [value];
  return undefined;
}

async function fetchHttps(url: string): Promise<Uint8Array> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error(`refusing non-https URL ${url}`);
  }
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
