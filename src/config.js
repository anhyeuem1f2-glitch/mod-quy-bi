export const VERSION = '0.4.9';
export const CHAT_STATE_KEY = 'qbcc_runtime_companion';
export const HARD_DIFFICULTIES = new Set(['Khó', 'Ác mộng']);

export const ENTITY_CONFIG = {
  amon: {
    aliases: ['Amon', '阿蒙'],
    trueBodyPower: 98,
    avatarPower: 76,
    unknownPower: 86,
    onSceneHints: [
      'xuất hiện', 'bước tới', 'đứng trước', 'ngồi trước', 'mỉm cười', 'nhìn sang',
      'lên tiếng', 'nói', 'đeo đơn phiến kính', 'chỉnh đơn phiến kính', 'monocle'
    ],
  },
  adam: {
    aliases: ['Adam', '亚当'],
    onSceneHints: ['xuất hiện', 'đứng', 'ngồi', 'nhìn', 'nói', 'giáo sĩ', 'tác giả'],
  },
  evernight: {
    aliases: ['Nữ thần Đêm Tối', 'Evernight', 'Amanises', '黑夜女神', '阿曼妮西斯'],
    onSceneHints: ['xuất hiện', 'giáng lâm', 'che giấu', 'ẩn đi', 'bóng tối', 'đêm tối'],
  },
  fateSnake: {
    aliases: ['Will Auceptin', 'Ouroboros', 'Rắn Vận Mệnh', 'Rắn Thủy Ngân', 'Snake of Mercury', '威尔·昂赛汀', '乌洛琉斯'],
    onSceneHints: ['xuất hiện', 'vận mệnh', 'quay ngược', 'khởi động lại', 'trở về', 'reset'],
  },
};

export const RUNTIME_BLOCK_RE = /<QB_RUNTIME>\s*([\s\S]*?)\s*<\/QB_RUNTIME>/gi;
export const HIDE_BLOCK_RE = /<QB_HIDE>([\s\S]*?)<\/QB_HIDE>/gi;
export const PROTECTED_USER_TAG_RE = /<\/?(?:QB_RUNTIME|QB_HIDE|UpdateVariable|JSONPatch|BianLiang)(?:\s[^>]*)?>/gi;

export const LIMITS = {
  hiddenDirectiveChars: 1400,
  inputChars: 6000,
  runtimeBlocksPerMessage: 8,
  rerollsPerMessage: 1,
  fateViewportDelayMs: 10000,
  entityPlanChars: 7000,
};

export const REROLL_COMMANDS = ['/regenerate'];
