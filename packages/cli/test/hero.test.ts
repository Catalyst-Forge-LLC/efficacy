import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { sha256File } from "@efficacy/core";

const main = fileURLToPath(new URL("../src/main.ts", import.meta.url));
const keyId = "https://github.com/Catalyst-Forge-LLC/efficacy#efficacy-key-v1";

function run(cwd: string, args: string[]) {
  return spawnSync(process.execPath, [main, ...args], { cwd, encoding: "utf8" });
}

test("init, record, and verify complete the hero flow", () => {
  const dir = mkdtempSync(join(tmpdir(), "efficacy-"));
  const keydir = join(dir, "keys");
  const chain = join(dir, ".efficacy", "demo.jsonl");
  const toolPath = join(dir, "tool.txt");
  const evidencePath = join(dir, "evidence.json");
  const toolBytes = Buffer.from("demo-tool-bytes");
  writeFileSync(toolPath, toolBytes);
  const toolHash = sha256File(toolBytes);
  writeFileSync(
    evidencePath,
    JSON.stringify({ tool: { name: "demo-tool", version: "1.2.3", hash: toolHash } }),
  );

  const keygen = run(dir, ["keygen", "--out", keydir]);
  assert.equal(keygen.status, 0, keygen.stderr);

  const init = run(dir, [
    "init",
    "--chain",
    chain,
    "--id",
    "gen_demo",
    "--scope-type",
    "tool",
    "--scope-name",
    "demo-tool",
    "--repo",
    "https://github.com/Catalyst-Forge-LLC/efficacy",
    "--action",
    "opened an efficacy chain for demo-tool",
    "--key",
    join(keydir, "efficacy-private.pem"),
    "--key-id",
    keyId,
    "--signed-at",
    "2026-09-22T18:00:00.000Z",
  ]);
  assert.equal(init.status, 0, init.stderr);

  const record = run(dir, [
    "record",
    "--chain",
    chain,
    "--id",
    "rec_demo",
    "--tool-name",
    "demo-tool",
    "--tool-version",
    "1.2.3",
    "--tool-hash",
    toolHash,
    "--tool-locator",
    "https://example.com/demo-tool",
    "--tool-file",
    toolPath,
    "--action",
    "measured a demo run",
    "--verdict",
    "pass",
    "--reason",
    "the next step reused the recorded choice",
    "--tokens-saved",
    "12",
    "--evidence-url",
    "https://example.com/runs/demo.json",
    "--evidence-kind",
    "test-run",
    "--evidence-file",
    evidencePath,
    "--key",
    join(keydir, "efficacy-private.pem"),
    "--key-id",
    keyId,
    "--signed-at",
    "2026-09-22T18:05:00.000Z",
  ]);
  assert.equal(record.status, 0, record.stderr);

  const verify = run(dir, [
    "verify",
    "--chain",
    chain,
    "--public-key",
    join(keydir, "efficacy-public.pem"),
    "--tool-file",
    `rec_demo=${toolPath}`,
    "--evidence-file",
    `rec_demo=${evidencePath}`,
  ]);
  assert.equal(verify.status, 0, verify.stderr);
  assert.match(verify.stdout, /ok 1 genesis gen_demo/);
  assert.match(verify.stdout, /ok 2 use rec_demo tier 3/);
  assert.equal(readFileSync(chain, "utf8").trim().split(/\r?\n/).length, 2);
});
