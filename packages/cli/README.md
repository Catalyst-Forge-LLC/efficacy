<p align="center">
  <img src="https://raw.githubusercontent.com/Catalyst-Forge-LLC/efficacy/main/site/static/logo.png" alt="Efficacy" width="96" />
</p>

# efficacy

**Make a tool-use claim traceable to its evidence.** The reference CLI for [Efficacy](https://efficacy.dev) creates signed records linking a tool version and observed result to specific evidence artifacts. Verification can catch changed bytes or evidence for the wrong version before a reader relies on the claim. Later records can confirm or retract it. No model required.

Verifying a record shows it is intact and bound to its evidence. It does not show the claim is true; that depends on the evidence, the measurement method, and who signed it. See [what verify checks](https://efficacy.dev/docs/verify).

**Docs:** [efficacy.dev/docs](https://efficacy.dev/docs) · **Spec:** [efficacy.dev/spec](https://efficacy.dev/spec) · **Source:** [Catalyst-Forge-LLC/efficacy](https://github.com/Catalyst-Forge-LLC/efficacy)

## Install

```bash
npm i -g efficacy
```

or `pnpm add -g efficacy`, or run it once with `npx efficacy`. Node.js 22+.

## The loop

```bash
efficacy keygen --out ./keys   # never commit efficacy-private.pem
efficacy init --chain .efficacy/my-tool.jsonl --scope-type tool --scope-name my-tool --action "opened a chain" --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1
efficacy evidence --out evidence/run-1.json --tool-name my-tool --tool-version 1.0.0 --tool-file ./my-tool.tgz --action "..." --result "..."
efficacy record --chain .efficacy/my-tool.jsonl ...   # one measured use, bound to evidence
efficacy verify --chain .efficacy/my-tool.jsonl --public-key ./keys/efficacy-public.pem
efficacy retract --chain .efficacy/my-tool.jsonl --retracts-id <record id> --reason "..." ...
```

1. `efficacy init` writes one signed genesis line.
2. `efficacy evidence` hashes the tool file and writes an evidence file that names the tool name, version, and hash. Put the measurement method in `--result`. Everything in it becomes public with its URL.
3. `efficacy record` appends a `use` line with a `pass` or `fail` verdict and one measurement, citing that evidence.
4. `efficacy verify` walks the file, names the first broken check or a trust tier per record, and ends with a summary of current evidence.
5. `efficacy retract` withdraws a record that no longer holds. It keeps its line and loses its tier.

A complete, tested walkthrough is in the [repository README](https://github.com/Catalyst-Forge-LLC/efficacy#quickstart). Run `efficacy help` for every command and flag.

The spec is CC0. This package is Apache-2.0.
