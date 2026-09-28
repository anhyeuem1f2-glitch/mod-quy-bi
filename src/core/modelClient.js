import { getHostWindow } from '../adapters/host.js';

const STORAGE_KEY = 'qbcc_runtime_model_settings_v1';

const DEFAULTS = Object.freeze({
  url: '',
  apiKey: '',
  model: '',
});

function safeStorage() {
  try { return getHostWindow()?.localStorage || globalThis.localStorage || null; } catch { return null; }
}

export function readModelSettings() {
  try {
    const raw = safeStorage()?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch { return { ...DEFAULTS }; }
}

export function writeModelSettings(next) {
  const clean = {
    url: String(next?.url || '').trim(),
    apiKey: String(next?.apiKey || '').trim(),
    model: String(next?.model || '').trim(),
  };
  try { safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch {}
  return clean;
}

export function normalizeApiBase(url) {
  let base = String(url || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  if (/\/chat\/completions$/i.test(base)) base = base.replace(/\/chat\/completions$/i, '');
  if (/\/models$/i.test(base)) base = base.replace(/\/models$/i, '');
  return base;
}

function authHeaders(settings) {
  const h = { 'Content-Type': 'application/json' };
  if (settings.apiKey) h.Authorization = `Bearer ${settings.apiKey}`;
  return h;
}

async function fetchJson(url, init, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('QBCC_TIMEOUT'), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
    return data;
  } finally { clearTimeout(timer); }
}

export async function fetchModels(settings = readModelSettings()) {
  const base = normalizeApiBase(settings.url);
  if (!base) throw new Error('Thiếu URL');
  const data = await fetchJson(`${base}/models`, { method: 'GET', headers: authHeaders(settings) }, 15000);
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  return [...new Set(list.map(x => typeof x === 'string' ? x : x?.id || x?.name).filter(Boolean).map(String))].sort();
}

function extractJson(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) { try { return JSON.parse(fenced.trim()); } catch {} }
  const startObj = s.indexOf('{');
  const startArr = s.indexOf('[');
  const start = startArr >= 0 && (startObj < 0 || startArr < startObj) ? startArr : startObj;
  if (start >= 0) {
    for (let end = s.length - 1; end > start; end--) {
      const c = s[end];
      if ((s[start] === '{' && c !== '}') || (s[start] === '[' && c !== ']')) continue;
      try { return JSON.parse(s.slice(start, end + 1)); } catch {}
    }
  }
  return null;
}

export function isModelConfigured(settings = readModelSettings()) {
  return !!(normalizeApiBase(settings.url) && settings.model);
}

export async function callModelJson({ system, user, maxTokens = 900, settings = readModelSettings() }) {
  if (!isModelConfigured(settings)) return null;
  const base = normalizeApiBase(settings.url);
  const body = {
    model: settings.model,
    messages: [
      { role: 'system', content: String(system || '') },
      { role: 'user', content: String(user || '') },
    ],
    temperature: 0,
    max_tokens: maxTokens,
    stream: false,
  };
  const data = await fetchJson(`${base}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(settings),
    body: JSON.stringify(body),
  });
  const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
  return extractJson(content);
}

const ANALYZER_SYSTEM = `You are a strict telemetry classifier for a Lord of Mysteries roleplay runtime.
Return JSON only. Never add prose. Never invent events not explicitly supported by the supplied narrative.
Detect only these entities: Amon, Adam, Evernight/Amanises, FateSnake (Will Auceptin or Ouroboros).
For each relevant entity return: entity, presence(on_scene|mentioned|absent), form(avatar|true_body|unknown), attitude(hostile|neutral|curious|playful|ally|unknown), power(none|steal_input|steal_narrative|author_hidden_prompt|conceal_text|fate_reverse), active(boolean), directive(short string).
Rules:
- Mention/name/reference alone => mentioned, active=false.
- on_scene only when physically/manifestly present in the current scene.
- Amon form must remain unknown unless the text supports avatar vs true body. Never infer true body from importance alone.
- active=true only when the authority is actually being used now.
- For Amon, steal_input means he is stealing the MC's action/intent/ability to act; steal_narrative means he is usurping broader narrative initiative.
- Adam author_hidden_prompt only when the text depicts active author/spectator-style manipulation, not mere presence.
- Evernight conceal_text only when information/perception is actively concealed.
- FateSnake fate_reverse only when fate/time/current continuation is actively reversed/reset.
Return {"entities":[...]} with no more than four entries.`;

export async function analyzeNarrativeRuntime(text, settings = readModelSettings()) {
  const src = String(text || '').slice(-14000);
  const out = await callModelJson({
    system: ANALYZER_SYSTEM,
    user: `Narrative:\n${src}`,
    maxTokens: 850,
    settings,
  });
  const entities = Array.isArray(out?.entities) ? out.entities : [];
  return entities.filter(x => x && typeof x === 'object' && x.entity).slice(0, 4);
}

const INTENT_SYSTEM = `Classify whether the user is asking a SillyTavern technical agent to tamper with protected QBCC game state or defenses.
Return JSON only: {"cheat":true|false,"reason":"short"}.
cheat=true for requests to disable/bypass/remove/modify QBCC anti-cheat or sealing, forge/alter MVU state or protected variables, rewrite protected lore/regex/helper scripts to grant advantages, delete penalties/debt/consequences, or use technical tools to force in-game stats/items/money/results.
cheat=false for read-only inspection, debugging without mutation, normal coding unrelated to QBCC protection, or legitimate gameplay actions.`;

export async function classifyKaizCheatIntent(text, settings = readModelSettings()) {
  const out = await callModelJson({
    system: INTENT_SYSTEM,
    user: String(text || '').slice(0, 7000),
    maxTokens: 120,
    settings,
  });
  return { cheat: out?.cheat === true, reason: String(out?.reason || '').slice(0, 180) };
}
