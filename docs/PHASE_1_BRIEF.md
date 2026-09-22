# Efficacy — Phase 1 architecture brief

_Structured capture of planning and architecture **before** code scaffolding. Goal: Phase 2 (or a new agent/session) can start from this file + `.forgetrail/workflow_tracking.json` without re-reading the whole Phase 1 chat._

**Status:** `locked`  
**Last updated:** `2026-09-22`  
**Phase 1 exit:** Do not mark Phase 1 complete in `.forgetrail/workflow_tracking.json` until this brief is **locked** and major commitments are in `decisions[]`.

---

## 1. Problem and outcome

**What we are building (2–4 sentences):**

Efficacy is a standard for machine-readable proof of tool success, written by agents, for agents. A record says what tool was used, what was measured, and whether it worked, then binds those claims to independently checkable evidence. This repo publishes that standard at efficacy.dev and ships the reference library and CLI that create, hash, sign, and verify those records. The spec in `docs/efficacy-spec-v0.3.md` is the authority. Implementations do not invent answers for questions the spec left open.

**Project archetype:** `product`

**What “done” looks like for v1 (measurable where possible):**

An operator can run three commands on a fresh directory and get a truthful result:

1. `efficacy init` writes one signed genesis line to `.efficacy/<name>.jsonl`.
2. `efficacy record` appends one evidence-shaped `use` line whose `prev` is the genesis content hash.
3. `efficacy verify` walks that file and reports pass, or names the first broken check (kind, link, hash, signature, or evidence).

The spec page is readable from the `site/` package locally. Unsigned notes stay hints. A genesis-only chain is intent, not a win.

---

## 2. Users and hero flow

**Primary user(s):**

Coding agents, and the people who operate them, deciding whether a tool has checkable evidence before they adopt it.

**The single most important workflow (hero flow) end-to-end:**

`efficacy init` creates a signed `.efficacy/<tool>.jsonl` genesis record. After a real tool run, `efficacy record` appends an evidence-bound `use` record. A later agent runs `efficacy verify` on that file and gets a chain verdict with a trust tier for each `use` line.

**Secondary workflows (if any) for v1:**

- Append a `retract` line that withdraws trust in an earlier `use` without deleting it.
- Reject a second genesis, a non-genesis with `prev: null`, and a broken `prev` link.
- Publish the v0.3 spec as the efficacy.dev site.

---

## 3. Constraints

- **Technical:** TypeScript, ESM only, pnpm. Chains are append-only JSONL in the consumer repo. No database, no accounts, no runtime LLM. Canonical bytes are sorted-key JSON, UTF-8, no insignificant whitespace, `signature` excluded. Hash is SHA-256. Signature algorithm in examples is Ed25519. `key_id` resolves outside the record. Evidence URLs on `use` records are absolute `https://`.
- **Business / timeline:** Public repo `https://github.com/Catalyst-Forge-LLC/efficacy.git`. Domain `efficacy.dev`. Spec license CC0. The published npm package name is `efficacy`. Implementation license is still open (Apache-2.0 recommended).
- **Explicit non-goals for v1:** See §10. The haulout note in `docs/` is parked.

---

## 4. Stack and tooling

_Confirmed choices only after user sign-off. Mirror the same choices into `CONTEXT_PROMPT.md` → Tech Stack in Phase 2._

| Area | Choice | Status (proposed / confirmed) | Notes / WHY |
| --- | --- | --- | --- |
| Layout | pnpm workspace: `packages/core`, `packages/cli`, `site/` | confirmed | User chose monorepo |
| Language | TypeScript, ESM | confirmed | Project rule |
| Package manager | pnpm | confirmed | Project rule |
| Framework | None for the engine. FilePress for `site/` | confirmed | Spec site is Markdown, not an app |
| DB / backend | None. `.efficacy/*.jsonl` is the store | confirmed | Spec: piggyback on git |
| Auth / storage | None. Local key file for signing; public key resolved outside the record | confirmed | Spec forbids embedding the only copy of the public key |
| Styling | FilePress defaults | confirmed | |
| Deploy / CI | Cloudflare Pages for `site/` | confirmed | Static spec site |
| Git host | GitHub | confirmed | |
| DNS | Cloudflare | confirmed | Domain already on Cloudflare |
| Registrar | Cloudflare | confirmed | User confirmed registration |
| State persistence | Files in git. No browser state, no PocketBase | confirmed | Chains outlive any browser by living in the repo |

---

## 5. Data model (sketch)

**Core entities:**

- **Record** — one JSON object, one JSONL line. `kind` is `genesis`, `use`, or `retract`. Common fields: `spec`, `kind`, `id`, `prev`, `signed_at`, optional `key_id` and `signature`.
- **Genesis** — `prev: null`, `scope.type` (`tool` or `repo`), `scope.name`, `action`, `reason`. Measurement, verdict, tool hash, and evidence are ignored for scoring if present.
- **Use** — `tool` (name, version, hash, locator), `action`, `measurement` (at least one quantified field), `verdict` (`pass` or `fail`), `reason`, `evidence` (url, hash, kind). Optional `complexity`.
- **Retract** — `retracts` (content hash of the withdrawn record), `reason`.
- **Chain file** — `.efficacy/<name>.jsonl`. First line is the only genesis. Later lines are `use` or `retract`. `prev` is the SHA-256 of the previous record’s canonical bytes.

