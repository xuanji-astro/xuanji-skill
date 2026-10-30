#!/usr/bin/env node
// 印占合盘（Milan，北印度通行的八项 36 分）：读两个人用 client.mjs vedic 存下的 vedic.json，算八项分数、两边的火星煞和常见的抵消情况，写一份 milan.json。
// 只在本机算，不联网；两张盘都要有出生时间（没有时间排不了印占）。网页印占页的 Milan 页签用同一段算法（milanOf）。
// 用法：node vedic_milan.mjs --a vedic.json --b vedic_ta.json --sex-a female|male --sex-b female|male [--relation 朋友] --out milan.json
// 规则 v2：拿 Prokerala、AstroSage 把 20 对编的盘逐项对过（160 格）；v1 作废。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import { existsSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readPrivateJSON, writePrivateText, reasonOf } from './private_files.mjs';
import { safeData } from './client.mjs';

const SIGN = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const LORD = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
const PLANET = { sun: '太阳', moon: '月亮', mars: '火星', mercury: '水星', jupiter: '木星', venus: '金星', saturn: '土星' };
const NAK = ['娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸', '角', '亢', '氐', '房', '心', '尾', '箕', '斗', '女', '虚', '危', '室', '壁', '奎'];
const VARNA = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };
const VASHYA = ['Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Keeta'];
const VASHYA_T = [[2, 1, 1, 0.5, 1], [1, 2, 0.5, 0, 0], [1, 0.5, 2, 1, 1], [0, 0, 1, 2, 0], [1, 1, 1, 0, 2]];   // 行＝男方，列＝女方（v2：人×天蝎 1→0）
const YONI = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
const YONI_CN = ['马', '象', '羊', '蛇', '狗', '猫', '鼠', '牛', '水牛', '虎', '鹿', '猴', '獴', '狮'];
const YONI_T = [   // Saravali 全表，行＝女方、列＝男方（v2：鹿行马列 3→1；锚点 马女×鹿男＝3、鹿女×马男＝1）
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1], [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0], [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2], [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1], [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2], [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1], [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1], [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1], [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2], [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4]];
YONI_T[10][0] = 1;   // 鹿女×马男（公开抄本这格写成 3，Saravali 原表是 1）
const GANA = ['Deva', 'Manushya', 'Rakshasa'], GANA_CN = ['天', '人', '罗刹'];
const GANA_T = [[6, 6, 0], [5, 6, 0], [1, 0, 6]];   // 行＝男方，列＝女方（v2：天男×罗刹女 1→0，反过来罗刹男×天女仍是 1，不对称）
const NADI = ['Adi', 'Madhya', 'Antya'], NADI_CN = ['首脉', '中脉', '尾脉'];
const MAITRI = { ff: 5, fn: 4, nn: 3, fe: 1, ne: 0.5, ee: 0 };
const REASON = { same_sign_diff_nak: '同一个月亮星座、不同的宿', same_nak_diff_sign: '同一个宿、跨了月亮星座', same_nak_diff_pada: '同一个宿、不同的分', same_lord: '两人月亮星座的主星是同一颗', lords_friends: '两人月亮星座的主星互为朋友', mars_own: '火星在自己的星座（白羊、天蝎）', mars_exalted: '火星入旺（摩羯）', jupiter_on_mars: '木星跟火星同座或照到火星' };

function person(c) {
  const a = c.avakahada, m = c.moon, g = c.manglik, mars = c.planets.mars, jup = c.planets.jupiter;
  // 火星煞（v2）：上升、月亮、金星三处任一处落 1、2、4、7、8、12 宫算原始有；火星在自己的座或入旺个人取消；木星同座或照火星只记缓解
  const raw = !!(g.from_lagna || g.from_moon || g.from_venus), codes = [];
  if (mars.sign === 0 || mars.sign === 7) codes.push('mars_own');
  if (mars.sign === 9) codes.push('mars_exalted');
  const jd = (mars.sign - jup.sign + 12) % 12 + 1;
  return { sign: m.sign, nak: m.nak, pada: m.pada, varna: a.varna, vashya: a.vashya, yoni: a.yoni, gana: a.gana, nadi: a.nadi,
    manglik: { from_lagna: !!g.from_lagna, from_moon: !!g.from_moon, from_venus: !!g.from_venus, house_from_lagna: g.house_from_lagna, house_from_moon: g.house_from_moon, house_from_venus: g.house_from_venus,
      raw, cancel: raw ? codes : [], effective: raw && !codes.length, mitigation: raw && [1, 5, 7, 9].includes(jd) ? ['jupiter_on_mars'] : [] } };
}
const idx = (list, v) => { const i = list.indexOf(v); if (i < 0) throw Error('VEDIC_INVALID'); return i; };
const taraOK = (from, to) => ![3, 5, 7].includes(((to - from + 27) % 27 + 1) % 9);   // 从一人的宿数到另一人的宿，余 3、5、7 不吉

