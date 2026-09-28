export function normalizeDifficulty(value) {
  const s = String(value ?? '');
  if (/Ác\s*mộng|ac\s*mong|nightmare/i.test(s)) return 'Ác mộng';
  if (/Khó|\bkho\b|hard/i.test(s)) return 'Khó';
  if (/Dễ|\bde\b|easy/i.test(s)) return 'Dễ';
  return 'Thường';
}

export function readDifficulty(statData) {
  const stat = statData && typeof statData === 'object' ? statData : {};
  const seal = stat._Niêm_phong && typeof stat._Niêm_phong === 'object' ? stat._Niêm_phong : {};
  const settings = stat._Cài_đặt && typeof stat._Cài_đặt === 'object' ? stat._Cài_đặt : {};
  return normalizeDifficulty(seal.Độ_khó || settings.Độ_khó || 'Thường');
}

export function isHardMode(diff) {
  const d = normalizeDifficulty(diff);
  return d === 'Khó' || d === 'Ác mộng';
}
