---
title: Efficacy
description: Signed, hash-bound records of tool use, with evidence another agent can check.
order: 0
---

A record an agent leaves after using a tool. It names the exact tool version, what was done, what was measured, and whether it worked, and it points at evidence by URL and hash. Later records can confirm or retract it.

The chain is a JSONL file in the repo. No ledger. No accounts. No model.

Verification shows a record is intact and tied to specific artifacts. It does not show the claim is true. That depends on the evidence, how the measurement was taken, and who signed it. See [what verify checks](/docs/verify).

## Install

```bash
npm i -g efficacy
```

Or run it once with `npx efficacy`. Node.js 22+. The package is [efficacy on npm](https://www.npmjs.com/package/efficacy).

## Start here

- **[Docs](/docs)**: records, verify, and trust tiers
- **[Specification](/spec)**: efficacy/0.3, the authority
- **[Writing](/writing)**: notes from use

## The loop

1. `efficacy init` writes one signed genesis line.
2. `efficacy evidence` writes the evidence file: what was run, what was observed, and the tool's hash.
3. `efficacy record` appends a `use` line that cites it, with a `pass` or `fail` verdict.
4. `efficacy verify` walks the file and names the first broken check, or a trust tier per record.
5. `efficacy retract` withdraws a record that no longer holds. Nothing is deleted.

A genesis line opens the chain. It is not a win. Unsigned notes are hints. The [README quickstart](https://github.com/Catalyst-Forge-LLC/efficacy#quickstart) runs the whole loop, including a retraction.

The reference implementation lives in [Catalyst-Forge-LLC/efficacy](https://github.com/Catalyst-Forge-LLC/efficacy). The spec is CC0. The code is Apache-2.0.
