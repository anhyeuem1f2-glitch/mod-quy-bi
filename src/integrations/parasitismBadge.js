import { getHostDocument, getHostMutationObserver } from '../adapters/host.js';

const ID = 'qbcc-amon-parasitism-badge';
const STYLE = 'qbcc-amon-parasitism-badge-style';

function ensureStyle(d) {
  if (!d || d.getElementById(STYLE)) return;
  const s = d.createElement('style');
  s.id = STYLE;
  s.textContent = `#${ID}{display:inline-flex;align-items:center;gap:4px;margin:4px 8px;padding:3px 8px;border:1px solid rgba(210,180,90,.75);border-radius:999px;background:rgba(26,22,16,.9);color:#e7cf79;font-size:11px;font-weight:700;box-shadow:0 0 8px rgba(231,207,121,.2)}#${ID}[hidden]{display:none!important}body.qbcc-amon-parasitized .mes[is_user="true"] .name_text::after,body.qbcc-amon-parasitized .mes.user_mes .name_text::after{content:" (BỊ KÝ SINH)";color:#e7cf79;font-size:.78em;font-weight:700;opacity:.95}`;
  d.head?.appendChild(s);
}

function hostForBadge(d) {
  return d?.querySelector?.('#send_form') || d?.querySelector?.('#form_sheld') || d?.body || null;
}

export function installParasitismBadge({ isActive } = {}) {
  const d = getHostDocument();
  const MO = getHostMutationObserver();
  if (!d) return { refresh() {}, stop() {} };
  ensureStyle(d);
  let stopped = false;
  let ob = null;
  const refresh = () => {
    if (stopped) return;
    let badge = d.getElementById(ID);
    const active = !!isActive?.();
    try { d.body?.classList?.toggle('qbcc-amon-parasitized', active); } catch {}
    if (!badge) {
      badge = d.createElement('span');
      badge.id = ID;
      badge.textContent = '◉ (BỊ KÝ SINH)';
      badge.title = 'Amon parasitism is active: user input is treated as thought, not direct body control.';
      hostForBadge(d)?.appendChild?.(badge);
    }
    badge.hidden = !active;
  };
  refresh();
  if (MO) {
    ob = new MO(() => refresh());
    ob.observe(d.documentElement || d.body, { childList:true, subtree:true });
  }
  return { refresh, stop() { stopped = true; ob?.disconnect?.(); try { d.body?.classList?.remove('qbcc-amon-parasitized'); } catch {} d.getElementById(ID)?.remove?.(); } };
}
