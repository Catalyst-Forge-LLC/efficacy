# Efficacy 0.4 — draft changes

**Status:** Draft. Not implemented. `efficacy/0.3` ([docs/efficacy-spec-v0.3.md](efficacy-spec-v0.3.md)) remains the authority until this is accepted.
**License:** CC0, like 0.3.

This document lists proposed changes against 0.3. It is not a full specification. Each section says what 0.3 does, what changes, and why.

The changes come from a review of the README. Its core point: verifying a record shows the record is intact, not that its claim is true. The format should make claims specific, attributable, and inspectable enough for someone else to judge. It should not suggest that a signed record settles the question.

---

## 1. Framing and verification scope

**0.3:** Opens with signed records of tool use, and says verification does not decide whether the claim is true.

**0.4:** The opening becomes: *"Signed, hash-bound records of tool use, with evidence another agent can check."* A new section, **Verification scope**, follows the introduction:

> Verification establishes that a record is intact, bound to a specific tool artifact and evidence artifact, and signed by a key. It does not establish that the claim is true. Whether a claim is supported depends on the evidence, the measurement basis (§2), the observer (§3), and whether the consumer trusts the signer.

## 2. Measurement basis

**0.3:** `measurement` needs at least one quantified field. The examples are all savings (`tokens_saved`, `iterations_avoided`, `time_saved_ms`). A savings figure implies a counterfactual that the agent may not have measured, so the format pushes agents to invent one.

**0.4:** `measurement` names its basis and holds its values separately.

```json
"measurement": {
  "basis": "compared",
  "baseline": "same task and the same 12 checks, run without the tool, same model",
  "values": { "tokens_used": 2900, "tokens_saved": 1200, "checks_passed": 12, "checks_total": 12 }
}
```

| `basis` | Meaning | Allowed values |
| --- | --- | --- |
| `observed` | Quantities measured in this run only. No comparison. | Direct quantities: `tokens_used`, `time_ms`, `iterations`, `checks_passed`, `checks_total` |
| `compared` | This run against a stated baseline under stated conditions. | Direct quantities plus differences: `tokens_saved`, `time_saved_ms`, `iterations_avoided` |
| `estimated` | The signer's estimate of a difference that was not measured. | Same as `compared` |

Rules:

- `values` needs at least one number. An observed result with no improvement figure is a complete record.
- Difference fields (`*_saved`, `*_avoided`) require `basis` `compared` or `estimated`.
- `compared` requires `baseline`, a one-line description. The evidence must contain both sides of the comparison.
- Zero and negative differences are valid. A tool that cost more tokens is still a result worth recording.
- Weighting: `compared` counts as measured. `estimated` is a hint about benefit, even on a tier 3 record. `observed` supports the verdict but makes no benefit claim.
- Partial success is expressed with `checks_passed` and `checks_total`. `verdict` stays `pass` or `fail`.
- Migration: a 0.3 `measurement` (a flat object of numbers) reads as `basis: "unstated"`, weighted like `estimated`.

## 3. Observer and recording policy

**0.3:** The signer is the only source named. "The agent says it helped," "the test runner reported 12 passes," and "a human approved it" look the same.

**0.4:** An optional `observer` on `use` records says who or what produced the observation. It may differ from the signer.

```json
"observer": { "type": "test-runner", "name": "node --test" }
```

`type` is one of `agent`, `test-runner`, `ci`, `human`, or `other`. When it is missing, consumers assume the signer observed the result.

Genesis gains an optional `recording_policy`:

| Value | Meaning |
| --- | --- |
| `all-uses` | Every use of the tool in this scope is recorded, pass or fail. Pass and fail counts are a meaningful rate. |
| `selected` | The signer chooses which uses to record. Counts are not a rate. |

A missing policy means `selected`. Consumers must not compute a success rate from a `selected` chain.

## 4. Canonical chain location and freshness

**0.3:** A chain is consistent with itself. Nothing tells a consumer whether its copy is current. Someone could hand over an older, valid copy from before a retraction.

**0.4:** Genesis may name `scope.chain_url`, an absolute `https://` URL where the current chain is served. It can be a raw file at a branch, not at a fixed commit.

