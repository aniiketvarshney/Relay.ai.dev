#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3000/api/publish';

const filePath = process.argv[2];

if (!filePath) {
  console.error('\n❌ Usage: node cli/index.js ./manifest.yaml\n');
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`);
  process.exit(1);
}

const manifest = yaml.load(fs.readFileSync(fullPath, 'utf8'));
console.log(`\n🚀 Publishing "${manifest.name}" to Relay...`);

fetch(REGISTRY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(manifest),
})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log(`✅ Published in under 30 seconds.`);
      console.log(`📦 Tool ID   : ${data.id}`);
      console.log(`🔗 MCP URL   : ${data.mcpEndpoint}`);
      console.log(`💡 Tokens    : ${data.tokenCount} (vs ~260 hardcoded)`);
      console.log(`🕐 Published : ${data.publishedAt}\n`);
    } else {
      console.error('❌ Failed:', data.error);
      if (data.details) data.details.forEach(d => console.error('  -', d));
    }
  })
  .catch(err => console.error('❌ Network error:', err.message));
