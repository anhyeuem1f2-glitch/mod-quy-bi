import { fetchModels, readModelSettings, writeModelSettings } from '../core/modelClient.js';
import { getHostDocument, getHostMutationObserver, getHostWindow } from '../adapters/host.js';

const ROOT_ID = 'qbcc-runtime-settings-root';
const SETTINGS_STYLE_ID = 'qbcc-runtime-settings-style';
// Official SillyTavern extension settings injection points. Tavern Helper runs
// this script in an iframe, so these selectors are always resolved in parent.
const HOST_CANDIDATES = ['#extensions_settings2', '#extensions_settings', '.extensions_settings'];

function doc() { return getHostDocument(); }
function el(id) { return doc()?.getElementById?.(id) || null; }

function css() {
  return `
#${ROOT_ID}{margin:0;width:100%;box-sizing:border-box}
#${ROOT_ID} .qbcc-runtime-header{cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;gap:10px}
#${ROOT_ID} .qbcc-runtime-title{display:flex;align-items:center;gap:8px;font-weight:700}
#${ROOT_ID} .qbcc-runtime-version{font-size:10px;opacity:.65;font-weight:600}
#${ROOT_ID} .qbcc-runtime-chevron{transition:transform .16s ease}
#${ROOT_ID}.qbcc-collapsed .qbcc-runtime-chevron{transform:rotate(-90deg)}
#${ROOT_ID}.qbcc-collapsed .qbcc-runtime-body{display:none}
#${ROOT_ID} .qbcc-runtime-body{padding:10px 8px 6px}
#${ROOT_ID} .qbcc-runtime-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#${ROOT_ID} .qbcc-runtime-field{min-width:0}
#${ROOT_ID} .qbcc-runtime-field.qbcc-full{grid-column:1 / -1}
#${ROOT_ID} label{display:block;margin:0 0 5px;font-size:12px;opacity:.82}
#${ROOT_ID} input,#${ROOT_ID} select{width:100%;box-sizing:border-box;min-height:36px}
#${ROOT_ID} .qbcc-runtime-model-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
#${ROOT_ID} .qbcc-runtime-actions{display:flex;gap:8px;align-items:center;margin-top:10px}
#${ROOT_ID} .qbcc-runtime-actions .menu_button{min-height:34px;display:flex;align-items:center;justify-content:center}
#${ROOT_ID} .qbcc-runtime-save{min-width:90px}
#${ROOT_ID} .qbcc-runtime-status{min-height:18px;font-size:11px;opacity:.72;display:flex;align-items:center}
@media(max-width:700px){#${ROOT_ID} .qbcc-runtime-grid{grid-template-columns:1fr}#${ROOT_ID} .qbcc-runtime-field.qbcc-full{grid-column:auto}}
`;
}

function ensureStyles() {
  const d = doc();
  if (!d || el(SETTINGS_STYLE_ID)) return;
  const style = d.createElement('style');
  style.id = SETTINGS_STYLE_ID;
  style.textContent = css();
  d.head.appendChild(style);
}

function findHost() {
  const d = doc();
  if (!d) return null;
  for (const selector of HOST_CANDIDATES) {
    const host = d.querySelector(selector);
    if (host) return host;
  }
  return null;
}

function createRoot(version = '') {
  const d = doc();
  const root = d.createElement('div');
  root.id = ROOT_ID;
  root.className = 'inline-drawer qbcc-collapsed';
  root.dataset.qbccVersion = String(version || '');
  root.innerHTML = `
<div class="inline-drawer-toggle inline-drawer-header qbcc-runtime-header">
  <div class="qbcc-runtime-title"><span>QBCC Runtime</span><span class="qbcc-runtime-version">v${String(version || '')}</span></div>
  <i class="fa-solid fa-circle-chevron-down inline-drawer-icon qbcc-runtime-chevron"></i>
</div>
<div class="inline-drawer-content qbcc-runtime-body">
  <div class="qbcc-runtime-grid">
    <div class="qbcc-runtime-field qbcc-full">
      <label for="qbcc-runtime-url">URL</label>
      <input id="qbcc-runtime-url" class="text_pole" autocomplete="off" spellcheck="false" />
    </div>
    <div class="qbcc-runtime-field qbcc-full">
      <label for="qbcc-runtime-api">API Key</label>
      <input id="qbcc-runtime-api" class="text_pole" type="password" autocomplete="off" spellcheck="false" />
    </div>
    <div class="qbcc-runtime-field qbcc-full">
      <label for="qbcc-runtime-model">Model</label>
      <div class="qbcc-runtime-model-row">
        <select id="qbcc-runtime-model" class="text_pole"><option value=""></option></select>
        <div id="qbcc-runtime-load-models" class="menu_button interactable" tabindex="0">Tải model</div>
      </div>
    </div>
  </div>
  <div class="qbcc-runtime-actions">
    <div id="qbcc-runtime-save" class="menu_button interactable qbcc-runtime-save" tabindex="0">Lưu</div>
    <div id="qbcc-runtime-settings-status" class="qbcc-runtime-status"></div>
  </div>
</div>`;
  return root;
}

