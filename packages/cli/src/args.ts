import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

export function readFlags(argv: string[], options: ParseArgsOptionsConfig) {
  try {
    return parseArgs({ args: argv, options, strict: true }).values;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fail args: ${detail}\n`);
    process.exit(1);
  }
}

type FlagValues = Record<string, unknown>;

export function flag(values: FlagValues, name: string): string {
  const value = values[name];
  if (typeof value !== "string" || value.length === 0) {
    process.stderr.write(`fail args: missing --${name}\n`);
    process.exit(1);
  }
  return value;
}

export function optional(values: FlagValues, name: string): string | undefined {
  const value = values[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function optionalNumber(values: FlagValues, name: string): number | undefined {
  const value = optional(values, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    process.stderr.write(`fail args: --${name} must be a number\n`);
    process.exit(1);
  }
  return parsed;
}

/** `id=path` pairs. The path may contain extra '=' characters. */
export function idPaths(values: string[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of values ?? []) {
    const splitAt = entry.indexOf("=");
    if (splitAt <= 0 || splitAt === entry.length - 1) {
      process.stderr.write(`fail args: expected id=path, got ${entry}\n`);
      process.exit(1);
    }
    map.set(entry.slice(0, splitAt), entry.slice(splitAt + 1));
  }
  return map;
}
