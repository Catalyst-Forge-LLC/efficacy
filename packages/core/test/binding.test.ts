import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceBinds, toolIdentityLine } from "../src/index.ts";

const hash = `sha256:${"a".repeat(64)}`;
const tool = { name: "demo-tool", version: "1.2.3", hash };

test("JSON evidence binds through an exact tool object", () => {
  assert.equal(evidenceBinds(JSON.stringify({ tool }), tool), true);
  assert.equal(evidenceBinds(JSON.stringify({ runs: [{ tool: { ...tool, locator: "x" } }] }), tool), true);
});

test("JSON evidence for a different version does not bind, even when the text contains it", () => {
  const body = JSON.stringify({ tool: { ...tool, version: "1.2.30" } });
  assert.ok(body.includes("1.2.3"));
  assert.equal(evidenceBinds(body, tool), false);
});

test("plain text binds only through a whole identity line", () => {
  assert.equal(evidenceBinds(`run log\n${toolIdentityLine(tool)}\nok\n`, tool), true);
  assert.equal(evidenceBinds(`ran demo-tool 1.2.30 ${hash}\n`, tool), false);
  assert.equal(evidenceBinds(`${toolIdentityLine({ ...tool, version: "1.2.30" })}\n`, tool), false);
});
