const RE = /<QB_HIDE>([\s\S]*?)<\/QB_HIDE>/gi;

function redactElement(el) {
  if (!el || typeof el.innerHTML !== 'string' || !el.innerHTML.includes('QB_HIDE')) return;
  el.innerHTML = el.innerHTML.replace(RE, (_m, inner) => {
    const len = Math.max(4, Math.min(24, String(inner).replace(/<[^>]+>/g, '').length));
    return `<span class="qbcc-concealed" title="Concealed by Evernight">${'█'.repeat(len)}</span>`;
  });
}

export function installDomRedactor() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const scan = root => {
    try {
      if (root?.matches?.('.mes_text')) redactElement(root);
      root?.querySelectorAll?.('.mes_text')?.forEach(redactElement);
    } catch {}
  };
  scan(document);
  const ob = new MutationObserver(mutations => {
    for (const m of mutations) for (const node of m.addedNodes || []) if (node?.nodeType === 1) scan(node);
  });
  ob.observe(document.body, { childList: true, subtree: true });
  return () => ob.disconnect();
}
