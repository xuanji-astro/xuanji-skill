// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 紫微三个专题报告：命宫主星、夫妻宫、财帛宫。
// 判断都在 report.json 里；盘面（三方四正图、大限流年四化落哪宫）由这里照 ziwei.json 画，不让 AI 抄。
// 查：骨架的段一段不少、每段有盘上依据（宫里真有那几颗星）、正文里写的「某星化某」「某星（庙旺）」跟盘对得上。
import { esc, tx, page, part, remember, doorCard, asks, founder } from './doc_render.mjs';

const arr = (v) => (Array.isArray(v) ? v : []);
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const HUA = ['禄', '权', '科', '忌'];
const Z = '子丑寅卯辰巳午未申酉戌亥';
// 题目：看哪一宫、骨架几段（最后的「这几年」统一放进 years，照大限＋三年流年一段一段写）
export const TOPICS = {
  ming: { palace: '命宫', name: '命宫主星', title: '你是谁', sections: ['底色', '行事', '感情', '得用', '注意'], years: '这几年的你' },
  fuqi: { palace: '夫妻', name: '夫妻宫', title: '你会爱上谁', sections: ['你会爱上谁', '你在关系里的样子', '磕绊在哪'], years: '这几年的感情气候' },
  caibo: { palace: '财帛', name: '财帛宫', title: '你的钱从哪来', sections: ['你的钱从哪来', '进财的姿势', '财上的磕绊'], years: '这几年的钱景' },
};
// 封面三句不放紫微术语（术语挪到「依据」那行）
export const ZW_COVER_TERMS = ['化禄', '化权', '化科', '化忌', '大限', '庙', '陷', '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];

const stars = (p) => [...arr(p.major), ...arr(p.minor), ...arr(p.adjective)];
// 依据里的星：数组，或者一串用顿号隔开的字都认
export const starList = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[、，,\s]+/)).map((s) => String(s).trim()).filter(Boolean);
const len = (s) => [...String(s ?? '').replaceAll('**', '').replace(/\s/g, '')].length;
const sanfang = (c, name) => { const b = Z.indexOf(c.palaces.find((p) => p.name === name).branch); return [0, 4, 8, 6].map((k) => Z[(b + k) % 12]); };
// 大限、三年流年：每段四化落在哪一宫（星落哪宫照盘找）
export function periods(c) {
  const where = Object.fromEntries(c.palaces.flatMap((p) => [...arr(p.major), ...arr(p.minor)].map((s) => [s.name, p])));
  const four = (m) => arr(m).map((s, i) => ({ star: s, hua: HUA[i], palace: where[s]?.name || '', branch: where[s]?.branch || '' }));
  const d = c.now.decadal, out = [];
  if (d) out.push({ label: `这步大限 · ${d.start}～${d.end} 岁`, gz: d.stem + d.branch, palace: d.palace, hua: four(d.mutagen) });
  for (const y of arr(c.now.years)) out.push({ label: `${y.year} 年`, gz: y.stem + y.branch, palace: y.palace, hua: four(y.mutagen) });
  return out;
}

