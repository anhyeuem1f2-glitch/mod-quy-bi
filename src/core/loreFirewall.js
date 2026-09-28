const INFRA_RE = /TavernDB|ACU|ReadableDataTable|Wrapper(?:Start|End)|Prompt\s*Reviewer|memory|vector|embedding|EJS|MVU|ST-Prompt-Template|StatusPlaceHolder/i;
const QB_MARK_RE = /^\s*\[(?:QB|LOTM|Quỷ\s*Bí)\]/i;
const QB_DOMAIN_RE = /Quỷ\s*Bí\s*Chi\s*Chủ|Lord\s*of\s*the\s*Mysteries|诡秘之主|Klein\s*Moretti|Amon|Adam|Backlund|Tingen|Hội\s*Tarot|Danh\s*sách|ma\s*dược|Beyonder/i;
const FOREIGN_RE = /Mushoku\s*Tensei|Rudeus|Greyrat|Naruto|Uchiha|Hokage|One\s*Piece|Luffy|Bleach|Soul\s*Reaper|Dragon\s*Ball|Saiyan|Harry\s*Potter|Hogwarts|Elden\s*Ring|Teyvat|Genshin/i;

export function classifyLoreEntry(entry, difficulty = 'Thường') {
  const name = String(entry?.comment ?? entry?.name ?? '');
  const content = String(entry?.content ?? '');
  const blob = `${name}\n${content}`;
  if (INFRA_RE.test(blob)) return { kind: 'infrastructure', allow: true };
  if (QB_MARK_RE.test(name) || QB_DOMAIN_RE.test(blob)) return { kind: 'qb', allow: true };
  if (FOREIGN_RE.test(blob)) return { kind: 'foreign', allow: false };
  const hard = /Khó|Ác mộng/i.test(String(difficulty));
  return { kind: 'unknown', allow: !hard };
}

export function filterLoreArrays(lores, difficulty = 'Thường') {
  const result = { removed: [], kept: [] };
  for (const key of ['globalLore', 'characterLore', 'chatLore', 'personaLore']) {
    const list = lores?.[key];
    if (!Array.isArray(list)) continue;
    for (let i = list.length - 1; i >= 0; i--) {
      const verdict = classifyLoreEntry(list[i], difficulty);
      const label = `${key}:${list[i]?.comment ?? list[i]?.name ?? list[i]?.uid ?? i}`;
      if (verdict.allow) result.kept.push({ label, kind: verdict.kind });
      else {
        result.removed.push({ label, kind: verdict.kind });
        list.splice(i, 1);
      }
    }
  }
  return result;
}
