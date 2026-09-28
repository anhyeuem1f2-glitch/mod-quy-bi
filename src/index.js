import { VERSION } from './config.js';
import { createTavernApi } from './adapters/tavernHelper.js';
import { installDomRedactor } from './adapters/domRedactor.js';
import { sanitizeUserContent } from './core/anticheat.js';
import { readDifficulty, isHardMode } from './core/difficulty.js';
import { filterLoreArrays } from './core/loreFirewall.js';
import { scanEntityMentions } from './core/presence.js';
import { parseRuntimeBlocks, stripRuntimeBlocks } from './core/tags.js';
import { readStoredState, writeStoredState } from './core/runtimeState.js';
import { updateAmonState } from './entities/amon.js';
import { updateAdamState } from './entities/adam.js';
import { updateEvernightState } from './entities/evernight.js';
import { updateFateSnakeState, shouldForceReroll } from './entities/fateSnake.js';
import { applyHardModeToChat, applyHardModeToTextPrompt } from './hardmode/director.js';
import { activateKaizAmon, ensureKaizAmonApplied, restoreKaizAmon, installKaizTripwire, isKaizInstalled } from './integrations/kaizAmon.js';
import { analyzeNarrativeRuntime, classifyKaizCheatIntent, readModelSettings } from './core/modelClient.js';
import { installSettingsPanel, focusSettingsPanel } from './ui/settingsPanel.js';
import { installInputAuthorityGate } from './core/inputAuthority.js';

const INSTANCE_KEY = '__QBCC_RUNTIME_COMPANION__';

class QbccRuntimeCompanion {
  constructor(api = createTavernApi()) {
    this.api = api;
    this.state = readStoredState(api);
    this.difficulty = 'Thường';
    this.statData = {};
    this.bound = [];
    this.stopRedactor = () => {};
    this.kaizTripwire = null;
    this.lastSealIntervention = 0;
    this.stopSettingsPanel = () => {};
    this.stopInputAuthority = () => {};
  }

  refreshContext() {
    const latest = this.api.getLatestMvuData();
    this.statData = latest?.data?.stat_data || {};
    this.difficulty = readDifficulty(this.statData);
    return latest;
  }

  async persist() { await writeStoredState(this.api, this.state); }

  sanitizePromptChat(chat) {
    if (!Array.isArray(chat)) return;
    for (const m of chat) {
      if (!m || typeof m.content !== 'string') continue;
      if (m.role === 'user') m.content = sanitizeUserContent(m.content);
      else m.content = stripRuntimeBlocks(m.content, { preserveHiddenContent: true });
    }
  }

  async triggerKaizAmon(reason) {
    try {
      if (this.state?.kaizAmon?.awakened) {
        ensureKaizAmonApplied(this.state);
        return false;
      }
      if (!activateKaizAmon(this.state, reason)) return false;
      await this.persist();
      this.api.toast('warning', 'Một tiếng cười rất khẽ vang lên. Trợ lý Kaiz vẫn ở đó... chỉ là bên mắt phải có thêm một chiếc kính một mắt.');
      return true;
    } catch (error) { console.error('[QBCC Runtime] Kaiz-Amon trigger', error); return false; }
  }

  evaluateKaizSealSignal(reason = 'protected mutation') {
    try {
      if (!this.kaizTripwire?.isLikelyKaizActive?.()) return false;
      this.refreshContext();
      const np = this.statData?._Niêm_phong || {};
      const current = Number(np.Can_thiệp || 0);
      const increased = current > this.lastSealIntervention;
      this.lastSealIntervention = Math.max(this.lastSealIntervention, current);
      const integrityBad = globalThis.QBCC_GUARD?.state?.integrity?.ok === false;
      if (increased || integrityBad) {
        void this.triggerKaizAmon(`${reason}${increased ? '; seal intervention increased' : ''}${integrityBad ? '; card integrity changed' : ''}`);
        return true;
      }
    } catch {}
    return false;
  }

  onProtectedMutationEvent = () => {
    try {
      if (!this.kaizTripwire?.isLikelyKaizActive?.()) return;
      setTimeout(() => {
        this.kaizTripwire?.inspectIntegrity?.();
        this.evaluateKaizSealSignal('Kaiz-active protected asset edit');
      }, 900);
    } catch {}
  };

