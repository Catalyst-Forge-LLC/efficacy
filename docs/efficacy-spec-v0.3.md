# Efficacy Specification

**Version:** 0.3  
**Status:** Draft  
**Domain:** efficacy.dev  
**License:** CC0 for the spec; implementations may choose their own license

## One-line pitch

A standard for machine-readable proof of tool success, written by agents, for agents.

## What this is

Efficacy is a compact record an agent leaves after using a tool. The record captures what was used, what was measured, and whether it worked — then binds those claims to independently checkable evidence.

The point is a compounding loop: an agent finds a verified record, uses the tool, saves tokens, and emits its own record. That record becomes evidence for the next agent. Repos become ledgers of proven choices instead of starting from zero every session.

This is not a popularity score, a star count, or a marketing badge. Unsigned or unverifiable records are hints. Signed, hashed, evidence-bound records are evidence.

## Record kinds

Every record has a `kind`:

| Kind | Purpose |
|---|---|
| `genesis` | Opens a chain. Declares scope. Has no predecessor. |
| `use` | A measured use of a tool. The normal record. |
| `retract` | Withdraws trust in an earlier record without deleting it. |

A chain begins with exactly one `genesis` record. Everything after that is `use` or `retract`.

## The core object: the efficacy record

A small structured block — JSON or YAML.

Every `use` record captures four claims:

1. **Tool identity** — name, version, and content hash of the artifact at that version
2. **Action** — short description of the task performed
3. **Measurement** — quantified savings the agent can actually measure (tokens, iterations avoided, time)
4. **Verdict** — `pass` or `fail`, with a one-line reason

Every record also carries verification fields and chain fields. `genesis` records declare scope instead of claiming a measured win.

### Canonical `use` example

```json
{
  "spec": "efficacy/0.3",
  "kind": "use",
  "id": "rec_01JEXAMPLE",
  "tool": {
    "name": "catalyst-forge/forgetrail",
    "version": "0.4.7",
    "hash": "sha256:7f3c1a9b2e4d...",
    "locator": "https://www.npmjs.com/package/forgetrail"
  },
  "action": "resumed a multi-session coding workflow from existing trail files",
  "measurement": {
    "tokens_saved": 4200,
    "iterations_avoided": 3,
    "time_saved_ms": 18000
  },
  "complexity": {
    "scale": "medium",
    "lines_touched": 42,
    "dependencies_touched": 2
  },
  "verdict": "pass",
  "reason": "next session continued from recorded decisions without rediscovering the data-store choice",
  "evidence": {
    "url": "https://example.com/runs/forgetrail-2026-09-20.json",
    "hash": "sha256:9aa1c0ffee12...",
    "kind": "benchmark"
  },
  "prev": "sha256:def456aa11bb...",
  "key_id": "https://github.com/Catalyst-Forge-LLC/forgetrail#efficacy-key-v1",
  "signed_at": "2026-09-20T20:00:00Z",
  "signature": "ed25519:MEUCIQDexample..."
}
```

## Genesis records

The first record in a chain has no predecessor. That is expected, not a broken link.

A genesis record is valid only when all of these hold:

1. `kind` is `genesis`
2. `prev` is `null`
3. It is the first record in that chain file
4. No later record in the same chain also has `kind: genesis`

If `prev` is `null` and `kind` is not `genesis`, the record is invalid.  
If `kind` is `genesis` and `prev` is not `null`, the record is invalid.  
If a chain contains two genesis records, the chain is invalid from the second genesis onward.

### What genesis is for

Genesis is not a fake first win. It is the header for the chain.

It declares:

- which tool or repo the chain belongs to
- the scope of the chain (`tool` or `repo`)
- the spec version in force when the chain started
- optional intent: why this chain exists

Agents reading a chain start at genesis. They learn the subject before they evaluate any `use` record.

### Canonical genesis example

```json
{
  "spec": "efficacy/0.3",
  "kind": "genesis",
  "id": "gen_forgetrail_repo",
  "scope": {
    "type": "tool",
    "name": "catalyst-forge/forgetrail",
    "repo": "https://github.com/Catalyst-Forge-LLC/forgetrail"
  },
  "action": "opened an efficacy chain for forgetrail",
  "reason": "first record; no prior chain existed",
  "prev": null,
  "key_id": "https://github.com/Catalyst-Forge-LLC/forgetrail#efficacy-key-v1",
  "signed_at": "2026-09-20T23:00:00Z",
  "signature": "ed25519:MEUCIQDexample..."
}
```

Genesis may omit `measurement`, `verdict`, `tool.hash`, and `evidence`. Those fields describe a measured use. Genesis is a declaration, not a result.

If a genesis record includes those fields anyway, consumers ignore them for scoring. They do not count as a win.

### Genesis and cold-start

A product with no prior records starts here:

1. Emit one signed genesis record for the chain
2. Then emit `use` records as tools are actually exercised
3. Never invent a dummy `use` just to have a `prev` value

A first real `use` after genesis sets `prev` to the genesis record's content hash.

## Required fields

Common to every kind:

