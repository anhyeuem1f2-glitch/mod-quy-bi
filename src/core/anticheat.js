import { PROTECTED_USER_TAG_RE, RUNTIME_BLOCK_RE } from '../config.js';

const UPDATE_BLOCK_RE = /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi;
const JSON_PATCH_BLOCK_RE = /<JSONPatch>[\s\S]*?<\/JSONPatch>/gi;
const BIAN_BLOCK_RE = /<BianLiang>[\s\S]*?<\/BianLiang>/gi;

export function sanitizeUserContent(text) {
  let out = String(text ?? '');
  // Users cannot forge runtime telemetry or direct MVU mutation blocks.
  RUNTIME_BLOCK_RE.lastIndex = 0;
  out = out.replace(RUNTIME_BLOCK_RE, '');
  out = out.replace(UPDATE_BLOCK_RE, '');
  out = out.replace(JSON_PATCH_BLOCK_RE, '');
  out = out.replace(BIAN_BLOCK_RE, '');
  PROTECTED_USER_TAG_RE.lastIndex = 0;
  out = out.replace(PROTECTED_USER_TAG_RE, '');
  return out.trim();
}

export function sanitizeTrustedDirective(text, maxChars = 1400) {
  let out = String(text ?? '');
  // Adam may steer narrative, but never receives permission to alter protected state directly.
  out = out.replace(UPDATE_BLOCK_RE, '[state mutation omitted]')
    .replace(JSON_PATCH_BLOCK_RE, '[state mutation omitted]')
    .replace(BIAN_BLOCK_RE, '[state mutation omitted]')
    .replace(/stat_data|_Niêm_phong|_Cài_đặt|_Hồ_sơ_khởi_tạo/gi, '[protected-state]');
  return out.slice(0, maxChars).trim();
}

export function isTrustedInternalSource(source) {
  return /^qbcc-runtime:(?:adam|amon|evernight|fate-snake|core)$/.test(String(source ?? ''));
}
