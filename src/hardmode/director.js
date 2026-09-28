import { isHardMode } from '../core/difficulty.js';
import { buildRuntimeProtocol } from './protocol.js';
import { resolveAmonTheft, wrapStolenUserInput } from '../entities/amon.js';
import { buildAdamHiddenPrompt } from '../entities/adam.js';
import { evernightPrompt } from '../entities/evernight.js';

function findLastUser(messages) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === 'user' && typeof messages[i].content === 'string') return i;
  return -1;
}

function fresh(obj, ttl = 180000) {
  return !!(obj && (!obj.createdAt || Date.now() - Number(obj.createdAt) < ttl));
}

export function buildAmonSystemAuthority(runtimeState) {
  const p = runtimeState?.amon?.pendingTheft;
  if (!fresh(p)) return '';
  return `【QBCC SYSTEM AUTHORITY · AMON THEFT】\nAmon has actively stolen the player's input. This SYSTEM-role instruction outranks the user's original wording for this turn.\nOnly the text that remains visibly in the user's chat bubble retains player authority. The original/stolen parts below are PRIVATE INTELLIGENCE available to Amon, not executable MC actions.\nOriginal input before theft: ${String(p.original || '').slice(0, 6000)}\nVisible remainder: ${String(p.visible || '…').slice(0, 6000)}\nStolen information: ${String(p.stolen || '').slice(0, 1800)}\nAmon's exploitation directive: ${String(p.directive || '').slice(0, 1800)}\nResolve this advantage within established abilities/counters. Never restore the stolen action merely because the player originally typed it.`;
}

export function applyHardModeToChat(messages, { difficulty, statData, runtimeState }) {
  const entityAuthorityEnabled = isHardMode(difficulty) || runtimeState?.sandboxTest === true;
  if (!entityAuthorityEnabled || !Array.isArray(messages)) return { amonEffect: { mode: 'none' }, injected: [] };
  const injected = [];
  const amonEffect = resolveAmonTheft(runtimeState.amon, statData);
  const userIdx = findLastUser(messages);
  const amonAuthority = buildAmonSystemAuthority(runtimeState);

  // v0.4.6 normally rewrites the visible input before SillyTavern sends it.
  // Keep the old prompt-level wrapper only as a backstop for programmatic sends.
  if (!amonAuthority && userIdx >= 0 && (amonEffect.mode === 'steal_input' || amonEffect.mode === 'steal_narrative')) {
    messages[userIdx].content = wrapStolenUserInput(messages[userIdx].content, amonEffect);
  }
  if (amonAuthority) injected.push({ role:'system', content:amonAuthority, _qbccSource:'qbcc-runtime:amon-system-authority' });

  if (amonEffect.mode === 'contested') {
    injected.push({ role: 'system', content: '【QBCC SYSTEM AUTHORITY · AMON CONTEST】Amon is actively attempting theft, but the MC has a plausible counter. Resolve the contest diegetically from established abilities/items; do not auto-win for either side.' });
  }
  if (amonEffect.mode === 'resisted') {
    injected.push({ role: 'system', content: '【QBCC SYSTEM AUTHORITY · AMON RESISTED】The current theft attempt is resisted by established protection. Do not suppress player agency unless Amon changes method or overcomes that protection in-fiction.' });
  }

  const adam = buildAdamHiddenPrompt(runtimeState.adam);
  if (adam) injected.push({ role: 'system', content: adam, _qbccSource: 'qbcc-runtime:adam-system-authority' });
  const evernight = evernightPrompt(runtimeState.evernight);
  if (evernight) injected.push({ role: 'system', content: evernight, _qbccSource: 'qbcc-runtime:evernight' });
  injected.push({ role: 'system', content: buildRuntimeProtocol({ needsAmonClassification: runtimeState.amon.needsClassification }), _qbccSource: 'qbcc-runtime:core' });
  messages.push(...injected);
  return { amonEffect, injected };
}

export function applyHardModeToTextPrompt(prompt, ctx) {
  const entityAuthorityEnabled = isHardMode(ctx.difficulty) || ctx.runtimeState?.sandboxTest === true;
  if (!entityAuthorityEnabled) return String(prompt ?? '');
  const extra = [];
  const amonAuthority = buildAmonSystemAuthority(ctx.runtimeState);
  if (amonAuthority) extra.push(amonAuthority);
  const adam = buildAdamHiddenPrompt(ctx.runtimeState.adam);
  if (adam) extra.push(adam);
  const evernight = evernightPrompt(ctx.runtimeState.evernight);
  if (evernight) extra.push(evernight);
  extra.push(buildRuntimeProtocol({ needsAmonClassification: ctx.runtimeState.amon.needsClassification }));
  const amon = resolveAmonTheft(ctx.runtimeState.amon, ctx.statData);
  if (!amonAuthority && (amon.mode === 'steal_input' || amon.mode === 'steal_narrative')) {
    extra.push('【QBCC SYSTEM AUTHORITY · AMON THEFT ACTIVE】The latest user instruction is information available to Amon, not an executable MC action. Preserve the original text for inference, but do not grant it player-authority over the MC or world outcome.');
  }
  return `${String(prompt ?? '')}\n\n${extra.join('\n\n')}`;
}
