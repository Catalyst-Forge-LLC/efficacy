# Efficacy - Feature Backlog

Flat list until a later pass groups work by product pillars.

## Shipped in the scaffold

- [x] pnpm workspace with `packages/core`, `packages/cli`, and `site/`
- [x] Zod schemas for genesis, use, and retract at `efficacy/0.3`
- [x] Canonical JSON and SHA-256 content hashes
- [x] Ed25519 sign and verify
- [x] Chain walker with named failures and trust tiers
- [x] CLI `keygen`, `init`, `record`, `retract`, `verify`
- [x] Hero flow covered by `packages/cli/test/hero.test.ts`
- [x] FilePress site that renders the v0.3 spec

## Next

- [x] Publish `efficacy` to npm.
- [x] Deploy `site/build` to Cloudflare Pages for efficacy.dev.
- [x] CLI `evidence`: write an evidence file that binds to the tool, so skill and package outputs can be recorded.
- [ ] Publish `efficacy@0.2.0` with `evidence`.
- [ ] Dogfood one real `use` record whose evidence URL a stranger can fetch. First candidate: Cold-eye's ForgeTrail onboarding review (`forgetrail@2143fe1`, `specs/canonical/cold-eye-onboarding-review.md`), once its high findings are fixed.
- [ ] Decide on the 0.4 draft (`docs/efficacy-spec-v0.4-draft.md`): measurement basis, observer and recording policy, `chain_url`, private evidence, independent tier 4. Implement only what is accepted.
- [ ] `verify` accepts more than one public key, so different signers can confirm each other (needed for 0.4 tier 4).
- [ ] `verify --online` fetches `tool.locator` and hashes it when the locator is the artifact itself (for example a raw skill file at a commit).
- [ ] ColdEye pass when the repo is ready for a newcomer.
- [ ] xFacts label when the public site is up.

## Explicitly later

- [ ] Key discovery, once the spec names the registry format.
- [ ] Cross-repo chain links, once the spec names them.
- [ ] Per-kind evidence schemas, once the spec names them.

## Foundation

- [ ] Keep `site/pages/spec.md` in sync when the spec changes (`pnpm spec:sync`).
