---
title: Verify
---

`efficacy verify` checks that a record is intact and tied to specific artifacts. It does not check that the claim inside is true.

| Check | What passing shows | What the CLI needs |
| --- | --- | --- |
| Chain | No line was edited, removed, or reordered after later lines were written | The chain file |
| Tool hash | The artifact you hold is the one the record names | `--tool-file id=path` |
| Evidence hash | The evidence you hold is the file the record cited | `--evidence-file id=path`, or `--online` |
| Binding | The evidence names the same tool name, version, and hash | The evidence file |
| Signature | The record was signed by the key you supplied | `--public-key` |

What it does not check:

- **Who owns the key.** `key_id` is not resolved. The signature is checked against the key you pass.
- **Whether the measurement or verdict is right.** A signed number is still the signer's number. Evidence that only names the tool still binds. Reading it is your job.
- **Whether your copy is the latest.** A chain proves its own lines are consistent, not that no retraction was appended somewhere else. Read the chain from the tool's own repository.

## The loop

```bash
efficacy keygen --out ./keys
efficacy init --chain .efficacy/demo.jsonl --id gen_demo --scope-type tool --scope-name demo-tool --action "opened a chain" --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1
efficacy evidence --out evidence/rec_demo.json --tool-name demo-tool --tool-version 1.2.3 --tool-file ./tool.bin --action "ran the fixture task without and with demo-tool" --result "same 12 checks passed; without: 4100 tokens, with: 2900"
efficacy record --chain .efficacy/demo.jsonl --id rec_demo --tool-name demo-tool --tool-version 1.2.3 --tool-file ./tool.bin --tool-locator https://example.com/demo-tool-1.2.3.tgz --action "ran the fixture task with demo-tool" --verdict pass --reason "same checks passed with fewer tokens" --tokens-saved 1200 --evidence-url https://example.com/evidence/rec_demo.json --evidence-kind benchmark --evidence-file evidence/rec_demo.json --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1
efficacy verify --chain .efficacy/demo.jsonl --public-key ./keys/efficacy-public.pem --tool-file rec_demo=./tool.bin --evidence-file rec_demo=evidence/rec_demo.json
efficacy retract --chain .efficacy/demo.jsonl --retracts-id rec_demo --reason "baseline used a different model" --key ./keys/efficacy-private.pem --key-id https://example.com/keys#efficacy-key-v1
```

`evidence` hashes `--tool-file` and writes a JSON file that names the tool name, version, and hash, so the record binds. Add `--artifact <path>` for each file the result rests on (a review, a report, a diff); each is listed with its own hash. Put the method in `--result`: what the baseline was and what was compared. Commit the evidence file where `evidence.url` will fetch it, at a fixed commit. It will not overwrite an existing file, since a record may already cite its hash.

Everything in the evidence file is public once its URL is. Do not put prompts, client material, or private paths in it.

`record` computes the tool hash from `--tool-file`, or takes `--tool-hash`. It refuses an evidence file that does not name the tool, and prints the new record's content hash. `retract` takes that hash with `--retracts`, or the record id with `--retracts-id`.

`verify` prints `ok` or `fail` per line, and a failure names the check (`prev`, `binding`, `signature`, `schema`, and the rest). A retracted record prints `retracted by <id>` instead of a tier. It ends with a summary of what counts as current evidence, and a note that verdicts and measurements were not evaluated.

`retract` checks its target before appending: it must exist in the chain and must not be another retract.

Binding is exact. JSON evidence must contain an object whose `name`, `version`, and `hash` equal the record's. Evidence for `1.2.30` does not bind a record for `1.2.3`. Plain-text evidence, such as a transcript, must contain this line on its own:

```text
efficacy-tool: demo-tool 1.2.3 sha256:...
```

`--online` fetches each `evidence.url`, but only after the whole chain passes offline checks. It fetches over https only, from public addresses only (checked again after DNS resolution and on every redirect), follows at most 5 redirects, reads at most 5 MB, and gives up after 15 seconds. Pass `--tool-file` when you have the artifact bytes. A package page is not treated as the artifact.

An `id=path` argument that matches no `use` record in the chain is an error, not a silent skip.

Keys stay in PEM files. Do not commit the private key. Publish the public key where `key_id` points. This version does not invent a key registry.
