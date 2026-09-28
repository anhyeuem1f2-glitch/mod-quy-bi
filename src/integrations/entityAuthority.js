import { createHostEvent, getHostDocument, getHostWindow } from '../adapters/host.js';

function getMainInput() {
  return getHostDocument()?.getElementById?.('send_textarea') || null;
}

function getSendButton() {
  return getHostDocument()?.getElementById?.('send_but') || null;
}

function isMainSend(ev) {
  try {
    const t = ev?.target;
    if (!t) return false;
    if (ev.type === 'click') return !!t.closest?.('#send_but');
    return ev.type === 'keydown' && t.id === 'send_textarea' && ev.key === 'Enter' && !ev.shiftKey;
  } catch { return false; }
}

function setInputValue(value) {
  const input = getMainInput();
  if (!input) return false;
  input.value = String(value ?? '');
  input.dispatchEvent(createHostEvent('input', { bubbles: true }));
  return true;
}

/**
 * Holds a normal SillyTavern send before the native handler when an active
 * high-level entity needs to author the turn. The callback may rewrite the
 * visible user input before the original send is replayed.
 */
export function installMainEntityAuthorityGate({ shouldHold, inspectTurn, onError } = {}) {
  const d = getHostDocument();
  if (!d) return () => {};
  let busy = false;
  let replaying = false;

  const capture = async ev => {
    if (replaying || busy || !isMainSend(ev)) return;
    let hold = false;
    try { hold = !!shouldHold?.(); } catch {}
    if (!hold) return;

    const input = getMainInput();
    const original = String(input?.value || '').trim();
    if (!original) return;

    ev.preventDefault?.();
    ev.stopPropagation?.();
    ev.stopImmediatePropagation?.();
    busy = true;

    try {
      const result = await inspectTurn?.(original);
      const visible = result && typeof result.visibleInput === 'string'
        ? result.visibleInput
        : original;
      // SillyTavern will not send an empty message. A stolen whole input is
      // represented visibly as an ellipsis while the original survives only
      // in QBCC's hidden system-authority payload.
      setInputValue(visible.trim() ? visible : '…');
    } catch (error) {
      console.error('[QBCC Runtime] main entity pre-send gate failed', error);
      onError?.(error);
      setInputValue(original);
    }

    // Replay exactly once through SillyTavern's own send path. During this
    // synthetic click our capture listener stands down so ST owns persistence,
    // UI rendering, regex and generation normally.
    try {
      replaying = true;
      const btn = getSendButton();
      if (btn?.click) btn.click();
      else {
        const inputEl = getMainInput();
        const KeyboardEventCtor = getHostWindow()?.KeyboardEvent || globalThis.KeyboardEvent;
        inputEl?.dispatchEvent?.(new KeyboardEventCtor('keydown', { key:'Enter', code:'Enter', bubbles:true, cancelable:true }));
      }
    } finally {
      setTimeout(() => { replaying = false; busy = false; }, 0);
    }
  };

  d.addEventListener('click', capture, true);
  d.addEventListener('keydown', capture, true);
  return () => {
    d.removeEventListener('click', capture, true);
    d.removeEventListener('keydown', capture, true);
  };
}
