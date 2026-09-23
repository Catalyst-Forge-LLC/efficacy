import { contentHash, sha256File } from "./canonical.ts";
import { evidenceBinds } from "./binding.ts";
import { formatSchemaError, recordSchema, type UseRecord } from "./schema.ts";
import { signatureVerifies } from "./sign.ts";

export type LineResult = {
  line: number;
  id: string;
  kind: string;
  ok: boolean;
  check?: string;
  tier: number | null;
  detail: string;
  /** Id of the retract record that withdrew this record, or abandoned the chain. */
  retractedBy?: string;
};

export type VerifyOptions = {
  publicKeyPem?: string;
  /** Record id → evidence bytes. */
  evidenceBodies?: ReadonlyMap<string, Uint8Array>;
  /** Record id → tool artifact bytes. */
  toolBodies?: ReadonlyMap<string, Uint8Array>;
  /** When true, a use record without evidence bytes fails. */
  requireEvidence?: boolean;
};

type Checked = {
  line: number;
  raw: Record<string, unknown>;
  record: ReturnType<typeof recordSchema.parse>;
  hash: string;
};

function lineId(raw: unknown, line: number): string {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const id = (raw as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return `line-${line}`;
}

function fail(line: number, id: string, kind: string, check: string, detail: string): LineResult {
  return { line, id, kind, ok: false, check, tier: null, detail };
}

export function verifyChain(text: string, options: VerifyOptions = {}): { ok: boolean; lines: LineResult[] } {
  const rawLines = text.split(/\r?\n/);
  const occupied: { line: number; text: string }[] = [];
  for (let index = 0; index < rawLines.length; index += 1) {
    const textLine = rawLines[index] ?? "";
    if (textLine.trim().length === 0) continue;
    occupied.push({ line: index + 1, text: textLine });
  }

  if (occupied.length === 0) {
    return { ok: false, lines: [fail(0, "chain", "chain", "empty", "chain has no records")] };
  }

  const results: LineResult[] = [];
  const checked: Checked[] = [];
  const seenIds = new Set<string>();
  let broken = false;

  for (const entry of occupied) {
    if (broken) {
      let id = `line-${entry.line}`;
      let kind = "unknown";
      try {
        const raw = JSON.parse(entry.text) as unknown;
        id = lineId(raw, entry.line);
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          const maybeKind = (raw as Record<string, unknown>).kind;
          if (typeof maybeKind === "string") kind = maybeKind;
        }
      } catch {
        // The earlier break already failed the chain. Keep this line out of evidence.
      }
      results.push(fail(entry.line, id, kind, "chain-broken", "an earlier link failed, so this line is not current evidence"));
      continue;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(entry.text) as unknown;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "invalid JSON";
      results.push(fail(entry.line, `line-${entry.line}`, "unknown", "json", detail));
      broken = true;
      continue;
    }

    const id = lineId(raw, entry.line);
    const kind =
      raw && typeof raw === "object" && !Array.isArray(raw) && typeof (raw as Record<string, unknown>).kind === "string"
        ? String((raw as Record<string, unknown>).kind)
        : "unknown";

    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success) {
      results.push(fail(entry.line, id, kind, "schema", formatSchemaError(parsed.error)));
      broken = true;
      continue;
    }

    const record = parsed.data;
    if (seenIds.has(record.id)) {
      results.push(fail(entry.line, record.id, record.kind, "id", "duplicate id in this chain"));
      broken = true;
      continue;
    }
    seenIds.add(record.id);

    if (checked.length === 0) {
      if (record.kind !== "genesis") {
        results.push(fail(entry.line, record.id, record.kind, "genesis", "the first record must be genesis"));
        broken = true;
        continue;
      }
    } else if (record.kind === "genesis") {
      results.push(fail(entry.line, record.id, record.kind, "genesis-count", "a chain can contain only one genesis"));
      broken = true;
      continue;
    }

    if (checked.length > 0) {
      const expected = checked[checked.length - 1]?.hash;
      if (record.prev !== expected) {
        results.push(
          fail(entry.line, record.id, record.kind, "prev", `expected ${expected ?? "null"} got ${String(record.prev)}`),
        );
        broken = true;
        continue;
      }
    }

    if (record.kind === "retract") {
      const target = checked.find((item) => item.hash === record.retracts);
      if (!target) {
        results.push(fail(entry.line, record.id, record.kind, "retracts", "retracts does not match an earlier record hash"));
        broken = true;
        continue;
      }
      if (target.record.kind === "retract") {
        results.push(
          fail(entry.line, record.id, record.kind, "retracts", `cannot retract retract ${target.record.id}; write a new use record instead`),
        );
        broken = true;
        continue;
      }
    }

    if (record.signature && !record.key_id) {
      results.push(fail(entry.line, record.id, record.kind, "key_id", "a signature needs a key_id that resolves outside the record"));
      broken = true;
      continue;
    }

    const rawObject = raw as Record<string, unknown>;
    if (record.signature && options.publicKeyPem) {
      if (!signatureVerifies(rawObject, options.publicKeyPem)) {
        results.push(fail(entry.line, record.id, record.kind, "signature", "signature does not match the canonical record"));
        broken = true;
        continue;
      }
    }

    const useNotes = record.kind === "use" ? checkUse(record, rawObject, options) : undefined;
    if (useNotes && !useNotes.ok) {
      results.push(fail(entry.line, record.id, record.kind, useNotes.check, useNotes.detail));
      broken = true;
      continue;
    }

    const hash = contentHash(rawObject);
    checked.push({ line: entry.line, raw: rawObject, record, hash });
    results.push({
      line: entry.line,
      id: record.id,
      kind: record.kind,
      ok: true,
      tier: record.kind === "use" ? (useNotes?.tier ?? null) : null,
      detail: detailFor(record.kind, useNotes?.notes ?? [], hash, record.kind === "retract" ? record.retracts : undefined),
    });
  }

  applyRetractions(results, checked);
  applyConfirmations(results, checked);
  return { ok: results.every((line) => line.ok), lines: results };
}

