import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contentHash,
  generateEd25519Pem,
  serializeRecord,
  sha256File,
  signRecord,
  verifyChain,
  type UseRecord,
} from "../src/index.ts";

const signedAt = "2026-09-22T18:00:00.000Z";
const keyId = "https://github.com/Catalyst-Forge-LLC/efficacy#efficacy-key-v1";

function chainText(records: unknown[]): string {
  return `${records.map((record) => serializeRecord(record)).join("\n")}\n`;
}

test("a signed genesis and bound use verify at tier 3", () => {
  const keys = generateEd25519Pem();
  const toolBytes = new TextEncoder().encode("tool-artifact");
  const toolHash = sha256File(toolBytes);
  const evidence = JSON.stringify({
    tool: { name: "demo-tool", version: "1.2.3", hash: toolHash },
  });
  const evidenceBytes = new TextEncoder().encode(evidence);
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen_demo",
      scope: { type: "tool", name: "demo-tool", repo: "https://github.com/Catalyst-Forge-LLC/efficacy" },
      action: "opened an efficacy chain for demo-tool",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const use = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "use",
      id: "rec_use",
      prev: contentHash(genesis),
      tool: {
        name: "demo-tool",
        version: "1.2.3",
        hash: toolHash,
        locator: "https://example.com/demo-tool",
      },
      action: "measured a demo run",
      measurement: { tokens_saved: 10 },
      verdict: "pass",
      reason: "the next step reused the recorded choice",
      evidence: {
        url: "https://example.com/runs/demo.json",
        hash: sha256File(evidenceBytes),
        kind: "test-run",
      },
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );

  const report = verifyChain(chainText([genesis, use]), {
    publicKeyPem: keys.publicKeyPem,
    toolBodies: new Map([["rec_use", toolBytes]]),
    evidenceBodies: new Map([["rec_use", evidenceBytes]]),
  });

  assert.equal(report.ok, true);
  assert.equal(report.lines[1]?.tier, 3);
});

test("a second genesis breaks the chain at that line", () => {
  const keys = generateEd25519Pem();
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen_one",
      scope: { type: "repo", name: "efficacy" },
      action: "opened a chain",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const second = { ...genesis, id: "gen_two" };
  const report = verifyChain(chainText([genesis, second]), { publicKeyPem: keys.publicKeyPem });
  assert.equal(report.ok, false);
  assert.equal(report.lines[1]?.check, "genesis-count");
});

test("a mismatched prev names the expected hash", () => {
  const keys = generateEd25519Pem();
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen_prev",
      scope: { type: "tool", name: "demo-tool" },
      action: "opened a chain",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const use: UseRecord = {
    spec: "efficacy/0.3",
    kind: "use",
    id: "rec_bad_prev",
    prev: `sha256:${"ab".repeat(32)}`,
    tool: {
      name: "demo-tool",
      version: "1.2.3",
      hash: `sha256:${"cd".repeat(32)}`,
      locator: "https://example.com/demo-tool",
    },
    action: "measured a demo run",
    measurement: { tokens_saved: 1 },
    verdict: "pass",
    reason: "placeholder",
    evidence: {
      url: "https://example.com/runs/demo.json",
      hash: `sha256:${"ef".repeat(32)}`,
      kind: "other",
    },
    key_id: keyId,
    signed_at: signedAt,
  };
  const report = verifyChain(chainText([genesis, use]));
  assert.equal(report.lines[1]?.check, "prev");
  assert.match(report.lines[1]?.detail ?? "", /expected sha256:/);
});

