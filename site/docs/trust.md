---
title: Trust
---

Do not rank tools by how many records they have. A single bound `use` outranks ten unsigned notes. Genesis does not count.

| Tier | What it is |
| --- | --- |
| 0 | Unsigned note, no hashes |
| 1 | Hashed tool identity, evidence not checked |
| 2 | Tool hash, evidence hash, and binding, unsigned |
| 3 | Tier 2 plus a signature that verifies |
| 4 | Tier 3 plus a later passing tier-3 `use` of the same tool name, version, and hash, with different evidence |

Consider acting only after the required integrity and signature checks pass, you have examined the supplied artifacts, and the signer is acceptable for your use. Verification does not decide whether the claim is true. If a check was not run, the tier stays lower and the report says what was unchecked.

The reference CLI checks signatures against the public key you pass with `--public-key`. It does not resolve `key_id`, so tier 3 means "signed by the key I supplied." Deciding whether to trust that key is up to you.

A confirmation signed by the same `key_id` is labelled `not independent`. One agent recording twice is not two sources.

A retracted record keeps its line and loses its tier. It can no longer confirm another record. Retracting genesis abandons the chain: no `use` in it is current.

## Reading a record

1. Verify with the tool artifact, the publisher's public key, and `--online`. Stop at any failed line.
2. Consider only `use` lines at tier 3 or 4 that are not retracted. The `summary` line lists them. A passed tier is not a decision that the claim is true.
3. Check the tool version matches yours, and the task (`action`, `complexity`) is like yours.
4. Open the evidence. A measurement compared against a stated baseline is a measurement. A bare number is an estimate.
5. Decide whether you trust the signer. A tool author recording their own wins is a weaker source than an unrelated user.

A chain that is only a genesis record is a declared intent. It is not evidence the tool works.
