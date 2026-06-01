import { Manifest } from './manifest-validator';

function schemaProperties(inputSchema: Record<string, unknown> | undefined): Record<string, unknown> {
  const props = inputSchema?.properties;
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    return props as Record<string, unknown>;
  }
  return {};
}

export function generateDoc(manifest: Manifest, mcpEndpoint: string): string {
  const tools = manifest.tools.map(tool => {
    const props = schemaProperties(tool.inputSchema);
    const inputLines = Object.keys(props).length > 0
      ? Object.entries(props).map(([k, v]) => {
          const type =
            v && typeof v === 'object' && 'type' in v && typeof v.type === 'string'
              ? v.type
              : 'any';
          return `  ${k}: ${type}`;
        }).join('\n')
      : '  (no input required)';

    return `[${tool.name}]
DESC: ${tool.description || 'No description provided'}
CALL: ${tool.method || 'POST'} ${mcpEndpoint}
BODY: { "tool": "${tool.name}", "input": <INPUT>, "agentId": "<YOUR_AGENT_ID>" }
INPUT:
${inputLines}`;
  }).join('\n---\n');

  return `TOOL_REGISTRY_ENTRY
NAME: ${manifest.name} v${manifest.version}
PURPOSE: ${manifest.description}
DOMAIN: ${manifest.domain || 'general'}
AUTH: ${manifest.authType === 'none' ? 'No auth required' : `Include "${manifest.authHeader || 'Authorization'}" header on every call`}
TOOLS_COUNT: ${manifest.tools.length}
---
${tools}
---
USAGE_NOTE: Always pass agentId for telemetry tracking.`;
}

export function countTokens(text: string): number {
  return Math.round(text.length / 4);
}
