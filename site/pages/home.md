---
title: "Leave evidence the next agent can inspect."
description: "After an agent uses a tool, Efficacy records the version, the task, the observed result, and links to evidence. The next agent can inspect that record before relying on the same tool."
order: 0
---

<section class="value-hero" aria-label="Efficacy overview"><div class="value-intro"><div class="value-headline"><p class="value-kind">Signed tool-use records and verification CLI</p><h1>Leave evidence the next agent can inspect.</h1></div><div class="value-pitch"><p class="value-lede">After an agent uses a tool, Efficacy records the version, the task, the observed result, and links to evidence. The next agent can inspect that record before relying on the same tool.</p><div class="cta-row"><a class="cta cta-primary" href="https://github.com/Catalyst-Forge-LLC/efficacy#quickstart">Follow the quickstart</a><a class="cta cta-secondary" href="#record-example">See what a record lets you check</a></div><p class="value-limit">Verification checks integrity and artifact binding. Whether a claim is true still depends on the evidence and signer.</p></div></div>
<figure class="value-proof worked-example" id="record-example" tabindex="-1">
<figcaption>Check which tool a “pass” actually refers to</figcaption>
<p class="example-context">Illustrative excerpt from the documented demo-tool workflow. Fields and hashes are shortened here; this is not a complete, verifiable record or a measured performance claim.</p>
<section class="example-step" aria-labelledby="example-step-1">
<h2 id="example-step-1"><span>1 · The claim being recorded</span> “Passed” needs a version and evidence</h2>
<p>The demo reports the same 12 checks passing, using 4,100 tokens without the tool and 2,900 with it.</p><p><strong>Tool:</strong> <code>demo-tool 1.2.3</code><br><strong>Claim:</strong> 1,200 tokens saved.</p><p>Those are the example’s reported numbers, not facts established by signing them.</p>
</section>
<section class="example-step example-report" aria-labelledby="example-step-2">
<h2 id="example-step-2"><span>2 · Efficacy record excerpt</span> The claim points to specific artifacts</h2>
<pre><code>"tool": {
  "name": "demo-tool",
  "version": "1.2.3",
  "hash": "sha256:…"
},
"measurement": { "tokens_saved": 1200 },
"verdict": "pass",
"evidence": {
  "url": "https://example.com/evidence/rec_demo.json",
  "hash": "sha256:…",
  "kind": "benchmark"
}</code></pre>
</section>
<section class="example-step" aria-labelledby="example-step-3">
<h2 id="example-step-3"><span>3 · The next reader checks</span> Catch evidence for the wrong version</h2>
<p><code>efficacy verify</code> checks the supplied chain, key, tool bytes, and evidence bytes.</p><p><strong>Binding check:</strong> Evidence naming <code>demo-tool 1.2.30</code> cannot support a record naming <code>1.2.3</code>. Verification reports <code>check binding</code> when that check fails.</p><p class="example-payoff">A later agent can spot a version mismatch before relying on the claim, then read the evidence to judge the result.</p>
</section>
<p class="value-note">Passing verification establishes integrity and binding, not that the measurement is correct or that the signer is trustworthy. The full workflow also shows how to retract a bad baseline.</p>
<p class="example-links"><a href="/docs/verify">Run the complete verification example</a></p>
</figure></section>

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
