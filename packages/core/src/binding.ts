export type ToolIdentity = {
  name: string;
  version: string;
  hash: string;
};

function sameTool(value: unknown, tool: ToolIdentity): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.name === tool.name && record.version === tool.version && record.hash === tool.hash;
}

function findTool(value: unknown, tool: ToolIdentity): boolean {
  if (sameTool(value, tool)) return true;
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => findTool(entry, tool));
  const record = value as Record<string, unknown>;
  if (record.tool && sameTool(record.tool, tool)) return true;
  return Object.values(record).some((entry) => findTool(entry, tool));
}

/** The evidence body names this tool version and hash, as JSON or as plain text. */
export function evidenceBinds(body: string, tool: ToolIdentity): boolean {
  try {
    if (findTool(JSON.parse(body) as unknown, tool)) return true;
  } catch {
    // Transcripts and other non-JSON evidence fall through to text search.
  }
  return body.includes(tool.name) && body.includes(tool.version) && body.includes(tool.hash);
}
