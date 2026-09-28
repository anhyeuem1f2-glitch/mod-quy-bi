import { sanitizeUserContent } from './anticheat.js';

function getMainInput() {
  return document.getElementById('send_textarea');
}

function sanitizeMainInput() {
  try {
    const input = getMainInput();
    if (!input || typeof input.value !== 'string') return false;
    const before = input.value;
    const after = sanitizeUserContent(before);
    if (after === before) return false;
    input.value = after;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch { return false; }
}

function isMainSend(ev) {
  try {
    const t = ev?.target;
    if (!t) return false;
    if (ev.type === 'click') return !!t.closest?.('#send_but');
    return ev.type === 'keydown' && t.id === 'send_textarea' && ev.key === 'Enter' && !ev.shiftKey;
  } catch { return false; }
}

export function installInputAuthorityGate({ onSanitized } = {}) {
  if (typeof document === 'undefined') return () => {};
  const capture = ev => {
    if (!isMainSend(ev)) return;
    if (sanitizeMainInput()) onSanitized?.();
  };
  // Capture phase gives the runtime the earliest practical interception point
  // available to a Tavern Helper/browser-side runtime before normal ST handlers.
  document.addEventListener('click', capture, true);
  document.addEventListener('keydown', capture, true);
  return () => {
    document.removeEventListener('click', capture, true);
    document.removeEventListener('keydown', capture, true);
  };
}
