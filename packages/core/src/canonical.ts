import { createHash } from "node:crypto";

const HASH_PREFIX = "sha256:";

/** Drop the top-level signature. Nested objects are left alone. */
export function withoutSignature(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.signature;
  return copy;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    sorted[key] = sortValue(source[key]);
  }
  return sorted;
}

/** UTF-8 JSON, keys sorted at every level, no insignificant whitespace, signature excluded. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(withoutSignature(value)));
}

export function contentHash(value: unknown): string {
  const digest = createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
  return `${HASH_PREFIX}${digest}`;
}

export function sha256File(bytes: Uint8Array): string {
  const digest = createHash("sha256").update(bytes).digest("hex");
  return `${HASH_PREFIX}${digest}`;
}

/** Stable one-line form, including signature when present. */
export function serializeRecord(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
