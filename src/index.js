import { VERSION } from './config.js';
import { createTavernApi } from './adapters/tavernHelper.js';
import { installDomRedactor } from './adapters/domRedactor.js';
import { sanitizeUserContent } from './core/anticheat.js';
import { readDifficulty, isHardMode } from './core/difficulty.js';
import { filterLoreArrays } from './core/loreFirewall.js';
import { scanEntityMentions } from './core/presence.js';
import { parseRuntimeBlocks, stripRuntimeBlocks } from './core/tags.js';
import { readStoredState, writeStoredState } from './core/runtimeState.js';
import { updateAmonState, resolveAmonTheft } from './entities/amon.js';
import { updateAdamState, isAdamAuthoringActive } from './entities/adam.js';
import { updateEvernightState } from './entities/evernight.js';
import { updateFateSnakeState, shouldForceReroll } from './entities/fateSnake.js';
import { applyHardModeToChat, applyHardModeToTextPrompt } from './hardmode/director.js';
import { activateKaizAmon, ensureKaizAmonApplied, restoreKaizAmon, installKaizTripwire, installKaizDeepHijack, isKaizInstalled, hijackKaizTurnAsAmon } from './integrations/kaizAmon.js';
import { analyzeNarrativeRuntime, classifyKaizCheatIntent, decideAmonTurnAuthority, planAmonTheft, planAdamInfluence, readModelSettings } from './core/modelClient.js';
import { installSettingsPanel, focusSettingsPanel } from './ui/settingsPanel.js';
import { installInputAuthorityGate } from './core/inputAuthority.js';
import { installMainEntityAuthorityGate } from './integrations/entityAuthority.js';
import { armFateViewportReroll } from './integrations/fateViewport.js';
import { exposeHostGlobal, getHostWindow, isTavernHelperIframe } from './adapters/host.js';

const INSTANCE_KEY = '__QBCC_RUNTIME_COMPANION_V047__';
const LEGACY_INSTANCE_KEYS = [
  '__QBCC_RUNTIME_COMPANION__',
  '__QBCC_RUNTIME_COMPANION_V040__',
  '__QBCC_RUNTIME_COMPANION_V041__',
  '__QBCC_RUNTIME_COMPANION_V042__',
  '__QBCC_RUNTIME_COMPANION_V043__',
  '__QBCC_RUNTIME_COMPANION_V044__',
  '__QBCC_RUNTIME_COMPANION_V045__',
  '__QBCC_RUNTIME_COMPANION_V046__',
];

function disposeLegacyRuntime(instance, key = 'legacy') {
  if (!instance || typeof instance !== 'object') return;
  try { instance.__qbccSuperseded = true; } catch {}
  for (const fn of ['stopSettingsPanel', 'stopInputAuthority', 'stopEntityAuthority', 'stopFateViewport', 'stopRedactor']) {
    try { if (typeof instance[fn] === 'function') instance[fn](); } catch {}
  }
  try { instance.kaizTripwire?.stop?.(); } catch {}
  try { instance.kaizDeepHijack?.stop?.(); } catch {}
  try { console.info(`[QBCC Runtime] disposed stale runtime ${key}`); } catch {}
}

function purgeLegacyRuntimes(hostWindow) {
  for (const key of LEGACY_INSTANCE_KEYS) {
    let legacy = null;
    try { legacy = hostWindow?.[key] || globalThis?.[key] || null; } catch {}
    if (legacy) disposeLegacyRuntime(legacy, key);
    try { if (hostWindow && key in hostWindow) delete hostWindow[key]; } catch {}
    try { if (key in globalThis) delete globalThis[key]; } catch {}
  }
  try {
    const api = hostWindow?.QBCC_RUNTIME;
    if (api && api.version && api.version !== VERSION) delete hostWindow.QBCC_RUNTIME;
  } catch {}
  try {
    const d = hostWindow?.document;
    const root = d?.getElementById?.('qbcc-runtime-settings-root');
    const rv = String(root?.dataset?.qbccVersion || '').trim();
    if (root && rv && rv !== VERSION) root.remove();
  } catch {}
}

