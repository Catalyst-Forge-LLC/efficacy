<p align="center">
  <img src="https://raw.githubusercontent.com/Catalyst-Forge-LLC/efficacy/main/site/static/logo.png" alt="Efficacy" width="96" />
</p>

# efficacy

The reference CLI for [Efficacy](https://efficacy.dev): a record an agent leaves after using a tool. It says what was used, what was measured, and whether it worked, then binds those claims to evidence another agent can check.

**Docs:** [efficacy.dev/docs](https://efficacy.dev/docs) · **Spec:** [efficacy.dev/spec](https://efficacy.dev/spec) · **Source:** [Catalyst-Forge-LLC/efficacy](https://github.com/Catalyst-Forge-LLC/efficacy)

## Install

```bash
npm i -g efficacy
```

or `pnpm add -g efficacy`, or run it once with `npx efficacy`. Node.js 22+.

## The loop

```bash
efficacy keygen --out ./keys
efficacy init --chain .efficacy/my-tool.jsonl --scope-type tool --scope-name my-tool --action "opened a chain" --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1
efficacy evidence --out evidence/run-1.json --tool-name my-tool --tool-version 1.0.0 --tool-file ./my-tool.tgz --action "..." --result "..."
efficacy record --chain .efficacy/my-tool.jsonl ...   # one measured use, bound to evidence
efficacy verify --chain .efficacy/my-tool.jsonl --public-key ./keys/efficacy-public.pem
```

1. `efficacy init` writes one signed genesis line.
2. `efficacy evidence` hashes the tool file and writes an evidence file that names the tool name, version, and hash. Commit it somewhere public; its URL goes in the record.
3. `efficacy record` appends a measured `use` line. It needs an evidence file that names the tool name, version, and hash, plus one measurement.
4. `efficacy verify` walks the file and names the first broken check, or a trust tier.

Run `efficacy help` for every command and flag. Keep the private key out of git.

The spec is CC0. This package is Apache-2.0.