function detailFor(kind: string, notes: string[], hash: string, retracts?: string): string {
  if (kind === "genesis") return `content ${hash}`;
  if (kind === "retract") return `retracts ${retracts}`;
  if (notes.length === 0) return "checks passed";
  return notes.join("; ");
}

type UseNotes = { ok: true; tier: number; notes: string[] } | { ok: false; check: string; detail: string };

function checkUse(record: UseRecord, raw: Record<string, unknown>, options: VerifyOptions): UseNotes {
  const notes: string[] = [];
  let toolHashOk = false;
  const toolBody = options.toolBodies?.get(record.id);
  if (toolBody) {
    const actual = sha256File(toolBody);
    if (actual !== record.tool.hash) {
      return { ok: false, check: "tool-hash", detail: `expected ${record.tool.hash} got ${actual}` };
    }
    toolHashOk = true;
  } else {
    notes.push("tool-hash unchecked");
  }

  let evidenceOk = false;
  const evidenceBody = options.evidenceBodies?.get(record.id);
  if (!evidenceBody) {
    if (options.requireEvidence) {
      return { ok: false, check: "evidence", detail: "evidence body was not provided" };
    }
    notes.push("evidence unchecked");
  } else {
    const actual = sha256File(evidenceBody);
    if (actual !== record.evidence.hash) {
      return { ok: false, check: "evidence-hash", detail: `expected ${record.evidence.hash} got ${actual}` };
    }
    const text = new TextDecoder().decode(evidenceBody);
    if (!evidenceBinds(text, record.tool)) {
      return {
        ok: false,
        check: "binding",
        detail: "evidence does not name this tool name, version, and hash",
      };
    }
    evidenceOk = true;
  }

  let signatureOk = false;
  if (!record.signature) {
    notes.push("unsigned");
  } else if (!options.publicKeyPem) {
    notes.push("signature unchecked");
  } else if (!signatureVerifies(raw, options.publicKeyPem)) {
    return { ok: false, check: "signature", detail: "signature does not match the canonical record" };
  } else {
    signatureOk = true;
    notes.push("signature matches the supplied public key; key_id not resolved");
  }

  let tier = 1;
  if (toolHashOk && evidenceOk) {
    tier = signatureOk ? 3 : 2;
  }
  return { ok: true, tier, notes };
}

/** Retracted records stay in history but lose their tier. Retracting genesis abandons the chain. */
function applyRetractions(results: LineResult[], checked: Checked[]): void {
  const retractedBy = new Map<string, string>();
  for (const item of checked) {
    if (item.record.kind === "retract") retractedBy.set(item.record.retracts, item.record.id);
  }
  const genesis = checked[0];
  const abandonedBy = genesis ? retractedBy.get(genesis.hash) : undefined;

  for (const item of checked) {
    const result = results.find((line) => line.line === item.line && line.ok);
    if (!result) continue;
    const direct = item.record.kind === "genesis" ? undefined : retractedBy.get(item.hash);
    const by = direct ?? (item.record.kind === "retract" ? undefined : abandonedBy);
    if (!by) continue;
    result.retractedBy = by;
    const was = result.tier === null ? "" : `; was tier ${result.tier}`;
    result.detail = `${direct ? "retracted by" : "chain abandoned by"} ${by}, not current evidence${was}`;
    result.tier = null;
  }
}

function applyConfirmations(results: LineResult[], checked: Checked[]): void {
  const uses = checked.flatMap((item, index) => {
    if (item.record.kind !== "use") return [];
    const result = results.find((line) => line.line === item.line && line.ok);
    if (!result || result.tier === null) return [];
    return [{ index, record: item.record, tier: result.tier, result }];
  });

  for (const current of uses) {
    if (current.tier !== 3 || current.record.verdict !== "pass") continue;
    const confirmer = uses.find(
      (later) =>
        later.index > current.index &&
        later.tier >= 3 &&
        later.record.verdict === "pass" &&
        later.record.tool.name === current.record.tool.name &&
        later.record.tool.version === current.record.tool.version &&
        later.record.tool.hash === current.record.tool.hash &&
        later.record.evidence.hash !== current.record.evidence.hash,
    );
    if (!confirmer) continue;
    current.result.tier = 4;
    const sameKey = confirmer.record.key_id === current.record.key_id;
    current.result.detail = `confirmed by ${confirmer.record.id}${sameKey ? " (same key_id, not independent)" : ""}; ${current.result.detail}`;
  }
}