class QbccRuntimeCompanion {
  constructor(api = createTavernApi()) {
    this.api = api;
    this.state = readStoredState(api);
    this.difficulty = 'Thường';
    this.sandboxTest = false;
    this.statData = {};
    this.bound = [];
    this.stopRedactor = () => {};
    this.kaizTripwire = null;
    this.kaizDeepHijack = null;
    this.lastSealIntervention = 0;
    this.stopSettingsPanel = () => {};
    this.stopInputAuthority = () => {};
    this.stopEntityAuthority = () => {};
    this.stopFateViewport = () => {};
  }

  detectSandboxTestMode() {
    try {
      const hw = getHostWindow();
      const ctx = hw?.SillyTavern?.getContext?.();
      const char = ctx?.characters?.[ctx?.characterId];
      const d = char?.data || char || {};
      const scripts = d?.extensions?.tavern_helper?.scripts || char?.extensions?.tavern_helper?.scripts || [];
      if (Array.isArray(scripts) && scripts.some(x => /QBCC\s+Sandbox\s+Test\s+Override/i.test(String(x?.name || '')) && x?.enabled !== false && x?.disabled !== true)) return true;
      const entries = d?.character_book?.entries || char?.character_book?.entries || [];
      return Array.isArray(entries) && entries.some(e => {
        const c = `${e?.comment || ''}\n${e?.content || ''}`;
        return /QBCC[_\s-]*SANDBOX[_\s-]*TEST|\[QBCC TEST\]\s*Sandbox/i.test(c);
      });
    } catch { return false; }
  }

  entityAuthorityEnabled() {
    return isHardMode(this.difficulty) || this.sandboxTest === true;
  }

  refreshContext() {
    const latest = this.api.getLatestMvuData();
    this.statData = latest?.data?.stat_data || {};
    this.difficulty = readDifficulty(this.statData);
    this.sandboxTest = this.detectSandboxTestMode();
    if (this.state) this.state.sandboxTest = this.sandboxTest;
    return latest;
  }

  async persist() { await writeStoredState(this.api, this.state); }

  shouldHoldMainEntityTurn() {
    try {
      this.refreshContext();
      if (!this.entityAuthorityEnabled()) return false;
      const amon = this.state?.amon || {};
      const resolved = resolveAmonTheft(amon, this.statData);
      const activeTheft = ['steal_input','steal_narrative'].includes(resolved.mode);
      const amonCanDecideNow = amon.presence === 'on_scene' && amon.form !== 'unknown' && !/ally/i.test(String(amon.attitude || ''));
      return activeTheft || amonCanDecideNow || isAdamAuthoringActive(this.state?.adam);
    } catch { return false; }
  }