// 算法：boy／girl 是传统方向（一男一女时按性别定；同性或没说时按 a＝男方位、b＝女方位排，结论只当参考）
export function milanOf(chartA, chartB, sexA, sexB, natural) {
  const A = person(chartA), B = person(chartB);
  const traditional = (sexA === 'male' && sexB === 'female') || (sexA === 'female' && sexB === 'male');
  const boyIsA = !(sexA === 'female' && sexB === 'male');
  const boy = boyIsA ? A : B, girl = boyIsA ? B : A;
  const nat = natural || chartA.maitri.natural;
  const rel = (x, y) => (x === y ? 'f' : (nat[x] && nat[x][y]) || 'n');
  const k = [];
  // 1 Varna：男方不低于女方得 1
  k.push({ key: 'varna', name: '心性层次（Varna）', max: 1, score: (VARNA[boy.varna] || 0) >= (VARNA[girl.varna] || 0) ? 1 : 0 });
  // 2 Vashya
  k.push({ key: 'vashya', name: '步调一致（Vashya）', max: 2, score: VASHYA_T[idx(VASHYA, boy.vashya)][idx(VASHYA, girl.vashya)] });
  // 3 Tara：两个方向各 1.5
  k.push({ key: 'tara', name: '彼此的星宿吉凶（Tara）', max: 3, score: (taraOK(girl.nak, boy.nak) ? 1.5 : 0) + (taraOK(boy.nak, girl.nak) ? 1.5 : 0) });
  // 4 Yoni
  const yb = idx(YONI, boy.yoni), yg = idx(YONI, girl.yoni);
  k.push({ key: 'yoni', name: '本能和亲密（Yoni）', max: 4, score: YONI_T[yg][yb], a: YONI_CN[idx(YONI, A.yoni)], b: YONI_CN[idx(YONI, B.yoni)] });
  // 5 Graha Maitri：两人月亮星座主星互相看
  const la = LORD[A.sign], lb = LORD[B.sign];
  const pair = la === lb ? 'ff' : [rel(la, lb), rel(lb, la)].sort((p, q) => 'fne'.indexOf(p) - 'fne'.indexOf(q)).join('');
  k.push({ key: 'maitri', name: '心意相通（Graha Maitri）', max: 5, score: MAITRI[pair], a: PLANET[la], b: PLANET[lb] });
  // 6 Gana
  k.push({ key: 'gana', name: '脾气（Gana）', max: 6, score: GANA_T[idx(GANA, boy.gana)][idx(GANA, girl.gana)], a: GANA_CN[idx(GANA, A.gana)], b: GANA_CN[idx(GANA, B.gana)] });
  // 7 Bhakoot：月亮星座相隔
  const d = (B.sign - A.sign + 12) % 12 + 1, bad = [2, 12, 5, 9, 6, 8].includes(d);   // 二十二、九五、六八 三种相隔扣分（反过来数也是同一对）
  const lordCodes = la === lb ? ['same_lord'] : rel(la, lb) === 'f' && rel(lb, la) === 'f' ? ['lords_friends'] : [];   // 互友要两个方向都是朋友
  const bhCodes = bad ? lordCodes : [];
  k.push({ key: 'bhakoot', name: '家运和财（Bhakoot）', max: 7, score: bad ? 0 : 7, effective_score: bad && !bhCodes.length ? 0 : 7, raw_dosha: bad, effective_dosha: bad && !bhCodes.length, cancellation_reason_codes: bhCodes, apart: d });
  // 8 Nadi
  const sameNadi = A.nadi === B.nadi;
  const naCodes = sameNadi ? [A.sign === B.sign && A.nak !== B.nak ? 'same_sign_diff_nak' : null, A.nak === B.nak && A.sign !== B.sign ? 'same_nak_diff_sign' : null,
    A.nak === B.nak && A.pada !== B.pada ? 'same_nak_diff_pada' : null, ...lordCodes].filter(Boolean) : [];
  k.push({ key: 'nadi', name: '体质和后代（Nadi）', max: 8, score: sameNadi ? 0 : 8, effective_score: sameNadi && !naCodes.length ? 0 : 8, raw_dosha: sameNadi, effective_dosha: sameNadi && !naCodes.length, cancellation_reason_codes: naCodes, a: NADI_CN[idx(NADI, A.nadi)], b: NADI_CN[idx(NADI, B.nadi)] });
  for (const x of k) if (!('effective_score' in x)) x.effective_score = x.score;
  const total = k.reduce((s, x) => s + x.score, 0), total_effective = k.reduce((s, x) => s + x.effective_score, 0);
  const ma = A.manglik.effective, mb = B.manglik.effective;
  return {
    schema: 'xuanji.vedic_milan/0.2',
    roles: { traditional, boy: boyIsA ? 'a' : 'b' },
    a: { moon: SIGN[A.sign], nak: NAK[A.nak - 1] + '宿', pada: A.pada },
    b: { moon: SIGN[B.sign], nak: NAK[B.nak - 1] + '宿', pada: B.pada },
    kootas: k, total, total_effective, max: 36,
    band: total >= 33 ? '很好' : total >= 25 ? '不错' : total >= 18 ? '中等' : '偏低',
    manglik: { a: A.manglik, b: B.manglik, pair_cancel: ma && mb,
      verdict: ma && mb ? '两人取消后都还有，配对时看成互相抵消' : !ma && !mb ? (A.manglik.raw || B.manglik.raw ? '有的那一方按个人条件取消了，配对时不算' : '两人都没有') : '一人有一人没有，常见说法当成要留意的一项' },
    reasons: REASON,
    conventions: { rules: 'v2_20261025', tables: 'prokerala_astrosage_common_saravali_yoni', manglik: 'lagna_moon_venus_individual_cancel_own_exalted_jupiter_mitigation_only', cancellations: 'raw_and_effective' },
  };
}

