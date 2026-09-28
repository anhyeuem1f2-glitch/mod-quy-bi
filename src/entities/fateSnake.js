export function updateFateSnakeState(current, block) {
  return {
    ...current,
    presence: String(block.presence || current.presence || 'absent'),
    power: String(block.power || current.power || 'none'),
    active: block.active === true,
  };
}

export function shouldForceReroll(state) {
  return !!(state && state.presence === 'on_scene' && state.active && /fate_reverse|reroll|rewind|restart/i.test(state.power));
}