  onPromptReady = ev => {
    try {
      if (!ev || !Array.isArray(ev.chat)) return;
      this.refreshContext();
      ensureKaizAmonApplied(this.state);
      this.sanitizePromptChat(ev.chat);
      applyHardModeToChat(ev.chat, {
        difficulty: this.difficulty,
        statData: this.statData,
        runtimeState: this.state,
      });
    } catch (error) { console.error('[QBCC Runtime] prompt hook', error); }
  };

  onTextPromptReady = res => {
    try {
      if (!res || typeof res.prompt !== 'string') return;
      this.refreshContext();
      ensureKaizAmonApplied(this.state);
      res.prompt = stripRuntimeBlocks(res.prompt, { preserveHiddenContent: true });
      res.prompt = applyHardModeToTextPrompt(res.prompt, {
        difficulty: this.difficulty,
        statData: this.statData,
        runtimeState: this.state,
      });
    } catch (error) { console.error('[QBCC Runtime] text prompt hook', error); }
  };

  onWorldInfoLoaded = lores => {
    try {
      this.refreshContext();
      const result = filterLoreArrays(lores, this.difficulty);
      if (result.removed.length) console.info('[QBCC Runtime] lore firewall removed:', result.removed);
    } catch (error) { console.error('[QBCC Runtime] lore firewall', error); }
  };

  async processAssistantMessage(id, message) {
    const text = String(message?.message ?? message?.mes ?? message?.content ?? '');
    if (!text || message?.role === 'user') return;
    let blocks = parseRuntimeBlocks(text);
    const mentions = scanEntityMentions(text);

    // In Hard/Nightmare, the optional external model can classify entity presence/form/power
    // when the main RP model omitted QB_RUNTIME telemetry or left Amon unresolved.
    if (isHardMode(this.difficulty)) {
      const needsModelScan = !blocks.length || (mentions.amon?.likelyOnScene && !blocks.some(b => /amon|阿蒙/i.test(String(b.entity || ''))));
      if (needsModelScan) {
        try {
          const inferred = await analyzeNarrativeRuntime(text);
          if (inferred?.length) blocks = [...blocks, ...inferred];
        } catch (error) { console.debug('[QBCC Runtime] external analyzer skipped:', error?.message || error); }
      }
    }

    for (const block of blocks) {
      const entity = String(block.entity || '').toLowerCase();
      if (/amon|阿蒙/.test(entity)) this.state.amon = updateAmonState(this.state.amon, block);
      else if (/adam|亚当/.test(entity)) this.state.adam = updateAdamState(this.state.adam, block);
      else if (/evernight|amanises|đêm\s*tối|黑夜|阿曼妮西斯/.test(entity)) this.state.evernight = updateEvernightState(this.state.evernight, block);
      else if (/fatesnake|will|ouroboros|rắn|乌洛琉斯|威尔/.test(entity)) this.state.fateSnake = updateFateSnakeState(this.state.fateSnake, block);
    }

    if (mentions.amon.likelyOnScene && !blocks.some(b => /amon|阿蒙/i.test(String(b.entity || '')))) {
      this.state.amon = { ...this.state.amon, presence: 'on_scene', form: 'unknown', needsClassification: true };
    }

    this.state.lastAssistantId = id;
    this.refreshContext();
    await this.persist();

    if (isHardMode(this.difficulty) && shouldForceReroll(this.state.fateSnake)) {
      if (this.state.reroll.messageId !== id) this.state.reroll = { messageId: id, count: 0 };
      if (this.state.reroll.count < 1) {
        this.state.reroll.count += 1;
        this.state.fateSnake.active = false; // consume once; new generation may reactivate it.
        await this.persist();
        setTimeout(() => this.api.reroll(), 80);
      }
    }
  }

