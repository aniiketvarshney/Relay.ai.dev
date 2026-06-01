import { CodeBlock } from '@/components/ui/CodeBlock';

const SECTIONS = [
  { id: 'what', title: 'What is Relay' },
  { id: 'publish', title: 'Publishing your first tool' },
  { id: 'registry', title: 'Querying the registry' },
  { id: 'mcp', title: 'Using the MCP gateway' },
  { id: 'proxy', title: 'Security proxy' },
  { id: 'api', title: 'API reference' },
];

export default function DocsPage() {
  return (
    <div className="flex gap-8">
      <nav className="hidden md:block w-48 shrink-0 sticky top-8 self-start">
        <ul className="space-y-2 text-[12px]">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-text-secondary hover:text-white transition-colors duration-150">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="flex-1 max-w-2xl space-y-12 text-[14px] text-text-secondary leading-relaxed">
        <section id="what">
          <h2 className="text-[20px] font-semibold text-text-primary mb-3">What is Relay</h2>
          <p>
            Relay is a registry and secure proxy for AI agent tools. Publish a manifest once; agents discover tools
            via the registry and execute them through Layer 2 security checks.
          </p>
        </section>

        <section id="publish">
          <h2 className="text-[20px] font-semibold text-text-primary mb-3">Publishing your first tool</h2>
          <CodeBlock
            language="yaml"
            code={`name: GitAnalyzer
version: "1.0.0"
description: Analyzes GitHub repositories
serverUrl: https://api.example.com/v1
authType: none
domain: devtools
tools:
  - name: search_repos
    endpoint: /repos/search
    method: POST`}
          />
        </section>

        <section id="registry">
          <h2 className="text-[20px] font-semibold text-text-primary mb-3">Querying the registry</h2>
          <CodeBlock code={`curl "https://your-app.vercel.app/api/registry?q=github&domain=devtools"`} language="bash" />
        </section>

        <section id="mcp">
          <h2 className="text-[20px] font-semibold text-text-primary mb-3">Using the MCP gateway</h2>
          <CodeBlock
            code={`POST /api/mcp/{manifestId}
{ "tool": "search_repos", "input": { "keyword": "react" }, "agentId": "agent_1" }`}
            language="json"
          />
        </section>

        <section id="proxy">
          <h2 className="text-[20px] font-semibold text-text-primary mb-3">Setting up the security proxy</h2>
          <p className="mb-3">Route agent calls through Layer 2 with one endpoint:</p>
          <CodeBlock
            code={`POST /api/proxy
{ "manifestId": "...", "toolName": "search_repos", "payload": { } }`}
            language="json"
          />
        </section>

        <section id="api">
          <h2 className="text-[20px] font-semibold text-text-primary mb-3">API reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-mono">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Path</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {[
                  ['POST', '/api/publish', 'Publish manifest'],
                  ['GET', '/api/registry', 'List/search tools (?q=, ?domain=)'],
                  ['GET', '/api/registry/:id', 'Tool detail + analytics'],
                  ['POST', '/api/proxy', 'Secure tool execution'],
                  ['POST', '/api/mcp/:id', 'MCP gateway'],
                  ['GET', '/api/health', 'System health'],
                  ['GET', '/api/dashboard', 'Dashboard stats'],
                  ['GET', '/api/security/events', 'Security audit log'],
                ].map(([m, p, d]) => (
                  <tr key={p} className="border-b border-border">
                    <td className="py-2 pr-4">{m}</td>
                    <td className="py-2 pr-4 text-accent-blue">{p}</td>
                    <td className="py-2">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </article>
    </div>
  );
}
