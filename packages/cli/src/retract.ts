import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { formatSchemaError, retractSchema, serializeRecord, signRecord, SPEC_VERSION } from "@efficacy/core";
import { flag, optional, readFlags } from "./args.ts";
import { appendRecord, lastContentHash, retractTarget } from "./chain-file.ts";

export function runRetract(argv: string[]): void {
  const values = readFlags(argv, {
    chain: { type: "string" },
    id: { type: "string" },
    retracts: { type: "string" },
    "retracts-id": { type: "string" },
    reason: { type: "string" },
    key: { type: "string" },
    "key-id": { type: "string" },
    "signed-at": { type: "string" },
  });
  const chain = flag(values, "chain");
  const byHash = optional(values, "retracts");
  const byId = optional(values, "retracts-id");
  if (!byHash === !byId) {
    process.stderr.write("fail args: pass exactly one of --retracts <sha256:...> or --retracts-id <record id>\n");
    process.exit(1);
  }
  const prev = lastContentHash(chain);
  const draft = {
    spec: SPEC_VERSION,
    kind: "retract" as const,
    id: optional(values, "id") ?? `rec_${randomBytes(8).toString("hex")}`,
    prev,
    retracts: retractTarget(chain, byId !== undefined ? { id: byId } : { hash: byHash }),
    reason: flag(values, "reason"),
    key_id: flag(values, "key-id"),
    signed_at: optional(values, "signed-at") ?? new Date().toISOString(),
  };
  const parsed = retractSchema.safeParse(draft);
  if (!parsed.success) {
    process.stderr.write(`fail schema: ${formatSchemaError(parsed.error)}\n`);
    process.exit(1);
  }
  const signed = signRecord(draft, readFileSync(flag(values, "key"), "utf8"));
  appendRecord(chain, serializeRecord(signed));
  process.stdout.write(`wrote retract ${signed.id} to ${chain} (retracts ${draft.retracts})\n`);
}
