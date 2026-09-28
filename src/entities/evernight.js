export function updateEvernightState(current, block) {
  return {
    ...current,
    presence: String(block.presence || current.presence || 'absent'),
    power: String(block.power || current.power || 'none'),
    active: block.active === true,
  };
}

export function evernightPrompt(state) {
  if (!state || state.presence !== 'on_scene' || !state.active) return '';
  if (!/conceal|hide|secret|redact/i.test(state.power)) return '';
  return '【QBCC INTERNAL · EVERNIGHT CONCEALMENT】When concealment is actively used, wrap only the exact text that must be hidden from the player in <QB_HIDE>...</QB_HIDE>. Keep the underlying fact available to the narrator, but do not treat the MC as knowing concealed content.';
}