| Field | Type | Rule |
|---|---|---|
| `spec` | string | Must be `efficacy/0.3` for this version |
| `kind` | enum | `genesis` \| `use` \| `retract` |
| `id` | string | Unique within the local chain. Opaque is fine. |
| `prev` | string or null | `null` only when `kind` is `genesis` |
| `signed_at` | string | ISO-8601 timestamp |

Required on `genesis`:

| Field | Type | Rule |
|---|---|---|
| `scope.type` | enum | `tool` \| `repo` |
| `scope.name` | string | Stable identifier for the subject of the chain |
| `action` | string | One sentence. Why this chain was opened. |
| `reason` | string | One line. Usually "first record; no prior chain existed" |

Required on `use`:

| Field | Type | Rule |
|---|---|---|
| `tool.name` | string | Stable tool identifier |
| `tool.version` | string | Exact version used |
| `tool.hash` | string | Content hash of the tool artifact at that version |
| `tool.locator` | string | Absolute URL that resolves to that artifact or its package page |
| `action` | string | One sentence. What the agent did with the tool. |
| `measurement` | object | At least one quantified field. Empty measurements are hints, not evidence. |
| `verdict` | enum | `pass` or `fail` |
| `reason` | string | One line. No marketing language. |
| `evidence.url` | string | Absolute, fetchable URL. No localhost, no relative paths, no `file://` |
| `evidence.hash` | string | Content hash of the evidence artifact itself |
| `evidence.kind` | enum | `benchmark` \| `test-run` \| `commit` \| `trace` \| `other` |

Required on `retract`:

| Field | Type | Rule |
|---|---|---|
| `retracts` | string | Content hash of the record being withdrawn |
| `reason` | string | Why current trust should stop |

Signature fields are required for evidence-tier records of any kind:

| Field | Type | Rule |
|---|---|---|
| `key_id` | string | Resolver for the public key. Never embed the public key alone. |
| `signature` | string | Signature over the canonical record body |

Unsigned records of any kind are allowed. They are hints.

Optional on `use`:

| Field | Type | Rule |
|---|---|---|
| `complexity.scale` | enum | `trivial` \| `small` \| `medium` \| `hard` |
| `complexity.lines_touched` | number | If known |
| `complexity.dependencies_touched` | number | If known |

## Canonicalization for hashing and signing

Agents must sign and hash a stable form of the record, not whatever pretty-printed JSON they happened to emit.

1. Remove `signature` from the object.
2. Sort object keys lexicographically at every level.
3. Encode as UTF-8 JSON with no insignificant whitespace.
4. Hash that bytestring with SHA-256. That hash is the record's own content hash.
5. Sign that same bytestring.

`prev` on a non-genesis record is the SHA-256 of the previous record's canonical bytestring (also excluding that previous record's `signature`).

If two implementations disagree about whitespace or key order, verification fails. That is intended.

## Verification anchors

A consuming agent must not trust a `use` record on its word. It checks four things before treating that record as evidence:

1. **Tool hash** — fetch or resolve `tool.locator`, hash the artifact at `tool.version`, compare to `tool.hash`.
2. **Evidence hash** — fetch `evidence.url`, hash the body, compare to `evidence.hash`.
3. **Binding** — the evidence artifact must itself name or include the same `tool.name`, `tool.version`, and `tool.hash`. If it does not, the record is unbound and must be treated as a hint.
4. **Signature** — resolve `key_id` to a public key, then verify `signature` over the canonical record body.

Genesis records skip tool-hash and evidence-hash checks. They are verified as:

1. `kind` is `genesis` and `prev` is `null`
2. They are the first record in the chain
3. Signature resolves, if present
4. `scope` is present and internally consistent

If any required check fails, the record is not evidence. It may still be stored as an unverified hint.

### Key discovery

`key_id` must resolve through one of these allowed mechanisms:

- A well-known file in the tool repo, for example `/.well-known/efficacy-keys.json`
- A signed release asset attached to the same version
- A registry entry published by the tool author

Agents must not trust a public key that appears only inside the record. The key has to live somewhere independently checkable.

## Evidence rules

Evidence exists to stop claims from floating free of artifacts.

- `evidence.url` must be an absolute `https://` URL that a stranger can fetch.
- `evidence.hash` is required on `use` records. A URL without a hash is not evidence.
- Local paths, `localhost`, ephemeral CI logs that vanish, and screenshots-only claims are not valid evidence.
- Acceptable evidence kinds: a benchmark JSON file, a test-run transcript, a commit that contains the measured result, or a signed execution trace.
- The evidence artifact should be small and stable. If the URL starts returning different bytes, verification fails. That is the point.
- Genesis records do not need evidence.

## Hash chain

Each non-genesis record includes `prev`, the hash of the previous record in that chain.

- Tamper with any entry and every subsequent hash breaks.
- The chain lives in the repo. It piggybacks on git. No external ledger is required.
- Agents can walk the chain forward or backward.
- A broken link is visible to anyone who looks.
- A missing genesis, or a second genesis, is also a broken chain.

Allowed layouts:

- One chain per tool
- One global chain for the repo

Do not mix the two in the same file without namespacing. Genesis is the place that declares the layout.

