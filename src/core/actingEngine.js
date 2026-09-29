import { getHostWindow } from '../adapters/host.js';

function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

export function readActingState(statData) {
  const sf = obj(obj(obj(statData).Nhân_vật_chính).Siêu_phàm);
  return {
    pathway: String(sf.Con_đường || sf.Con_duong || '').trim(),
    sequence: Number.isFinite(Number(sf.Danh_sách)) ? Number(sf.Danh_sách) : 10,
    principles: obj(sf.Nguyên_tắc_sắm_vai || sf.Nguyen_tac_sam_vai),
  };
}

function currentCharacterData() {
  try {
    const ctx = getHostWindow()?.SillyTavern?.getContext?.();
    const ch = ctx?.characters?.[ctx?.characterId];
    return ch?.data || ch || {};
  } catch { return {}; }
}

export function findActingLore(statData) {
  const s = readActingState(statData);
  if (!s.pathway || s.sequence >= 10) return '';
  const d = currentCharacterData();
  const entries = d?.character_book?.entries || d?.data?.character_book?.entries || [];
  if (!Array.isArray(entries)) return '';
  const normalized = s.pathway.toLowerCase().replace(/\s+/g, '');
  const e = entries.find(x => {
    const c = String(x?.comment || x?.name || '');
    if (!/\[Sắm vai\]/i.test(c)) return false;
    const tail = c.replace(/^.*?\[Sắm vai\]\s*/i, '').toLowerCase().replace(/\s+/g, '');
    return tail && (tail === normalized || tail.includes(normalized) || normalized.includes(tail));
  });
  return String(e?.content || '').trim();
}

export function buildActingAuthority(statData) {
  const s = readActingState(statData);
  if (!s.pathway || s.sequence >= 10) return '';
  const lore = findActingLore(statData);
  const known = Object.keys(s.principles || {}).length ? JSON.stringify(s.principles) : '(none yet)';
  return `【QBCC ACTING / DIGESTION ROUTER】
Current Pathway: ${s.pathway}; Sequence: ${s.sequence}; already-realized acting principles in MVU: ${known}.
The following acting lore is narrator reference only; it does NOT automatically become MC knowledge:
${lore || '(No pathway-specific acting entry was found; do not invent a secret principle.)'}
Rules:
- If the MC merely behaves in accordance with the role without consciously realizing a principle, digestion may progress but do NOT add a new principle to MVU.
- Only when the narrative clearly establishes that the MC personally realizes/formulates a new acting principle may the assistant append the appropriate <UpdateVariable>/<JSONPatch> operation inserting that principle into Nhân_vật_chính.Siêu_phàm.Nguyên_tắc_sắm_vai.
- Never copy hidden narrator wording directly into MC knowledge. Avoid duplicates. On Pathway/Sequence change, use the new current role.`;
}
