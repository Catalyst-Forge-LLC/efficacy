import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { canonicalJson } from "./canonical.ts";

export type KeyPair = {
  privateKeyPem: string;
  publicKeyPem: string;
};

export function generateEd25519Pem(): KeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  return {
    privateKeyPem: typeof privateKeyPem === "string" ? privateKeyPem : privateKeyPem.toString("utf8"),
    publicKeyPem: typeof publicKeyPem === "string" ? publicKeyPem : publicKeyPem.toString("utf8"),
  };
}

export function signRecord<T extends Record<string, unknown>>(record: T, privateKeyPem: string): T & { signature: string } {
  const body = Buffer.from(canonicalJson(record), "utf8");
  const signature = sign(null, body, createPrivateKey(privateKeyPem));
  const next = { ...record };
  delete next.signature;
  return { ...next, signature: `ed25519:${signature.toString("base64")}` };
}

export function signatureVerifies(record: Record<string, unknown>, publicKeyPem: string): boolean {
  const field = record.signature;
  if (typeof field !== "string" || !field.startsWith("ed25519:")) return false;
  const raw = Buffer.from(field.slice("ed25519:".length), "base64");
  if (raw.length === 0) return false;
  const body = Buffer.from(canonicalJson(record), "utf8");
  try {
    return verify(null, body, createPublicKey(publicKeyPem), raw);
  } catch {
    return false;
  }
}