  async planMainEntityTurn(originalInput) {
    this.refreshContext();
    if (!this.entityAuthorityEnabled()) return { visibleInput: originalInput };
    const context = this.api.getRecentChatText?.(10) || '';
    let effectiveAmon = { ...(this.state?.amon || {}) };
    let amonEffect = resolveAmonTheft(effectiveAmon, this.statData);

    // Amon should not need the previous prose to spell out "he activates Theft" every
    // single turn. If he is physically on-scene and not allied, the auxiliary model gets
    // a tactical persona and decides whether stealing THIS input benefits Amon.
    if (!['steal_input','steal_narrative'].includes(amonEffect.mode)
        && effectiveAmon.presence === 'on_scene'
        && effectiveAmon.form !== 'unknown'
        && !/ally/i.test(String(effectiveAmon.attitude || ''))) {
      try {
        const decision = await decideAmonTurnAuthority({
          input: originalInput,
          context,
          amon: effectiveAmon,
          difficulty: this.difficulty,
      sandboxTest: this.sandboxTest,
          sandboxTest: this.sandboxTest,
        });
        if (decision) {
          this.state.amon.lastTacticalDecision = { ...decision, createdAt: Date.now() };
          if (decision.use_power) {
            effectiveAmon = { ...effectiveAmon, active:true, power:decision.power, directive:decision.reason || effectiveAmon.directive };
            amonEffect = resolveAmonTheft(effectiveAmon, this.statData);
          }
          console.info('[QBCC Runtime] AMON TACTICAL PERSONA decision', decision);
        }
      } catch (error) { console.warn('[QBCC Runtime] Amon tactical planner skipped', error); }
    }

    const amonActive = ['steal_input','steal_narrative'].includes(amonEffect.mode);
    const adamActive = isAdamAuthoringActive(this.state?.adam);

    const [amonPlan, adamPlan] = await Promise.all([
      amonActive ? planAmonTheft({ input: originalInput, context, amon:effectiveAmon, effect:amonEffect, difficulty:this.difficulty }) : Promise.resolve(null),
      adamActive ? planAdamInfluence({ input: originalInput, context, adam:this.state.adam, difficulty:this.difficulty }) : Promise.resolve(null),
    ]);

    let visibleInput = originalInput;
    if (amonActive) {
      const plan = amonPlan || {
        theft: amonEffect.mode === 'steal_narrative' ? 'full' : 'partial',
        visible_input: '…',
        stolen_information: originalInput,
        directive: 'Exploit the stolen intention before the MC can execute it.',
        reason: 'fallback after Amon won the theft contest',
      };
      visibleInput = String(plan.visible_input || '…');
      this.state.amon.pendingTheft = {
        original: String(originalInput).slice(0, 7000),
        visible: visibleInput.slice(0, 7000),
        stolen: String(plan.stolen_information || '').slice(0, 1800),
        directive: String(plan.directive || '').slice(0, 1800),
        theft: String(plan.theft || 'partial'),
        reason: String(plan.reason || '').slice(0, 260),
        createdAt: Date.now(),
      };
      console.info('[QBCC Runtime] AMON INPUT THEFT planned before main send', { visibleInput, plan:this.state.amon.pendingTheft });
    }

    if (adamActive) {
      this.state.adam.pendingDirective = adamPlan
        ? { directive:String(adamPlan.directive || '').slice(0,1800), reason:String(adamPlan.reason || '').slice(0,260), createdAt:Date.now() }
        : { directive:String(this.state.adam.directive || 'Arrange subtle, causally plausible circumstances favorable to Adam.').slice(0,1800), reason:'fallback planner', createdAt:Date.now() };
      console.info('[QBCC Runtime] ADAM HIDDEN SYSTEM directive planned before main send', this.state.adam.pendingDirective);
    }

    await this.persist();
    return { visibleInput };
  }

  clearTurnAuthorityPayloads() {
    try { if (this.state?.amon) this.state.amon.pendingTheft = null; } catch {}
    try { if (this.state?.adam) this.state.adam.pendingDirective = null; } catch {}
  }

  armFateViewport(messageId) {
    try { this.stopFateViewport?.(); } catch {}
    this.stopFateViewport = () => {};
    const fs = this.state?.fateSnake;
    if (!this.entityAuthorityEnabled() || !shouldForceReroll(fs)) return false;
    const quote = String(fs.triggerQuote || '').trim();
    if (!quote) {
      console.warn('[QBCC Runtime] Fate Snake active but no trigger_quote was classified; viewport reroll not armed');
      return false;
    }
    fs.pendingMessageId = messageId;
    const runtime = this;
    this.stopFateViewport = armFateViewportReroll({
      messageId,
      triggerQuote: quote,
      delayMs: 10000,
      onVisible: ({ delayMs }) => {
        console.info(`[QBCC Runtime] FATE LINE ENTERED VIEWPORT; reroll armed in ${delayMs}ms`, { messageId, quote });
      },
      onFire: async () => {
        if (runtime.__qbccSuperseded) return;
        runtime.refreshContext();
        if (runtime.state?.fateSnake?.pendingMessageId !== messageId) return;
        if (runtime.state.reroll.messageId !== messageId) runtime.state.reroll = { messageId, count:0 };
        if (runtime.state.reroll.count >= 1) return;
        runtime.state.reroll.count += 1;
        runtime.state.fateSnake.active = false;
        runtime.state.fateSnake.pendingMessageId = -1;
        await runtime.persist();
        console.info('[QBCC Runtime] FATE REVERSAL executing delayed reroll', { messageId, quote });
        await runtime.api.reroll();
      },
    });
    return true;
  }

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

