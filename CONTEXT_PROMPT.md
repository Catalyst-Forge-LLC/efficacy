# Efficacy - Project Context Prompt

_Copy and paste this into a new chat to pick up where you left off. Update it at the end of every session._

Efficacy is a standard for machine-readable proof of tool success, written by agents, for agents, plus the reference CLI that creates and checks those records. The spec at `docs/efficacy-spec-v0.3.md` is the authority. The public site is efficacy.dev.

**Hero flow:** `efficacy init` writes a signed genesis line, `efficacy record` appends a bound `use` line, `efficacy verify` walks the file and names the first failed check or a trust tier.

---

## Tech Stack

- **Layout:** pnpm workspace. `packages/core` (private), `packages/cli` (published later as `efficacy`), `site/` (FilePress).
- **Language:** TypeScript, ESM, Node 22+. The CLI and tests run as TypeScript via Node's type stripping. There is no compile step for the library.
- **Package manager:** pnpm.
- **Records:** Append-only `.efficacy/*.jsonl`. No database, no accounts, no runtime LLM.
- **Crypto:** Node `crypto` Ed25519. Content hash is SHA-256 of canonical JSON. Signature prefix is `ed25519:` plus base64.
- **Validation:** Zod schemas in `packages/core/src/schema.ts` for `efficacy/0.3`.
- **Site:** FilePress (`getfilepress`). `pages/` holds Home, About, and the spec. `site/docs/` builds a handbook mounted at `/docs`. Package name `efficacy-site`. LocalSlip lease `efficacy-site` on port 4173. `filepress dev` reads that lease and does not take a `--port` flag.
- **Deploy target:** Cloudflare Pages. Registrar and DNS are Cloudflare. Domain `https://efficacy.dev`.
- **License:** Spec CC0. Code Apache-2.0.
- **Key dependencies:** `zod`. Site dev dependency `getfilepress`.

## Project Structure

```
efficacy/
  packages/core/     schemas, canonical JSON, signing, chain checks
  packages/cli/      efficacy binary (keygen, init, record, retract, verify)
  site/              FilePress site (pages/, posts/, docs/ mounted at /docs)
  docs/              spec and Phase 1 brief
  scripts/           sync-spec-page.mjs
```

## Data Model

Records are one JSON object per line. `prev` on every non-genesis record is the SHA-256 of the previous record's canonical bytes, excluding `signature`.

| Kind | Purpose | Key fields |
| --- | --- | --- |
| genesis | Opens a chain | `prev: null`, `scope.type`, `scope.name`, `action`, `reason` |
| use | A measured tool run | `tool`, `measurement`, `verdict`, `reason`, `evidence` |
| retract | Withdraws an earlier record | `retracts` (content hash), `reason` |

A chain file has one genesis, then `use` or `retract` lines. Genesis is not a trust tier. Tier 3 needs a checked tool hash, a checked evidence hash, binding, and a verified signature. Tier 4 needs a later confirming `use` for the same tool name.

## Key Architectural Decisions

**D1. Monorepo.** Core is usable without the CLI. The site does not import the crypto package. DECIDED: Phase 1.

**D2. Hero flow is init → record → verify.** DECIDED: Phase 1.

**D3. Do not invent spec-open answers.** No key registry, no public-key directory, no cross-repo bridge, no per-kind evidence schema. DECIDED: Phase 1.

**D4. Errors name the check.** Verify prints `check <name>:` (`prev`, `binding`, `signature`, `schema`, and the rest). DECIDED: Phase 1.

**D5. Schemas stay with the spec.** Field changes update `docs/efficacy-spec-v0.3.md` and `packages/core/src/schema.ts` together. `pnpm spec:sync` copies the spec into `site/pages/spec.md`. DECIDED: Phase 1.

**D6. No application database.** The chain is the store. DECIDED: Phase 1.

**D7. FilePress site, Cloudflare Pages, LocalSlip for the dev port.** DECIDED: Phase 1.

**D8. One public npm name, `efficacy`.** `@efficacy/core` stays private. DECIDED: Phase 1.

**D9. Code is Apache-2.0. Spec stays CC0.** DECIDED: Phase 1.

**D10. v1 verify does not resolve package pages into artifacts.** Pass `--tool-file id=path` for the tool hash. `--online` fetches `evidence.url` only. A package-page locator is not hashed as if it were the tarball. WHY: the spec has not named a resolution protocol.

## Critical Patterns for This Stack

- Canonical JSON sorts keys at every level, uses `JSON.stringify`, and drops the top-level `signature` before hashing. Hash the parsed object, not the raw line.
- Signing keys are PEM files. `keygen` refuses to overwrite them (`wx`). Do not commit `*.pem`.
- `evidence.url` must be public `https`. Binding means the evidence body contains the same tool name, version, and hash together.
- An unchecked tool hash or evidence body caps the tier. It does not pretend the record is tier 3.
- After the first broken link, later lines are `chain-broken` and are not current evidence.

## Design Philosophy

- The honest path is the easy path. The CLI signs and checks binding before it appends a `use` record.
- Claims are cheap. Evidence is the product. Genesis is a header, not a win.
- Machine-readable output first. Each failure names the check.

## Writing/Voice Rules

Spec and CLI text stay literal. Reasons are one line. No marketing language in records.

## My Preferences

- Plan before multi-file changes. Execute a single-file fix directly.
- Keep files focused. Prefer Node built-ins over new dependencies.
- Do not mark a ForgeTrail phase complete without an explicit yes.

## Current Feature State

### Complete

- Workspace, Zod schemas, canonical hash, Ed25519 sign/verify, chain walker, trust tiers.
- CLI `keygen`, `init`, `record`, `retract`, `verify`.
- Hero-flow test: init, record, verify at tier 3.
- FilePress site shell with the spec page generated from `docs/efficacy-spec-v0.3.md`.

### In Progress

- Phase 2 scaffold. Deploy to Cloudflare Pages is not done.

### Not Started

- A real dogfood `use` record whose evidence URL is fetchable by a stranger.
- npm publish. The CLI package is `private: true` until a version is ready.
- ColdEye readiness pass and an xFacts label.

## Patterns to Follow

- Name the failed check in stderr as `fail <check>: <detail>` or `fail <line> <kind> <id> check <name>: <detail>`.
- Keep `@efficacy/core` private. The public bin is `efficacy`.
- When the spec changes, update the schema in the same change and run `pnpm spec:sync`.

## Anti-Patterns to Avoid

- Do not invent a key registry, a shared public-key directory, or cross-repo chain links.
- Do not treat a signed genesis as proof the tool works.
- Do not rewrite earlier JSONL lines. Append only.
- Do not pass `--port` to `filepress dev`. Claim `efficacy-site` with LocalSlip first.
- Do not add a package whose only job is to read the LocalSlip lease.

## Recent Changes

### Session 4 - 2026-09-22

- Locked Apache-2.0 for the code and closed Phase 1.
- Scaffolded the workspace, the chain library, the CLI, and the FilePress site.
- `pnpm verify` typechecks, runs the chain tests and the hero-flow test, and checks the spec page.
