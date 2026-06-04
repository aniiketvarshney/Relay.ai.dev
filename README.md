# 🚀 Relay

### A zero-configuration, zero-dependency runtime security proxy for AI agents and MCP tools.

<p align="center">
  <a href="https://relay-ai-kappa.vercel.app"><b>Website</b></a> | 
  <a href="https://github.com/aniiketvarshney/Relay.ai.dev/discussions"><b>Community</b></a>
</p>

---

## 🛑 What is Relay?

Relay acts as a secure network gateway and execution firewall for autonomous AI agents. Instead of letting an LLM connect directly to your database or APIs, route your traffic through Relay to stop malicious prompt injections from nuking your infrastructure.

### The Execution Loop (Scan ➔ Block ➔ Log ➔ Forward)

```mermaid
graph LR
    Agent[AI Agent] -->|Tool Call| Scan[1. Scan Payload]
    Scan --> Block{2. Threat Detected?}
    Block -->|Yes| Halt[✖ Terminate Action]
    Block -->|No| Log[3. Log Audit Trail]
    Log --> Forward[4. Forward to API/DB]
    style Halt fill:#ffcccc,stroke:#333,stroke-width:2px
    style Forward fill:#ccffcc,stroke:#333,stroke-width:2px
```