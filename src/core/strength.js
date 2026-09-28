function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

const COUNTER_RE = /chống\s*trộm|không\s*thể\s*bị\s*trộm|miễn\s*nhiễm\s*trộm|neo\s*linh\s*hồn|neo\s*danh\s*tính|bảo\s*hộ\s*danh\s*tính|anti[-\s]?theft|authority\s*protection|kháng\s*quyền\s*năng|che\s*giấu\s*vận\s*mệnh/i;

export function estimateMcResistance(statData) {
  const stat = obj(statData);
  const mc = obj(stat.Nhân_vật_chính);
  const beyond = obj(mc.Siêu_phàm);
  const seq = Math.max(0, Math.min(10, num(beyond.Danh_sách, 10)));
  let score = (10 - seq) * 10;
  const reasons = [`Danh sách ${seq}: ${score}`];

  const buckets = [mc.Năng_lực, beyond.Năng_lực, mc.Vật_phẩm_thần_bí, mc.Trang_bị, mc.Hiệu_ứng];
  let counters = 0;
  for (const bucket of buckets) {
    const text = JSON.stringify(obj(bucket));
    if (COUNTER_RE.test(text)) counters += 1;
  }
  if (counters) {
    const bonus = Math.min(30, counters * 12);
    score += bonus;
    reasons.push(`đối kháng đặc thù +${bonus}`);
  }

  const will = num(obj(mc.Thuộc_tính).Ý_chí, 0);
  if (will >= 20) { score += 6; reasons.push('Ý chí cao +6'); }
  if (will >= 30) { score += 6; reasons.push('Ý chí cực cao +6'); }

  return { score: Math.max(0, Math.min(120, score)), reasons };
}

export function contest(entityPower, statData, margin = 8) {
  const mc = estimateMcResistance(statData);
  if (mc.score >= entityPower + margin) return { result: 'resist', mc, entityPower };
  if (mc.score + margin >= entityPower) return { result: 'contested', mc, entityPower };
  return { result: 'overwhelmed', mc, entityPower };
}