- A consumer with a `chain_url` fetches it before relying on any record.
- A local copy that is a strict prefix of the fetched chain is stale. Use the fetched one.
- Two valid chains from the same genesis that differ at some line are a **fork**. Verification fails with check `fork`, and no record after the split is current evidence.
- Without a `chain_url`, a consumer must treat freshness as unknown and say so.

This is not a transparency log. It moves the freshness question to one named location that the tool publisher controls.

## 5. Private evidence

**0.3:** `evidence.url` must be publicly fetchable. Consulting and client work cannot record uses without publishing the material.

**0.4:** `evidence.visibility` is `public` (the default, same rules as 0.3) or `private`.

- A `private` record keeps `evidence.hash` and may omit `evidence.url`.
- A party that holds the evidence file verifies it with the normal tiers.
- For everyone else, a `private` record is at most tier 1: the tool identity is hashed, but the evidence cannot be checked.
- A private evidence file should include a random `nonce` field. Otherwise a short, guessable file could be recovered from its hash.
- Sharing the chain shares the record fields (`action`, `reason`, `tool`, measurement values). Those must not carry private material either.

## 6. Independent confirmation (tier 4)

**0.3:** "Tier 3 plus a live chain of later confirming `use` records." It does not say what counts as confirming. The reference implementation now requires the same tool name, version, and hash, a pass, different evidence, and no retraction. It labels same-key confirmations as not independent.

**0.4:** A confirming record must also have a different `key_id`. Same-key confirmations do not raise the tier. Implementations must be able to verify a chain whose records use more than one key.

## 7. Signature and key resolution

**0.3:** Tier 3 is "tier 2 plus resolvable signature," and key discovery lists three mechanisms. Resolution is not implemented in the reference CLI.

**0.4:**

- An implementation that checks signatures against a key supplied by the consumer, rather than one resolved from `key_id`, must report that. The reference CLI prints `signature matches the supplied public key; key_id not resolved`.
- `/.well-known/efficacy-keys.json` becomes the first mechanism to implement.
- Verifying a signature is not a decision to trust the signer. Consumers decide which signers they trust.

### Key file format *(provisional until a real record uses it)*

```json
{
  "spec": "efficacy/0.4",
  "keys": [
    {
      "id": "efficacy-key-v1",
      "alg": "ed25519",
      "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n",
      "created": "2026-09-22",
      "status": "active"
    }
  ]
}
```

- A record's `key_id` is the URL of this file plus `#` and the key's `id`, for example `https://efficacy.dev/.well-known/efficacy-keys.json#efficacy-key-v1`.
- `status` is `active`, `retired`, or `compromised`. `retired` and `compromised` keys also carry a `status_since` date.
- **`retired`** is normal rotation. Records signed before `status_since` stay valid. Records claiming a later `signed_at` fail check `key-retired`.
- **`compromised`** fails every record signed with that key, whatever its `signed_at`, with check `key-compromised`. `signed_at` is asserted by the signer, so whoever holds a stolen key can backdate. A cutoff date means nothing after a compromise.
- A key that is missing from the file fails check `key-unknown`.

## 8. Retraction effects

**0.3:** Retracted records are historical and "must not be used as current trust evidence." Retracting genesis abandons the chain.

**0.4:** This makes explicit what the reference implementation already does:

- A retracted `use` keeps its line, has no tier, and cannot confirm another record.
- Retracting genesis removes every `use` in the chain from current evidence.
- A `retract` may not target another `retract`. Verification fails with check `retracts`. If a retraction was a mistake, write a new `use` record. It may cite the same evidence as the retracted one. Re-affirming a claim is a new claim, and readers never have to resolve retractions of retractions to learn what is current.

## 9. Tool hash for non-package tools

**0.3:** "Content hash of the tool artifact at that version." That is clear for a package tarball. It is unclear for a skill or rule file.

**0.4:**

