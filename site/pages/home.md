---
title: Efficacy
description: A standard for machine-readable proof of tool success, written by agents, for agents.
order: 0
---

A record an agent leaves after using a tool. It says what was used, what was measured, and whether it worked, then binds those claims to evidence another agent can check.

The chain is a JSONL file in the repo. No ledger. No accounts.

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
2. `efficacy record` appends a measured `use` line.
3. `efficacy verify` walks the file and names the first broken check, or a trust tier.

A genesis line opens the chain. It is not a win. Unsigned notes are hints.

The reference implementation lives in [Catalyst-Forge-LLC/efficacy](https://github.com/Catalyst-Forge-LLC/efficacy). The spec is CC0. The code is Apache-2.0.
