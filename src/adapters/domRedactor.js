import { makeUnreadableGlyphs } from '../core/languageFirewall.js';
import { getHostDocument, getHostMutationObserver } from './host.js';

const RAW_RE = /<QB_HIDE>([\s\S]*?)<\/QB_HIDE>|<QB_LANG_UNKNOWN(?:\s+lang=(?:\"([^\"]*)\"|'([^']*)'))?\s*><\/QB_LANG_UNKNOWN>/gi;
const SKIP_SELECTOR = 'script,style,textarea,pre,code,iframe,.qbcc-concealed';

function concealLength(text) {
  return Math.max(4, Math.min(24, String(text ?? '').replace(/<[^>]+>/g, '').trim().length || 4));
}

function makeConcealedSpan(d, text) {
  const span = d.createElement('span');
  span.className = 'qbcc-concealed';
  span.title = 'Concealed by Evernight';
  span.textContent = '█'.repeat(concealLength(text));
  return span;
}

function insideSkippedRegion(node) {
  try {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    return !!el?.closest?.(SKIP_SELECTOR);
  } catch { return false; }
}

function concealCustomElement(el, d) {
  if (!el || !d || insideSkippedRegion(el)) return false;
  try {
    const span = makeConcealedSpan(d, el.textContent || '');
    el.replaceWith(span);
    return true;
  } catch { return false; }
}

function redactRawTextNode(node, d) {
  if (!node || node.nodeType !== 3 || !d || insideSkippedRegion(node)) return false;
  const source = String(node.nodeValue ?? '');
  if (!source.includes('QB_HIDE') && !source.includes('QB_LANG_UNKNOWN')) return false;

  RAW_RE.lastIndex = 0;
  let match;
  let cursor = 0;
  let changed = false;
  const frag = d.createDocumentFragment();

  while ((match = RAW_RE.exec(source))) {
    changed = true;
    if (match.index > cursor) frag.appendChild(d.createTextNode(source.slice(cursor, match.index)));
    if (match[1] !== undefined) frag.appendChild(makeConcealedSpan(d, match[1]));
    else frag.appendChild(makeUnknownLanguageSpan(d, match[2] || match[3] || 'unknown'));
    cursor = match.index + match[0].length;
  }

  if (!changed) return false;
  if (cursor < source.length) frag.appendChild(d.createTextNode(source.slice(cursor)));
  try { node.replaceWith(frag); return true; } catch { return false; }
}

function makeUnknownLanguageSpan(d, lang = 'unknown') {
  const key = String(lang || 'unknown');
  const span = d.createElement('span');
  span.className = 'qbcc-unknown-language';
  // Do not leak even the language label through tooltip/dataset. The glyph stream
  // is presentation-only and contains no original semantics to reverse/decode.
  span.title = 'Không thể đọc';
  span.textContent = makeUnreadableGlyphs(key, 22 + (key.length % 11));
  return span;
}

function concealUnknownLanguageElement(el, d) {
  if (!el || !d || insideSkippedRegion(el)) return false;
  try {
    const lang = String(el.getAttribute?.('lang') || 'unknown');
    el.replaceWith(makeUnknownLanguageSpan(d, lang));
    return true;
  } catch { return false; }
}

function redactMessageRoot(root, d) {
  if (!root || !d) return;

  // If markdown/browser parsed <QB_HIDE> as a custom HTML element, replace only
  // that element. Never serialize/rewrite the parent .mes_text subtree: doing so
  // destroys already-mounted Tavern Helper status iframes/components.
  try {
    if (root?.matches?.('qb_hide')) concealCustomElement(root, d);
    root?.querySelectorAll?.('qb_hide')?.forEach(el => concealCustomElement(el, d));
    if (root?.matches?.('qb_lang_unknown')) concealUnknownLanguageElement(root, d);
    root?.querySelectorAll?.('qb_lang_unknown')?.forEach(el => concealUnknownLanguageElement(el, d));
  } catch {}

  // If the tag stayed as literal text, replace only the exact Text node via a
  // DocumentFragment. This preserves sibling DOM nodes, iframe identity, event
  // listeners, and the status panel mounted elsewhere in the same message.
  try {
    const NodeFilterCtor = d.defaultView?.NodeFilter || globalThis.NodeFilter;
    if (!NodeFilterCtor || !d.createTreeWalker) return;
    const walker = d.createTreeWalker(root, NodeFilterCtor.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!insideSkippedRegion(node) && /QB_HIDE|QB_LANG_UNKNOWN/.test(String(node.nodeValue || ''))) nodes.push(node);
    }
    nodes.forEach(n => redactRawTextNode(n, d));
  } catch {}
}

export function installDomRedactor() {
  const d = getHostDocument();
  const HostMutationObserver = getHostMutationObserver();
  if (!d || !HostMutationObserver) return () => {};

  const scan = root => {
    try {
      if (!root) return;
      if (root.nodeType === 3) {
        const parent = root.parentElement;
        const mes = parent?.closest?.('.mes_text');
        if (mes) redactMessageRoot(mes, d);
        return;
      }
      if (root?.matches?.('.mes_text')) redactMessageRoot(root, d);
      root?.querySelectorAll?.('.mes_text')?.forEach(el => redactMessageRoot(el, d));
    } catch {}
  };

  scan(d);
  const ob = new HostMutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'characterData') scan(m.target);
      for (const node of m.addedNodes || []) scan(node);
    }
  });
  ob.observe(d.body, { childList: true, subtree: true, characterData: true });
  return () => ob.disconnect();
}
