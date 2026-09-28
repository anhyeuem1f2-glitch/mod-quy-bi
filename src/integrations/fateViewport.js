import { LIMITS } from '../config.js';
import { getHostDocument, getHostWindow } from '../adapters/host.js';

const SENTINEL_CLASS = 'qbcc-fate-viewport-sentinel';

function messageTextRoot(messageId) {
  const d = getHostDocument();
  if (!d) return null;
  return d.querySelector?.(`#chat .mes[mesid="${messageId}"] .mes_text`)
    || d.querySelector?.(`.mes[mesid="${messageId}"] .mes_text`)
    || null;
}

function normalizeQuote(q) {
  return String(q || '')
    .replace(/[*_`~>#\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findTextNode(root, quote) {
  if (!root) return null;
  const d = getHostDocument();
  const NodeFilterCtor = getHostWindow()?.NodeFilter || globalThis.NodeFilter;
  const walker = d?.createTreeWalker?.(root, NodeFilterCtor?.SHOW_TEXT ?? 4);
  if (!walker) return null;
  const candidates = [];
  let n;
  while ((n = walker.nextNode())) {
    const raw = String(n.nodeValue || '');
    if (raw.trim()) candidates.push({ node:n, raw });
  }
  const clean = normalizeQuote(quote);
  const probes = [String(quote || '').trim(), clean, clean.slice(0, 80), clean.slice(0, 48), clean.slice(0, 28)]
    .filter(x => x && x.length >= 8);
  for (const probe of probes) {
    for (const c of candidates) {
      let idx = c.raw.indexOf(probe);
      if (idx >= 0) return { node:c.node, offset:idx };
      const rawClean = c.raw.replace(/\s+/g, ' ');
      idx = rawClean.indexOf(probe);
      if (idx >= 0 && rawClean === c.raw) return { node:c.node, offset:idx };
    }
  }
  // Last-resort key phrases still place the trigger at the actual fate-action
  // line rather than at the top of a long message.
  const fallback = /(quay\s*ngược|khởi\s*động\s*lại|đảo\s*ngược|vận\s*mệnh|rewind|restart|fate)/i;
  for (const c of candidates) {
    const m = c.raw.match(fallback);
    if (m) return { node:c.node, offset:m.index || 0 };
  }
  return null;
}

function insertSentinel(root, quote, messageId) {
  const found = findTextNode(root, quote);
  if (!found) return null;
  try {
    const { node, offset } = found;
    const tail = offset > 0 ? node.splitText(offset) : node;
    const span = getHostDocument().createElement('span');
    span.className = SENTINEL_CLASS;
    span.dataset.qbccMessageId = String(messageId);
    span.setAttribute('aria-hidden', 'true');
    span.style.cssText = 'display:inline-block;width:1px;height:1em;opacity:0;pointer-events:none;vertical-align:baseline;';
    tail.parentNode?.insertBefore(span, tail);
    return span;
  } catch { return null; }
}

/**
 * Arms the Fate Snake only when the exact ability line reaches the user's
 * viewport. Once seen, the 10-second countdown continues even if the user
 * scrolls away, giving them time to finish the response before regeneration.
 */
export function armFateViewportReroll({ messageId, triggerQuote, delayMs = LIMITS.fateViewportDelayMs, onVisible, onFire } = {}) {
  let observer = null;
  let timer = null;
  let poll = null;
  let sentinel = null;
  let fired = false;
  let stopped = false;

  const cleanupObserver = () => {
    try { observer?.disconnect?.(); } catch {}
    observer = null;
    if (poll) clearInterval(poll);
    poll = null;
  };

  const startCountdown = () => {
    if (fired || stopped) return;
    fired = true;
    cleanupObserver();
    onVisible?.({ messageId, triggerQuote, delayMs });
    timer = setTimeout(() => {
      if (stopped) return;
      Promise.resolve(onFire?.({ messageId, triggerQuote })).catch(error => console.error('[QBCC Runtime] fate reroll fire failed', error));
    }, Math.max(0, Number(delayMs) || 10000));
  };

  const arm = () => {
    if (stopped || sentinel) return !!sentinel;
    const root = messageTextRoot(messageId);
    if (!root) return false;
    sentinel = insertSentinel(root, triggerQuote, messageId);
    if (!sentinel) return false;
    const IO = getHostWindow()?.IntersectionObserver || globalThis.IntersectionObserver;
    if (typeof IO === 'function') {
      observer = new IO(entries => {
        if (entries.some(e => e?.isIntersecting && (e.intersectionRatio ?? 1) > 0)) startCountdown();
      }, { root:null, threshold:0.01 });
      observer.observe(sentinel);
    } else {
      const check = () => {
        try {
          const r = sentinel.getBoundingClientRect();
          const h = getHostWindow()?.innerHeight || 0;
          if (r.bottom >= 0 && r.top <= h) startCountdown();
        } catch {}
      };
      getHostWindow()?.addEventListener?.('scroll', check, true);
      check();
      observer = { disconnect: () => getHostWindow()?.removeEventListener?.('scroll', check, true) };
    }
    return true;
  };

  if (!arm()) {
    let tries = 0;
    poll = setInterval(() => {
      tries += 1;
      if (arm() || tries > 80) cleanupObserver(); // up to ~20s waiting for render
    }, 250);
  }

  return () => {
    stopped = true;
    cleanupObserver();
    if (timer) clearTimeout(timer);
    timer = null;
    try { sentinel?.remove?.(); } catch {}
    sentinel = null;
  };
}
