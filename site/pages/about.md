---
title: About
description: What Efficacy is, and what it is not.
order: 2
---

**Efficacy** is a format for recording tool use so that another agent can inspect the claim: which tool version, what was measured, whether it worked, and the evidence. Implementations may differ. The specification is the authority.

## What it is

- A JSON record with three kinds: `genesis`, `use`, and `retract`
- A hash chain that lives in git, one JSONL file per chain
- Evidence that a stranger can fetch, hashed, and bound to a tool version
- A reference CLI, `efficacy`, that writes and checks those files

## What it is not

- Not a popularity score or a star count
- Not a security audit
- Not a supply-chain attestation. in-toto, SLSA, and npm provenance say how an artifact was built. Efficacy records what happened when it was used, and can cite an attestation as evidence.
- Not a declaration label. xFacts says what a tool claims about itself. Efficacy keeps observations from use.
- Not a blockchain, and not a hosted ledger
- Not proof the claim is true. A verified record is intact and bound to its evidence. Whether the evidence supports the claim is the reader's call.
- Not a success rate. A chain that records only passes says nothing about how often the tool fails.

## Names

| Layer | Name |
| --- | --- |
| Standard | Efficacy |
| Record format | `efficacy/0.3` |
| CLI package | [`efficacy`](https://www.npmjs.com/package/efficacy) |
| Latest CLI release | See npm. The package version is not the record format. |
| Domain | efficacy.dev |
| Chain files | `.efficacy/*.jsonl` |

The spec is CC0. The reference code is Apache-2.0. Maintained by [Catalyst Forge](https://github.com/Catalyst-Forge-LLC).