test("unbound evidence fails the binding check", () => {
  const keys = generateEd25519Pem();
  const toolBytes = new TextEncoder().encode("tool-artifact");
  const evidenceBytes = new TextEncoder().encode('{"ok":true}');
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen_bind",
      scope: { type: "tool", name: "demo-tool" },
      action: "opened a chain",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const use = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "use",
      id: "rec_bind",
      prev: contentHash(genesis),
      tool: {
        name: "demo-tool",
        version: "1.2.3",
        hash: sha256File(toolBytes),
        locator: "https://example.com/demo-tool",
      },
      action: "measured a demo run",
      measurement: { tokens_saved: 1 },
      verdict: "pass",
      reason: "placeholder",
      evidence: {
        url: "https://example.com/runs/demo.json",
        hash: sha256File(evidenceBytes),
        kind: "other",
      },
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const report = verifyChain(chainText([genesis, use]), {
    publicKeyPem: keys.publicKeyPem,
    toolBodies: new Map([["rec_bind", toolBytes]]),
    evidenceBodies: new Map([["rec_bind", evidenceBytes]]),
  });
  assert.equal(report.lines[1]?.check, "binding");
});

test("a later confirming use raises the earlier record to tier 4", () => {
  const keys = generateEd25519Pem();
  const toolBytes = new TextEncoder().encode("tool-artifact");
  const toolHash = sha256File(toolBytes);
  const evidenceFor = (id: string) => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ tool: { name: "demo-tool", version: "1.2.3", hash: toolHash }, id }),
    );
    return { bytes, hash: sha256File(bytes) };
  };
  const firstEvidence = evidenceFor("one");
  const secondEvidence = evidenceFor("two");
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen_tier",
      scope: { type: "tool", name: "demo-tool" },
      action: "opened a chain",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const first = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "use",
      id: "rec_first",
      prev: contentHash(genesis),
      tool: { name: "demo-tool", version: "1.2.3", hash: toolHash, locator: "https://example.com/demo-tool" },
      action: "first measured run",
      measurement: { tokens_saved: 2 },
      verdict: "pass",
      reason: "first pass",
      evidence: { url: "https://example.com/runs/one.json", hash: firstEvidence.hash, kind: "test-run" },
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const second = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "use",
      id: "rec_second",
      prev: contentHash(first),
      tool: { name: "demo-tool", version: "1.2.3", hash: toolHash, locator: "https://example.com/demo-tool" },
      action: "second measured run",
      measurement: { tokens_saved: 3 },
      verdict: "pass",
      reason: "confirmed",
      evidence: { url: "https://example.com/runs/two.json", hash: secondEvidence.hash, kind: "test-run" },
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const report = verifyChain(chainText([genesis, first, second]), {
    publicKeyPem: keys.publicKeyPem,
    toolBodies: new Map([
      ["rec_first", toolBytes],
      ["rec_second", toolBytes],
    ]),
    evidenceBodies: new Map([
      ["rec_first", firstEvidence.bytes],
      ["rec_second", secondEvidence.bytes],
    ]),
  });
  assert.equal(report.ok, true);
  assert.equal(report.lines[1]?.tier, 4);
  assert.match(report.lines[1]?.detail ?? "", /confirmed by rec_second \(same key_id, not independent\)/);
  assert.equal(report.lines[2]?.tier, 3);
});

type UseSpec = { id: string; version?: string; evidence?: string; verdict?: "pass" | "fail" };

