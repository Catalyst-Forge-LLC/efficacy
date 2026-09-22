import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { sha256File, SPEC_VERSION } from "@efficacy/core";
import { flag, optional, readFlags } from "./args.ts";

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function runEvidence(argv: string[]): void {
  const values = readFlags(argv, {
    out: { type: "string" },
    "tool-name": { type: "string" },
    "tool-version": { type: "string" },
    "tool-file": { type: "string" },
    "tool-locator": { type: "string" },
    action: { type: "string" },
    result: { type: "string" },
    artifact: { type: "string", multiple: true },
    note: { type: "string", multiple: true },
    "observed-at": { type: "string" },
    force: { type: "boolean", default: false },
  });

  const out = flag(values, "out");
  if (existsSync(out) && values.force !== true) {
    process.stderr.write(`fail evidence-exists: ${out} already exists; a record may already cite its hash (use --force to replace it)\n`);
    process.exit(1);
  }

  const toolFile = flag(values, "tool-file");
  const locator = optional(values, "tool-locator");
  const tool = {
    name: flag(values, "tool-name"),
    version: flag(values, "tool-version"),
    hash: sha256File(readFileSync(toolFile)),
    ...(locator ? { locator } : {}),
  };

  const artifacts = list(values.artifact).map((path) => ({
    path: path.replaceAll("\\", "/"),
    hash: sha256File(readFileSync(path)),
  }));
  const notes = list(values.note);

  const body = {
    efficacy_evidence: SPEC_VERSION,
    tool,
    action: flag(values, "action"),
    result: flag(values, "result"),
    ...(artifacts.length > 0 ? { artifacts } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    observed_at: optional(values, "observed-at") ?? new Date().toISOString(),
  };

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(body, null, 2)}\n`);
  process.stdout.write(`wrote evidence ${out} for ${tool.name}@${tool.version}\n`);
  process.stdout.write(`tool-hash ${tool.hash}\n`);
  process.stdout.write(`evidence-hash ${sha256File(readFileSync(out))}\n`);
}