// ── 按关系分、前世业力、本命动物 ──
// 跟网页 yinzhan/yz-milan.js 同一段（GROUP、relScore、karmaHits、animalOf），改一处要两边一起改
const GROUP = (rel) => (rel === '朋友' ? 'friend' : rel === '家人' ? 'family' : ['同事', '客户', '其他', '路人'].includes(rel) ? 'other' : 'love');
const REL_KEYS = { friend: ['varna', 'vashya', 'tara', 'maitri', 'gana'], family: ['vashya', 'tara', 'maitri', 'gana', 'bhakoot'], other: ['varna', 'vashya', 'tara', 'maitri', 'gana'] };
export function relScore(M, g) {
  const ks = M.kootas.filter((k) => REL_KEYS[g].includes(k.key)), got = ks.reduce((s, k) => s + k.effective_score, 0), max = ks.reduce((s, k) => s + k.max, 0), pct = Math.round(got / max * 100);
  return { keys: REL_KEYS[g], got, max, pct, band: pct >= 85 ? '很合' : pct >= 70 ? '合得来' : pct >= 55 ? '还不错' : '慢慢处' };
}
const SEVEN = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const orbOf = (p, q) => { const x = Math.abs(p - q) % 360; return Math.min(x, 360 - x); };
// 一人的七颗星压对方计都／罗睺（8 度内，带耶米尼代表星角色）、两人南北交点对调、土星贴对方月亮太阳金星、对方的木星月亮金星落你十二／九／五宫（上升、月亮各数一遍）、灵魂星同一颗
export function karmaHits(rA, rB) {
  const H = [], P = { a: rA, b: rB }, role = (r, p) => Object.keys(r.karakas || {}).find((k) => r.karakas[k] === p) || '';
  for (const [x, y] of [['a', 'b'], ['b', 'a']]) {
    const X = P[x], Y = P[y];
    for (const p of SEVEN) {
      for (const nd of ['ketu', 'rahu']) { const o = orbOf(X.planets[p].lon, Y.planets[nd].lon); if (o <= 8) H.push({ type: nd, from: x, planet: p, role: role(X, p), orb: +o.toFixed(1) }); }
    }
    if (x === 'a') { const o = orbOf(X.planets.rahu.lon, Y.planets.ketu.lon); if (o <= 8) H.push({ type: 'flip', orb: +o.toFixed(1) }); }
    for (const t of ['moon', 'sun', 'venus']) { const o = orbOf(X.planets.saturn.lon, Y.planets[t].lon); if (o <= 8) H.push({ type: 'saturn', from: x, to: t, orb: +o.toFixed(1) }); }
    for (const p of ['jupiter', 'moon', 'venus']) {
      const hs = [['lagna', Y.asc.sign], ['moon', Y.planets.moon.sign]].map(([base, s]) => ({ base, house: (X.planets[p].sign - s + 12) % 12 + 1 })).filter((h) => [12, 9, 5].includes(h.house));
      if (hs.length) H.push({ type: 'house', from: x, planet: p, at: hs });
    }
  }
  if (rA.karakas && rB.karakas && rA.karakas.AK && rA.karakas.AK === rB.karakas.AK) H.push({ type: 'same_ak', planet: rA.karakas.AK });
  return H;
}
// 本命动物不出公母（听着像骂人），只给中文名＋英文名
export const animalOf = (r) => { const i = YONI.indexOf(r.avakahada.yoni); return { cn: YONI_CN[i], en: YONI[i], nak: NAK[r.moon.nak - 1] }; };
const BIG_CAT = ['狮', '虎', '猫'];
function animalPairKind(a, b) {
  if (a === b) return 'same';
  if (BIG_CAT.includes(a) && BIG_CAT.includes(b)) return 'big_cats';
  const ia = YONI_CN.indexOf(a), ib = YONI_CN.indexOf(b), s = Math.max(YONI_T[ia][ib], YONI_T[ib][ia]);
  return s >= 3 ? 'friendly' : s === 2 ? 'different' : s === 1 ? 'complement' : 'rivals';
}

