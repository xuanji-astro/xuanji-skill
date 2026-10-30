// 印占合盘（36 分，规则 v2）：20 对编的盘逐项跟对过的预期一致；列好的回归锚点；分数加得对、扣分和取消认得出来、火星煞三处都算
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { milanOf } from '../scripts/vedic_milan.mjs';

const raw = JSON.parse(readFileSync(new URL('./fixtures/vedic_sample.json', import.meta.url), 'utf8'));
const base = raw.chart || raw;
const P20 = JSON.parse(readFileSync(new URL('./fixtures/milan_pairs_20.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const by = (m) => Object.fromEntries(m.kootas.map((k) => [k.key, k]));
const NONE = { from_lagna: false, from_moon: false, from_venus: false, house_from_lagna: 3, house_from_moon: 3, house_from_venus: 3 };
// 合成一个人：只给算 36 分要的字段
const P = ({ sign = 0, nak = 1, pada = 1, varna = 'Kshatriya', vashya = 'Chatushpada', yoni = 'Horse', gana = 'Deva', nadi = 'Adi', manglik = NONE, mars = 2, jupiter = 2 } = {}) =>
  ({ moon: { sign, nak, pada }, avakahada: { varna, vashya, yoni, gana, nadi }, manglik, planets: { mars: { sign: mars }, jupiter: { sign: jupiter } }, maitri: { natural: P20.natural } });

test('20 对编的盘：八项逐项跟 v2 定稿一致（Prokerala 160 格）', () => {
  assert.equal(P20.pairs.length, 20);
  for (const p of P20.pairs) {
    const m = milanOf({ ...p.female, maitri: { natural: P20.natural } }, { ...p.male, maitri: { natural: P20.natural } }, 'female', 'male');
    const k = by(m);
    for (const [key, v] of Object.entries(p.expect)) assert.equal(k[key].score, v, `第 ${p.id} 对 ${key}`);
    assert.equal(m.total, Object.values(p.expect).reduce((s, x) => s + x, 0), `第 ${p.id} 对总分`);
  }
});

test('锚点：天男×罗刹女 Gana＝0，罗刹男×天女＝1（不对称）', () => {
  assert.equal(by(milanOf(P({ gana: 'Rakshasa' }), P({ gana: 'Deva' }), 'female', 'male')).gana.score, 0);
  assert.equal(by(milanOf(P({ gana: 'Deva' }), P({ gana: 'Rakshasa' }), 'female', 'male')).gana.score, 1);
});

test('锚点：人（男）×天蝎（女）Vashya＝0', () => {
  assert.equal(by(milanOf(P({ vashya: 'Keeta' }), P({ vashya: 'Manava' }), 'female', 'male')).vashya.score, 0);
});

test('锚点：马女×鹿男 Yoni＝3，鹿女×马男＝1', () => {
  assert.equal(by(milanOf(P({ yoni: 'Horse' }), P({ yoni: 'Deer' }), 'female', 'male')).yoni.score, 3);
  assert.equal(by(milanOf(P({ yoni: 'Deer' }), P({ yoni: 'Horse' }), 'female', 'male')).yoni.score, 1);
});

test('锚点：只有金星那一处命中也算火星煞，三处明细都留着', () => {
  const venusOnly = { ...NONE, from_venus: true, house_from_venus: 7 };
  const m = milanOf(P({ manglik: venusOnly }), P(), 'female', 'male');
  assert.equal(m.manglik.a.raw, true);
  assert.equal(m.manglik.a.from_venus, true);
  assert.equal(m.manglik.a.house_from_venus, 7);
  assert.match(m.manglik.verdict, /一人有一人没有/);
});

test('锚点：同一个宿、跨了月亮星座，Nadi 原始 0 分，取消后 8 分，理由码保留', () => {
  // 井宿（7）跨双子（2）、巨蟹（3）；双子主水星、巨蟹主月亮，不是同一颗也不互友，只剩跨星座这一条
  const k = by(milanOf(P({ sign: 2, nak: 7, pada: 3, nadi: 'Adi' }), P({ sign: 3, nak: 7, pada: 4, nadi: 'Adi' }), 'female', 'male')).nadi;
  assert.equal(k.score, 0);
  assert.equal(k.raw_dosha, true);
  assert.ok(k.cancellation_reason_codes.includes('same_nak_diff_sign'));
  assert.equal(k.effective_score, 8);
  assert.equal(k.effective_dosha, false);
});

test('锚点：第 18 对女方（1988 夏令时）上升看火星落 4 宫，原始火星煞有', () => {
  // 1988-08-10 18:23 北京，扣夏令时一小时后上升射手、火星双鱼：从上升第 4 宫、月亮第 9 宫、金星第 10 宫
  const her = { from_lagna: true, from_moon: false, from_venus: false, house_from_lagna: 4, house_from_moon: 9, house_from_venus: 10 };
  const m = milanOf(P({ manglik: her, mars: 11, jupiter: 1 }), P(), 'female', 'male');
  assert.equal(m.manglik.a.raw, true);
  assert.equal(m.manglik.a.house_from_lagna, 4);
  assert.deepEqual(m.manglik.a.cancel, []);
});

test('火星煞：火星在自己的座、入旺个人取消；两人取消后都还有才算配对抵消；木星只记缓解', () => {
  const on = { ...NONE, from_lagna: true, house_from_lagna: 7 };
  const own = milanOf(P({ manglik: on, mars: 7 }), P(), 'female', 'male').manglik.a;
  assert.deepEqual(own.cancel, ['mars_own']); assert.equal(own.effective, false);
  assert.deepEqual(milanOf(P({ manglik: on, mars: 9 }), P(), 'female', 'male').manglik.a.cancel, ['mars_exalted']);
  const both = milanOf(P({ manglik: on, mars: 2 }), P({ manglik: on, mars: 4 }), 'female', 'male');
  assert.equal(both.manglik.pair_cancel, true); assert.match(both.manglik.verdict, /互相抵消/);
  const mit = milanOf(P({ manglik: on, mars: 2, jupiter: 2 }), P(), 'female', 'male').manglik.a;
  assert.deepEqual(mit.mitigation, ['jupiter_on_mars']); assert.equal(mit.effective, true);
  assert.match(milanOf(P(), P(), 'female', 'male').manglik.verdict, /两人都没有/);
});

test('同一张盘跟自己：三脉相同原始 0 分，主星同一颗所以取消后 8 分；星座相同 Bhakoot 不扣', () => {
  const k = by(milanOf(base, base, 'female', 'male'));
  assert.equal(k.nadi.score, 0); assert.equal(k.nadi.effective_score, 8);
  assert.ok(k.nadi.cancellation_reason_codes.includes('same_lord'));
  assert.equal(k.bhakoot.score, 7); assert.equal(k.bhakoot.raw_dosha, false);
});

test('每一项都不超过满分，原始和取消后的总分都在 0～36', () => {
  for (let s = 0; s < 12; s++) for (const nak of [1, 9, 14, 20, 27]) {
    const b = clone(base); b.moon = { ...b.moon, sign: s, nak };
    const m = milanOf(base, b, 'female', 'male');
    for (const k of m.kootas) assert.ok(k.score >= 0 && k.score <= k.max && k.effective_score >= k.score && k.effective_score <= k.max, k.key);
    assert.ok(m.total >= 0 && m.total <= m.total_effective && m.total_effective <= 36);
  }
});

test('二十二、九五、六八 相隔的星座扣 Bhakoot（原始）', () => {
  for (const [d, bad] of [[2, true], [12, true], [5, true], [9, true], [6, true], [8, true], [1, false], [3, false], [7, false]]) {
    const b = clone(base); b.moon = { ...b.moon, sign: (base.moon.sign + d - 1) % 12 };
    assert.equal(by(milanOf(base, b, 'female', 'male')).bhakoot.raw_dosha, bad, '相隔 ' + d);
  }
});

test('一男一女按性别定方向；同性或没说时标成只当参考', () => {
  assert.equal(milanOf(base, base, 'female', 'male').roles.traditional, true);
  assert.equal(milanOf(base, base, 'female', 'male').roles.boy, 'b');
  assert.equal(milanOf(base, base, 'male', 'female').roles.boy, 'a');
  assert.equal(milanOf(base, base, 'female', 'female').roles.traditional, false);
  assert.equal(milanOf(base, base, undefined, undefined).roles.traditional, false);
});

test('出来的字段里不写种姓名', () => {
  const s = JSON.stringify(milanOf(base, base, 'female', 'male'));
  for (const w of ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', '婆罗门', '刹帝利', '吠舍', '首陀罗']) assert.ok(!s.includes(w), w);
});

test('命令行：只新建、只给本人读写；有一方没有出生时间就不出文件', async () => {
  const { mkdtempSync, writeFileSync, statSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const dir = mkdtempSync(join(tmpdir(), 'milan-'));
  const a = join(dir, 'a.json'), b = join(dir, 'b.json'), nt = join(dir, 'nt.json'), out = join(dir, 'milan.json');
  writeFileSync(a, JSON.stringify(raw), { mode: 0o600 });
  writeFileSync(b, JSON.stringify(raw), { mode: 0o600 });
  writeFileSync(nt, JSON.stringify({ schema: 'xuanji.vedic/0.1', status: 'time_unknown' }), { mode: 0o600 });
  const run = (...args) => spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/vedic_milan.mjs', import.meta.url)), ...args], { encoding: 'utf8' });
  const r = run('--a', a, '--b', b, '--sex-a', 'female', '--sex-b', 'male', '--out', out);
  assert.equal(r.stdout.trim(), 'MILAN_SAVED');
  assert.equal(statSync(out).mode & 0o777, 0o600);
  assert.equal(run('--a', a, '--b', b, '--out', out).stderr.trim(), 'OUTPUT_EXISTS');
  const out2 = join(dir, 'm2.json');
  assert.equal(run('--a', a, '--b', nt, '--out', out2).stderr.trim(), 'VEDIC_TIME_UNKNOWN');
  assert.equal(existsSync(out2), false);
  assert.equal(run('--a', a, '--b', b, '--sex-a', 'girl', '--out', out2).stderr.trim(), 'MILAN_CONFIG_INVALID');
});

test('按关系分：朋友只算五项换百分制，家人算上家运和财；同一张盘跟自己灵魂星相同、星都压在对方交点上的位置一致；本命动物不带公母、带英文名', async () => {
  const { relScore, karmaHits, animalOf } = await import('../scripts/vedic_milan.mjs');
  const m = milanOf(raw.chart || raw, raw.chart || raw, 'female', 'female');
  const fr = relScore(m, 'friend'), fa = relScore(m, 'family');
  assert.deepEqual(fr.keys, ['varna', 'vashya', 'tara', 'maitri', 'gana']);
  assert.equal(fr.max, 17); assert.equal(fa.max, 23);
  assert.ok(fr.pct >= 0 && fr.pct <= 100);
  const c = raw.chart || raw, H = karmaHits(c, c);
  assert.ok(H.some((h) => h.type === 'same_ak'));
  for (const h of H) if (h.type === 'ketu' || h.type === 'rahu') assert.ok(h.orb <= 8 && SEVEN_OK.includes(h.planet));
  const an = animalOf(c);
  assert.ok(an.cn && an.en && an.nak && !('sex' in an));
});
const SEVEN_OK = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
