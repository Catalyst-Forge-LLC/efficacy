---
title: Records
---

Every record has a `kind`. A chain file starts with one `genesis` line. Later lines are `use` or `retract`. One JSON object per line. Do not rewrite earlier lines.

## Genesis

Genesis opens the chain. `prev` is `null`. It names the subject (`tool` or `repo`) and why the chain exists. It is not a measured win. A signed genesis does not prove the tool works.

## Use

A `use` record is the normal line. It names the tool (name, version, content hash, locator), the action, at least one quantified measurement, a `pass` or `fail` verdict, and evidence. Evidence is an absolute `https://` URL plus the hash of that artifact. The artifact must name the same tool name, version, and hash.

## Retract

A `retract` line withdraws trust in an earlier record. It points at that record's content hash. Nothing is deleted. Consumers may keep the old line for history. They must not treat it as current evidence.

## Hash

`prev` on every line after genesis is the SHA-256 of the previous record's canonical JSON. Canonical JSON sorts keys at every level, has no insignificant whitespace, and excludes `signature`. If two implementations disagree about key order, verification fails.
