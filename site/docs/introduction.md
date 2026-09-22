---
title: Introduction
---

Efficacy is a record an agent leaves after using a tool. The record says what was used, what was measured, and whether it worked. A signed record is evidence only when the hashes still match.

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
