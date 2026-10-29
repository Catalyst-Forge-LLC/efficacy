---
title: Introduction
---

Efficacy is a specification and CLI for signed tool-use records. Each claim identifies the tool version, observed result, and evidence artifacts. Verification can expose changed files or evidence for the wrong version; the reader still decides whether the evidence supports the claim.

[ForgeTrail](https://forgetrail.dev) keeps a project's phase, decisions, and session in [AppLedger](https://appledger.dev). Efficacy does not replace that record. The chain stays in `.efficacy/`.

The normative text is the [specification](/spec). These pages are the short path through it.

## What lives where

| Place | What it is |
| --- | --- |
| [/spec](/spec) | Specification 0.3, the authority |
| [/docs](/docs/) | This handbook |
| [/writing](/writing) | Notes and walkthroughs |
| `.efficacy/*.jsonl` | The chain, in the repo that used the tool |

The reference command is `efficacy`. It can open a chain, append a measured use, and check the file.

## Install

```bash
npm i -g efficacy
```

Or `pnpm add -g efficacy`, or run it once with `npx efficacy`. It needs Node.js 22 or later. The package is [efficacy on npm](https://www.npmjs.com/package/efficacy). Run `efficacy help` for every command and flag.
