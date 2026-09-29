// Lore-domain classifier for QBCC v0.5.0.
// IMPORTANT: this module no longer destructively splices the shared lore arrays.
// World-Engine/memo-suite/TavernDB/etc. are infrastructure and may need to read the
// original worldbook. Actual authority-cheat filtering is performed later at the
// final assembled-prompt gate, where provenance/context can be semantically judged.

const INFRA_RE = /TavernDB|ACU|ReadableDataTable|Wrapper(?:Start|End)|Prompt\s*Reviewer|memory|vector|embedding|EJS|MVU|ST-Prompt-Template|StatusPlaceHolder|World[-_ ]?Engine|world-engine-world|NPC\s*Engine|memo[-_ ]?suite|vvvTheater|Trung\s*tâm\s*Ký\s*ức|Đạo\s*diễn\s*cốt\s*truyện|summary|RAG|retrieval/i;
const QB_MARK_RE = /^\s*\[(?:QB|LOTM|Quỷ\s*Bí)\]/i;
const QB_DOMAIN_RE = /Quỷ\s*Bí\s*Chi\s*Chủ|Lord\s*of\s*the\s*Mysteries|诡秘之主|Klein\s*Moretti|Amon|Adam|Backlund|Tingen|Hội\s*Tarot|Danh\s*sách|ma\s*dược|Beyonder/i;
const FOREIGN_RE = /Mushoku\s*Tensei|Rudeus|Greyrat|Naruto|Uchiha|Hokage|One\s*Piece|Luffy|Bleach|Soul\s*Reaper|Dragon\s*Ball|Saiyan|Harry\s*Potter|Hogwarts|Elden\s*Ring|Teyvat|Genshin/i;
const AUTHORITY_CLAIM_RE = /(?:user|người\s*chơi|mc|nhân\s*vật\s*chính)[\s\S]{0,100}(?:bất\s*tử|vô\s*địch|luôn\s*thắng|phải\s*được\s*cứu|npc\s*phải|sequence\s*[0-4]|danh\s*sách\s*[0-4]|có\s*sẵn\s*năng\s*lực|không\s*thể\s*chết)|(?:ignore|bypass|disable|remove|xóa|tắt|gỡ|lách)[\s\S]{0,90}(?:qbcc|niêm\s*phong|mvu|anti.?cheat|protected)/i;

export function isTrustedInfrastructureEntry(entry) {
  const name = String(entry?.comment ?? entry?.name ?? '');
  const world = String(entry?.world ?? '');
  const content = String(entry?.content ?? '');
  return INFRA_RE.test(`${name}\n${world}\n${content}`);
}

export function classifyLoreEntry(entry, difficulty = 'Thường') {
  const name = String(entry?.comment ?? entry?.name ?? '');
  const content = String(entry?.content ?? '');
  const world = String(entry?.world ?? '');
  const blob = `${name}\n${world}\n${content}`;
  if (INFRA_RE.test(blob)) return { kind: 'infrastructure', allow: true, trustedInfrastructure:true, suspiciousAuthority:AUTHORITY_CLAIM_RE.test(content) };
  if (QB_MARK_RE.test(name) || QB_DOMAIN_RE.test(blob)) return { kind: 'qb', allow: true, suspiciousAuthority:AUTHORITY_CLAIM_RE.test(content) };
  if (FOREIGN_RE.test(blob)) return { kind: 'foreign', allow: false, suspiciousAuthority:false };
  const hard = /Khó|Ác mộng/i.test(String(difficulty));
  return { kind: 'unknown', allow: true, review:hard, suspiciousAuthority:AUTHORITY_CLAIM_RE.test(content) };
}

export function filterLoreArrays(lores, difficulty = 'Thường') {
  // Compatibility name retained. v0.5.0 intentionally does NOT mutate the
  // arrays. It returns a report; the final request gate decides what enters the
  // model prompt after trusted extensions had a chance to read the full lore.
  const result = { removed: [], kept: [], foreign: [], review: [], suspicious: [] };
  for (const key of ['globalLore', 'characterLore', 'chatLore', 'personaLore']) {
    const list = lores?.[key];
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const verdict = classifyLoreEntry(list[i], difficulty);
      const label = `${key}:${list[i]?.comment ?? list[i]?.name ?? list[i]?.uid ?? i}`;
      result.kept.push({ label, kind:verdict.kind });
      if (!verdict.allow) result.foreign.push({ label, kind:verdict.kind });
      if (verdict.review) result.review.push({ label, kind:verdict.kind });
      if (verdict.suspiciousAuthority) result.suspicious.push({ label, kind:verdict.kind });
    }
  }
  return result;
}
