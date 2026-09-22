import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cliDir = join(root, "packages", "cli");
const work = mkdtempSync(join(tmpdir(), "efficacy-pack-"));
const isWindows = process.platform === "win32";

function fail(message: string): never {
  process.stderr.write(`fail pack: ${message}\n  work dir kept at ${work}\n`);
  process.exit(1);
}

function run(command: string, args: string[], options: SpawnSyncOptions & { label: string }) {
  const { label, ...rest } = options;
  const shell = rest.shell ?? isWindows;
  // Windows needs a shell to run npm.cmd and pnpm.cmd; pass one quoted string so Node does not concatenate args.
  const result = shell
    ? spawnSync([command, ...args.map((arg) => `"${arg}"`)].join(" "), { encoding: "utf8", ...rest, shell: true })
    : spawnSync(command, args, { encoding: "utf8", ...rest });
  if (result.status !== 0) {
    fail(`${label} exited ${result.status}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
  return result.stdout as string;
}

function listFiles(base: string, dir = base): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(base, path) : [relative(base, path).replaceAll("\\", "/")];
  }).sort();
}

run("pnpm", ["pack", "--pack-destination", work], { cwd: cliDir, label: "pnpm pack" });
const tarball = readdirSync(work).find((name) => name.endsWith(".tgz"));
if (!tarball) fail("pnpm pack wrote no tarball");

writeFileSync(join(work, "package.json"), JSON.stringify({ name: "app", private: true, type: "module" }));
run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error", join(work, tarball)], {
  cwd: work,
  label: "npm install of the tarball",
});

const installed = join(work, "node_modules", "efficacy");
const shipped = listFiles(installed);
const unexpected = shipped.filter((file) => /^(src|test)\//.test(file) || file.endsWith(".ts") || file.endsWith(".pem"));
if (unexpected.length > 0) fail(`tarball ships files it should not: ${unexpected.join(", ")}`);
for (const required of ["package.json", "dist/main.js"]) {
  if (!shipped.includes(required)) fail(`tarball is missing ${required}`);
}

const manifest = readFileSync(join(installed, "package.json"), "utf8");
if (manifest.includes("workspace:")) fail("package.json still has a workspace: dependency");
const bin = JSON.parse(manifest).bin?.efficacy as string | undefined;
if (!bin) fail("package.json has no efficacy command");
const binPath = join(installed, bin);

const shim = join(work, "node_modules", ".bin", isWindows ? "efficacy.cmd" : "efficacy");
if (!existsSync(shim)) fail("npm did not link the efficacy command");
run(shim, ["help"], { cwd: work, label: "efficacy help through the installed command" });

const efficacy = (args: string[], label: string) =>
  run(process.execPath, ["--no-experimental-strip-types", binPath, ...args], { cwd: work, label, shell: false });

const keyId = "https://github.com/Catalyst-Forge-LLC/efficacy#efficacy-key-v1";
const keys = join(work, "keys");
const chain = join(work, ".efficacy", "demo.jsonl");
const toolPath = join(work, "tool.txt");
const evidencePath = join(work, "evidence.json");
const toolBytes = Buffer.from("demo-tool-bytes");
const toolHash = `sha256:${createHash("sha256").update(toolBytes).digest("hex")}`;
writeFileSync(toolPath, toolBytes);
writeFileSync(evidencePath, JSON.stringify({ tool: { name: "demo-tool", version: "1.2.3", hash: toolHash } }));
const privateKey = join(keys, "efficacy-private.pem");

efficacy(["keygen", "--out", keys], "efficacy keygen");
efficacy(
  [
    "init", "--chain", chain, "--id", "gen_demo",
    "--scope-type", "tool", "--scope-name", "demo-tool",
    "--action", "opened an efficacy chain for demo-tool",
    "--key", privateKey, "--key-id", keyId,
  ],
  "efficacy init",
);
efficacy(
  [
    "record", "--chain", chain, "--id", "rec_demo",
    "--tool-name", "demo-tool", "--tool-version", "1.2.3", "--tool-hash", toolHash,
    "--tool-locator", "https://example.com/demo-tool", "--tool-file", toolPath,
    "--action", "measured a demo run", "--verdict", "pass",
    "--reason", "the next step reused the recorded choice", "--tokens-saved", "12",
    "--evidence-url", "https://example.com/runs/demo.json", "--evidence-kind", "test-run",
    "--evidence-file", evidencePath,
    "--key", privateKey, "--key-id", keyId,
  ],
  "efficacy record",
);
const report = efficacy(
  [
    "verify", "--chain", chain, "--public-key", join(keys, "efficacy-public.pem"),
    "--tool-file", `rec_demo=${toolPath}`, "--evidence-file", `rec_demo=${evidencePath}`,
  ],
  "efficacy verify",
);
if (!/ok 1 genesis gen_demo/.test(report) || !/ok 2 use rec_demo tier 3/.test(report)) {
  fail(`efficacy verify did not reach tier 3:\n${report}`);
}

rmSync(work, { recursive: true, force: true });
process.stdout.write(
  `pack check passed: ${tarball} installs with npm, ships ${shipped.length} files, and the installed efficacy command reaches tier 3\n`,
);
