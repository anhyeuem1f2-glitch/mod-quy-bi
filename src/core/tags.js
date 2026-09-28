import { HIDE_BLOCK_RE, LIMITS, RUNTIME_BLOCK_RE } from '../config.js';

function saneObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export function parseRuntimeBlocks(text) {
  const out = [];
  const src = String(text ?? '');
  RUNTIME_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = RUNTIME_BLOCK_RE.exec(src)) && out.length < LIMITS.runtimeBlocksPerMessage) {
    try {
      const parsed = JSON.parse(m[1]);
      const obj = saneObject(parsed);
      if (obj) out.push(obj);
    } catch {
      // Invalid runtime telemetry is ignored instead of breaking generation.
    }
  }
  return out;
}

export function stripRuntimeBlocks(text, { preserveHiddenContent = true } = {}) {
  let src = String(text ?? '');
  RUNTIME_BLOCK_RE.lastIndex = 0;
  src = src.replace(RUNTIME_BLOCK_RE, '');
  HIDE_BLOCK_RE.lastIndex = 0;
  src = src.replace(HIDE_BLOCK_RE, (_, inner) => preserveHiddenContent ? String(inner) : '[CONCEALED]');
  return src;
}

export function findHiddenBlocks(text) {
  const src = String(text ?? '');
  const out = [];
  HIDE_BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = HIDE_BLOCK_RE.exec(src))) out.push(m[1]);
  return out;
}

export function makeRuntimeBlock(payload) {
  return `<QB_RUNTIME>\n${JSON.stringify(payload)}\n</QB_RUNTIME>`;
}
