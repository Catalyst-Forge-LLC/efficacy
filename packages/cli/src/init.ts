import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { SPEC_VERSION, formatSchemaError, genesisSchema, serializeRecord, signRecord } from "@efficacy/core";
import { flag, optional, readFlags } from "./args.ts";
import { appendRecord, existingChain } from "./chain-file.ts";

export function runInit(argv: string[]): void {
  const values = readFlags(argv, {
    chain: { type: "string" },
    id: { type: "string" },
    "scope-type": { type: "string" },
    "scope-name": { type: "string" },
    repo: { type: "string" },
    action: { type: "string" },
    reason: { type: "string" },
    key: { type: "string" },
    "key-id": { type: "string" },
    "signed-at": { type: "string" },
  });
  const chain = flag(values, "chain");
  if (existingChain(chain)) {
    process.stderr.write(`fail chain-exists: ${chain} already has records\n`);
    process.exit(1);
  }
  const scopeType = flag(values, "scope-type");
  if (scopeType !== "tool" && scopeType !== "repo") {
    process.stderr.write("fail args: --scope-type must be tool or repo\n");
    process.exit(1);
  }
  const repo = optional(values, "repo");
  const draft = {
    spec: SPEC_VERSION,
    kind: "genesis" as const,
    id: optional(values, "id") ?? `gen_${randomBytes(8).toString("hex")}`,
    scope: {
      type: scopeType,
      name: flag(values, "scope-name"),
      ...(repo ? { repo } : {}),
    },
    action: flag(values, "action"),
    reason: optional(values, "reason") ?? "first record; no prior chain existed",
    prev: null,
    key_id: flag(values, "key-id"),
    signed_at: optional(values, "signed-at") ?? new Date().toISOString(),
  };
  const parsed = genesisSchema.safeParse(draft);
  if (!parsed.success) {
    process.stderr.write(`fail schema: ${formatSchemaError(parsed.error)}\n`);
    process.exit(1);
  }
  const signed = signRecord(draft, readFileSync(flag(values, "key"), "utf8"));
  appendRecord(chain, serializeRecord(signed));
  process.stdout.write(`wrote genesis ${signed.id} to ${chain}\n`);
}