**Relationships:**

One chain file has one genesis and an ordered list of later records. A `retract` points at an earlier record hash. It does not point at another file in v1.

**Existing data / migration:** none. Fixture chains are written for tests. This repo does not seed a fake `use` to occupy `prev`.

---

## 6. Integrations and external systems

| Integration | Purpose | Auth / secrets | Risk notes |
| --- | --- | --- | --- |
| HTTPS fetch | Tool artifact and evidence body, when verify is online | None in v1 | Timeouts and changed bytes must fail closed and name the check |
| Ed25519 | Sign and verify canonical bytes | Private key stays off the record | Do not invent a key registry. Local key path plus a caller-supplied public key is enough until the spec names discovery |
| FilePress | Render `site/` from the spec | None | |
| Cloudflare Pages | Publish efficacy.dev | Wrangler token later | Not required to prove the hero flow locally |

---

## 6a. Content-generation pattern (only if LLM-produced content)

Skipped. Spec prose and records are hand-authored or produced by the CLI from measured inputs. No project LLM keys.

---

## 7. Hardest problems and risks

1. Two implementations that disagree on canonical JSON will fail verification on purpose. The canonicalizer needs fixture tests, not a pretty-printer.
2. The spec’s key-discovery mechanisms are unnamed. v1 must verify signatures when key material is supplied, and must not pretend a registry exists.
3. Online evidence checks depend on URLs a stranger can fetch. Tests need offline fixtures so CI does not require the network. A failed fetch is a failed check, with the reason in the output.
4. Padding and unsigned notes must not score as wins. Trust-tier output has to follow the spec table, including “genesis is not a tier.”

---

## 8. Architectural decisions (numbered)

**D1. Monorepo.** `packages/core` holds schemas, canonical JSON, hashing, signing, and chain checks. `packages/cli` is the `efficacy` binary and depends on core. `site/` is the public spec site. **Why:** the library must be usable without the CLI, and the site must not pull crypto into a docs build. **Rejected:** a single root package.

**D2. Hero flow is init → record → verify.** v1 is done when those three commands produce and check one genesis plus one `use` on a JSONL chain. **Why:** that is the loop the spec describes, without a hosted ledger.

**D3. Spec open questions stay open.** No shared key directory, no cross-repo bridge, no cross-model measurement scale, no per-kind evidence schema, no multi-chain genesis. **Why:** the spec says not to invent those answers.

**D4. Errors name the check.** Verify output says which rule failed (second genesis, bad `prev`, hash mismatch, unbound evidence, bad signature) and the record id. **Why:** a bare “invalid” wastes the next session.

**D5. Schemas match the spec in the same change.** Field or enum changes update the spec note and the core schema together. **Why:** drifted validators would certify records the spec rejects.

**D6. No application database.** **Why:** the chain is the product, and it already lives in git.

**D7. Spec site on FilePress, published with Cloudflare Pages.** Registrar and DNS are both Cloudflare. LocalSlip claims the site dev port. ColdEye and xFacts wait until a readiness pass and a ship label. No desktop GUI. **Why:** the site is Markdown, the domain is already on Cloudflare, and the CLI’s users are agents in a terminal.

**D8. One published package, named `efficacy`.** `packages/core` stays a private workspace package and is consumed by the CLI. **Why:** the npm name `efficacy` is already staked, and v1 does not need a second public package.

---

## 9. Open questions (before or during Phase 2)

| # | Question | Owner / resolve by |
| --- | --- | --- |
| 1 | Implementation license for the code. Spec stays CC0. Recommendation: Apache-2.0, because it includes a patent grant from contributors. MIT is the shorter copyright-only alternative. | User, before publish |

---

## 10. Explicitly out of scope (v1)

- Haulout / chat-export experiment
- Hosted ledger, accounts, billing, multi-tenant orgs
- PocketBase or any server database
- Invented key registry or efficacy.dev public-key directory
- Cross-repo chain bridging
- Ranking tools by record count
- A desktop GUI over the CLI
- Dummy `use` records created only to fill `prev`
- Treating a signed genesis as evidence the tool works

---

## 11. First feature batch (post-scaffold)

1. Workspace root, `packages/core`, `packages/cli`, TypeScript project references, `pnpm` verify script (typecheck + tests).
2. Zod (or equivalent) schemas for `genesis`, `use`, and `retract` at `efficacy/0.3`.
3. Canonical JSON and SHA-256 content hash, with fixtures for key order and whitespace.
4. Ed25519 sign and verify over canonical bytes.
5. Chain walker: genesis rules, `prev` links, retract targets, trust tier, plain-language failure.
6. CLI commands `init`, `record`, `verify` covering the hero flow.
7. `site/` FilePress shell that renders the v0.3 spec. Local dev port comes from a LocalSlip claim. Do not pass a hardcoded port, and do not add a package whose only job is to read that port.

---

## 12. Handoff checklist (before leaving Phase 1)

- [x] User confirmed monorepo layout and hero flow
- [x] User confirmed the stack rows in §4
- [x] This brief is **locked**. Remaining items are only the publish questions in §9
- [x] `.forgetrail/workflow_tracking.json` has the architecture decisions
- [ ] Phase 2 opener will read **this file** + `.forgetrail/workflow_tracking.json` first
