import { strictSimulationEnabled } from './authorityPolicy.js';

function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

const BASELINE = new Set(['Loen', 'Tiếng Loen', 'Loen ngữ']);

export function collectKnownLanguages(statData) {
  const mc = obj(obj(statData).Nhân_vật_chính);
  const skills = obj(mc.Kỹ_năng || mc.Ky_nang);
  const out = new Map();
  for (const [name, raw] of Object.entries(skills)) {
    if (!/(ngữ|tiếng|language|Hermes|Feysac|Jotun|Cự Nhân|Tinh Linh|Rồng|Dutan|Cao Địa|Loen|Intis)/i.test(name)) continue;
    const level = typeof raw === 'string' ? raw : String(obj(raw).Mức || obj(raw).Muc || obj(raw).Cấp || obj(raw).level || raw || 'đã học');
    out.set(String(name), level);
  }
  for (const x of BASELINE) if (!out.has(x)) out.set(x, 'bản ngữ/mặc định nếu hồ sơ không nói khác');
  return [...out.entries()].map(([name, level]) => ({ name, level }));
}

export function buildLanguageAuthority({ difficulty, sandboxTest = false, statData = {} } = {}) {
  if (!strictSimulationEnabled(difficulty, sandboxTest)) return '';
  const langs = collectKnownLanguages(statData);
  const known = langs.length ? langs.map(x => `${x.name}(${x.level})`).join(', ') : 'Loen only unless verified otherwise';
  return `【QBCC HARD/NIGHTMARE · LANGUAGE FIREWALL】
Verified MC language skills: ${known}.
Language comprehension is a state/skill, not a USER privilege.
- If the MC has never learned the relevant language/script/ritual register, DO NOT output the semantic original, translation, phonetic clue, reversible cipher, parenthetical translation, or an OOC explanation that reconstructs it.
- Render the perceived content as an EMPTY semantic marker: <QB_LANG_UNKNOWN lang="LANG"></QB_LANG_UNKNOWN>. The runtime UI converts that marker into meaningless non-reversible glyph shapes. There must be NO recoverable original text inside the tag.
- Reading, speaking, writing and ritual competence are distinct. One does not imply the others.
- Reasoning/OOC decoding cannot bypass an unlearned language. Learning later may allow the MC to re-read a physical document still possessed, but old transcript gibberish does not retroactively decode itself.
- Chinese/Roselle diary remains unreadable to native inhabitants unless the character has a verified in-fiction reason to know it.`;
}

const GLYPH_SETS = [
  ['◬','⌁','⟟','⌖','⋔','⟁','⌇','⊹','⧗','⌬','⋇','⟒','⟐','◫','⧖'],
  ['𐌙','𐌗','𐌊','𐌑','𐌔','𐌚','𐌖','𐌂','𐌅','𐌇','𐌋'],
  ['ᚦ','ᛉ','ᚱ','ᚷ','ᛇ','ᛜ','ᚻ','ᛏ','ᚾ','ᛃ','ᛞ'],
  ['⌘','⍜','⌑','⌿','⍉','⋈','⎔','⌁','⟊','⏣','⌭'],
];

function hash(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text || '')) { h ^= ch.codePointAt(0) || 0; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function makeUnreadableGlyphs(lang = 'unknown', count = 22) {
  let h = hash(lang);
  const set = GLYPH_SETS[h % GLYPH_SETS.length];
  const n = Math.max(8, Math.min(40, Number(count) || 22));
  let out = '';
  for (let i = 0; i < n; i++) {
    h = Math.imul(h ^ (i + 0x9e3779b9), 2654435761) >>> 0;
    out += set[h % set.length];
    if (i > 3 && i % (4 + (h % 4)) === 0) out += ' ';
  }
  return out.trim();
}
