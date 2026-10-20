// 印占排盘报告：把 /v1/vedic 回来的整盘画成一张静态页（样子照网站印占排盘页），只放盘和数据、不写解读。
// 字和图都在文件里，打开不靠脚本；不印出生日期、时间和地点。末尾附印占数据包（可以整段贴给别的 AI）。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { chartSVG, chartCSS, ORDER } from './vedic_chart.mjs';
import { vedicPack } from './vedic_pack.mjs';

const CSS = () => readFileSync(new URL('../template/vedic.css', import.meta.url), 'utf8');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SIG = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const SABBR = ['羊', '牛', '双', '蟹', '狮', '女', '秤', '蝎', '射', '摩', '瓶', '鱼'];
const SK_SIGN = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const FULL = { sun: '太阳', moon: '月亮', mars: '火星', mercury: '水星', jupiter: '木星', venus: '金星', saturn: '土星', rahu: '罗睺', ketu: '计都' };
const CN1 = { sun: '日', moon: '月', mars: '火', mercury: '水', jupiter: '木', venus: '金', saturn: '土', rahu: '罗', ketu: '计' };
const SEV = ORDER.slice(0, 7);
const NAK = { Ashwini: '娄', Bharani: '胃', Krittika: '昴', Rohini: '毕', Mrigashirsha: '觜', Ardra: '参', Punarvasu: '井', Pushya: '鬼', Ashlesha: '柳', Magha: '星', Purva_Phalguni: '张', Uttara_Phalguni: '翼', Hasta: '轸', Chitra: '角', Swati: '亢', Vishakha: '氐', Anuradha: '房', Jyeshtha: '心', Mula: '尾', Purva_Ashadha: '箕', Uttara_Ashadha: '斗', Shravana: '女', Dhanishta: '虚', Shatabhisha: '危', Purva_Bhadrapada: '室', Uttara_Bhadrapada: '壁', Revati: '奎' };
const SRC = { birth_certificate: '出生证', rectified: '已校准', family: '家里说的', shichen: '只知道时辰' };
const VINFO = { D2: ['钱财', 'Hora', '只分太阳、月亮两半，星只落巨蟹或狮子'], D3: ['兄弟姐妹', 'Drekkana', '胆量、手足、自己闯的劲'], D4: ['房产安居', 'Chaturthamsa', '房子、家宅、安不安稳'], D7: ['子女', 'Saptamsa', '孩子缘、创造力'], D10: ['事业', 'Dasamsa', '做什么、在哪一行出头'], D12: ['父母', 'Dwadasamsa', '父母缘、家里给的底子'],
  D16: ['车子享受', 'Shodasamsa'], D20: ['修行', 'Vimsamsa'], D24: ['学业', 'Siddhamsa'], D27: ['体质强弱', 'Bhamsa'], D30: ['灾病坎坷', 'Trimsamsa', '只落火土木水金管的五个座'], D40: ['母系', 'Khavedamsa'], D45: ['父系', 'Akshavedamsa'], D60: ['前世业力', 'Shashtyamsa'] };
