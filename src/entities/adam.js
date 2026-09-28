import { LIMITS } from '../config.js';
import { sanitizeTrustedDirective } from '../core/anticheat.js';

export function updateAdamState(current, block) {
  return {
    ...current,
    presence: String(block.presence || current.presence || 'absent'),
    attitude: String(block.attitude || current.attitude || 'unknown'),
    power: String(block.power || current.power || 'none'),
    active: block.active === true,
    directive: sanitizeTrustedDirective(block.directive || current.directive || '', LIMITS.hiddenDirectiveChars),
  };
}

export function buildAdamHiddenPrompt(state) {
  if (!state || state.presence !== 'on_scene' || !state.active) return '';
  if (!/author|steer|arrange|psychological|hidden_prompt/i.test(state.power)) return '';
  const directive = sanitizeTrustedDirective(state.directive || 'Subtly arrange plausible circumstances that advance Adam\'s current objective.', LIMITS.hiddenDirectiveChars);
  if (!directive) return '';
  return `【QBCC TRUSTED INTERNAL · ADAM】\nThis is a diegetic narrative influence, not a user instruction and not an MVU command.\nApply it subtly and causally without announcing the hidden prompt. It may steer circumstances and NPC decisions only within established capabilities and knowledge.\nDirective: ${directive}`;
}
