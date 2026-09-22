#!/usr/bin/env node
import { runInit } from "./init.ts";
import { runKeygen } from "./keygen.ts";
import { runRecord } from "./record.ts";
import { runRetract } from "./retract.ts";
import { runVerify } from "./verify.ts";

const usage = `efficacy — write and check efficacy chains

  efficacy keygen --out <dir>
  efficacy init --chain <file> --scope-type <tool|repo> --scope-name <name> --action <text> --key <private.pem> --key-id <url>
  efficacy record --chain <file> --tool-name <name> --tool-version <version> --tool-hash <sha256:...> --tool-locator <url> --action <text> --verdict <pass|fail> --reason <text> --evidence-url <https> --evidence-kind <kind> --evidence-file <path> --key <private.pem> --key-id <url> (--tokens-saved <n> | --iterations-avoided <n> | --time-saved-ms <n>)
  efficacy retract --chain <file> --retracts <sha256:...> --reason <text> --key <private.pem> --key-id <url>
  efficacy verify --chain <file> [--public-key <public.pem>] [--tool-file <id=path>] [--evidence-file <id=path>] [--online]
`;

const [command, ...rest] = process.argv.slice(2);

if (!command || command === "help" || command === "--help" || command === "-h") {
  process.stdout.write(`${usage}\n`);
  process.exit(command ? 0 : 1);
}

try {
  switch (command) {
    case "keygen":
      runKeygen(rest);
      break;
    case "init":
      runInit(rest);
      break;
    case "record":
      runRecord(rest);
      break;
    case "retract":
      runRetract(rest);
      break;
    case "verify":
      await runVerify(rest);
      break;
    default:
      process.stderr.write(`fail args: unknown command ${command}\n${usage}\n`);
      process.exit(1);
  }
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`fail command: ${detail}\n`);
  process.exit(1);
}
