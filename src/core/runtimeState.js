import { CHAT_STATE_KEY, VERSION } from '../config.js';

export function defaultRuntimeState() {
  return {
    version: VERSION,
    lastAssistantId: -1,
    sandboxTest: false,
    amon: { presence: 'absent', form: 'unknown', attitude: 'unknown', power: 'none', active: false, directive: '', needsClassification: false, pendingTheft: null, lastTacticalDecision: null },
    adam: { presence: 'absent', attitude: 'unknown', power: 'none', active: false, directive: '', pendingDirective: null },
    evernight: { presence: 'absent', power: 'none', active: false },
    fateSnake: { presence: 'absent', power: 'none', active: false, triggerQuote: '', actor: '', pendingMessageId: -1 },
    reroll: { messageId: -1, count: 0 },
    kaizAmon: { awakened: false, takeover: false, reason: '', triggeredAt: 0, lastAppliedAt: 0, introPending: false, snapshot: null },
    diagnostics: [],
  };
}

export function normalizeRuntimeState(value) {
  const base = defaultRuntimeState();
  const v = value && typeof value === 'object' ? value : {};
  return {
    ...base,
    ...v,
    version: VERSION,
    amon: { ...base.amon, ...(v.amon || {}) },
    adam: { ...base.adam, ...(v.adam || {}) },
    evernight: { ...base.evernight, ...(v.evernight || {}) },
    fateSnake: { ...base.fateSnake, ...(v.fateSnake || {}) },
    reroll: { ...base.reroll, ...(v.reroll || {}) },
    kaizAmon: { ...base.kaizAmon, ...(v.kaizAmon || {}) },
  };
}

export function readStoredState(api) {
  try {
    const vars = api.getChatVariables?.() || {};
    return normalizeRuntimeState(vars[CHAT_STATE_KEY]);
  } catch {
    return defaultRuntimeState();
  }
}

export async function writeStoredState(api, state) {
  try {
    await api.setChatVariables?.({ [CHAT_STATE_KEY]: normalizeRuntimeState(state) });
  } catch (error) {
    console.warn('[QBCC Runtime] cannot persist runtime state', error);
  }
}
