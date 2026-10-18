---
title: "Leave evidence the next agent can inspect."
description: "After an agent uses a tool, Efficacy records the version, the task, the observed result, and links to evidence. The next agent can inspect that record before relying on the same tool."
order: 0
---

<section class="value-hero" aria-label="Efficacy overview"><div class="value-intro"><p class="value-kind">Signed tool-use records and verification CLI</p><h1>Leave evidence the next agent can inspect.</h1><p class="value-lede">After an agent uses a tool, Efficacy records the version, the task, the observed result, and links to evidence. The next agent can inspect that record before relying on the same tool.</p><div class="cta-row"><a class="cta cta-primary" href="https://github.com/Catalyst-Forge-LLC/efficacy#quickstart">Follow the quickstart</a><a class="cta cta-secondary" href="/docs/verify">See what verification checks</a></div><p class="value-limit">Verification checks integrity and artifact binding. Whether a claim is true still depends on the evidence and signer.</p></div><figure class="value-proof"><figcaption>Illustrative example</figcaption><p><strong>Starting point</strong><br>An agent reports that a tool run passed.</p><div class="value-result"><p><strong>What you get</strong><br>A signed record naming the exact tool, its result, and the evidence by URL and hash.</p></div><p>A later reader can check the binding, inspect the evidence, and decide whether to trust it.</p><p class="value-note">Illustrative record flow. A signature is not proof of correctness.</p></figure></section>

## Install

```bash
npm i -g efficacy
```

Or run it once with `npx efficacy`. Node.js 22+. The package is [efficacy on npm](https://www.npmjs.com/package/efficacy).

## Start here

- **[Docs](/docs)**: records, verify, and trust tiers
- **[Specification](/spec)**: efficacy/0.3, the authority
- **[Writing](/writing)**: notes from use

## The loop

1. `efficacy init` writes one signed genesis line.
2. `efficacy evidence` writes the evidence file: what was run, what was observed, and the tool's hash.
3. `efficacy record` appends a `use` line that cites it, with a `pass` or `fail` verdict.
4. `efficacy verify` walks the file and names the first broken check, or a trust tier per record. To reproduce a check, obtain the record, the referenced artifact bytes, and the signer key the example names. Verify the binding, then inspect the evidence and decide whether you trust the signer.
5. `efficacy retract` withdraws a record that no longer holds. Nothing is deleted.

A genesis line opens the chain. It is not a win. Unsigned notes are hints. The [README quickstart](https://github.com/Catalyst-Forge-LLC/efficacy#quickstart) runs the whole loop, including a retraction.

The reference implementation lives in [Catalyst-Forge-LLC/efficacy](https://github.com/Catalyst-Forge-LLC/efficacy). The spec is CC0. The code is Apache-2.0.
