<p align="center">
  <img src="site/static/logo.png" alt="Efficacy" width="96" />
</p>

# Efficacy

**Signed, hash-bound records of tool use, with evidence another agent can check.**

Efficacy is a specification and a CLI. After an agent uses a tool, it writes one line to an append-only file. The line names the exact tool (name, version, content hash), what was done, what was measured, and whether it worked, and it points at an evidence file by URL and hash. Later records can confirm or retract it.

Use it when another agent or developer should be able to inspect a tool-use claim instead of trusting a summary that says "it worked." Efficacy is built for agent workflows. It does not use or require a model.

**Docs:** [efficacy.dev/docs](https://efficacy.dev/docs) · **Spec:** [efficacy.dev/spec](https://efficacy.dev/spec) · **npm:** [efficacy](https://www.npmjs.com/package/efficacy)

## What verification means

`efficacy verify` checks that a record is intact and tied to specific artifacts. It does not check that the claim inside is true. Whether a claim holds depends on the evidence, how the measurement was taken, and who signed it.

| Check | What passing shows | What the CLI needs |
| --- | --- | --- |
| Chain | No line was edited, removed, or reordered after later lines were written (`prev` hashes). | The chain file |
| Tool hash | The artifact you hold is the one the record names. | `--tool-file` |
| Evidence hash | The evidence you hold is the file the record cited. | `--evidence-file`, or `--online` to fetch `evidence.url` |
| Binding | The evidence names the same tool name, version, and hash. | The evidence file |
| Signature | The record was signed by the key you supplied. | `--public-key` |

Some things `verify` does not check:

- **Who the key belongs to.** The CLI does not resolve `key_id`. It checks the signature against the public key you pass, and deciding whether to trust that key is up to you. The spec requires keys to be published outside the record (a well-known file, a release asset, or a registry). Automatic discovery is not built yet.
- **Whether the measurement or verdict is right.** A signed "saved 1,200 tokens" is still the signer's number. Evidence that names the tool and nothing else still binds, and evidence reporting a failure does not stop a record from claiming `pass`. Reading the evidence is the consumer's job. `verify` says so on its last line.
- **Whether you have the latest history.** A chain file shows its own contents are consistent. It cannot show that nobody appended a retraction somewhere else, so read the chain from the tool's own repository.

Each `use` line gets a trust tier. Tier 3 means tool hash, evidence hash, binding, and signature all passed. Tier 4 means a later passing record confirms the same tool version with different evidence. `verify` labels a confirmation signed by the same key as "not independent." A retracted record keeps its line but loses its tier. Act on tier 3 and 4 only.

## What a record can say

- **Success or failure.** `verdict` is `pass` or `fail`. A failed use is a normal record, and a chain of passes only is not a success rate unless every attempt was recorded.
- **A measurement.** Version 0.3 requires at least one number: `tokens_saved`, `iterations_avoided`, or `time_saved_ms`. Zero and negative values are accepted. These are improvement claims. Put the method in the evidence (what the baseline was, what was compared), or the number is only an estimate. Recording an observed result with no improvement figure is proposed for 0.4 (see [the draft](docs/efficacy-spec-v0.4-draft.md)).
- **Evidence by reference.** The record holds the evidence URL and its hash, not the evidence itself. The spec requires that URL to be public, so anything in the evidence file is published. Do not put prompts, client material, or private paths in it.

## Install

```bash
npm i -g efficacy
```

or `pnpm add -g efficacy`, or run it once with `npx efficacy`. Node.js 22+. Run `efficacy help` for every command and flag.

## Quickstart

One full loop: open a chain, record a measured use with its evidence, verify it, then retract it and see what changes. `demo-tool.txt` stands in for the real tool artifact (a package tarball, a skill file). This block is run by the test suite exactly as written.

<!-- quickstart -->
```bash
echo "demo-tool 1.0.0" > demo-tool.txt

# A signing key. ./keys/efficacy-private.pem must never be committed.
efficacy keygen --out ./keys

# Open a chain for the tool.
efficacy init --chain .efficacy/demo-tool.jsonl --id gen_demo \
  --scope-type tool --scope-name demo-tool --action "opened a chain for demo-tool" \
  --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1

# Evidence: what was run and what was observed, bound to the tool's hash.
efficacy evidence --out evidence/rec_demo.json \
  --tool-name demo-tool --tool-version 1.0.0 --tool-file demo-tool.txt \
  --action "ran the fixture task twice, without and with demo-tool" \
  --result "both runs passed the same 12 checks; without: 4100 tokens, with: 2900 tokens"

# The use record. tokens-saved is the difference the evidence shows, not a guess.
efficacy record --chain .efficacy/demo-tool.jsonl --id rec_demo \
  --tool-name demo-tool --tool-version 1.0.0 --tool-file demo-tool.txt \
  --tool-locator https://example.com/demo-tool-1.0.0.tgz \
  --action "ran the fixture task with demo-tool" --verdict pass \
  --reason "same checks passed with fewer tokens" --tokens-saved 1200 \
  --evidence-url https://example.com/evidence/rec_demo.json --evidence-kind benchmark \
  --evidence-file evidence/rec_demo.json \
  --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1

efficacy verify --chain .efficacy/demo-tool.jsonl --public-key ./keys/efficacy-public.pem \
  --tool-file rec_demo=demo-tool.txt --evidence-file rec_demo=evidence/rec_demo.json

# Later, the baseline turns out to be wrong. Withdraw the record; nothing is deleted.
efficacy retract --chain .efficacy/demo-tool.jsonl --id retract_demo --retracts-id rec_demo \
  --reason "baseline run used a different model; the comparison does not hold" \
  --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1

efficacy verify --chain .efficacy/demo-tool.jsonl --public-key ./keys/efficacy-public.pem \
  --tool-file rec_demo=demo-tool.txt --evidence-file rec_demo=evidence/rec_demo.json
```
<!-- /quickstart -->

The first `verify` ends with:

```text
ok 2 use rec_demo tier 3 signature matches the supplied public key; key_id not resolved
summary: 1 current evidence (rec_demo tier 3), 0 below tier 3, 0 retracted
note: integrity and binding only; verdict and measurement claims were not evaluated against the evidence
```

After the retraction:

```text
ok 2 use rec_demo retracted by retract_demo, not current evidence; was tier 3
ok 3 retract retract_demo retracts sha256:...
summary: 0 current evidence, 0 below tier 3, 1 retracted
```

In real use, commit `evidence/rec_demo.json` where `--evidence-url` serves it at a fixed commit, publish the public key where `--key-id` points, and keep the chain in the tool's repository.

## Reading a record

This is what the next agent does with a chain. The CLI handles the first two steps; the rest is judgment.

1. Run `efficacy verify --online` with the tool artifact and the publisher's public key. Stop if any line fails.
2. Consider only `use` lines at tier 3 or 4 that are not retracted. The `summary` line lists them.
3. Check that the record is for the tool version you are about to use, and a task like yours (`action`, `complexity`).
4. Open the evidence. Is the measurement a comparison against a stated baseline, or a single number? Treat an unexplained figure as an estimate.
5. Decide whether you trust the signer. A tool author recording their own wins is a weaker source than an unrelated user.

A reasonable conclusion reads like: "Same tool version, similar task. The signature verifies against the author's published key. The evidence shows a baseline comparison on 12 checks, so I'll treat the token figure as measured, for this task only."

## How it relates to other formats

- **Supply-chain attestations** (in-toto, SLSA, npm provenance) state how an artifact was built. Efficacy records what happened when an agent used it. An attestation can be cited as evidence.
- **Declaration labels** like xFacts describe what a tool says about itself. Efficacy keeps observations from its use. A declaration is not an observation, and one observation is not a general endorsement.

## Develop

The rest of this README is for working on this repo.

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

That typechecks, runs the tests, and confirms `site/pages/spec.md` matches `docs/efficacy-spec-v0.3.md`. It then packs the CLI the way `npm publish` would, installs the tarball into an empty folder with npm, and runs keygen, init, evidence, record, and verify from that install. That shows the packed package installs cleanly and completes the loop on the machine that ran it. Run only that last step with `pnpm pack:check`.

The published package is one bundled file, `packages/cli/dist/main.js`, built by `pnpm --filter efficacy build`. The check also fails if `npm publish` would rewrite `packages/cli/package.json` or leave out `LICENSE`. If the current version is already on npm, it says so.

To publish, bump `version` in `packages/cli/package.json`, run `pnpm verify`, then run `npm publish` from `packages/cli`. The root `package.json` is the workspace. It stays `"private": true` and is never published.

### Use the CLI from source

`pnpm efficacy <command>` runs the CLI from `packages/cli/src` without building. The [Quickstart](#quickstart) works the same way with `pnpm efficacy` in place of `efficacy`. `efficacy evidence` also takes `--artifact <path>` (repeatable) to list supporting files, such as a review or a diff, each with its own hash. Run `pnpm efficacy` with no command to see the flags.

### Spec site

```bash
pnpm dev
```

That claims LocalSlip lease `efficacy-site` on port 4173 and starts FilePress. The spec is at `/spec`. Production build:

```bash
pnpm build
```

Output is `site/build`. Home is a static page. The handbook is built from `site/docs/` and mounted at `/docs`.

Deploy to Cloudflare Pages:

```bash
pnpm ship
```

That builds the site and runs `wrangler pages deploy build --project-name=efficacy` from `site/`. The first run asks to create the `efficacy` Pages project and its production branch. Answer `main`. Then attach `efficacy.dev` to the project under Custom domains in the Cloudflare dashboard.

## Project Structure

```
packages/core/     record schemas, hashing, signing, chain checks
packages/cli/      the efficacy command
site/              FilePress site for efficacy.dev
docs/              the v0.3 spec, the 0.4 draft, and the architecture brief
```

## Features

| Feature | Description | Location |
| --- | --- | --- |
| Genesis, use, retract | Append-only JSONL chain. A retract withdraws an earlier record without deleting it. | `packages/core` |
| Trust tiers | Tier per `use` line; retracted records drop out; same-key confirmations are labelled | `packages/core` |
| `efficacy` CLI | Keys, evidence files, records, retractions, verification | `packages/cli` |
| Spec site | Home, about, docs handbook, and specification 0.3 | `site/` |

## Tech Stack

- **Language:** TypeScript (ESM)
- **Package manager:** pnpm
- **Site:** FilePress
- **Storage:** JSONL files in git
- **AI:** none

## Documentation

- [Specification 0.3](docs/efficacy-spec-v0.3.md)
- [Specification 0.4 draft](docs/efficacy-spec-v0.4-draft.md): proposed changes, not yet implemented
- [Architecture brief](docs/PHASE_1_BRIEF.md)
- [TODO.md](TODO.md)