  onAssistantEvent = async (...args) => {
    try {
      let id = -1;
      let message = null;
      for (const a of args) {
        if (typeof a === 'number' && id < 0) id = a;
        else if (a && typeof a === 'object' && !message) message = a;
      }
      if (!message || id < 0) {
        const last = this.api.lastMessage();
        id = last.id;
        message = last.message;
      }
      if (id === this.state.lastAssistantId && !parseRuntimeBlocks(String(message?.message || '')).length) return;
      await this.processAssistantMessage(id, message);
    } catch (error) { console.error('[QBCC Runtime] assistant scan', error); }
  };

  onChatChanged = async () => {
    try { restoreKaizAmon(this.state); } catch {}
    this.state = readStoredState(this.api);
    this.refreshContext();
    this.lastSealIntervention = Number(this.statData?._Niêm_phong?.Can_thiệp || 0);
    ensureKaizAmonApplied(this.state);
  };

  async start() {
    // Settings must be available immediately, even while MVU is still booting.
    this.stopSettingsPanel = installSettingsPanel({ toast: (kind, msg) => this.api.toast(kind, msg), version: VERSION });
    this.stopInputAuthority = installInputAuthorityGate({ onSanitized: () => this.api.toast('warning', 'Đã lọc lệnh can thiệp trực tiếp khỏi input.') });
    console.info(`[QBCC Runtime] settings UI installed; waiting for MVU...`);
    await this.api.waitForMvu();
    this.refreshContext();
    this.state = readStoredState(this.api);
    this.stopRedactor = installDomRedactor();
    this.lastSealIntervention = Number(this.statData?._Niêm_phong?.Can_thiệp || 0);
    this.kaizTripwire = installKaizTripwire({
      onTrigger: reason => void this.triggerKaizAmon(reason),
      onIntentCheck: text => classifyKaizCheatIntent(text),
    });
    ensureKaizAmonApplied(this.state);

    this.api.onEvent('WORLDINFO_ENTRIES_LOADED', this.onWorldInfoLoaded, 'first');
    this.api.onEvent('CHAT_COMPLETION_PROMPT_READY', this.onPromptReady, 'last');
    this.api.onEvent('GENERATE_AFTER_COMBINE_PROMPTS', this.onTextPromptReady, 'last');
    this.api.onEvent('CHAT_CHANGED', this.onChatChanged, 'on');
    this.api.onEvent('WORLDINFO_UPDATED', this.onProtectedMutationEvent, 'on');
    this.api.onEvent('CHARACTER_EDITED', this.onProtectedMutationEvent, 'on');
    const post = this.api.onFirstAvailable(
      ['MESSAGE_RECEIVED', 'CHARACTER_MESSAGE_RENDERED', 'GENERATION_ENDED', 'GENERATION_STOPPED', 'MESSAGE_SWIPED'],
      this.onAssistantEvent,
    );
    console.info(`[QBCC Runtime] v${VERSION} enabled. assistant-event=${post || 'fallback only'}`);
    return this;
  }

  diagnostics() {
    return {
      version: VERSION,
      difficulty: this.difficulty,
      statLoaded: !!Object.keys(this.statData || {}).length,
      kaizInstalled: isKaizInstalled(),
      model: (() => { const m = readModelSettings(); return { url: m.url, model: m.model, configured: !!(m.url && m.model) }; })(),
      state: JSON.parse(JSON.stringify(this.state)),
    };
  }
}

console.info(`[QBCC Runtime] module evaluated v${VERSION}`);

if (!globalThis[INSTANCE_KEY]) {
  const instance = new QbccRuntimeCompanion();
  globalThis[INSTANCE_KEY] = instance;
  globalThis.QBCC_RUNTIME = {
    version: VERSION,
    diagnostics: () => instance.diagnostics(),
    rescanLast: () => instance.onAssistantEvent(),
    triggerKaizAmon: reason => instance.triggerKaizAmon(reason || 'manual test'),
    releaseKaizAmon: async () => { restoreKaizAmon(instance.state); instance.state.kaizAmon = { awakened:false, reason:'', triggeredAt:0, lastAppliedAt:0, introPending:false, snapshot:null }; await instance.persist(); return true; },
    openSettings: () => focusSettingsPanel(),
    get state() { return instance.state; },
  };
  void instance.start();
}

export { QbccRuntimeCompanion };