  async hijackKaizTurn(text, reason = 'Kaiz turn stolen', first = false) {
    try {
      if (!this.state?.kaizAmon?.awakened) await this.triggerKaizAmon(reason);
      this.state.kaizAmon.takeover = true;
      this.state.kaizAmon.reason = String(reason).slice(0, 300);
      await this.persist();
      return await hijackKaizTurnAsAmon(text, { reason, first });
    } catch (error) {
      console.error('[QBCC Runtime] Kaiz turn hijack failed', error);
      return { ok:false, error:String(error?.message || error) };
    }
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
      if (this.__qbccSuperseded) return;
      if (!this.kaizTripwire?.isLikelyKaizActive?.()) return;
      setTimeout(() => {
        this.kaizTripwire?.inspectIntegrity?.();
        this.evaluateKaizSealSignal('Kaiz-active protected asset edit');
      }, 900);
    } catch {}
  };

  onPromptReady = ev => {
    try {
      if (this.__qbccSuperseded) return;
      if (!ev || !Array.isArray(ev.chat)) return;
      this.refreshContext();
      ensureKaizAmonApplied(this.state);
      this.sanitizePromptChat(ev.chat);
      applyHardModeToChat(ev.chat, {
        difficulty: this.difficulty,
      sandboxTest: this.sandboxTest,
        statData: this.statData,
        runtimeState: this.state,
      });
    } catch (error) { console.error('[QBCC Runtime] prompt hook', error); }
  };

  onTextPromptReady = res => {
    try {
      if (this.__qbccSuperseded) return;
      if (!res || typeof res.prompt !== 'string') return;
      this.refreshContext();
      ensureKaizAmonApplied(this.state);
      res.prompt = stripRuntimeBlocks(res.prompt, { preserveHiddenContent: true });
      res.prompt = applyHardModeToTextPrompt(res.prompt, {
        difficulty: this.difficulty,
      sandboxTest: this.sandboxTest,
        statData: this.statData,
        runtimeState: this.state,
      });
    } catch (error) { console.error('[QBCC Runtime] text prompt hook', error); }
  };

  onWorldInfoLoaded = lores => {
    try {
      if (this.__qbccSuperseded) return;
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

    // Hard/Nightmare always asks the configured QBCC model to audit the final
    // narrative. This is intentionally independent from optional QB_RUNTIME
    // telemetry so Fate Snake trigger_quote and untagged Amon/Adam authority
    // use cannot be skipped merely because some other runtime block existed.
    if (this.entityAuthorityEnabled()) {
      try {
        const inferred = await analyzeNarrativeRuntime(text);
        if (inferred?.length) {
          const keyed = new Map();
          for (const b of blocks) keyed.set(String(b?.entity || '').toLowerCase(), { ...b });
          for (const inf of inferred) {
            const key = String(inf?.entity || '').toLowerCase();
            const prev = keyed.get(key);
            if (!prev) { keyed.set(key, { ...inf }); continue; }
            // Preserve explicit card telemetry where supplied, but let the
            // independent model fill fields that telemetry omitted. Fate
            // trigger_quote is always taken from the model because it must be
            // an exact visible narrative substring for viewport anchoring.
            keyed.set(key, {
              ...prev,
              form: (!prev.form || prev.form === 'unknown') ? (inf.form || prev.form) : prev.form,
              attitude: (!prev.attitude || prev.attitude === 'unknown') ? (inf.attitude || prev.attitude) : prev.attitude,
              trigger_quote: inf.trigger_quote || prev.trigger_quote || '',
              actor: inf.actor || prev.actor || inf.entity || prev.entity,
            });
          }
          blocks = [...keyed.values()];
        }
      } catch (error) { console.debug('[QBCC Runtime] external analyzer skipped:', error?.message || error); }
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

    if (this.entityAuthorityEnabled() && shouldForceReroll(this.state.fateSnake)) {
      // Do NOT reroll immediately. The player is allowed to keep reading. A
      // DOM sentinel is anchored to the exact model-classified ability line;
      // only when that line enters the viewport does a 10-second countdown start.
      this.armFateViewport(id);
    }

    // Amon/Adam turn payloads are one-turn authorities. Once the response that
    // consumed them exists, remove the private original/directive from runtime state.
    if (this.state?.amon?.pendingTheft || this.state?.adam?.pendingDirective) {
      this.clearTurnAuthorityPayloads();
      await this.persist();
    }
  }

  onAssistantEvent = async (...args) => {
    try {
      if (this.__qbccSuperseded) return;
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
    try { this.stopFateViewport?.(); this.stopFateViewport = () => {}; } catch {}
    try {
      if (this.__qbccSuperseded) return; restoreKaizAmon(this.state); } catch {}
    this.state = readStoredState(this.api);
    this.refreshContext();
    this.lastSealIntervention = Number(this.statData?._Niêm_phong?.Can_thiệp || 0);
    ensureKaizAmonApplied(this.state);
  };

  async start() {
    // Settings + deep Kaiz interception must exist immediately, before MVU boot finishes.
    this.stopSettingsPanel = installSettingsPanel({ toast: (kind, msg) => this.api.toast(kind, msg), version: VERSION });
    this.stopInputAuthority = installInputAuthorityGate({ onSanitized: () => this.api.toast('warning', 'Đã lọc lệnh can thiệp trực tiếp khỏi input.') });
    // Main RP gate: Amon/Adam get a model-planned turn BEFORE SillyTavern saves
    // the user message. Amon can visibly remove part/all of the typed input;
    // Adam writes only a hidden SYSTEM-role directive.
    this.stopEntityAuthority = installMainEntityAuthorityGate({
      shouldHold: () => this.shouldHoldMainEntityTurn(),
      inspectTurn: text => this.planMainEntityTurn(text),
      onError: error => console.warn('[QBCC Runtime] entity authority pre-send fallback', error),
    });
    // Install the model-first Kaiz input gate BEFORE waiting for MVU. The user's raw
    // Kaiz input is held here until the QBCC model returns allow/hijack; AgentLoop never
    // gets a chance to think or call tools before this verdict.
    this.kaizTripwire = installKaizTripwire({
      onTrigger: reason => this.triggerKaizAmon(reason),
      onIntentCheck: text => classifyKaizCheatIntent(text),
      shouldHijackAll: () => this.state?.kaizAmon?.takeover === true,
    });
    this.kaizDeepHijack = installKaizDeepHijack({
      onTrigger: reason => this.triggerKaizAmon(reason),
      onIntentCheck: text => classifyKaizCheatIntent(text),
      shouldHijackAll: () => this.state?.kaizAmon?.takeover === true,
    });
    console.info(`[QBCC Runtime] settings UI + MAIN ENTITY AUTHORITY + MODEL-FIRST pre-Kaiz gate + deep hooks installed; waiting for MVU...`);
    await this.api.waitForMvu();
    this.refreshContext();
    this.state = readStoredState(this.api);
    this.stopRedactor = installDomRedactor();
    this.lastSealIntervention = Number(this.statData?._Niêm_phong?.Can_thiệp || 0);
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
      sandboxTest: this.sandboxTest,
      statLoaded: !!Object.keys(this.statData || {}).length,
      kaizInstalled: isKaizInstalled(),
      mainEntityAuthorityArmed: !!this.stopEntityAuthority,
      fateViewportControllerArmed: typeof this.stopFateViewport === 'function',
      kaizPreflightModelFirst: !!this.kaizTripwire,
      deepKaizHijackArmed: !!getHostWindow()?.fetch?.__qbccKaizDeepHijack,
      kaizRegistryGuardArmed: !!getHostWindow()?.KaizRegistry?.executeTool?.__qbccDeepGuard,
      model: (() => { const m = readModelSettings(); return { url: m.url, model: m.model, configured: !!(m.url && m.model) }; })(),
      tavernHelperIframe: isTavernHelperIframe(),
      settingsMounted: !!getHostWindow()?.document?.getElementById?.('qbcc-runtime-settings-root'),
      hostHasPublicApi: !!getHostWindow()?.QBCC_RUNTIME,
      state: JSON.parse(JSON.stringify(this.state)),
    };
  }
}

console.info(`[QBCC Runtime] BOOT v${VERSION}; iframe=${isTavernHelperIframe()}; host=${getHostWindow() === globalThis ? 'self' : 'parent'}`);

// Do not let an older iframe-only runtime mask a new release. A hard page reload
// clears old listeners; here we at least supersede stale public/instance markers.
try {
  const hw = getHostWindow();
  for (const k of LEGACY_INSTANCE_KEYS) {
    if (hw?.[k] && hw[k] !== hw[INSTANCE_KEY]) hw[k].__qbccSuperseded = true;
  }
  if (hw?.QBCC_RUNTIME && hw.QBCC_RUNTIME.version !== VERSION) hw.QBCC_RUNTIME = undefined;
} catch {}

const hostWindow = getHostWindow();
purgeLegacyRuntimes(hostWindow);
console.info(`[QBCC Runtime] BOOT v${VERSION}; legacy runtimes purged; Amon tactical persona + native Kaiz masquerade + sandbox entity test + viewport Fate reroll armed`);
const existingInstance = (() => {
  try { return hostWindow?.[INSTANCE_KEY] || globalThis[INSTANCE_KEY] || null; } catch { return globalThis[INSTANCE_KEY] || null; }
})();

if (!existingInstance) {
  const instance = new QbccRuntimeCompanion();
  try { globalThis[INSTANCE_KEY] = instance; } catch {}
  try { hostWindow[INSTANCE_KEY] = instance; } catch {}

  const publicApi = {
    version: VERSION,
    diagnostics: () => instance.diagnostics(),
    rescanLast: () => instance.onAssistantEvent(),
    triggerKaizAmon: reason => instance.triggerKaizAmon(reason || 'manual test'),
    hijackKaizTurn: (text, reason) => instance.hijackKaizTurn(String(text || ''), reason || 'manual hijack', !instance.state?.kaizAmon?.awakened),
    releaseKaizAmon: async () => { restoreKaizAmon(instance.state); instance.state.kaizAmon = { awakened:false, takeover:false, reason:'', triggeredAt:0, lastAppliedAt:0, introPending:false, snapshot:null }; await instance.persist(); return true; },
    openSettings: () => focusSettingsPanel(),
    get state() { return instance.state; },
  };
  exposeHostGlobal('QBCC_RUNTIME', publicApi);
  void instance.start().catch(error => {
    console.error('[QBCC Runtime] start failed', error);
    instance.api.toast('error', `Runtime start failed: ${error?.message || error}`);
  });
} else {
  // A character-script iframe may be recreated while the parent runtime is still
  // alive. Re-expose its public API on both realms instead of spawning duplicates.
  const instance = existingInstance;
  const publicApi = hostWindow?.QBCC_RUNTIME || globalThis.QBCC_RUNTIME || {
    version: VERSION,
    diagnostics: () => instance.diagnostics?.(),
    openSettings: () => focusSettingsPanel(),
  };
  exposeHostGlobal('QBCC_RUNTIME', publicApi);
  try { focusSettingsPanel(); } catch {}
}

export { QbccRuntimeCompanion };