Suggested on-disk layout:

```text
.efficacy/
  INDEX.md
  forgetrail.jsonl
  coldeye.jsonl
```

Each `*.jsonl` file starts with one genesis record. Append-only after that. One record per line. Do not rewrite earlier lines.

Walking a chain:

1. Read the first line. It must be `kind: genesis` with `prev: null`.
2. Hash that record. That hash is `prev` for the next record.
3. Continue until the file ends.
4. Stop treating the chain as current evidence at the first broken link.

## Revocation

The chain is append-only. Nothing is deleted. Genesis is never deleted and should not be retracted except to abandon the whole chain.

A later `retract` record withdraws trust in an earlier `use` record:

1. Emit a new record with `kind: retract`.
2. Set `retracts` to the content hash of the record being withdrawn.
3. Explain why in `reason`.
4. Set `prev` to the previous record in the chain, as usual.

Consumers treat the retracted record as historical. It may be used for trend analysis. It must not be used as current trust evidence.

```json
{
  "spec": "efficacy/0.3",
  "kind": "retract",
  "id": "rec_01JRETRACT",
  "retracts": "sha256:def456aa11bb...",
  "reason": "critical bug in 0.4.7; do not treat prior pass records as current",
  "prev": "sha256:aa11bb22cc33...",
  "key_id": "https://github.com/Catalyst-Forge-LLC/forgetrail#efficacy-key-v1",
  "signed_at": "2026-09-21T01:00:00Z",
  "signature": "ed25519:MEUCIQDexample..."
}
```

If a later record retracts an earlier one, consumers should prefer the newest verified `use` record for that tool version.

Retracting genesis means "this chain is abandoned." Start a new chain file instead of trying to reuse the broken one.

## The loop

1. If no chain exists, emit a genesis record.
2. Agent finds later records, or starts from genesis.
3. Agent verifies according to record kind.
4. Agent uses the tool and measures the result.
5. Agent emits a `use` record, signed with a discoverable key, chained from `prev`.
6. That record becomes evidence for the next agent.

Each verified win makes the next adoption more likely. Silence is the penalty for tools with no records or broken hashes: agents skip them instead of debating them.

A chain that is only a genesis record is a declared intent, not yet evidence of efficacy. Agents may notice the tool exists. They should not treat an empty chain as a win.

## Weighting guidance

Do not rank tools by record count.

Score on **evidence density**:

- Does the record cite a fetchable artifact with a matching hash?
- Does that artifact bind to the same tool version?
- Is the measurement quantified, or is it just "worked well"?
- Is the signature resolvable to a published key?
- Has the record been retracted?
- Is this a real `use`, or only a genesis header?

A single benchmark-backed `use` record outranks ten unsigned "worked well" notes. Genesis does not count toward density.

`complexity` exists so agents can normalize. A trivial formatting tool should not outrank a hard multi-file migration just because it is easier to emit a record about. If `complexity` is missing, treat the record as less comparable, not more impressive.

Padding a chain with empty records should dilute weight, not increase it.

## Trust tiers

| Tier | What it is | How agents should treat it |
|---|---|---|
| 0 | Unsigned note, no hashes | Ignore for decisions |
| 1 | Hashed tool identity, no evidence hash | Weak hint |
| 2 | Tool hash + evidence hash + binding, unsigned | Useful but spoofable |
| 3 | Tier 2 plus resolvable signature | Evidence |
| 4 | Tier 3 plus a live chain of later confirming `use` records | Strong evidence |

Genesis, even if signed, is not a trust tier of its own. It makes the chain readable. It does not prove the tool works.

Agents should default to acting only on tier 3 and 4 `use` records.

## What this is not

- Not a security audit
- Not a supply-chain attestation in the SLSA / npm provenance sense, though those can be cited as evidence
- Not a human review site
- Not a blockchain
- Not a guarantee the tool is good in every repo — only that this agent measured this result against this artifact
- Not a substitute for a first real measurement. Genesis is a header, not a trophy.

## Cold-start

The format does not spread until someone seeds it.

Recommended seed path:

1. Publish this spec at efficacy.dev
2. Open a genesis record per tool chain
3. Dogfood `use` records across Catalyst Forge tools that already use each other
4. Emit `use` records from ColdEye passes that **hold**, never from passes that fail
5. Keep the first `use` records short, hashed, and boring

A failed ColdEye read should not produce a `pass` efficacy record. It may produce a `fail` `use` record, or no record.

## Design principles

- Honest path is the easy path
- Machine-readable first, human-glanceable second
- No external infrastructure required
- Verification is built in, not bolted on
- Bad records are flaggable, not erasable
- Claims are cheap; evidence is the product
- The first record is an origin, not a fabricated win

## Open questions

These are intentionally unresolved in 0.3:

- Exact key registry format
- Whether a shared public key directory should exist at efficacy.dev
- Cross-repo chain bridging
- How agents should compare measurements taken on different models or machines
- Minimum evidence schema per `evidence.kind`
- Whether a repo-scoped genesis may point at multiple tool chains, or must stay one-to-one

Do not invent answers in implementations until this spec names them.
