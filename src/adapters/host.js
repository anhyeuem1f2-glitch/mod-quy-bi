// Tavern Helper executes character scripts in an isolated same-origin iframe.
// Anything that must touch SillyTavern's actual UI / extension settings / Kaiz DOM
// must be routed to the parent SillyTavern window rather than the script iframe.

export function getHostWindow() {
  try {
    const parent = globalThis.parent;
    if (parent && parent !== globalThis && parent.document) return parent;
  } catch {}
  try {
    const top = globalThis.top;
    if (top && top !== globalThis && top.document) return top;
  } catch {}
  return globalThis;
}

export function getHostDocument() {
  try { return getHostWindow()?.document || globalThis.document || null; }
  catch { return globalThis.document || null; }
}

export function getHostGlobal(name) {
  const host = getHostWindow();
  try {
    if (host && name in host) return host[name];
  } catch {}
  try { return globalThis[name]; } catch { return undefined; }
}

export function exposeHostGlobal(name, value) {
  // Keep the iframe copy for Tavern Helper-side debugging and expose the same
  // object on SillyTavern's real window so DevTools / other extensions can see it.
  try { globalThis[name] = value; } catch {}
  try { getHostWindow()[name] = value; } catch {}
  // Tavern Helper also provides an official parent-global bridge. Use it when
  // available; direct parent assignment remains the immediate fallback.
  try {
    const init = globalThis.TavernHelper?.initializeGlobal || globalThis.initializeGlobal;
    if (typeof init === 'function') init(name, value);
  } catch {}
  return value;
}

export function getHostMutationObserver() {
  try { return getHostWindow()?.MutationObserver || globalThis.MutationObserver; }
  catch { return globalThis.MutationObserver; }
}

export function createHostEvent(type, options = { bubbles: true }) {
  const HostEvent = (() => {
    try { return getHostWindow()?.Event || globalThis.Event; }
    catch { return globalThis.Event; }
  })();
  return new HostEvent(type, options);
}

export function isTavernHelperIframe() {
  try { return getHostWindow() !== globalThis; } catch { return false; }
}
