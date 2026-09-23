import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { contentHash, evidenceBinds, formatSchemaError, serializeRecord, sha256File, signRecord, SPEC_VERSION, useSchema } from "@efficacy/core";
import { flag, optional, optionalNumber, readFlags } from "./args.ts";
import { appendRecord, lastContentHash } from "./chain-file.ts";

export function runRecord(argv: string[]): void {
  const values = readFlags(argv, {
    chain: { type: "string" },
    id: { type: "string" },
    "tool-name": { type: "string" },
    "tool-version": { type: "string" },
    "tool-hash": { type: "string" },
    "tool-locator": { type: "string" },
    "tool-file": { type: "string" },
    action: { type: "string" },
    verdict: { type: "string" },
    reason: { type: "string" },
    "evidence-url": { type: "string" },
    "evidence-kind": { type: "string" },
    "evidence-file": { type: "string" },
    "tokens-saved": { type: "string" },
    "iterations-avoided": { type: "string" },
    "time-saved-ms": { type: "string" },
    scale: { type: "string" },
    "lines-touched": { type: "string" },
    "dependencies-touched": { type: "string" },
    key: { type: "string" },
    "key-id": { type: "string" },
    "signed-at": { type: "string" },
  });

  const measurement: Record<string, number> = {};
  const tokens = optionalNumber(values, "tokens-saved");
  const iterations = optionalNumber(values, "iterations-avoided");
  const timeSaved = optionalNumber(values, "time-saved-ms");
  if (tokens !== undefined) measurement.tokens_saved = tokens;
  if (iterations !== undefined) measurement.iterations_avoided = iterations;
  if (timeSaved !== undefined) measurement.time_saved_ms = timeSaved;
  if (Object.keys(measurement).length === 0) {
    process.stderr.write("fail args: provide at least one of --tokens-saved, --iterations-avoided, --time-saved-ms\n");
    process.exit(1);
  }

  const verdict = flag(values, "verdict");
  if (verdict !== "pass" && verdict !== "fail") {
    process.stderr.write("fail args: --verdict must be pass or fail\n");
    process.exit(1);
  }

  const evidenceKind = flag(values, "evidence-kind");
  const kinds = ["benchmark", "test-run", "commit", "trace", "other"] as const;
  if (!kinds.includes(evidenceKind as (typeof kinds)[number])) {
    process.stderr.write(`fail args: --evidence-kind must be one of ${kinds.join(", ")}\n`);
    process.exit(1);
  }

  const tool = {
    name: flag(values, "tool-name"),
    version: flag(values, "tool-version"),
    hash: flag(values, "tool-hash"),
    locator: flag(values, "tool-locator"),
  };
  const toolFile = optional(values, "tool-file");
  if (toolFile) {
    const actual = sha256File(readFileSync(toolFile));
    if (actual !== tool.hash) {
      process.stderr.write(`fail tool-hash: file hashed to ${actual}, record says ${tool.hash}\n`);
      process.exit(1);
    }
  }

  const evidenceFile = flag(values, "evidence-file");
  const evidenceBytes = readFileSync(evidenceFile);
  const evidenceText = evidenceBytes.toString("utf8");
  if (!evidenceBinds(evidenceText, tool)) {
    process.stderr.write("fail binding: evidence file does not name this tool name, version, and hash\n");
    process.exit(1);
  }

  const scale = optional(values, "scale");
  const linesTouched = optionalNumber(values, "lines-touched");
  const dependenciesTouched = optionalNumber(values, "dependencies-touched");
  const complexity =
    scale || linesTouched !== undefined || dependenciesTouched !== undefined
      ? {
          ...(scale ? { scale } : {}),
          ...(linesTouched !== undefined ? { lines_touched: linesTouched } : {}),
          ...(dependenciesTouched !== undefined ? { dependencies_touched: dependenciesTouched } : {}),
        }
      : undefined;

  const chain = flag(values, "chain");
  const draft = {
    spec: SPEC_VERSION,
    kind: "use" as const,
    id: optional(values, "id") ?? `rec_${randomBytes(8).toString("hex")}`,
    prev: lastContentHash(chain),
    tool,
    action: flag(values, "action"),
    measurement,
    verdict,
    reason: flag(values, "reason"),
    evidence: {
      url: flag(values, "evidence-url"),
      hash: sha256File(evidenceBytes),
      kind: evidenceKind,
    },
    ...(complexity ? { complexity } : {}),
    key_id: flag(values, "key-id"),
    signed_at: optional(values, "signed-at") ?? new Date().toISOString(),
  };
  const parsed = useSchema.safeParse(draft);
  if (!parsed.success) {
    process.stderr.write(`fail schema: ${formatSchemaError(parsed.error)}\n`);
    process.exit(1);
  }
  const signed = signRecord(draft, readFileSync(flag(values, "key"), "utf8"));
  appendRecord(chain, serializeRecord(signed));
  process.stdout.write(`wrote use ${signed.id} to ${chain} (content ${contentHash(signed)})\n`);
}
