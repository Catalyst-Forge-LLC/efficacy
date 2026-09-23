import assert from "node:assert/strict";
import { test } from "node:test";
import { addressIsNonPublic, hostnameIsNonPublic, useSchema } from "../src/index.ts";

test("non-public addresses are recognised", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(addressIsNonPublic(ip), true, ip);
  }
  for (const ip of ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(addressIsNonPublic(ip), false, ip);
  }
});

test("host names: local names and private literals are non-public", () => {
  for (const host of ["localhost", "api.localhost", "printer.local", "metadata.internal", "[::1]", "10.0.0.1"]) {
    assert.equal(hostnameIsNonPublic(host), true, host);
  }
  assert.equal(hostnameIsNonPublic("example.com"), false);
});

test("the use schema rejects evidence URLs on private addresses", () => {
  const url = (href: string) =>
    useSchema.shape.evidence.shape.url.safeParse(href).success;
  assert.equal(url("https://example.com/e.json"), true);
  assert.equal(url("https://10.0.0.8/e.json"), false);
  assert.equal(url("https://169.254.169.254/latest"), false);
  assert.equal(url("https://[fd00::1]/e.json"), false);
});
