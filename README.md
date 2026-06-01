# Relay — The DNS for AI Agents

> Publish your API once. Any AI agent discovers and uses it automatically.

## Live Demo

https://relay-developer.vercel.app

## What it does

- **Layer 1: AgentRegistry** — developers publish a manifest once; any agent (Claude, GPT, Gemini, custom) queries and uses it
- **Layer 2: Security Proxy** — every agent tool call is intercepted, scanned for prompt injection, logged, and blocked if suspicious

## Try it in 60 seconds

```bash
curl https://relay-developer.vercel.app/api/registry
```

## Built with

Next.js 15, Prisma, Neon PostgreSQL, Vercel
