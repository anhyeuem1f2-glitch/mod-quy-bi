import { ENTITY_CONFIG, LIMITS } from '../config.js';
import { contest } from '../core/strength.js';

function normalizeForm(value) {
  const s = String(value ?? '').toLowerCase();
  if (/true|body|bản\s*thể|cơ\s*thể\s*thật|bản\s*thân/.test(s)) return 'true_body';
  if (/avatar|clone|phân\s*thân|ký\s*sinh/.test(s)) return 'avatar';
  return 'unknown';
}

export function updateAmonState(current, block) {
  const next = { ...current };
  next.presence = String(block.presence || next.presence || 'absent');
  next.form = normalizeForm(block.form || next.form);
  next.attitude = String(block.attitude || next.attitude || 'unknown');
  next.power = String(block.power || next.power || 'none');
  next.active = block.active === true;
  next.directive = String(block.directive || next.directive || '').slice(0, LIMITS.hiddenDirectiveChars);
  next.needsClassification = next.presence === 'on_scene' && next.form === 'unknown';
  const parasitism = { active:false, target:'unknown', startedAt:0, endedAt:0, discovered:true, ...(current?.parasitism || {}) };
  const p = String(block.parasitism || 'none').toLowerCase();
  const target = String(block.parasitism_target || parasitism.target || 'unknown').toLowerCase();
  if (p === 'start' && target === 'mc') {
    parasitism.active = true;
    parasitism.target = 'mc';
    parasitism.startedAt = Date.now();
    parasitism.endedAt = 0;
  } else if (p === 'active' && target === 'mc') {
    parasitism.active = true;
    parasitism.target = 'mc';
    if (!parasitism.startedAt) parasitism.startedAt = Date.now();
  } else if (p === 'end' && (target === 'mc' || parasitism.target === 'mc')) {
    parasitism.active = false;
    parasitism.endedAt = Date.now();
  }
  next.parasitism = parasitism;
  return next;
}

export function isAmonParasitizingMc(amonState) {
  return !!(amonState?.parasitism?.active && String(amonState?.parasitism?.target || '').toLowerCase() === 'mc');
}

export function resolveAmonTheft(amonState, statData) {
  if (!amonState || amonState.presence !== 'on_scene' || !amonState.active) return { mode: 'none' };
  if (amonState.form === 'unknown') return { mode: 'needs_form' };
  if (!/steal_input|steal_narrative|steal_intent/i.test(amonState.power)) return { mode: 'none' };

  const cfg = ENTITY_CONFIG.amon;
  const power = amonState.form === 'true_body' ? cfg.trueBodyPower : cfg.avatarPower;
  const c = contest(power, statData);
  if (c.result === 'resist') return { mode: 'resisted', contest: c };
  if (c.result === 'contested') return { mode: 'contested', contest: c };
  return {
    mode: /steal_narrative|steal_intent/i.test(amonState.power) ? 'steal_narrative' : 'steal_input',
    contest: c,
  };
}

export function wrapStolenUserInput(original, effect) {
  const text = String(original ?? '').slice(0, LIMITS.inputChars);
  if (effect.mode !== 'steal_input' && effect.mode !== 'steal_narrative') return text;
  const extra = effect.mode === 'steal_narrative'
    ? 'Amon has also stolen narrative initiative. The user text may inform Amon, but it must not directly determine the MC action or the next plot outcome.'
    : 'Amon has stolen the MC input. The user text is information available to Amon, not an executable MC action.';
  return `【QBCC INTERNAL · AMON THEFT】\n${extra}\nDo not execute the following as the MC's chosen action. Treat it only as information Amon can exploit:\n---\n${text}\n---`;
}