const FLAGS = ['--a', '--b', '--sex-a', '--sex-b', '--out', '--relation'];
export async function main(args) {
  const f = {};
  for (let i = 0; i < args.length; i += 2) { const k = args[i], v = args[i + 1]; if (!FLAGS.includes(k) || !v || v.startsWith('--') || f[k]) throw Error('MILAN_CONFIG_INVALID'); f[k] = v; }
  if (!f['--a'] || !f['--b'] || !f['--out'] || !/\.json$/i.test(f['--out'])) throw Error('MILAN_CONFIG_INVALID');
  for (const s of [f['--sex-a'], f['--sex-b']]) if (s && !['male', 'female'].includes(s)) throw Error('MILAN_CONFIG_INVALID');
  if (existsSync(f['--out'])) throw Error('OUTPUT_EXISTS');
  const va = await readPrivateJSON(f['--a'], 524288), vb = await readPrivateJSON(f['--b'], 524288);
  for (const v of [va, vb]) {
    try { safeData(v); } catch { throw Error('VEDIC_INVALID'); }
    if (!v || v.schema !== 'xuanji.vedic/0.1') throw Error('VEDIC_INVALID');
    if (v.status === 'time_unknown') throw Error('VEDIC_TIME_UNKNOWN');   // 有一方没出生时间：印占合盘不做，普通合盘照做
    if (v.status !== 'ok' || !v.chart || !v.chart.avakahada || !v.chart.moon || !v.chart.manglik || !v.chart.maitri) throw Error('VEDIC_INVALID');
  }
  let out;
  try {
    out = milanOf(va.chart, vb.chart, f['--sex-a'], f['--sex-b']);
    const rel = f['--relation'] || '', g = GROUP(rel), aa = animalOf(va.chart), ab = animalOf(vb.chart);
    out.relation = { label: rel || '未说', group: g };   // 不说关系按婚配（36 分原样）
    if (g !== 'love') out.rel_score = relScore(out, g);
    out.karma = karmaHits(va.chart, vb.chart);
    out.animals = { a: aa, b: ab, pair: animalPairKind(aa.cn, ab.cn) };
  } catch { throw Error('VEDIC_INVALID'); }
  await writePrivateText(f['--out'], JSON.stringify(out, null, 1));
  console.log('MILAN_SAVED');
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  const allowed = ['MILAN_CONFIG_INVALID', 'PRIVATE_FILE_INVALID', 'OUTPUT_EXISTS', 'VEDIC_INVALID', 'VEDIC_TIME_UNKNOWN'];
  console.error(allowed.includes(e.message) ? e.message : 'MILAN_FAILED'); const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); process.exitCode = 1;
});
