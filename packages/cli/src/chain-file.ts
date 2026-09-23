import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { contentHash } from "@efficacy/core";

export function existingChain(chainPath: string): boolean {
  if (!existsSync(chainPath)) return false;
  return readFileSync(chainPath, "utf8").trim().length > 0;
}

export function lastContentHash(chainPath: string): string {
  if (!existsSync(chainPath)) {
    process.stderr.write(`fail chain-missing: ${chainPath} does not exist\n`);
    process.exit(1);
  }
  const lines = readFileSync(chainPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const last = lines.at(-1);
  if (!last) {
    process.stderr.write(`fail chain-missing: ${chainPath} has no records\n`);
    process.exit(1);
  }
  try {
    return contentHash(JSON.parse(last) as unknown);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fail json: last line of ${chainPath} is not JSON (${detail})\n`);
    process.exit(1);
  }
}

export function contentHashForId(chainPath: string, id: string): string {
  const lines = readFileSync(chainPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  for (const line of lines) {
    let raw: unknown;
    try {
      raw = JSON.parse(line) as unknown;
    } catch {
      continue;
    }
    if (raw && typeof raw === "object" && (raw as Record<string, unknown>).id === id) return contentHash(raw);
  }
  process.stderr.write(`fail retracts: no record with id ${id} in ${chainPath}\n`);
  process.exit(1);
}

export function appendRecord(chainPath: string, line: string): void {
  mkdirSync(dirname(chainPath), { recursive: true });
  const file = existsSync(chainPath) ? readFileSync(chainPath, "utf8") : "";
  const needsBreak = file.length > 0 && !file.endsWith("\n");
  appendFileSync(chainPath, `${needsBreak ? "\n" : ""}${line}\n`);
}
