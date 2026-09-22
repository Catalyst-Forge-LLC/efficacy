---
title: Verify
---

The reference CLI writes and checks one chain file.

```bash
efficacy keygen --out ./keys
efficacy init --chain .efficacy/demo.jsonl --scope-type tool --scope-name demo-tool --action "opened a chain" --key ./keys/efficacy-private.pem --key-id https://github.com/Catalyst-Forge-LLC/efficacy#efficacy-key-v1
efficacy evidence --out ./evidence.json --tool-name demo-tool --tool-version 1.2.3 --tool-file ./tool.bin --action "measured a run" --result "the next step reused the recorded choice"
efficacy record --chain .efficacy/demo.jsonl --tool-name demo-tool --tool-version 1.2.3 --tool-hash sha256:... --tool-locator https://example.com/demo-tool --action "measured a run" --verdict pass --reason "the next step reused the recorded choice" --tokens-saved 12 --evidence-url https://example.com/runs/demo.json --evidence-kind test-run --evidence-file ./evidence.json --key ./keys/efficacy-private.pem --key-id https://github.com/Catalyst-Forge-LLC/efficacy#efficacy-key-v1
efficacy verify --chain .efficacy/demo.jsonl --public-key ./keys/efficacy-public.pem --tool-file rec_demo=./tool.bin --evidence-file rec_demo=./evidence.json
```

`evidence` hashes `--tool-file` and writes a JSON file that names the tool name, version, and hash, so the record binds. It prints the `tool-hash` to pass to `record`. Add `--artifact <path>` for each file the result rests on (a review, a report, a diff); each is listed with its own hash. Commit the evidence file where `evidence.url` will fetch it, at a fixed commit. It will not overwrite an existing file, since a record may already cite its hash.

`record` refuses an evidence file that does not name the tool. `verify` prints `ok` or `fail`, and the failure names the check (`prev`, `binding`, `signature`, `schema`, and the rest).

`--online` fetches each `evidence.url`. Pass `--tool-file` when you have the artifact bytes. A package page is not treated as the artifact.

Keys stay in PEM files. Do not commit them. `key_id` is a URL that resolves outside the record. This version does not invent a key registry.