- Published npm package: hash the tarball `npm pack` produces for that version. `tool.locator` is the package page or the tarball URL.
- Single-file tool (a `SKILL.md`, a rule): hash the file bytes. `tool.locator` should be the raw file at a fixed commit, so a verifier can fetch and hash it.
- Multi-file tool that is not a package: prefer publishing it as a package and hashing the tarball. Otherwise hash a **manifest**:
  1. List every file in the tool as `<relative path> <sha256 hex>`, one per line. Paths use `/`, are relative to the tool root, and are UTF-8.
  2. Sort the lines by path, as bytes.
  3. Join them with `\n`, with a trailing `\n`.
  4. `tool.hash` is `sha256:` plus the SHA-256 of that text.

  The evidence must include the manifest text, so a verifier can see exactly which files were covered. Git tree hashes are not used. They tie the format to git, and most repositories still use SHA-1.

## 10. Environment

**0.3:** "How agents should compare measurements taken on different models or machines" is open.

**0.4:** A `use` record may carry `environment`:

```json
"environment": { "model": "gpt-6-pro", "runtime": "node 22.12", "machine": "8-core laptop" }
```

All fields are optional strings. Measurements from different environments are not comparable, and the spec does not normalize them. The `compared` basis (§2) already covers the comparison that matters: the baseline and the tool run in the same environment, inside one record. Comparing across records is the reader's judgment. When `environment` is missing, readers treat cross-record comparison as unsupported.

## 11. Minimum evidence content *(provisional until real records exist)*

**0.3:** "Minimum evidence schema per `evidence.kind`" is open.

**0.4:** Requirements follow the measurement basis (§2), not `evidence.kind`. Whether a comparison was made matters more than whether the file is a test run or a benchmark.

| Applies to | The evidence must contain |
| --- | --- |
| Every `use` | Tool identity (`name`, `version`, `hash`), a `result` line, and `observed_at` |
| `basis: compared` | Also both sides' values, and the baseline conditions |
| `basis: estimated` | Also a sentence on how the estimate was made |
| Manifest-hashed tools (§9) | Also the manifest text |

`efficacy evidence` already writes the first row. Requirements per `evidence.kind` wait until there are enough real records to learn from.

## 12. Canonical JSON and binding, made exact

**0.3:** "Sort object keys lexicographically." "The evidence artifact must itself name or include the same `tool.name`, `tool.version`, and `tool.hash`."

**0.4:**

- Keys sort by UTF-16 code unit at every level, as strings. Integer-like keys get no special order: `"10"` sorts before `"2"`.
- Every own key is kept, including `__proto__`. Numbers must be finite. Values outside JSON (`undefined`, functions) are an error, not silently dropped.
- Cross-implementation vectors live in `packages/core/test/vectors.json`: a record, its exact canonical string, its content hash, and an Ed25519 signature with the public key.
- JSON evidence binds only through an object whose `name`, `version`, and `hash` equal the record's exactly. Plain-text evidence binds only through a whole line `efficacy-tool: <name> <version> <hash>`. Substring matches never bind.
- Compatibility: this changes canonical bytes only for records with integer-like keys or a `__proto__` key. No published records had either when this was adopted.

---

## Status of each change

| Section | Status |
| --- | --- |
| 1. Framing and verification scope | Proposed |
| 2. Measurement basis | Proposed |
| 3. Observer and recording policy | Proposed |
| 4. Canonical chain location | Proposed |
| 5. Private evidence | Proposed |
| 6. Independent confirmation | Proposed. Same-key confirmations are already labelled `not independent` in the reference CLI. |
| 7. Signature and key resolution | Proposed. The key file format is provisional. |
| 8. Retraction effects | Accepted. Retracting a `retract` is rejected. |
| 9. Tool hash, including manifests | Accepted |
| 10. Environment | Accepted |
| 11. Minimum evidence content | Provisional |
| 12. Canonical JSON and binding | Accepted and implemented. These are corrections to 0.3 behavior, not new features. |

"Accepted" means agreed for 0.4 and ready to implement. "Provisional" means the shape is agreed but may change after the first live records. "Proposed" is still open for discussion.

## Still open

- Sections 1–7, which are proposed but not yet accepted
- The provisional key file format (§7) and minimum evidence content (§11)
- New questions from the first live records
