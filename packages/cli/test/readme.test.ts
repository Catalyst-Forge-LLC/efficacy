import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const main = fileURLToPath(new URL("../src/main.ts", import.meta.url));
const readme = readFileSync(fileURLToPath(new URL("../../../README.md", import.meta.url)), "utf8").replace(/\r\n/g, "\n");

function quickstartCommands(): string[] {
  const block = /<!-- quickstart -->\s*```bash\n([\s\S]*?)```\s*<!-- \/quickstart -->/.exec(readme);
  assert.ok(block?.[1], "README has a quickstart block");
  return block[1]
    .replace(/\\\n\s*/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/** Splits a command line on spaces, honoring double quotes. Enough for the README. */
function words(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((match) => match[1] ?? match[2] ?? "");
}

test("the README quickstart runs as written", () => {
  const dir = mkdtempSync(join(tmpdir(), "efficacy-readme-"));
  const outputs: string[] = [];
  for (const line of quickstartCommands()) {
    const echo = /^echo "([^"]*)" > (\S+)$/.exec(line);
    if (echo) {
      writeFileSync(join(dir, echo[2] as string), `${echo[1]}\n`);
      continue;
    }
    const [command, ...args] = words(line);
    assert.equal(command, "efficacy", `quickstart line is not an efficacy command: ${line}`);
    const result = spawnSync(process.execPath, [main, ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, `${line}\n${result.stderr}`);
    outputs.push(result.stdout);
  }

  const verifies = outputs.filter((output) => output.startsWith("ok 1 genesis"));
  assert.equal(verifies.length, 2);
  const expectedBlocks = readme.match(/```text\n([\s\S]*?)```/g) ?? [];
  assert.equal(expectedBlocks.length, 2, "README shows verify output before and after the retraction");
  for (const expected of expectedBlocks) {
    const lines = expected.replace(/```(text)?\n?/g, "").trim().split("\n");
    const output = lines.some((line) => line.includes("retracted by")) ? verifies[1] : verifies[0];
    for (const line of lines) {
      const pattern = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("sha256:\\.\\.\\.", "sha256:[0-9a-f]{64}");
      assert.match(output ?? "", new RegExp(`^${pattern}$`, "m"), `README output line not produced: ${line}`);
    }
  }
});