// 查：返回 [类别, 字段路径]
export function checkZiweiDoc(R, c) {
  const bad = [], say = (cat, path) => bad.push([cat, path]);
  const T = TOPICS[R.topic];
  if (!T) return [['ZIWEI_TOPIC', 'topic']];
  const secs = arr(R.sections);
  if (secs.length !== T.sections.length || secs.some((s, i) => s?.title !== T.sections[i])) say('ZIWEI_SECTIONS', 'sections');
  const P = Object.fromEntries(c.palaces.map((p) => [p.name, p]));
  // 篇幅：报告要写足——骨架每一段合起来至少 500 字，大限流年每段至少 150 字
  arr(R.years).forEach((y, i) => { if (len(y) < 150) say('LENGTH_SHORT', `years[${i + 1}]`); });
  secs.forEach((s, i) => {
    const ps = arr(s?.paras);
    if (ps.length < 3 || ps.length > 5) say('ITEM_COUNT', `sections[${i + 1}].paras`);
    if (ps.reduce((b, x) => b + len(x), 0) < 500) say('LENGTH_SHORT', `sections[${i + 1}].paras`);
    const bs = arr(s?.basis);
    if (bs.length < 1 || bs.length > 4) say('ITEM_COUNT', `sections[${i + 1}].basis`);
    // 依据：宫要有，写的星要真坐在那一宫
    bs.forEach((b, j) => { const p = P[b?.palace], ns = starList(b?.stars); if (!p || !ns.length || ns.some((n) => !stars(p).some((s2) => s2.name === n))) say('ZIWEI_BASIS', `sections[${i + 1}].basis[${j + 1}]`); });
  });
  if (arr(R.years).length !== periods(c).length) say('ITEM_COUNT', 'years');
  // 正文里写到的四化、亮度要跟盘对得上：四化只能是生年、这步大限、这三年流年给过的那几个
  const text = JSON.stringify(R);
  const ok = new Set([...c.sihua.map((x) => x.star + x.hua), ...periods(c).flatMap((p) => p.hua.map((h) => h.star + h.hua))]);
  const names = [...new Set(c.palaces.flatMap((p) => [...arr(p.major), ...arr(p.minor)].map((s) => s.name)))].sort((a, b) => b.length - a.length);
  const bright = Object.fromEntries(c.palaces.flatMap((p) => [...arr(p.major), ...arr(p.minor)].map((s) => [s.name, s.brightness || ''])));
  const N = names.join('|');
  for (const m of text.matchAll(new RegExp(`(${N})化(禄|权|科|忌)`, 'g'))) if (!ok.has(m[1] + m[2])) { say('ZIWEI_SIHUA', '*'); break; }
  for (const m of text.matchAll(new RegExp(`(${N})[（(](庙|旺|得|利|平|不|陷)[）)]`, 'g'))) if (bright[m[1]] !== m[2]) { say('ZIWEI_BRIGHTNESS', '*'); break; }
  // 「某星化某在／进／落在某宫」：那颗星得真坐在那一宫
  const home = Object.fromEntries(c.palaces.flatMap((p) => [...arr(p.major), ...arr(p.minor)].map((s) => [s.name, p.name])));
  const PN = c.palaces.map((p) => p.name).join('|');
  for (const m of text.matchAll(new RegExp(`(${N})化[禄权科忌](?:落在|落进|落|坐在|在|进了|进|入|到)(?:你的)?(${PN})`, 'g'))) if (home[m[1]] !== m[2]) { say('ZIWEI_PALACE', '*'); break; }
  return bad;
}

// 三方四正小盘：十二宫照地支摆一圈，这一题的宫实色、三方四正淡色，中间写题目
const POS = { 巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4], 辰: [2, 1], 酉: [2, 4], 卯: [3, 1], 戌: [3, 4], 寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4] };
function miniChart(c, T) {
  const sf = sanfang(c, T.palace);
  const cells = c.palaces.map((p) => {
    const [r, col] = POS[p.branch], on = p.name === T.palace, tint = !on && sf.includes(p.branch);
    const st = arr(p.major).map((s) => `<span class="zd-st">${esc(s.name)}<i>${esc(s.brightness || '')}</i>${s.mutagen ? `<u class="zd-h${HUA.indexOf(s.mutagen)}">${esc(s.mutagen)}</u>` : ''}</span>`).join('');
    const mi = arr(p.minor).filter((s) => s.mutagen).map((s) => `<span class="zd-st m">${esc(s.name)}<u class="zd-h${HUA.indexOf(s.mutagen)}">${esc(s.mutagen)}</u></span>`).join('');
    return `<div class="zd-c${on ? ' on' : tint ? ' sf' : ''}" style="grid-row:${r};grid-column:${col}"><div class="zd-ss">${st || '<span class="zd-empty">无主星</span>'}${mi}</div><div class="zd-pn">${esc(p.name)}${p.is_body ? '<em>身</em>' : ''}<b>${esc(p.stem + p.branch)}</b></div></div>`;
  }).join('');
  return `<div class="zd-grid">${cells}<div class="zd-mid"><b>${esc(T.name)}</b><span>实色是这一宫<br>淡色是它的三方四正</span></div></div>`;
}

