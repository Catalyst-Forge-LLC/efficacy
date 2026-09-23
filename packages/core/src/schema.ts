import { z } from "zod";
import { hostnameIsNonPublic } from "./address.ts";

export const SPEC_VERSION = "efficacy/0.3";

const contentHash = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/, "must be sha256:<64 hex chars>");

const signature = z
  .string()
  .regex(/^ed25519:[A-Za-z0-9+/]+={0,2}$/, "must be ed25519:<base64>");

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

const remoteUrl = z.string().refine((value) => {
  const url = parseUrl(value);
  if (!url) return false;
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  return !hostnameIsNonPublic(url.hostname);
}, "must be an absolute http(s) URL that is not local or a private address");

const evidenceUrl = z.string().refine((value) => {
  const url = parseUrl(value);
  if (!url) return false;
  if (url.protocol !== "https:") return false;
  return !hostnameIsNonPublic(url.hostname);
}, "must be an absolute https URL that is not local or a private address");

const common = {
  spec: z.literal(SPEC_VERSION),
  id: z.string().min(1),
  signed_at: z.string().datetime({ offset: true }),
  key_id: z.string().min(1).optional(),
  signature: signature.optional(),
};

export const genesisSchema = z.object({
  ...common,
  kind: z.literal("genesis"),
  prev: z.null(),
  scope: z.object({
    type: z.enum(["tool", "repo"]),
    name: z.string().min(1),
    repo: remoteUrl.optional(),
  }),
  action: z.string().min(1),
  reason: z.string().min(1),
});

export const useSchema = z.object({
  ...common,
  kind: z.literal("use"),
  prev: contentHash,
  tool: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    hash: contentHash,
    locator: remoteUrl,
  }),
  action: z.string().min(1),
  measurement: z
    .record(z.string(), z.number().finite())
    .refine((value) => Object.keys(value).length > 0, "needs at least one quantified field"),
  verdict: z.enum(["pass", "fail"]),
  reason: z.string().min(1),
  evidence: z.object({
    url: evidenceUrl,
    hash: contentHash,
    kind: z.enum(["benchmark", "test-run", "commit", "trace", "other"]),
  }),
  complexity: z
    .object({
      scale: z.enum(["trivial", "small", "medium", "hard"]).optional(),
      lines_touched: z.number().finite().optional(),
      dependencies_touched: z.number().finite().optional(),
    })
    .optional(),
});

export const retractSchema = z.object({
  ...common,
  kind: z.literal("retract"),
  prev: contentHash,
  retracts: contentHash,
  reason: z.string().min(1),
});

export const recordSchema = z.discriminatedUnion("kind", [
  genesisSchema,
  useSchema,
  retractSchema,
]);

export type GenesisRecord = z.infer<typeof genesisSchema>;
export type UseRecord = z.infer<typeof useSchema>;
export type RetractRecord = z.infer<typeof retractSchema>;
export type EfficacyRecord = z.infer<typeof recordSchema>;

export function formatSchemaError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(record)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