function buildChain(steps: (UseSpec | { retract: string })[]) {
  const keys = generateEd25519Pem();
  const toolBytes = new Map<string, Uint8Array>();
  const evidenceBytes = new Map<string, Uint8Array>();
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen",
      scope: { type: "tool", name: "demo-tool" },
      action: "opened a chain",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const records: Record<string, unknown>[] = [genesis];
  const hashes = new Map<string, string>([["gen", contentHash(genesis)]]);
  for (const step of steps) {
    const prev = contentHash(records[records.length - 1]);
    if ("retract" in step) {
      const retract = signRecord(
        {
          spec: "efficacy/0.3",
          kind: "retract",
          id: `retract_${step.retract}`,
          prev,
          retracts: hashes.get(step.retract),
          reason: "withdrawn",
          key_id: keyId,
          signed_at: signedAt,
        },
        keys.privateKeyPem,
      );
      records.push(retract);
      hashes.set(`retract_${step.retract}`, contentHash(retract));
      continue;
    }
    const version = step.version ?? "1.2.3";
    const tool = new TextEncoder().encode(`tool-${version}`);
    const toolHash = sha256File(tool);
    const evidence = new TextEncoder().encode(
      JSON.stringify({ tool: { name: "demo-tool", version, hash: toolHash }, run: step.evidence ?? step.id }),
    );
    toolBytes.set(step.id, tool);
    evidenceBytes.set(step.id, evidence);
    const use = signRecord(
      {
        spec: "efficacy/0.3",
        kind: "use",
        id: step.id,
        prev,
        tool: { name: "demo-tool", version, hash: toolHash, locator: "https://example.com/demo-tool" },
        action: "measured a run",
        measurement: { tokens_saved: 1 },
        verdict: step.verdict ?? "pass",
        reason: "placeholder",
        evidence: { url: `https://example.com/runs/${step.id}.json`, hash: sha256File(evidence), kind: "test-run" },
        key_id: keyId,
        signed_at: signedAt,
      },
      keys.privateKeyPem,
    );
    records.push(use);
    hashes.set(step.id, contentHash(use));
  }
  return verifyChain(chainText(records), { publicKeyPem: keys.publicKeyPem, toolBodies: toolBytes, evidenceBodies: evidenceBytes });
}

test("a retracted use loses its tier and cannot confirm another", () => {
  const report = buildChain([{ id: "rec_a" }, { id: "rec_b" }, { retract: "rec_b" }]);
  assert.equal(report.ok, true);
  assert.equal(report.lines[1]?.tier, 3);
  assert.equal(report.lines[2]?.tier, null);
  assert.equal(report.lines[2]?.retractedBy, "retract_rec_b");
  assert.match(report.lines[2]?.detail ?? "", /^retracted by retract_rec_b, not current evidence; was tier 3/);
});

test("retracting genesis leaves no current use records", () => {
  const report = buildChain([{ id: "rec_a" }, { id: "rec_b" }, { retract: "gen" }]);
  assert.equal(report.ok, true);
  assert.equal(report.lines[1]?.tier, null);
  assert.equal(report.lines[2]?.tier, null);
  assert.match(report.lines[1]?.detail ?? "", /^chain abandoned by retract_gen/);
});

test("a retract cannot target another retract", () => {
  const report = buildChain([{ id: "rec_a" }, { retract: "rec_a" }, { retract: "retract_rec_a" }]);
  assert.equal(report.ok, false);
  assert.equal(report.lines[3]?.check, "retracts");
  assert.match(report.lines[3]?.detail ?? "", /cannot retract retract retract_rec_a/);
});

test("confirmation needs the same tool version and different evidence", () => {
  const otherVersion = buildChain([{ id: "rec_a" }, { id: "rec_b", version: "2.0.0" }]);
  assert.equal(otherVersion.lines[1]?.tier, 3);

  const sameEvidence = buildChain([{ id: "rec_a", evidence: "shared" }, { id: "rec_b", evidence: "shared" }]);
  assert.equal(sameEvidence.lines[1]?.tier, 3);

  const failed = buildChain([{ id: "rec_a" }, { id: "rec_b", verdict: "fail" }]);
  assert.equal(failed.lines[1]?.tier, 3);
});

test("retract points at an earlier content hash", () => {
  const keys = generateEd25519Pem();
  const genesis = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "genesis",
      id: "gen_retract",
      scope: { type: "tool", name: "demo-tool" },
      action: "opened a chain",
      reason: "first record; no prior chain existed",
      prev: null,
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const retract = signRecord(
    {
      spec: "efficacy/0.3",
      kind: "retract",
      id: "rec_retract",
      prev: contentHash(genesis),
      retracts: contentHash(genesis),
      reason: "chain abandoned",
      key_id: keyId,
      signed_at: signedAt,
    },
    keys.privateKeyPem,
  );
  const report = verifyChain(chainText([genesis, retract]), { publicKeyPem: keys.publicKeyPem });
  assert.equal(report.ok, true);
  assert.equal(report.lines[1]?.kind, "retract");
});