export function installSettingsPanel({ toast, version = '' } = {}) {
  const d = doc();
  if (!d) return () => {};
  ensureStyles();

  let root = el(ROOT_ID);
  let observer = null;
  let disposed = false;

  function bind(currentRoot) {
    if (currentRoot.dataset.qbccBound === '1') return;
    currentRoot.dataset.qbccBound = '1';
    const url = currentRoot.querySelector('#qbcc-runtime-url');
    const api = currentRoot.querySelector('#qbcc-runtime-api');
    const model = currentRoot.querySelector('#qbcc-runtime-model');
    const status = currentRoot.querySelector('#qbcc-runtime-settings-status');
    const header = currentRoot.querySelector('.qbcc-runtime-header');
    const load = currentRoot.querySelector('#qbcc-runtime-load-models');
    const saveBtn = currentRoot.querySelector('#qbcc-runtime-save');

    function fill() {
      const s = readModelSettings();
      url.value = s.url || '';
      api.value = s.apiKey || '';
      if (s.model && ![...model.options].some(o => o.value === s.model)) model.add(new (getHostWindow().Option)(s.model, s.model));
      model.value = s.model || '';
    }

    function save() {
      const chosen = String(model.value || '').trim();
      writeModelSettings({ url: url.value, apiKey: api.value, model: chosen });
      status.textContent = 'Đã lưu';
      toast?.('success', 'Đã lưu cấu hình model.');
    }

    async function loadModels() {
      status.textContent = 'Đang tải...';
      const temp = { url: url.value, apiKey: api.value, model: model.value };
      try {
        const models = await fetchModels(temp);
        const current = String(model.value || readModelSettings().model || '').trim();
        model.innerHTML = '<option value=""></option>';
        const OptionCtor = getHostWindow().Option;
        for (const name of models) model.add(new OptionCtor(name, name));
        if (current && !models.includes(current)) model.add(new OptionCtor(current, current));
        model.value = current || (models.length === 1 ? models[0] : '');
        status.textContent = `${models.length} model`;
      } catch (e) {
        status.textContent = `Lỗi: ${e?.message || e}`;
      }
    }

    header?.addEventListener('click', () => currentRoot.classList.toggle('qbcc-collapsed'));
    saveBtn?.addEventListener('click', save);
    load?.addEventListener('click', loadModels);
    load?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadModels(); } });
    saveBtn?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); save(); } });
    fill();
  }

  function mount() {
    if (disposed) return false;
    const existing = el(ROOT_ID);
    if (existing) {
      const existingVersion = String(existing.dataset.qbccVersion || '').trim();
      if (existingVersion && existingVersion !== String(version || '')) {
        console.info(`[QBCC Runtime] removing stale settings panel v${existingVersion}; current=v${version}`);
        existing.remove();
      } else {
        root = existing;
        root.dataset.qbccVersion = String(version || '');
        const versionNode = root.querySelector('.qbcc-runtime-version');
        if (versionNode) versionNode.textContent = `v${String(version || '')}`;
        bind(root);
        return true;
      }
    }
    const host = findHost();
    if (!host) return false;
    root = createRoot(version);
    // Match the normal SillyTavern settings drawers (Kaiz/TTS/Regex style).
    host.appendChild(root);
    bind(root);
    console.info(`[QBCC Runtime] settings section mounted v${version} in parent SillyTavern Extensions panel`, host);
    return true;
  }

  if (!mount()) {
    const HostMutationObserver = getHostMutationObserver();
    if (HostMutationObserver) {
      observer = new HostMutationObserver(() => {
        if (mount()) { observer?.disconnect(); observer = null; }
      });
      observer.observe(d.documentElement || d.body, { childList: true, subtree: true });
    }
  }

  return () => {
    disposed = true;
    observer?.disconnect();
    el(ROOT_ID)?.remove();
  };
}

export function focusSettingsPanel() {
  const root = el(ROOT_ID);
  if (!root) return false;
  root.classList.remove('qbcc-collapsed');
  root.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => root.querySelector('#qbcc-runtime-url')?.focus?.(), 220);
  return true;
}