export function renderZiweiDoc({ chart: c, report: R, qr }) {
  const T = TOPICS[R.topic], sf = sanfang(c, T.palace), cv = R.cover || {}, g = R.glance || {};
  const cover = `<div class="card cover seen"><div class="cvrow"><div class="lab" style="margin:0">玄玑看见的你 · ${esc(T.name)}</div>${cv.stamp ? `<div class="stamp two"><b>${esc(cv.stamp)}</b><small></small></div>` : ''}</div>
<div class="seenp">${(Array.isArray(cv.seen) ? cv.seen : String(cv.seen || '').split('\n')).map((s) => esc(String(s).trim())).filter(Boolean).join('<br>')}</div>${cv.evidence ? `<div class="seenev">${esc(cv.evidence)}</div>` : ''}<div class="seenft"><span class="mirror">紫微斗数 · 三合</span><b class="sig">Xuanji 玄玑</b></div></div>`;
  const p1 = `${part('p1', '壹', '一眼', '看懂')}<div class="card"><div class="lab">${esc(T.title)}</div><p class="para zd-one">${tx(R.oneline)}</p>
<div class="pts">${arr(g.points).map((p, i) => `<div><i>${'一二三'[i]}</i><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div>`).join('')}</div></div>
<div class="card"><div class="lab">盘上这一宫</div>${miniChart(c, T)}<div class="cap">四化角标：<u class="zd-h0">禄</u> <u class="zd-h1">权</u> <u class="zd-h2">科</u> <u class="zd-h3">忌</u>　「身」是身宫</div></div>`;
  const p2 = `${part('p2', '贰', '细', '讲')}${arr(R.sections).map((s) => `<div class="card"><div class="lab">${esc(s.title)}</div>${arr(s.paras).map((x) => `<p class="para">${tx(x)}</p>`).join('')}<div class="zd-basis"><span>盘上依据</span>${arr(s.basis).map((b) => `<em>${esc(b.palace)}：${esc(starList(b.stars).join('、'))}</em>`).join('')}</div></div>`).join('')}`;
  const pr = periods(c);
  const p3 = `${part('p3', '叁', '这', '几年')}<div class="card"><div class="lab">${esc(T.years)}</div>${pr.map((p, i) => `<div class="zd-yr"><div class="zd-yh"><b>${esc(p.label)}</b><span>${esc(p.gz)} · ${p.label.startsWith('这步') ? '大限' : '流年'}命宫在${esc(p.palace)}</span></div><div class="zd-hua">${p.hua.map((h) => `<span class="${sf.includes(h.branch) ? 'hit' : ''}">${esc(h.star)}<u class="zd-h${HUA.indexOf(h.hua)}">${esc(h.hua)}</u>→${esc(h.palace)}</span>`).join('')}</div><p class="para">${tx(arr(R.years)[i])}</p></div>`).join('')}<div class="cap">描了边的四化落在${esc(T.name === '命宫主星' ? '命宫' : T.name)}的三方四正里，这一段这块事格外有感</div></div>`;
  const lp = R.loop || {};
  const p4 = `${part('p4', '肆', '回到', '你身上')}<div class="card"><div class="lab">军师谏言</div>${arr(R.advisors).map((a) => `<div class="jun"><div class="av">${esc([...String(a.name).replace(/^.*·/, '')][0] || '')}</div><div><div class="who"><b>${esc(a.name)}</b> · ${esc(a.title)}</div><p class="para" style="font-size:14px;margin-top:2px">${tx(a.advice)}</p></div></div>`).join('')}</div>
<div class="card loop">${remember(lp.remember)}${lp.back_msg ? doorCard('到时候，回来发这一句', [{ msg: lp.back_msg, to: '回来对一对' }]) : ''}</div>`;
  return page(`玄玑 · 紫微 · ${T.name}`, '玄玑 · 紫微专题', [cover, p1, p2, p3, p4, asks(R.next_questions), founder(qr, ['创始人亲自看你这张紫微盘', '大限流年细到哪一年', '跟八字、星盘合起来看'], '紫微专题')].join('\n'));
}
