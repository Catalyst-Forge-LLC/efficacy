# Efficacy

A standard for machine-readable proof of tool success, written by agents, for agents. This repo holds the spec, the reference CLI, and the efficacy.dev site.

## Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- FilePress CLI (`filepress`) and LocalSlip (`localslip`) for the spec site

### Installation

```bash
git clone https://github.com/Catalyst-Forge-LLC/efficacy.git
cd efficacy
pnpm install
```

No environment variables are required. Signing keys are files you pass to the CLI. Do not commit them.

### Check the library

```bash
pnpm verify
```

That typechecks, runs the tests, and confirms `site/pages/spec.md` matches `docs/efficacy-spec-v0.3.md`.

### Use the CLI

```bash
pnpm efficacy keygen --out ./keys
pnpm efficacy init --chain .efficacy/demo.jsonl --scope-type tool --scope-name demo-tool --action "opened a chain" --key ./keys/efficacy-private.pem --key-id https://github.com/Catalyst-Forge-LLC/efficacy#efficacy-key-v1
pnpm efficacy verify --chain .efficacy/demo.jsonl --public-key ./keys/efficacy-public.pem
```

`efficacy record` appends a `use` line. It requires an evidence file that names the tool name, version, and hash, plus one measurement (`--tokens-saved`, `--iterations-avoided`, or `--time-saved-ms`). Run `pnpm efficacy` with no command to see the flags.

### Spec site

```bash
pnpm dev
```

That claims LocalSlip lease `efficacy-site` on port 4173 and starts FilePress. The spec is at `/spec`. Production build:

```bash
pnpm build
```

Output is `site/build`. Cloudflare Pages is the deploy target. Build command `pnpm install && pnpm --filter efficacy-site build`, output directory `site/build`.

## Project Structure

```
packages/core/     record schemas, hashing, signing, chain checks
packages/cli/      the efficacy command
site/              FilePress site for efficacy.dev
docs/              the v0.3 spec and the architecture brief
```

## Features

| Feature | Description | Location |
| --- | --- | --- |
| Genesis, use, retract | Append-only JSONL chain | `packages/core` |
| `efficacy` CLI | Create keys, append records, verify a chain | `packages/cli` |
| Spec site | Renders specification 0.3 | `site/pages/spec.md` |

## Tech Stack

- **Language:** TypeScript (ESM)
- **Package manager:** pnpm
- **Site:** FilePress
- **Storage:** JSONL files in git
- **AI:** none

## Documentation

- [Specification 0.3](docs/efficacy-spec-v0.3.md)
- [Architecture brief](docs/PHASE_1_BRIEF.md)
- [TODO.md](TODO.md)
