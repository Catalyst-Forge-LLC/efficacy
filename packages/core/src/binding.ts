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

/** The line plain-text evidence must contain to bind: `efficacy-tool: <name> <version> <hash>`. */
export function toolIdentityLine(tool: ToolIdentity): string {
  return `efficacy-tool: ${tool.name} ${tool.version} ${tool.hash}`;
}

/**
 * JSON evidence binds only through an object with exactly this name, version, and hash.
 * Plain text binds only through a whole line from `toolIdentityLine`. No substring matching:
 * version 1.2.3 must not bind to evidence about 1.2.30.
 */
export function evidenceBinds(body: string, tool: ToolIdentity): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    const wanted = toolIdentityLine(tool);
    return body.split(/\r?\n/).some((line) => line.trim() === wanted);
  }
  return findTool(parsed, tool);
}
