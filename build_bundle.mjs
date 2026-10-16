#!/usr/bin/env node
/** QBCC single-file release builder. Node >=18; no Python or npm install required. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(root, 'src', 'index.js');
const importRe = /^import\s+[^;]+?\s+from\s+['"](.+?)['"];?\s*$|^import\s+['"](.+?)['"];?\s*$/gm;
const seen = new Set();
const order = [];
function visit(filename) {
  filename = path.resolve(filename);
  if (seen.has(filename)) return;
  if (!fs.existsSync(filename)) throw new Error(`Module not found: ${filename}`);
  if (!filename.startsWith(path.join(root, 'src') + path.sep)) throw new Error(`Unexpected module outside src: ${filename}`);
  seen.add(filename);
  const source = fs.readFileSync(filename, 'utf8');
  for (const match of source.matchAll(new RegExp(importRe.source, 'gm'))) {
    const moduleName = match[1] || match[2];
    if (!moduleName.startsWith('.')) throw new Error(`External import not supported: ${moduleName}`);
    visit(path.resolve(path.dirname(filename), moduleName));
  }
  order.push(filename);
}
visit(entry);
const config = fs.readFileSync(path.join(root, 'src', 'config.js'), 'utf8');
const versionMatch = config.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch) throw new Error('Could not find VERSION in src/config.js');
const version = versionMatch[1];
const modules = order.map(filename => {
  const source = fs.readFileSync(filename, 'utf8');
  const transformed = source.replace(importRe, '')
    .replace(/^export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
  return `\n/* ===== ${path.relative(root, filename).split(path.sep).join('/')} ===== */\n${transformed.trim()}\n`;
}).join('');
const output = `// QBCC Runtime Companion self-contained bundle v${version}\n(()=>{\n'use strict';\n${modules}\n})();\n`;
if (Buffer.byteLength(output) < 100_000) throw new Error('Release bundle unexpectedly small');
for (const required of ['buildNpcAgencyAuthority', 'auditOversizedRelationshipDeltas', 'installFinalRequestGate', 'installKaizTripwire', 'armFateViewportReroll', 'buildAdamHiddenPrompt']) {
  if (!output.includes(required)) throw new Error(`Missing feature in bundle: ${required}`);
}
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const filename of [`qbcc-runtime-v${version}.js`, 'qbcc-runtime.js']) {
  fs.writeFileSync(path.join(dist, filename), output, 'utf8');
}
console.log(`QBCC Runtime v${version} built from ${order.length} source modules`);
console.log(`Release: dist/qbcc-runtime-v${version}.js (${Buffer.byteLength(output)} bytes)`);
console.log(`SHA-256 ${createHash('sha256').update(output).digest('hex')}`);
console.log('Existing versioned releases were preserved.');
