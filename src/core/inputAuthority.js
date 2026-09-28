import { sanitizeUserContent } from './anticheat.js';
import { createHostEvent, getHostDocument } from '../adapters/host.js';

function getMainInput() {
  return getHostDocument()?.getElementById?.('send_textarea') || null;
}

function sanitizeMainInput() {
  try {
    const input = getMainInput();
    if (!input || typeof input.value !== 'string') return false;
    const before = input.value;
    const after = sanitizeUserContent(before);
    if (after === before) return false;
    input.value = after;
    input.dispatchEvent(createHostEvent('input', { bubbles: true }));
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
  const d = getHostDocument();
  if (!d) return () => {};
  const capture = ev => {
    if (!isMainSend(ev)) return;
    if (sanitizeMainInput()) onSanitized?.();
  };
  // Parent-document capture phase runs before SillyTavern's normal send handler.
  d.addEventListener('click', capture, true);
  d.addEventListener('keydown', capture, true);
  return () => {
    d.removeEventListener('click', capture, true);
    d.removeEventListener('keydown', capture, true);
  };
}
