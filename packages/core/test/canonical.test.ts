import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalJson, contentHash } from "../src/index.ts";

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