const THEMES = ['D10', 'D7', 'D12', 'D4', 'D3', 'D2'], FINE = ['D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];
const VK16 = ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];
const WEEK = { '日曜': '星期日', '月曜': '星期一', '火曜': '星期二', '水曜': '星期三', '木曜': '星期四', '金曜': '星期五', '土曜': '星期六' };
const YOGA_G = { Vishkambha: '支柱', Priti: '喜爱', Ayushman: '长寿', Saubhagya: '好运', Shobhana: '光彩', Atiganda: '大险', Sukarma: '善行', Dhriti: '坚定', Shula: '尖刺', Ganda: '险结', Vriddhi: '增长', Dhruva: '恒常', Vyaghata: '打击', Harshana: '欢喜', Vajra: '金刚', Siddhi: '成就', Vyatipata: '灾变', Variyan: '安逸', Parigha: '门闩', Shiva: '吉祥', Siddha: '圆满', Sadhya: '可成', Shubha: '吉善', Shukla: '明净', Brahma: '梵天', Indra: '因陀罗', Vaidhriti: '分离' };
const FIXED_K = { Shakuni: 1, Chatushpada: 1, Naga: 1, Kimstughna: 1 };
const ROLE = { AK: '灵魂星', AmK: '辅佐星', BK: '手足星', MK: '母亲星', PK: '子女星', GK: '阻力星', DK: '配偶星' };
const REL = { '大友': 'fr', '友': 'fr', '中': 'ne', '敌': 'en', '大敌': 'en' };
const DAYCN = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四'];
const SBP = [['sthana', '位置'], ['dig', '方位'], ['kala', '时间'], ['chesta', '运动'], ['naisargika', '天生'], ['drik', '被照']];
const UPG = [['gulika', '古利卡', '古'], ['mandi', '曼迪', '曼'], ['dhuma', '烟', '烟'], ['vyatipata', '灾变', '灾'], ['parivesha', '日晕', '晕'], ['indrachapa', '虹', '虹'], ['upaketu', '副计都', '副计']];
const MAI = { gf: ['大友', 'fr'], f: ['友', 'fr'], n: ['中', 'ne'], e: ['敌', 'en'], ge: ['大敌', 'en'] };
const YONI_CN = { Horse: '马', Elephant: '象', Sheep: '羊', Serpent: '蛇', Dog: '狗', Cat: '猫', Rat: '鼠', Cow: '牛', Buffalo: '水牛', Tiger: '虎', Deer: '鹿', Monkey: '猴', Mongoose: '獴', Lion: '狮' };
const GANA_CN = { Deva: '神性', Manushya: '人性', Rakshasa: '罗刹性' };
const NADI_CN = { Adi: '前脉', Madhya: '中脉', Antya: '后脉' };
const VASHYA_CN = { Chatushpada: '四足', Manava: '人形', Jalachara: '水生', Vanachara: '林中', Keeta: '虫类' };
const DCL = { exalted: 'ex', own: 'own', debilitated: 'deb' };
const dash = '<span style="color:#c4c8d6">—</span>';
const dm = (x) => { const a = Math.floor(x), m = Math.floor((x - a) * 60 + 1e-6); return a + '°' + String(m).padStart(2, '0') + '′'; };
const pada = (n) => '第' + '一二三四'[n - 1] + '分';
const ym = (s) => s.slice(0, 7).replace('-', '.'), md = (s) => s.slice(5).replace('-', '.'), ymd = (s) => s.replace(/-/g, '.');
const on = (x, t) => x.start <= t && t < x.end;
const sec = (title, sub, sk, body) => `<section class="sec"><div class="sh"><b>${esc(title)}</b><span>${esc(sub)}</span>${sk ? `<i>${esc(sk)}</i>` : ''}</div>${body}</section>`;
const vol = (t, k) => `<div class="vt"><b>${esc(t)}</b><span>${esc(k)}</span></div>`;

function items(d, vk) {
  return ORDER.map((k) => {
    if (!vk || vk === 'D1') { const p = d.planets[k]; return { key: k, sign: p.sign, deg: p.deg, retro: p.retro, dignity: p.dignity }; }
    const v = d.vargas[vk].planets[k]; return { key: k, sign: v.sign, dignity: v.dignity };
  });
}
const tag = (v) => v.asc_stable ? '<span class="tag ok">宫位已定</span>' : '<span class="tag no">宫位未定</span>';
const why = (v) => v.asc_stable ? '' : (v.asc_candidates.length === 2 ? `上升在${SIG[v.asc_candidates[0]]}、${SIG[v.asc_candidates[1]]}之间` : `上升会换 ${v.asc_candidates.length} 个座`);
function miniVarga(d, vk, style, inPro) {
  const v = d.vargas[vk], info = VINFO[vk], line = v.asc_stable ? (info[2] || '') : why(v) + (info[2] ? '；' + info[2] : '');
  return `<div class="${inPro ? 'mini' : 'card mini'}"><div class="t"><b>${esc(info[0])}</b><span>${vk} · ${esc(info[1])}</span></div>` +
    chartSVG({ asc: v.asc, items: items(d, vk), small: true, gold: !v.asc_stable, style }) + tag(v) + (line ? `<p>${esc(line)}</p>` : '') + '</div>';
}
function miniChart(title, sub, svg, note) {
  return `<div class="card mini"><div class="t"><b>${esc(title)}</b><span>${esc(sub)}</span></div>${svg}${note ? `<p>${note}</p>` : ''}</div>`;
}

