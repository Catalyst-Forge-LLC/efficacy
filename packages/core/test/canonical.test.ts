import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canonicalJson, contentHash, signatureVerifies } from "../src/index.ts";

const vectors = JSON.parse(readFileSync(new URL("./vectors.json", import.meta.url), "utf8")) as {
  record: Record<string, unknown>;
  canonical: string;
  hash: string;
  signature: string;
  publicKeyPem: string;
};

test("key order does not change the content hash", () => {
  const left = contentHash({ b: 1, a: { d: true, c: "x" } });
  const right = contentHash({ a: { c: "x", d: true }, b: 1 });
  assert.equal(left, right);
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

test("signature bytes are not part of the content hash", () => {
  const left = contentHash({ id: "rec_a", signature: "ed25519:aaaa" });
  const right = contentHash({ id: "rec_a", signature: "ed25519:bbbb" });
  assert.equal(left, right);
});

test("integer-like keys sort as strings", () => {
  assert.equal(canonicalJson({ "10": "ten", "2": "two" }), '{"10":"ten","2":"two"}');
});

test("an own __proto__ key is kept and changes the hash", () => {
  const withProto = JSON.parse('{"a":1,"__proto__":{"x":1}}') as unknown;
  assert.equal(canonicalJson(withProto), '{"__proto__":{"x":1},"a":1}');
  assert.notEqual(contentHash(withProto), contentHash({ a: 1 }));
});

test("non-finite numbers are rejected, not written as null", () => {
  assert.throws(() => canonicalJson({ a: Number.NaN }), /\$\.a is not a finite number/);
});

test("fixed vectors: canonical bytes, content hash, and signature", () => {
  assert.equal(canonicalJson(vectors.record), vectors.canonical);
  assert.equal(contentHash(vectors.record), vectors.hash);
  assert.equal(signatureVerifies({ ...vectors.record, signature: vectors.signature }, vectors.publicKeyPem), true);
});
