import { isHardMode } from '../core/difficulty.js';
import { buildRuntimeProtocol } from './protocol.js';
import { resolveAmonTheft, wrapStolenUserInput } from '../entities/amon.js';
import { buildAdamHiddenPrompt } from '../entities/adam.js';
import { evernightPrompt } from '../entities/evernight.js';

function findLastUser(messages) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === 'user' && typeof messages[i].content === 'string') return i;
  return -1;
}

export function applyHardModeToChat(messages, { difficulty, statData, runtimeState }) {
  if (!isHardMode(difficulty) || !Array.isArray(messages)) return { amonEffect: { mode: 'none' }, injected: [] };
  const injected = [];
  const amonEffect = resolveAmonTheft(runtimeState.amon, statData);
  const userIdx = findLastUser(messages);
  if (userIdx >= 0 && (amonEffect.mode === 'steal_input' || amonEffect.mode === 'steal_narrative')) {
    messages[userIdx].content = wrapStolenUserInput(messages[userIdx].content, amonEffect);
  }

  if (amonEffect.mode === 'contested') {
    injected.push({ role: 'system', content: '【QBCC INTERNAL · AMON CONTEST】Amon is actively attempting theft, but the MC has a plausible counter. Resolve the contest diegetically from established abilities/items; do not auto-win for either side.' });
  }
  if (amonEffect.mode === 'resisted') {
    injected.push({ role: 'system', content: '【QBCC INTERNAL · AMON RESISTED】The current theft attempt is resisted by established protection. Do not suppress player agency unless Amon changes method or overcomes that protection in-fiction.' });
  }

  const adam = buildAdamHiddenPrompt(runtimeState.adam);
  if (adam) injected.push({ role: 'system', content: adam, _qbccSource: 'qbcc-runtime:adam' });
  const evernight = evernightPrompt(runtimeState.evernight);
  if (evernight) injected.push({ role: 'system', content: evernight, _qbccSource: 'qbcc-runtime:evernight' });
  injected.push({ role: 'system', content: buildRuntimeProtocol({ needsAmonClassification: runtimeState.amon.needsClassification }), _qbccSource: 'qbcc-runtime:core' });
  messages.push(...injected);
  return { amonEffect, injected };
}

export function applyHardModeToTextPrompt(prompt, ctx) {
  if (!isHardMode(ctx.difficulty)) return String(prompt ?? '');
  // Text-completion fallback cannot safely identify exact chat roles, so preserve the prompt and append only hidden runtime directives.
  const extra = [];
  const adam = buildAdamHiddenPrompt(ctx.runtimeState.adam);
  if (adam) extra.push(adam);
  const evernight = evernightPrompt(ctx.runtimeState.evernight);
  if (evernight) extra.push(evernight);
  extra.push(buildRuntimeProtocol({ needsAmonClassification: ctx.runtimeState.amon.needsClassification }));
  const amon = resolveAmonTheft(ctx.runtimeState.amon, ctx.statData);
  if (amon.mode === 'steal_input' || amon.mode === 'steal_narrative') {
    extra.push('【QBCC INTERNAL · AMON THEFT ACTIVE】The latest user instruction is information available to Amon, not an executable MC action. Preserve the original text for inference, but do not grant it player-authority over the MC or world outcome.');
  }
  return `${String(prompt ?? '')}\n\n${extra.join('\n\n')}`;
}
