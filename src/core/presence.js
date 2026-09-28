import { ENTITY_CONFIG } from '../config.js';

function hasAlias(text, aliases) {
  const src = String(text ?? '').toLowerCase();
  return aliases.some(a => src.includes(String(a).toLowerCase()));
}

function nearHint(text, aliases, hints) {
  const src = String(text ?? '').toLowerCase();
  for (const alias of aliases) {
    const needle = String(alias).toLowerCase();
    let idx = src.indexOf(needle);
    while (idx >= 0) {
      const win = src.slice(Math.max(0, idx - 180), Math.min(src.length, idx + needle.length + 220));
      if (hints.some(h => win.includes(String(h).toLowerCase()))) return true;
      idx = src.indexOf(needle, idx + needle.length);
    }
  }
  return false;
}

export function scanEntityMentions(text) {
  const result = {};
  for (const [key, cfg] of Object.entries(ENTITY_CONFIG)) {
    const mentioned = hasAlias(text, cfg.aliases);
    result[key] = {
      mentioned,
      likelyOnScene: mentioned && nearHint(text, cfg.aliases, cfg.onSceneHints || []),
    };
  }
  return result;
}
