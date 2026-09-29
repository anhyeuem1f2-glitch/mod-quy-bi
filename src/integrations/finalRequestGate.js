import { getHostWindow } from '../adapters/host.js';
import { isHardMode } from '../core/difficulty.js';
import { auditPromptSources } from '../core/modelClient.js';
import { buildFairSimulationAuthority, buildGrayFogLock, buildMultiPathwayLock, buildSourceTrustAuthority, buildWorldbookAuditAuthority } from '../core/authorityPolicy.js';
import { buildLanguageAuthority } from '../core/languageFirewall.js';
import { buildActingAuthority } from '../core/actingEngine.js';

export const MAIN_REQUEST_MARKER = '[QBCC_MAIN_REQUEST_GATE_V050]';

export function markMainRequest(messages) {
  if (!Array.isArray(messages)) return false;
  if (messages.some(m => typeof m?.content === 'string' && m.content.trim() === MAIN_REQUEST_MARKER)) return true;
  messages.push({ role:'system', content:MAIN_REQUEST_MARKER, _qbccSource:'qbcc-runtime:request-marker' });
  return true;
}

function consumeMainRequestMarker(messages) {
  if (!Array.isArray(messages)) return false;
  let found = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (typeof m?.content === 'string' && m.content.trim() === MAIN_REQUEST_MARKER) {
      messages.splice(i, 1);
      found = true;
    }
  }
  return found;
}

function parseBody(init) {
  try {
    if (!init || typeof init.body !== 'string') return null;
    const x = JSON.parse(init.body);
    return x && typeof x === 'object' ? x : null;
  } catch { return null; }
}

function looksLikeKaiz(payload) {
  if (!Array.isArray(payload?.messages)) return false;
  const sys = payload.messages.filter(x => x?.role === 'system').map(x => String(x?.content || '')).join('\n');
  return /CÁC CÔNG CỤ HIỆN CÓ|MAX AGENT FLOW|AGENT LOOP|AGENTIC LOOP/i.test(sys);
}

function isChatPayload(payload) {
  return !!(payload && Array.isArray(payload.messages) && payload.messages.some(m => m && typeof m.content === 'string'));
}

function directProtectedSystemTamper(text) {
  const s = String(text || '');
  return /<UpdateVariable>|<JSONPatch>|<BianLiang>|_Niêm_phong|qbcc_so_niem_phong|chữ\s*ký\s*niêm\s*phong/i.test(s)
    && /(?:ignore|bypass|disable|remove|delete|overwrite|forge|sửa|xóa|tắt|gỡ|lách|ghi\s*đè|giả\s*mạo)/i.test(s);
}

function applyCoreFallback(messages) {
  let changed = 0;
  for (const m of messages || []) {
    if (!m || !['system','developer'].includes(String(m.role || '').toLowerCase()) || typeof m.content !== 'string') continue;
    if (!directProtectedSystemTamper(m.content)) continue;
    m.content = m.content
      .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '[protected mutation removed]')
      .replace(/<JSONPatch>[\s\S]*?<\/JSONPatch>/gi, '[protected mutation removed]')
      .replace(/<BianLiang>[\s\S]*?<\/BianLiang>/gi, '[protected mutation removed]')
      .replace(/_Niêm_phong|qbcc_so_niem_phong/gi, '[protected state]');
    changed += 1;
  }
  return changed;
}

function appendAuthority(messages, ctx) {
  const blocks = [
    buildSourceTrustAuthority(ctx),
    buildWorldbookAuditAuthority(ctx),
    buildFairSimulationAuthority(ctx),
    buildGrayFogLock(ctx),
    buildMultiPathwayLock(ctx),
    buildLanguageAuthority(ctx),
    buildActingAuthority(ctx.statData || {}),
  ].filter(Boolean);
  if (!blocks.length) return;
  messages.push({
    role:'system',
    content:blocks.join('\n\n'),
    _qbccSource:'qbcc-runtime:final-authority',
  });
}

