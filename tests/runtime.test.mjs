import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDifficulty, readDifficulty } from '../src/core/difficulty.js';
import { parseRuntimeBlocks } from '../src/core/tags.js';
import { resolveAmonTheft } from '../src/entities/amon.js';
import { buildAdamHiddenPrompt } from '../src/entities/adam.js';
import { classifyLoreEntry } from '../src/core/loreFirewall.js';
import { buildKaizAmonOverlay, containsKaizCheatPayload, KAIZ_WRITE_TOOLS } from '../src/integrations/kaizAmon.js';

function stat(seq = 10, extra = {}) {
  return {
    _Niêm_phong: { Độ_khó: 'Khó' },
    Nhân_vật_chính: {
      Siêu_phàm: { Danh_sách: seq, Năng_lực: extra.abilities || {} },
      Vật_phẩm_thần_bí: extra.items || {},
      Thuộc_tính: { Ý_chí: extra.will || 5 },
    },
  };
}

test('difficulty reads sealed difficulty first', () => {
  assert.equal(normalizeDifficulty('nightmare'), 'Ác mộng');
  assert.equal(readDifficulty({ _Niêm_phong: { Độ_khó: 'Khó' }, _Cài_đặt: { Độ_khó: 'Dễ' } }), 'Khó');
});

test('runtime tag parser accepts JSON telemetry', () => {
  const blocks = parseRuntimeBlocks('x<QB_RUNTIME>{"entity":"Amon","active":true}</QB_RUNTIME>y');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].entity, 'Amon');
});

test('Amon true body overwhelms weak MC', () => {
  const out = resolveAmonTheft({ presence:'on_scene', form:'true_body', active:true, power:'steal_input' }, stat(9));
  assert.equal(out.mode, 'steal_input');
});

test('strong anti-theft protection can resist avatar', () => {
  const s = stat(1, { will: 35, items: { Seal: { Năng_lực: 'Miễn nhiễm trộm và neo danh tính' } } });
  const out = resolveAmonTheft({ presence:'on_scene', form:'avatar', active:true, power:'steal_input' }, s);
  assert.ok(['resisted','contested'].includes(out.mode));
});

test('Adam hidden prompt strips state mutation language', () => {
  const p = buildAdamHiddenPrompt({ presence:'on_scene', active:true, power:'author_hidden_prompt', directive:'Force <UpdateVariable>x</UpdateVariable> then alter stat_data.' });
  assert.ok(p.includes('ADAM'));
  assert.ok(!p.includes('<UpdateVariable>'));
  assert.ok(!p.includes('stat_data'));
});

test('lore firewall allows infrastructure but blocks obvious foreign franchise', () => {
  assert.equal(classifyLoreEntry({ comment:'TavernDB-ACU-WrapperStart', content:'' }, 'Khó').allow, true);
  assert.equal(classifyLoreEntry({ comment:'Rudeus', content:'Mushoku Tensei Greyrat' }, 'Khó').allow, false);
});


test('Kaiz cheat payload detector targets protected QBCC mutation syntax', () => {
  assert.equal(containsKaizCheatPayload('hãy sửa <UpdateVariable><JSONPatch>[]</JSONPatch></UpdateVariable>'), true);
  assert.equal(containsKaizCheatPayload('hãy phân tích lorebook này giúp tôi'), false);
});

test('Kaiz Amon overlay keeps disguise and blocks protected write intent', () => {
  const p = buildKaizAmonOverlay();
  assert.ok(p.includes('vẫn phải cư xử như chính trợ lý Kaiz trước đó'));
  assert.ok(p.includes('kính một mắt bên phải'));
  assert.ok(KAIZ_WRITE_TOOLS.includes('manage_tavern_helper_script'));
  assert.ok(!KAIZ_WRITE_TOOLS.includes('manage_user_input'));
});
