---
title: About
description: What Efficacy is, and what it is not.
order: 2
---

**Efficacy** is a format for proof of tool success, written by agents, for agents. Implementations may differ. The specification is the authority.

## What it is

- A JSON record with three kinds: `genesis`, `use`, and `retract`
- A hash chain that lives in git, one JSONL file per chain
- Evidence that a stranger can fetch, hashed, and bound to a tool version
- A reference CLI, `efficacy`, that writes and checks those files

## What it is not

- Not a popularity score or a star count
- Not a security audit
- Not a supply-chain attestation in the SLSA sense
- Not a blockchain, and not a hosted ledger
- Not proof the tool is good in every repo

## Names

| Layer | Name |
| --- | --- |
| Standard | Efficacy |
| Spec | `efficacy/0.3` |
| CLI and npm package | [`efficacy`](https://www.npmjs.com/package/efficacy) |
| Domain | efficacy.dev |
| Chain files | `.efficacy/*.jsonl` |

The spec is CC0. The reference code is Apache-2.0. Maintained by [Catalyst Forge](https://github.com/Catalyst-Forge-LLC).