export function renderVedic(d, { qr = null, style = 'north' } = {}) {
  const A = d.asc, M = d.moon, P = d.panchang, today = d.today, out = [];
  const role = {}; Object.keys(d.karakas).forEach((r) => { role[d.karakas[r]] = r; });
  const hOf = (sg) => (sg - A.sign + 12) % 12 + 1;
  const pos = (lon) => { const sg = Math.floor(lon / 30) % 12; return SIG[sg] + ' ' + dm(lon % 30); };

  // 封面
  out.push(`<div class="cv"><div class="br"><i></i>执天玄玑<i></i></div><h1>印占排盘</h1><p>印度占星 · Jyotish · 数据日期 ${ymd(today)}</p></div>`);
  out.push(`<section class="sec"><div class="ids">` +
    `<div class="card id"><i>上升</i><b>${SIG[A.sign]}</b><em>${dm(A.deg)} · ${SK_SIGN[A.sign]}<br>${NAK[A.nak_name]}宿${pada(A.pada)}</em></div>` +
    `<div class="card id"><i>月亮星座</i><b>${SIG[M.sign]}</b><em>${SK_SIGN[M.sign]}<br>印度人说的「你是什么座」</em></div>` +
    `<div class="card id"><i>月亮月宿</i><b>${NAK[M.nak_name]}宿</b><em>${esc(M.nak_name.replace('_', ' '))} ${pada(M.pada)}<br>大运从这里起算</em></div></div>` +
    `<div class="card params"><p><span>恒星黄道</span> · <span>Lahiri 岁差 <b>${dm(d.meta.ayanamsa)}</b></span> · <span>整宫制</span> · <span>平均交点</span><br><span>出生时间：<b>${esc(SRC[d.time_source] || d.time_source)}</b></span>，<span>误差按前后 <b>${d.err_min} 分钟</b>算</span></p></div></section>`);
  const n = (P.tithi - 1) % 15 + 1, white = P.tithi <= 15;
  const tname = (white ? '白分' : '黑分') + (n === 15 ? (white ? '满月' : '新月') : DAYCN[n]);
  out.push(sec('出生那天', '印度历', 'Panchanga', `<div class="card pc">` +
    `<div><i>七曜</i><b>${esc(P.vara)}</b><em>${WEEK[P.vara] || ''}${P.before_sunrise ? '<br>日出前，算前一天' : ''}</em></div>` +
    `<div><i>太阴日</i><b>${tname}</b><em>${white ? '月亮渐圆' : '月亮渐缺'}</em></div>` +
    `<div><i>月宿</i><b>${NAK[M.nak_name]}宿</b><em>${pada(M.pada)}</em></div>` +
    `<div><i>日月合</i><b class="l">${esc(P.yoga_name)}</b><em>${YOGA_G[P.yoga_name] || ''}</em></div>` +
    `<div><i>半日</i><b class="l">${esc(P.karana_name)}</b><em>${FIXED_K[P.karana_name] ? '固定类' : '活动类'}</em></div></div>`));

  // 卷壹 盘
  out.push(vol('卷壹 · 盘', 'CHAKRA'));
  const legend = '<div class="legend"><span><i style="background:#b07a12"></i>金色＝庙（最强）</span><span><i style="background:#1f7a6a"></i>青色＝本垣</span><span><i style="background:#b23a3a"></i>红色＝陷（最弱）</span><span>ᴿ＝逆行</span></div>';
  out.push(sec('主盘', '一切的底 · 北印度盘', 'Rasi D1', `<div class="main">${chartSVG({ asc: A.sign, items: items(d), big: true, style, title: '主盘', ascLabel: '上升' })}</div>${legend}`));
  const mv = ORDER.filter((k) => d.planets[k].bhava !== d.planets[k].house);
  const bhItems = ORDER.map((k) => { const p = d.planets[k]; return { key: k, sign: (A.sign + p.bhava - 1) % 12, deg: p.deg, retro: p.retro, dignity: p.dignity }; });
  const upMarks = UPG.map((u) => ({ sign: d.upagraha[u[0]].sign_index, s: u[2], cls: 'up' }));
  const arMarks = Object.keys(d.arudha).map((k) => ({ sign: Math.floor(d.arudha[k] / 30) % 12, s: k, cls: 'ar' }));
  out.push(sec('另外四张', '月亮盘 · 宫位盘 · 副星 · 外相', 'Chandra · Bhava · Upagraha · Arudha', `<div class="grid g4">` +
    miniChart('月亮盘', '从月亮的座起第一宫', chartSVG({ asc: M.sign, items: items(d), small: true, style, ascLabel: '月亮' })) +
    miniChart('宫位盘', 'Sripati 按宫头分宫', chartSVG({ asc: A.sign, items: bhItems, small: true, style }), mv.length ? '跟主盘比换了宫：<b>' + mv.map((k) => FULL[k]).join('、') + '</b>' : '跟主盘一样，没有星换宫') +
    miniChart('副星', 'Upagraha', chartSVG({ asc: A.sign, items: [], marks: upMarks, small: true, style }), UPG.map((u) => u[2] === u[1] ? u[1] : `${u[2]}＝${u[1]}`).join(' · ')) +
    miniChart('外相', 'Arudha', chartSVG({ asc: A.sign, items: [], marks: arMarks, small: true, style }), 'A1＝别人眼里的你 · A7＝伴侣 · A10＝事业 · UL＝婚姻') + '</div>'));
  const v9 = d.vargas.D9, vgk = ORDER.filter((k) => d.planets[k].vargottama);
  out.push(sec('九分盘', '婚姻与内在 · 每颗星的后劲', 'Navamsa D9', `<div class="card d9"><div class="top">${tag(v9)}<em>${v9.asc_stable ? '出生时间误差内上升不变' : why(v9)}</em></div>` +
    `<div class="chart">${chartSVG({ asc: v9.asc, items: items(d, 'D9'), gold: !v9.asc_stable, style, title: '九分盘' })}</div>` +
    `<p class="note">${v9.asc_stable ? '' : '星落哪个座是准的；<b>宫位要等出生时间校准</b>。'}${vgk.length ? '<b>九分同座：' + vgk.map((k) => FULL[k]).join('、') + '</b>（主盘和九分盘在同一个座，力量加倍）' : '没有九分同座的星'}</p></div>`));
  out.push(sec('主题分盘', '每张管一件事 · 金色数字＝上升', 'Varga D2–D12', `<div class="grid">${THEMES.map((k) => miniVarga(d, k, style)).join('')}</div>`));

  // 卷贰 星
  out.push(vol('卷贰 · 星', 'GRAHA'));
  const rows = ['<tr><th>星</th><th>位置</th><th>宫</th><th>月宿</th><th>状态</th><th>管</th></tr>'];
  ORDER.forEach((k) => {
    const p = d.planets[k], st = [];
    if (p.dignity === 'exalted') st.push('<span class="s ex">庙</span>');
    if (p.dignity === 'own') st.push('<span class="s own">本垣</span>');
    if (p.dignity === 'debilitated') st.push('<span class="s deb">陷</span>');
    if (p.retro && k !== 'rahu' && k !== 'ketu') st.push('<span class="s r">逆</span>');
    if (p.vargottama) st.push('<span class="s vg">九分同座</span>');
    rows.push(`<tr><td class="k">${FULL[k]}</td><td>${SIG[p.sign]} ${dm(p.deg)}</td><td>${p.house}</td><td>${NAK[p.nak_name]} ${p.pada}</td><td>${st.join(' ') || dash}</td><td>${p.rules.length ? p.rules.join('、') : dash}</td></tr>`);
  });
  const r2 = ['<tr><th>星</th><th>宿主星</th><th>落座</th><th>年龄</th><th>燃烧</th><th>角色</th></tr>'];
  ORDER.forEach((k) => {
    const p = d.planets[k]; let rel;
    if (p.dignity === 'exalted') rel = '<span class="s ex">庙</span>';
    else if (p.dignity === 'debilitated') rel = '<span class="s deb">陷</span>';
    else if (p.relation === 'own') rel = '<span class="s own">本垣</span>';
    else if (p.relation) rel = `<span class="s ${REL[p.relation] || 'ne'}">${esc(p.relation)}</span>`;
    else rel = dash;
    if (p.mt) rel += ' <span class="s mt">三方</span>';
    r2.push(`<tr><td class="k">${FULL[k]}</td><td>${FULL[p.nak_lord] || dash}</td><td>${rel}</td><td>${p.avastha ? esc(p.avastha) : dash}</td><td>${p.combust ? '<span class="s cb">燃烧</span>' : dash}</td><td>${role[k] ? `<span class="s role">${ROLE[role[k]]}</span>` : dash}</td></tr>`);
  });
  out.push(sec('九曜', '每颗星在哪、强不强、管哪几宫', 'Graha Sphuta', `<div class="card tb"><table>${rows.join('')}</table></div><div class="card tb tb2"><table>${r2.join('')}</table></div>`));
  const sb = d.shadbala; let top = 0;
  SEV.forEach((k) => { top = Math.max(top, sb[k].rupas, sb[k].min_rupas); }); top = Math.ceil(top + 0.5);
  const sbHtml = SEV.map((k) => {
    const x = sb[k], ok = x.rupas >= x.min_rupas;
    const parts = SBP.map((q) => { const v = typeof x[q[0]] === 'object' ? x[q[0]].total : x[q[0]]; return `<div><i>${q[1]}</i><b>${Math.round(v)}</b></div>`; }).join('');
    return `<div class="sbr"><div class="sbs"><b class="k2">${FULL[k]}</b><span class="bar"><i class="${ok ? '' : 'lo'}" style="width:${(x.rupas / top * 100).toFixed(1)}%"></i><u style="left:${(x.min_rupas / top * 100).toFixed(1)}%"></u></span><span class="v">${Math.round(x.total_virupa)}<em>第 ${x.rank}</em></span></div>` +
      `<div class="parts">${parts}<p>合计 ${Math.round(x.total_virupa)} 分 · 及格线 ${Math.round(x.min_rupas * 60)} 分</p></div></div>`;
  }).join('');
  const ikHtml = '<p class="sub2"><b>吉凶果报</b><span>多带好事还是多带麻烦 · 满分 60 · Ishta / Kashta</span></p>' + SEV.map((k) => {
    const x = d.ishta_kashta[k];
    return `<div class="ikr"><b class="k2">${FULL[k]}</b><span class="pair"><span class="bar g"><i style="width:${(x.ishta / 60 * 100).toFixed(1)}%"></i></span><em>吉 ${x.ishta.toFixed(1)}</em><span class="bar r"><i style="width:${(x.kashta / 60 * 100).toFixed(1)}%"></i></span><em>凶 ${x.kashta.toFixed(1)}</em></span></div>`;
  }).join('');
  out.push(sec('六力', '每颗星的力气 · 竖线是及格线', 'Shadbala', `<div class="card sb">${sbHtml}</div><div class="card ik">${ikHtml}</div>`));
  const bb = d.bhava_bala, hs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].sort((a, b) => bb[a].rank - bb[b].rank);
  const bmax = Math.max(...hs.map((h) => bb[h].rupas));
  out.push(sec('宫位力', '十二宫谁最有劲 · 从强到弱', 'Bhava Bala', `<div class="card bb">${hs.map((h) => { const x = bb[h]; return `<div class="bbr${x.rank <= 3 ? ' top' : ''}"><span class="rk">${x.rank}</span><b>第 ${h} 宫</b><span>${FULL[x.lord]}管</span><span class="bar"><i style="width:${(x.rupas / bmax * 100).toFixed(1)}%"></i></span><span class="v">${Math.round(x.total_virupa)}</span></div>`; }).join('')}</div>`));
  const by = {}; d.aspects_whole_sign.aspects.forEach((a) => { (by[a.from] = by[a.from] || []).push(a); });
  const none = ORDER.filter((k) => !by[k]);
  out.push(sec('相位', '谁照着谁 · 数字是从它数第几宫', 'Graha Drishti', `<div class="card asp">${ORDER.filter((k) => by[k]).map((k) => `<div class="apr"><b class="k2">${FULL[k]}</b><span class="tg">${by[k].map((a) => `<span class="ch">${FULL[a.to]}<em>${a.house_offset}</em></span>`).join('')}</span></div>`).join('')}${none.length ? `<p class="note">没照到别的星：${none.map((k) => FULL[k]).join('、')}</p>` : ''}</div>`));
  const sav = d.ashtakavarga.sav, hi = sav.indexOf(Math.max(...sav)), lo = sav.indexOf(Math.min(...sav));
  out.push(sec('八分力', '每个座得几分 · 28 分以上偏强', 'Ashtakavarga · SAV', `<div class="card av"><div class="chart">${chartSVG({ asc: A.sign, nums: sav, style, title: '八分力' })}</div><p class="note">总分 337 分摊到十二个座。最高 <b>${sav[hi]} 分在 ${hOf(hi)} 宫</b>（${SIG[hi]}），最低 <b>${sav[lo]} 分在 ${hOf(lo)} 宫</b>（${SIG[lo]}）。</p></div>`));

  // 卷叁 运
  out.push(vol('卷叁 · 运', 'DASHA'));
  const ds = [];
  d.dasha_days.forEach((m) => {
    const o = on(m, today);
    ds.push(`<div class="md${o ? ' on' : ''}"><span><b>${FULL[m.lord]}大运</b>${o ? '<span class="now">现在</span>' : ''}</span><span>${ym(m.start)} — ${ym(m.end)}</span></div>`);
    if (!o) return;
    const cur = m.antar.find((a) => on(a, today));
    ds.push(`<div class="ads">${m.antar.map((a) => `<div class="ad${a === cur ? ' on' : ''}"><b>${FULL[a.lord]}</b>${ym(a.start)}</div>`).join('')}</div>`);
    if (!cur || !cur.praty) return;
    ds.push(`<div class="pds"><p class="h">${FULL[cur.lord]}小运里的第三级运</p>${cur.praty.map((q) => {
      const qo = on(q, today), e = q.end.slice(0, 4) === q.start.slice(0, 4) ? md(q.end) : ymd(q.end);
      let sk = '';
      if (qo && q.sookshma) { let cz = null; q.sookshma.forEach((z) => { if (z.start <= today) cz = z; }); sk = `<div class="sks"><p class="h">这一段里的第四级运</p>${q.sookshma.map((z) => `<span class="sk${z === cz ? ' on' : ''}"><b>${CN1[z.lord]}</b>${md(z.start)}</span>`).join('')}</div>`; }
      return `<div class="pd${qo ? ' on' : ''}"><b>${FULL[q.lord]}</b><span>${ymd(q.start)} — ${e}</span></div>${sk}`;
    }).join('')}</div>`);
  });
  ds.push(`<p class="note">出生时间差 ${d.err_min} 分钟，大运交接日前后约差 <b>${d.dasha_err_days} 天</b>；第三级运一段只有几周、第四级只有几天，跟着一起挪。</p>`);
  out.push(sec('大运', '维姆肖塔里 · 九星轮流当家', 'Vimshottari Dasha', `<div class="card ds">${ds.join('')}</div>`));
  const ss = d.sade_sati, cyc = [];
  ss.periods.forEach((q) => { const last = cyc[cyc.length - 1]; if (last && (new Date(q.start) - new Date(last.end)) < 400 * 864e5) last.end = q.end; else cyc.push({ start: q.start, end: q.end }); });
  const mg = d.manglik, line = (t, y, h) => `${t}：<span class="${y ? 'y' : 'n'}">${y ? '有' : '没有'}</span>（${h} 宫）`;
  const ks = d.kalasarpa, pv = d.parivartana, cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  out.push(sec('七年半 · 火星煞', '常被问的几件', 'Sade Sati · Kuja Dosha', `<div class="two"><div class="card"><h4>土星七年半</h4><p>${ss.now ? `现在在<b>第${'一二三'[ss.now.phase - 1]}段</b>，到 ${ym(ss.now.end)}` : '现在<b>不在</b>七年半里'}${ss.next_start ? `；下一轮 <b>${ym(ss.next_start)}</b> 开始` : ''}</p><p>${cyc.map((c) => `${ym(c.start)} — ${ym(c.end)}`).join('<br>')}</p></div>` +
    `<div class="card"><h4>火星煞</h4><p>${line('从上升看', mg.from_lagna, mg.house_from_lagna)}<br>${line('从月亮看', mg.from_moon, mg.house_from_moon)}<br>${line('从金星看', mg.from_venus, mg.house_from_venus)}</p></div></div>` +
    `<div class="card ks"><div><h4>罗计夹</h4><p>${ks.present ? `<span class="y">有</span> · <b>${esc(cap(ks.type))}</b>（罗睺在 ${ks.rahu_house} 宫）` : '<span class="n">没有</span>'}</p></div><div><h4>宫主互换</h4><p>${pv.length ? pv.map((q) => `<b>${FULL[q[0]]} ⇄ ${FULL[q[1]]}</b>`).join('<br>') : '<span class="n">没有</span>'}</p></div></div>`));

  // 卷肆 细表
  out.push(vol('卷肆 · 细表', 'DETAILS'));
  const pro = [], sub = (t) => pro.push(`<p class="sub">${t}</p>`), tbl = (r, cls) => pro.push(`<div class="bavw"><table class="${cls || ''}">${r.join('')}</table></div>`);
  const th = (a) => '<tr>' + a.map((x) => `<th>${x}</th>`).join('') + '</tr>';
  sub('八分力细表（Bhinna Ashtakavarga，按宫排）');
  const bh = [th(['宫'].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))];
  SEV.forEach((k) => { bh.push(`<tr><td>${FULL[k]}</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => `<td>${d.ashtakavarga.bav[k][(A.sign + h - 1) % 12]}</td>`).join('')}</tr>`); });
  bh.push(`<tr class="sum"><td>合计</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => `<td>${sav[(A.sign + h - 1) % 12]}</td>`).join('')}</tr>`);
  tbl(bh);
  sub('宫位表（Sripati，按宫头）');
  tbl([th(['宫', '起', '宫中点', '止', '星'])].concat(d.sripati_houses.map((x) => `<tr><td>${x.house}</td><td>${pos(x.start)}</td><td>${pos(x.mid)}</td><td>${pos(x.end)}</td><td>${x.planets.map((k) => CN1[k]).join(' ') || dash}</td></tr>`)));
  sub('相位力（Drishti，横排是照的星，竖排是被照的星，满分 60）');
  tbl([th(['照 → 被照'].concat(SEV.map((k) => CN1[k])))].concat(SEV.map((a) => `<tr><td>${FULL[a]}</td>${SEV.map((b) => { const v = d.drishti[a][b]; return `<td>${v == null ? dash : Math.round(v)}</td>`; }).join('')}</tr>`)), 'mtx');
  sub('友敌表（Panchadha Maitri，五级合成）');
  tbl([th(['星'].concat(SEV.map((k) => CN1[k])))].concat(SEV.map((a) => `<tr><td>${FULL[a]}</td>${SEV.map((b) => { const c = d.maitri.compound[a][b]; return `<td>${c ? `<span class="s ${MAI[c][1]}">${MAI[c][0]}</span>` : dash}</td>`; }).join('')}</tr>`)), 'mtx');
  sub('分盘力（Vimshopaka，十六张分盘合起来，满分 20）');
  tbl([th(['星', '分盘力', '档'])].concat(SEV.map((k) => { const x = d.vimshopaka[k]; return `<tr><td>${FULL[k]}</td><td>${x.total.toFixed(2)} / ${x.max}</td><td>${esc(x.grade)}</td></tr>`; })), 'mtx');
  sub('十六分盘汇总（Shodasavarga，每颗星在每张分盘落哪个座）');
  tbl([th([''].concat(VK16))].concat([['asc', '上升']].concat(ORDER.map((k) => [k, CN1[k]])).map((r) => `<tr><td>${r[1]}</td>${VK16.map((vk) => { const v = d.vargas[vk]; if (r[0] === 'asc') return `<td>${SABBR[v.asc]}</td>`; const x = v.planets[r[0]], c = DCL[x.dignity]; return `<td>${c ? `<span class="s ${c}">${SABBR[x.sign]}</span>` : SABBR[x.sign]}</td>`; }).join('')}</tr>`)), 'mtx');
  const av = d.avakahada;
  sub('配对属性（Avakahada Chakra）');
  pro.push('<div class="avk">' + [['瓦尔那', av.varna, ''], ['相吸类', VASHYA_CN[av.vashya] || av.vashya, av.vashya], ['动物象', YONI_CN[av.yoni] || av.yoni, av.yoni], ['天性', GANA_CN[av.gana] || av.gana, av.gana], ['脉', NADI_CN[av.nadi] || av.nadi, av.nadi], ['宿主星', FULL[av.nakshatra_lord], ''], ['座主星', FULL[av.rashi_lord], '']]
    .map((x) => `<div><i>${x[0]}</i><b>${esc(x[1])}</b>${x[2] ? `<em>${esc(x[2])}</em>` : ''}</div>`).join('') + '</div>');
  const gh = d.ghata_chakra;
  if (gh && gh.month) {   // 不利日：月亮星座定的四样（OnlineJyotish 实排 12 行，引擎 10-19 起有）
    const GH_MON = { Chaitra: '3～4', Vaishakha: '4～5', Jyeshtha: '5～6', Ashadha: '6～7', Shravana: '7～8', Bhadrapada: '8～9', Ashwin: '9～10', Kartika: '10～11', Margashirsha: '11～12', Pausha: '12～1', Magha: '1～2', Phalguna: '2～3' };
    const GH_WEEK = { Sunday: '星期日', Monday: '星期一', Tuesday: '星期二', Wednesday: '星期三', Thursday: '星期四', Friday: '星期五', Saturday: '星期六' };
    const n = NAK[gh.nakshatra === 'Moola' ? 'Mula' : gh.nakshatra];
    sub('不利日（Ghata，碰上这几样，大事缓一缓）');
    pro.push('<div class="avk">' + [['月份', `约 ${GH_MON[gh.month]} 月`, gh.month], ['太阴日', '第 ' + gh.tithi.join('、'), gh.tithi_group], ['星期', GH_WEEK[gh.weekday], gh.weekday], ['月宿', n ? n + '宿' : gh.nakshatra, gh.nakshatra]]
      .map((x) => `<div><i>${x[0]}</i><b>${esc(x[1])}</b><em>${esc(x[2])}</em></div>`).join('') + '</div>');
  }
  sub('副星（Upagraha）');
  tbl([th(['副星', '位置', '宫', '月宿'])].concat(UPG.map((u) => { const x = d.upagraha[u[0]]; return `<tr><td>${u[1]}</td><td>${pos(x.longitude_deg)}</td><td>${hOf(x.sign_index)}</td><td>${NAK[x.nakshatra_name]} ${x.pada}</td></tr>`; })));
  sub('外相点（Arudha）');
  tbl([th(['', '座', '宫'])].concat(Object.keys(d.arudha).map((k) => { const sg = Math.floor(d.arudha[k] / 30) % 12; return `<tr><td>${k}</td><td>${SIG[sg]}</td><td>${hOf(sg)}</td></tr>`; })), 'mtx');
  sub('更细的八张分盘（D16–D60）');
  pro.push('<p class="warn">这八张一份只有几分钟出生时间。没校准之前，只看星落在哪个座，不看宫位。</p>');
  pro.push(`<div class="grid">${FINE.map((k) => miniVarga(d, k, style, true)).join('')}</div>`);
  out.push(`<section class="sec"><div class="card pro"><div class="in" style="padding-top:12px">${pro.join('')}</div></div></section>`);

  // 附：数据包、创始人、页脚
  const pack = vedicPack(d);
  out.push(vol('附 · 印占数据包', 'FOR ANY AI'));
  out.push(`<section class="sec"><div class="card pk"><p class="tip">下面这一段可以整段复制，贴给你常用的 AI 接着聊；压缩包里的「印占数据包.txt」是同一份。想照玄玑的读法深聊，直接在装了执天玄玑 Skill 的对话里问。</p><pre>${esc(pack)}</pre></div></section>`);
  if (qr) out.push(`<section class="sec"><div class="card fd"><img src="${qr}" alt="创始人微信"><div><div class="t">想看得更细</div><ul><li>创始人亲自把印占和八字、星盘合起来看</li><li>大运走到哪一步，细到哪几个月</li><li>你最在意的那件事，当面帮你盘</li></ul><span class="wx">微信 liin1223<em> · 备注「印占」</em></span></div></div></section>`);
  out.push('<p class="ft">排盘：执天玄玑 xuanji-astro.com · 印占按恒星黄道、Lahiri 岁差、整宫制<br>仅供参考，不承诺特定结果，不替代法律、投资、医疗等专业意见。</p>');
  const html = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>印占排盘 · 执天玄玑</title>\n<style>\n${CSS()}\n${chartCSS()}\n</style></head><body><div class="pg">\n${out.join('\n')}\n</div></body></html>\n`;
  return { html, pack };
}
