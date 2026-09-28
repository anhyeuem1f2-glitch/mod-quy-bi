import { REROLL_COMMANDS } from '../config.js';

function maybe(name) { return globalThis[name]; }

export function createTavernApi() {
  return {
    async waitForMvu() {
      try {
        if (typeof maybe('waitGlobalInitialized') === 'function') await maybe('waitGlobalInitialized')('Mvu');
      } catch {}
    },
    getLatestMvuData(maxBack = 60) {
      const Mvu = maybe('Mvu');
      if (!Mvu || typeof maybe('getLastMessageId') !== 'function') return null;
      let last;
      try { last = maybe('getLastMessageId')(); } catch { return null; }
      for (let id = last; id >= 0 && last - id < maxBack; id--) {
        try {
          const data = Mvu.getMvuData({ type: 'message', message_id: id });
          if (data?.stat_data && Object.keys(data.stat_data).length) return { id, data };
        } catch {}
      }
      return null;
    },
    getChatVariables() {
      try { return maybe('getVariables')?.({ type: 'chat' }) || {}; } catch { return {}; }
    },
    async setChatVariables(patch) {
      if (typeof maybe('insertOrAssignVariables') === 'function') return maybe('insertOrAssignVariables')(patch, { type: 'chat' });
    },
    getMessage(id) {
      try { return maybe('getChatMessages')?.(id)?.[0] || null; } catch { return null; }
    },
    lastMessage() {
      try {
        const id = maybe('getLastMessageId')?.();
        return { id, message: this.getMessage(id) };
      } catch { return { id: -1, message: null }; }
    },
    onEvent(key, handler, mode = 'on') {
      const events = maybe('tavern_events');
      const ev = events?.[key];
      if (!ev) return false;
      const fn = mode === 'first' ? maybe('eventMakeFirst') : mode === 'last' ? maybe('eventMakeLast') : maybe('eventOn');
      if (typeof fn !== 'function') return false;
      fn(ev, handler);
      return true;
    },
    onFirstAvailable(keys, handler) {
      for (const key of keys) if (this.onEvent(key, handler, 'on')) return key;
      return null;
    },
    async reroll() {
      const trigger = maybe('triggerSlash');
      if (typeof trigger !== 'function') return false;
      for (const cmd of REROLL_COMMANDS) {
        try { await trigger(cmd); return true; } catch {}
      }
      return false;
    },
    toast(kind, message) {
      try { globalThis.toastr?.[kind]?.(String(message), 'QBCC Runtime', { timeOut: 4500 }); } catch {}
    },
  };
}
