export function updateFateSnakeState(current, block) {
  return {
    ...current,
    presence: String(block.presence || current.presence || 'absent'),
    power: String(block.power || current.power || 'none'),
    active: block.active === true,
    triggerQuote: String(block.trigger_quote || block.triggerQuote || current.triggerQuote || '').slice(0, 240),
    actor: String(block.actor || block.entity || current.actor || '').slice(0, 80),
  };
}

export function shouldForceReroll(state) {
  return !!(state && state.presence === 'on_scene' && state.active && /fate_reverse|reroll|rewind|restart/i.test(state.power));
}
