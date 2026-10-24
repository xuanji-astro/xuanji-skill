// 紫微排盘报告：把 /v1/ziwei 回来的整盘画成一张静态页，只放盘和数据、不写解读（解读在对话里，照 reference/紫微.md）。
// 盘面照吉真紫微的三合盘：每宫主星、辅星、杂曜带亮度和生年四化，宫干自化／对宫化入，流年、小限岁数，
// 博士／将前／岁前三套神、长生十二宫、大限岁数、宫干支；三方四正和命宫着底色；四周标方位；盘下大限、流年、流月三条。
// 字都在文件里，打开不靠脚本；盘中间照吉真印真太阳时、北京时间、农历时间和节气四柱（不印出生地点）；数据包另外不印这些。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { ziweiPack, ORDER, HUA, byName, mingStars, starText } from './ziwei_pack.mjs';

const CSS = () => readFileSync(new URL('../template/vedic.css', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../template/ziwei.css', import.meta.url), 'utf8');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = (s) => s.replace(/-/g, '.');
const sec = (title, sub, sk, body) => `<section class="sec"><div class="sh"><b>${esc(title)}</b><span>${esc(sub)}</span>${sk ? `<i>${esc(sk)}</i>` : ''}</div>${body}</section>`;
const Z = '子丑寅卯辰巳午未申酉戌亥';
// 地支在盘里的格子（6×6 网格：外圈一行一列写方位，里面 4×4 是十二宫）：巳午未申 在上，寅丑子亥 在下，辰卯 在左，酉戌 在右
const CELL = { 巳: [2, 2], 午: [2, 3], 未: [2, 4], 申: [2, 5], 辰: [3, 2], 酉: [3, 5], 卯: [4, 2], 戌: [4, 5], 寅: [5, 2], 丑: [5, 3], 子: [5, 4], 亥: [5, 5] };
const DIR = { 子: '正北方', 丑: '北偏东', 寅: '东偏北', 卯: '正东方', 辰: '东偏南', 巳: '南偏东', 午: '正南方', 未: '南偏西', 申: '西偏南', 酉: '正西方', 戌: '西偏北', 亥: '北偏西' };
const SRC = { birth_certificate: '出生证', family_clear: '家里记得清楚', family_rough: '家里记得大概', unknown: '不清楚来源' };
const BASIS = { paipan: '跟八字同一个真太阳时', local: '按出生地经度和均时差算的真太阳时' };

// 星曜分色照吉真：主星红、吉星紫（左辅右弼文昌文曲天魁天钺禄存天马）、煞星蓝（擎羊陀罗火星铃星地空地劫）、杂曜黑；四化另打色块角标
const JI = new Set(['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马']), SHA = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);
const kindOf = (s, major) => (major ? 'm' : JI.has(s.name) ? 'j' : SHA.has(s.name) ? 'x' : 'a');
const starHTML = (s, kind) => `<span class="st ${kind}"><b>${[...s.name].map(esc).join('<br>')}</b><i>${s.brightness ? esc(s.brightness) : '&nbsp;'}</i>${s.mutagen ? `<u class="h-${s.mutagen}">${esc(s.mutagen)}</u>` : ''}</span>`;
// 五行配色（节气四柱、八字大运）：木绿、火红、土赭、金橙、水蓝
const WX = { 甲: 'mu', 乙: 'mu', 丙: 'huo', 丁: 'huo', 戊: 'tu', 己: 'tu', 庚: 'jin', 辛: 'jin', 壬: 'shui', 癸: 'shui', 寅: 'mu', 卯: 'mu', 巳: 'huo', 午: 'huo', 辰: 'tu', 戌: 'tu', 丑: 'tu', 未: 'tu', 申: 'jin', 酉: 'jin', 亥: 'shui', 子: 'shui' };
const gz = (ch) => `<em class="wx-${WX[ch] || 'tu'}">${esc(ch)}</em>`;
const hua = (h) => `<u class="h-${h}">${h}</u>`;
const whereStar = (c, n) => { const p = c.palaces.find((x) => [...x.major, ...x.minor].some((s) => s.name === n)); return p ? p.name : '—'; };

function chartGrid(c) {
  const P = byName(c), now = c.now, yearNow = now.years[0], curDec = now.decadal && now.decadal.palace;
  const ming = P['命宫'], mi = Z.indexOf(ming.branch), sfsz = new Set([4, 6, 8].map((k) => Z[(mi + k) % 12]));   // 三方四正：命宫、财帛（+8）、官禄（+4）、迁移（+6）
  const cells = c.palaces.map((p) => {
    const [r, col] = CELL[p.branch];
    const cls = ['zc', p.name === '命宫' ? 'ming' : sfsz.has(p.branch) ? 'sf' : '', p.name === curDec ? 'cur' : ''].filter(Boolean).join(' ');
    const fx = [...p.self_hua.map((h) => `<span class="fh zh h-${h}" title="本宫自化${h}">↓</span>`), ...p.opp_in.map((h) => `<span class="fh rh h-${h}" title="对宫化入${h}">↗</span>`)].join('');
    return `<div class="${cls}" style="grid-row:${r};grid-column:${col}">${yearNow && yearNow.palace === p.name ? `<span class="yr">${yearNow.year}</span>` : ''}` +
      `<div class="ss">${p.major.map((s) => starHTML(s, 'm')).join('')}${p.minor.map((s) => starHTML(s, kindOf(s))).join('')}${p.adjective.map((s) => starHTML(s, 'a')).join('')}</div>` +
      (fx ? `<div class="fx">${fx}</div>` : '') +
      `<div class="ag"><span>流年:${p.liunian.slice(0, 6).join(',')}</span><span>小限:${p.xiaoxian.slice(0, 6).join(',')}</span></div>` +
      `<div class="bt"><div class="zl"><span>${esc(p.boshi)} <b>${p.decadal.start}～${p.decadal.end}</b></span><span>${esc(p.jiangqian)}</span><span>${esc(p.suiqian)}</span></div>` +
      `<b class="pn">${esc(p.name)}</b><div class="zr">${p.is_body ? '<em class="sg">身<br>宫</em>' : ''}<i>${esc(p.changsheng)}</i><b>${esc(p.stem)}<br>${esc(p.branch)}</b></div></div></div>`;
  }).join('');
  const dirs = Object.entries(CELL).map(([b, [r, col]]) => {
    if (r === 2 && col > 2 && col < 5) return `<span class="dir t" style="grid-row:1;grid-column:${col}">${DIR[b]}</span>`;
    if (r === 5 && col > 2 && col < 5) return `<span class="dir t" style="grid-row:6;grid-column:${col}">${DIR[b]}</span>`;
    if (col === 2) return `<span class="dir v" style="grid-row:${r};grid-column:1">${DIR[b]}</span>`;
    return `<span class="dir v" style="grid-row:${r};grid-column:6">${DIR[b]}</span>`;
  }).join('');
  const luck = c.bazi_luck ? `<div class="lk">${c.bazi_luck.map((x, k, arr) => `<span><b>${esc(x.ganzhi[0])}</b><b>${esc(x.ganzhi[1])}</b><i>${x.start_age}${k === arr.length - 1 ? '虚岁' : '岁'}</i></span>`).join('')}</div>` : '';
  const T = c.time, L = c.lunar;
  const center = `<div class="zm"><b class="ttl">执天玄玑紫微</b>` +
    `<div class="ln nm"><b>${esc(c.yinyang)} ${esc(c.five_elements)}</b></div>` +
    `<div class="ln"><i>真太阳时</i><b>${esc(T.true_solar)}</b></div>` +
    (T.clock ? `<div class="ln"><i>北京时间</i><b>${esc(T.clock)}</b></div>` : '') +
    (L.ganzhi_text ? `<div class="ln"><i>农历时间</i><b>${esc(L.ganzhi_text)}</b></div>` : '') +
    (c.pillars ? `<div class="ln pz"><i>节气四柱</i><span class="zpc">${c.pillars.map((p) => `<span>${gz(p[0])}${gz(p[1])}</span>`).join('')}</span></div>` : '') + luck +
    `<div class="kv2"><span><i>命主</i><b>${esc(c.soul)}</b></span><span><i>身主</i><b>${esc(c.body)}</b></span><span><i>子斗</i><b>${esc(c.doujun)}</b></span>${yearNow ? `<span><i>流斗</i><b>${esc(yearNow.doujun)}</b></span>` : ''}</div>` +
    `<div class="kv2"><span><i>本宫自化</i><b class="ic zh">↓</b></span><span><i>对宫化入</i><b class="ic rh">↗</b></span></div>` +
    `<div class="ln"><i>四化颜色</i><span class="hc">${HUA.map((h) => `<em class="c-${h}">${h}</em>`).join('')}</span></div>` +
    `<div class="ln sm"><i>生年四化</i><span class="hz">${c.sihua.map((x) => `<span>${esc(x.star)}${hua(x.hua)}</span>`).join('')}</span></div>` + '</div>';
  return `<div class="zw">${dirs}${cells}${center}</div>`;
}

function strips(c) {
  const now = c.now, curDec = now.decadal && now.decadal.palace, yearNow = now.years[0];
  const dec = [...c.palaces].sort((a, b) => a.decadal.start - b.decadal.start);
  const byB = Object.fromEntries(c.palaces.map((p) => [p.branch, p.name]));
  const row = (lab, cells) => `<div class="zr2"><b class="zlab">${lab}</b><div class="zcs" style="grid-template-columns:repeat(${cells.length},minmax(0,1fr))">${cells.join('')}</div></div>`;
  const dx = [...(c.tongxian.length ? [`<span class="zc2"><i>起限前</i><b>(童限)</b><em>${c.tongxian.map((x) => x.age).join('、')}岁</em></span>`] : []),
    ...dec.map((p) => `<span class="zc2${p.name === curDec ? ' zon' : ''}"><i>${p.decadal.start}~${p.decadal.end}</i><b>${esc(p.decadal.stem + p.decadal.branch)}</b><em>${esc(p.name)}</em></span>`)];
  const ln = now.decade_years.map((y) => `<span class="zc2${yearNow && y.year === yearNow.year ? ' zon' : ''}"><i>${y.year}</i><b>${y.age}岁</b><b>${esc(y.stem + y.branch)}</b><em>${esc(byB[y.branch])}</em></span>`);
  const lm = yearNow ? yearNow.months.map((m) => `<span class="zc2${m.when === 'now' ? ' zon' : ''}"><b>${esc(m.month)}</b><em>${esc(m.palace)}</em></span>`) : [];
  return `<div class="zst">${row('大限', dx)}${ln.length ? row('流年', ln) : ''}${lm.length ? row(`流月<i>${yearNow.year}</i>`, lm) : ''}</div>`;
}

export function renderZiwei(c, { qr = null, timeSource = 'unknown' } = {}) {
  const P = byName(c), out = [], now = c.now, ms = mingStars(c), body = c.palaces.find((p) => p.is_body);
  const curDec = now.decadal && now.decadal.palace;

  // 封面一行，盘放第一页
  out.push(`<div class="ztop"><b>执天玄玑紫微</b><span>三合 · 数据日期 ${ymd(c.today)}</span></div>`);
  out.push(`<section class="sec zsec">${chartGrid(c)}${strips(c)}</section>`);

  // 基本信息
  out.push(`<section class="sec"><div class="ids">` +
    `<div class="card id"><i>命宫主星</i><b>${ms.stars.length ? ms.stars.map((s) => esc(s.name)).join('') : '无主星'}</b><em>命宫${esc(P['命宫'].stem + P['命宫'].branch)}${ms.borrowed ? '<br>借对宫迁移的主星' : ''}</em></div>` +
    `<div class="card id"><i>五行局</i><b>${esc(c.five_elements)}</b><em>${esc(c.yinyang)}<br>大限从 ${P['命宫'].decadal.start} 岁起</em></div>` +
    `<div class="card id"><i>身宫</i><b>${esc(body.name)}</b><em>命主${esc(c.soul)} · 身主${esc(c.body)}</em></div></div>` +
    `<div class="card params"><p><span>三合派通行安星</span> · <span>时辰用<b>${esc(BASIS[c.time.basis] || '真太阳时')}</b></span> · <span>23 点换日</span> · <span>年按农历正月初一</span><br><span>${esc(c.lunar.leap_rule)}${c.lunar.leap ? '（这张盘生在闰月）' : ''}</span> · <span>出生时间：<b>${esc(SRC[timeSource] || SRC.unknown)}</b></span>${c.time.near_boundary ? ` · <span>离时辰交界 <b>${c.time.minutes_to_boundary} 分钟</b>，命宫可能差一格</span>` : ''}</p></div></section>`);

  // 十二宫细表
  const rows = ORDER.map((n) => { const p = P[n];
    return `<tr${n === curDec ? ' class="znow"' : ''}><td class="k">${esc(n)}${p.is_body ? '<span class="s r"> 身</span>' : ''}</td><td>${esc(p.stem + p.branch)}</td><td class="w">${esc(p.major.map(starText).join('、') || '无主星')}</td><td class="w">${esc(p.minor.map(starText).join('、') || '—')}</td><td>${p.decadal.start}～${p.decadal.end}</td></tr>`
      + `<tr class="za${n === curDec ? ' znow' : ''}"><td></td><td colspan="4" class="w">杂曜：${esc(p.adjective.map((s) => s.name + (s.brightness ? `（${s.brightness}）` : '')).join('、') || '—')}　·　${esc(p.changsheng)} · ${esc(p.boshi)} · ${esc(p.jiangqian)} · ${esc(p.suiqian)}${p.self_hua.length ? '　·　自化' + p.self_hua.join('') : ''}${p.opp_in.length ? '　·　对宫化入' + p.opp_in.join('') : ''}</td></tr>`; }).join('');
  out.push(sec('十二宫', '星曜明细', 'Palaces', `<div class="card tb"><table><tr><th>宫</th><th>干支</th><th>主星</th><th>辅星</th><th>大限</th></tr>${rows}</table></div>`));

  // 四化：生年、大限、三年流年，各自落在哪一宫
  const line = (label, names, cls = '') => `<tr${cls}><td class="k">${esc(label)}</td>${names.map((n, i) => `<td class="w">${esc(n)}${hua(HUA[i])}<br><span style="color:var(--faint);font-size:11px">${esc(whereStar(c, n))}</span></td>`).join('')}</tr>`;
  const birth = HUA.map((h) => (c.sihua.find((x) => x.hua === h) || {}).star || '—');
  let t4 = line('生年', birth);
  if (now.decadal) t4 += line(`大限 ${now.decadal.stem}${now.decadal.branch}`, now.decadal.mutagen, ' class="znow"');
  for (const y of now.years) t4 += line(`${y.year} ${y.stem}${y.branch}`, y.mutagen);
  out.push(sec('四化', '生年、大限、流年', 'Si Hua', `<div class="card tb nb"><table><tr><th></th>${HUA.map((h) => `<th>化${h}</th>`).join('')}</tr>${t4}</table></div>`));

  // 附：数据包、创始人、页脚
  const pack = ziweiPack(c, { timeSource });
  out.push(`<div class="vt"><b>附 · 紫微数据包</b><span>FOR ANY AI</span></div>`);
  out.push(`<section class="sec"><div class="card pk"><p class="tip">下面这一段可以整段复制，贴给你常用的 AI 接着聊；压缩包里的「紫微数据包.txt」是同一份。想照玄玑的读法深聊，直接在装了执天玄玑 Skill 的对话里问。</p><pre>${esc(pack)}</pre></div></section>`);
  if (qr) out.push(`<section class="sec"><div class="card fd"><img src="${qr}" alt="创始人微信"><div><div class="t">想看得更细</div><ul><li>创始人亲自把紫微和八字、星盘合起来看</li><li>大限流年走到哪一步，细到哪几个月</li><li>你最在意的那件事，当面帮你盘</li></ul><span class="wx">微信 liin1223<em> · 备注「紫微」</em></span></div></div></section>`);
  out.push('<p class="ft">排盘：执天玄玑 xuanji-astro.com · 紫微按三合派通行安星<br>仅供参考，不承诺特定结果，不替代法律、投资、医疗等专业意见。</p>');
  const html = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>紫微排盘 · 执天玄玑</title>\n<style>\n${CSS()}\n</style></head><body><div class="pg">\n${out.join('\n')}\n</div></body></html>\n`;
  return { html, pack };
}
