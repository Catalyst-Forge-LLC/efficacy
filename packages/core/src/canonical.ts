import { createHash } from "node:crypto";

const HASH_PREFIX = "sha256:";

/** Drop the top-level signature. Nested objects are left alone. */
export function withoutSignature(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.signature;
  return copy;
}

/**
 * Writes the string directly. Building a sorted object instead would reorder integer-like keys
 * ("10" before "2" is lost) and drop an own "__proto__" key on assignment.
 */
function writeCanonical(value: unknown, path: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new Error(`canonical JSON: ${path} is not a finite number`);
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((entry, index) => writeCanonical(entry, `${path}[${index}]`)).join(",")}]`;
      }
      const source = value as Record<string, unknown>;
      const fields: string[] = [];
      for (const key of Object.keys(source).sort()) {
        const entry = source[key];
        if (entry === undefined) continue;
        fields.push(`${JSON.stringify(key)}:${writeCanonical(entry, `${path}.${key}`)}`);
      }
      return `{${fields.join(",")}}`;
    }
    default:
      throw new Error(`canonical JSON: ${path} has unsupported type ${typeof value}`);
  }
}

/** UTF-8 JSON, keys sorted by UTF-16 code unit at every level, no insignificant whitespace, signature excluded. */
export function canonicalJson(value: unknown): string {
  return writeCanonical(withoutSignature(value), "$");
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
  return writeCanonical(value, "$");
}