export function applySemanticAuditItems(messages, items) {
  if (!Array.isArray(messages) || !Array.isArray(items)) return 0;
  const groups = new Map();
  for (const item of items) {
    if (item?.verdict !== 'sanitize' || Number(item?.confidence || 0) < 0.75) continue;
    const index = Number(item.index);
    if (!Number.isInteger(index)) continue;
    if (!groups.has(index)) groups.set(index, []);
    groups.get(index).push(item);
  }

  let changed = 0;
  for (const [index, edits] of groups) {
    const m = messages[index];
    if (!m || typeof m.content !== 'string' || !['system','developer'].includes(String(m.role || '').toLowerCase())) continue;
    let content = String(m.content);
    // Offsets refer to the original message. Apply from the tail backwards so
    // earlier offsets remain valid after a later chunk is rewritten.
    const sorted = [...edits].sort((a,b) => Number(b.start || 0) - Number(a.start || 0));
    const reasons = [];
    for (const item of sorted) {
      const start = Math.max(0, Math.min(content.length, Number(item.start || 0)));
      const end = Math.max(start, Math.min(content.length, Number(item.end ?? start)));
      let replacement = String(item.sanitized_content ?? '');
      if (!replacement.trim()) replacement = '[QBCC source firewall: authority-cheat directive removed.]';
      content = content.slice(0, start) + replacement + content.slice(end);
      reasons.push(String(item.reason || 'semantic authority-cheat').slice(0,260));
      changed += 1;
    }
    m.content = content;
    m._qbccSanitized = true;
    m._qbccSanitizeReason = reasons.reverse().join(' | ').slice(0,1200);
  }
  return changed;
}

async function semanticSanitize(messages, ctx) {
  const report = await auditPromptSources(messages, { difficulty:ctx.difficulty });
  if (!report?.available) return { changed:0, report };
  return { changed:applySemanticAuditItems(messages, report.items || []), report };
}

export function installFinalRequestGate({ getDifficulty, getStatData, getRuntimeState, sandboxTest = () => false, onAudit } = {}) {
  const host = getHostWindow();
  if (!host || typeof host.fetch !== 'function') return { stop() {}, diagnostics:() => ({ armed:false }) };
  const upstream = host.fetch;
  if (upstream?.__qbccFinalRequestGate) return upstream.__qbccController || { stop() {}, diagnostics:() => ({ armed:true, reused:true }) };
  let stopped = false;
  let scans = 0;
  let sanitized = 0;

  const wrapped = async function(input, init = {}) {
    if (stopped || Number(host.__QBCC_INTERNAL_FETCH_DEPTH || 0) > 0) return upstream(input, init);
    const payload = parseBody(init);
    if (!isChatPayload(payload) || looksLikeKaiz(payload)) return upstream(input, init);

    const difficulty = String(getDifficulty?.() || 'Thường');
    const strict = isHardMode(difficulty) && sandboxTest?.() !== true;
    const messages = payload.messages.map(m => ({ ...m }));
    payload.messages = messages;

    // Only the real SillyTavern main-generation payload is marked from the
    // CHAT_COMPLETION_PROMPT_READY hook. World-Engine, memo-suite, summarizers,
    // image-captioners and other extension model calls must pass through untouched.
    // The marker is removed before the request leaves the browser.
    if (!consumeMainRequestMarker(messages)) return upstream(input, init);

    // Core protected-state tamper is never accepted, even on Easy/Normal.
    sanitized += applyCoreFallback(messages);

    // The configured QBCC model always gets the semantic vote on preset/persona/
    // worldbook/memory authority-cheat. Easy/Normal remain mechanically lenient,
    // but external sources still cannot forge protected state or guaranteed USER
    // privilege. Hard/Nightmare additionally receives the strict simulation layer.
    let report = null;
    try {
      scans += 1;
      const r = await semanticSanitize(messages, { difficulty, statData:getStatData?.() || {}, runtimeState:getRuntimeState?.() || {} });
      sanitized += r.changed || 0;
      report = r.report || null;
      onAudit?.({ type:'prompt-source', difficulty, changed:r.changed || 0, report });
    } catch (error) {
      console.warn('[QBCC Runtime] semantic final source audit failed; core fallback remains active', error);
    }

    appendAuthority(messages, {
      difficulty,
      sandboxTest:sandboxTest?.() === true,
      statData:getStatData?.() || {},
      runtimeState:getRuntimeState?.() || {},
    });

    const nextInit = { ...init, body:JSON.stringify(payload) };
    return upstream(input, nextInit);
  };

  const controller = {
    stop() { stopped = true; try { if (host.fetch === wrapped) host.fetch = upstream; } catch {} },
    diagnostics() { return { armed:!stopped, scans, sanitized }; },
  };
  wrapped.__qbccFinalRequestGate = true;
  wrapped.__qbccController = controller;
  wrapped.__qbccUpstream = upstream;
  host.fetch = wrapped;
  console.info('[QBCC Runtime] FINAL REQUEST semantic source/preset/persona/worldbook gate armed');
  return controller;
}
