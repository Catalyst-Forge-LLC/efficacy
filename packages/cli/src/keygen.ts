import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateEd25519Pem } from "@efficacy/core";
import { flag, readFlags } from "./args.ts";

export function runKeygen(argv: string[]): void {
  const values = readFlags(argv, {
    out: { type: "string" },
  });
  const out = flag(values, "out");
  const keys = generateEd25519Pem();
  mkdirSync(out, { recursive: true });
  const privatePath = join(out, "efficacy-private.pem");
  const publicPath = join(out, "efficacy-public.pem");
  writeFileSync(privatePath, keys.privateKeyPem, { flag: "wx", mode: 0o600 });
  writeFileSync(publicPath, keys.publicKeyPem, { flag: "wx" });
  process.stdout.write(`wrote ${privatePath}\nwrote ${publicPath}\n`);
}
