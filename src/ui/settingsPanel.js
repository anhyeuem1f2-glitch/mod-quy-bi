import { fetchModels, readModelSettings, writeModelSettings } from '../core/modelClient.js';

const ROOT_ID = 'qbcc-runtime-settings-root';
const STYLE_ID = 'qbcc-runtime-settings-style';

function css() {
  return `
#qbcc-runtime-settings-btn{position:fixed;right:14px;bottom:76px;z-index:2147482000;width:38px;height:38px;border-radius:50%;border:1px solid rgba(125,165,220,.55);background:#111a28;color:#e6eef9;font-weight:700;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.35)}
#qbcc-runtime-settings-root{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.48)}
#qbcc-runtime-settings-root.open{display:flex}
#qbcc-runtime-settings-panel{width:min(440px,calc(100vw - 28px));background:#10151f;border:1px solid #334055;border-radius:12px;padding:15px;box-shadow:0 20px 70px rgba(0,0,0,.55);color:#eef3fa;font-family:system-ui,sans-serif}
#qbcc-runtime-settings-panel .qbcc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-weight:700}
#qbcc-runtime-settings-panel .qbcc-x{border:0;background:transparent;color:#ddd;font-size:22px;cursor:pointer}
#qbcc-runtime-settings-panel input,#qbcc-runtime-settings-panel select{box-sizing:border-box;width:100%;height:38px;margin:5px 0 10px;border:1px solid #39465b;border-radius:8px;background:#0a0f17;color:#eef3fa;padding:0 10px;outline:none}
#qbcc-runtime-settings-panel label{font-size:12px;color:#b8c3d4}
#qbcc-runtime-settings-panel .qbcc-row{display:flex;gap:8px;align-items:center}
#qbcc-runtime-settings-panel .qbcc-row select{margin-bottom:5px;flex:1}
#qbcc-runtime-settings-panel button.qbcc-action{height:38px;border:1px solid #445a77;border-radius:8px;background:#18283e;color:#eef3fa;padding:0 13px;cursor:pointer;white-space:nowrap}
#qbcc-runtime-settings-panel .qbcc-save{width:100%;margin-top:8px;background:#1c3554!important}
#qbcc-runtime-settings-status{min-height:16px;font-size:11px;color:#9fb2ca;margin-top:4px}
`;
}

function el(id) { return document.getElementById(id); }

function ensureStyles() {
  if (el(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css();
  document.head.appendChild(style);
}

export function installSettingsPanel({ toast } = {}) {
  if (typeof document === 'undefined') return () => {};
  ensureStyles();
  if (el(ROOT_ID)) return () => {};

  const btn = document.createElement('button');
  btn.id = 'qbcc-runtime-settings-btn';
  btn.type = 'button';
  btn.textContent = 'QB';
  btn.title = 'QBCC Runtime';

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
<div id="qbcc-runtime-settings-panel">
  <div class="qbcc-head"><span>QBCC Runtime</span><button type="button" class="qbcc-x" id="qbcc-runtime-settings-close">×</button></div>
  <label>URL</label>
  <input id="qbcc-runtime-url" autocomplete="off" spellcheck="false" />
  <label>API Key</label>
  <input id="qbcc-runtime-api" type="password" autocomplete="off" spellcheck="false" />
  <label>Model</label>
  <div class="qbcc-row">
    <select id="qbcc-runtime-model"><option value=""></option></select>
    <button type="button" class="qbcc-action" id="qbcc-runtime-load-models">Tải model</button>
  </div>
  <input id="qbcc-runtime-model-manual" placeholder="Model" autocomplete="off" spellcheck="false" />
  <button type="button" class="qbcc-action qbcc-save" id="qbcc-runtime-save">Lưu</button>
  <div id="qbcc-runtime-settings-status"></div>
</div>`;
  document.body.append(btn, root);

  const url = el('qbcc-runtime-url');
  const api = el('qbcc-runtime-api');
  const model = el('qbcc-runtime-model');
  const manual = el('qbcc-runtime-model-manual');
  const status = el('qbcc-runtime-settings-status');

  function fill() {
    const s = readModelSettings();
    url.value = s.url || '';
    api.value = s.apiKey || '';
    manual.value = s.model || '';
    if (s.model && ![...model.options].some(o => o.value === s.model)) model.add(new Option(s.model, s.model));
    model.value = s.model || '';
  }
  function open() { fill(); root.classList.add('open'); }
  function close() { root.classList.remove('open'); }
  function save() {
    const chosen = String(model.value || manual.value || '').trim();
    writeModelSettings({ url: url.value, apiKey: api.value, model: chosen });
    if (chosen) manual.value = chosen;
    status.textContent = 'Đã lưu';
    toast?.('success', 'Đã lưu cấu hình model.');
  }

  btn.addEventListener('click', open);
  el('qbcc-runtime-settings-close').addEventListener('click', close);
  root.addEventListener('click', e => { if (e.target === root) close(); });
  el('qbcc-runtime-save').addEventListener('click', save);
  model.addEventListener('change', () => { if (model.value) manual.value = model.value; });
  manual.addEventListener('input', () => { if (manual.value !== model.value) model.value = ''; });
  el('qbcc-runtime-load-models').addEventListener('click', async () => {
    status.textContent = 'Đang tải...';
    const temp = { url: url.value, apiKey: api.value, model: manual.value || model.value };
    try {
      const models = await fetchModels(temp);
      const current = String(manual.value || model.value || '').trim();
      model.innerHTML = '<option value=""></option>';
      for (const name of models) model.add(new Option(name, name));
      if (current && !models.includes(current)) model.add(new Option(current, current));
      model.value = current;
      status.textContent = `${models.length} model`;
      if (!manual.value && models.length === 1) { manual.value = models[0]; model.value = models[0]; }
    } catch (e) {
      status.textContent = `Lỗi: ${e?.message || e}`;
    }
  });

  fill();
  return () => { btn.remove(); root.remove(); };
}
