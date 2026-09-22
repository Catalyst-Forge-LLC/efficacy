import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const spec = readFileSync(join(repo, "docs", "efficacy-spec-v0.3.md"), "utf8");
const page = `---
title: Specification 0.3
description: Machine-readable proof of tool success, written by agents, for agents.
order: 1
---

${spec.endsWith("\n") ? spec : `${spec}\n`}`;
const target = join(repo, "site", "pages", "spec.md");
mkdirSync(join(repo, "site", "pages"), { recursive: true });

if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");
  if (current !== page) {
    process.stderr.write("fail spec-sync: site/pages/spec.md does not match docs/efficacy-spec-v0.3.md. Run pnpm spec:sync.\n");
    process.exit(1);
  }
  process.stdout.write("spec page matches docs/efficacy-spec-v0.3.md\n");
} else {
  writeFileSync(target, page);
  process.stdout.write(`wrote ${target}\n`);
}
