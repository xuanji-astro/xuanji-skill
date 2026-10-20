// 印占数据包：把印占整盘（/v1/vedic 回来的 chart）拼成一段纯文字，用户可以整段贴给别的 AI。
// 不写出生日期、时间和地点；开头结尾带一句：想要完整报告、照玄玑的读法深聊，直接用执天玄玑 Skill。网站印占页「复制给AI」用同一套拼法。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
const SIG = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
const SK = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
const FULL = {sun:'太阳', moon:'月亮', mars:'火星', mercury:'水星', jupiter:'木星', venus:'金星', saturn:'土星', rahu:'罗睺', ketu:'计都'};
const ORDER = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'], SEV = ORDER.slice(0, 7);
const NAK = {Ashwini:'娄',Bharani:'胃',Krittika:'昴',Rohini:'毕',Mrigashirsha:'觜',Ardra:'参',Punarvasu:'井',Pushya:'鬼',Ashlesha:'柳',Magha:'星',Purva_Phalguni:'张',Uttara_Phalguni:'翼',Hasta:'轸',Chitra:'角',Swati:'亢',Vishakha:'氐',Anuradha:'房',Jyeshtha:'心',Mula:'尾',Purva_Ashadha:'箕',Uttara_Ashadha:'斗',Shravana:'女',Dhanishta:'虚',Shatabhisha:'危',Purva_Bhadrapada:'室',Uttara_Bhadrapada:'壁',Revati:'奎'};
const GH_MON = {Chaitra:'3～4', Vaishakha:'4～5', Jyeshtha:'5～6', Ashadha:'6～7', Shravana:'7～8', Bhadrapada:'8～9', Ashwin:'9～10', Kartika:'10～11', Margashirsha:'11～12', Pausha:'12～1', Magha:'1～2', Phalguna:'2～3'};   // 印度阴历月大约对应的公历月
const GH_WEEK = {Sunday:'星期日', Monday:'星期一', Tuesday:'星期二', Wednesday:'星期三', Thursday:'星期四', Friday:'星期五', Saturday:'星期六'};
const SRC = {birth_certificate:'出生证', rectified:'已校准', family:'家里说的', shichen:'只知道时辰'};
const dm = (x) => { const a = Math.floor(x), m = Math.floor((x - a) * 60 + 1e-6); return a + '°' + String(m).padStart(2, '0') + '′'; };
const pada = (n) => '第' + '一二三四'[n - 1] + '分';
const ym = (s) => s.slice(0, 7).replace('-', '.'), ymd = (s) => s.replace(/-/g, '.');
const nk = (n) => NAK[n] + '宿（' + n.replace('_', ' ') + '）';

export function vedicPack(d) {
  const A = d.asc, M = d.moon, today = d.today, L = [];
  const DIG = {exalted:'庙', own:'本垣', debilitated:'陷'};
  L.push('【执天玄玑 · 印占盘数据包】');
  L.push('这是执天玄玑（xuanji-astro.com）排的一张印占（印度占星）盘，贴给你常用的 AI 就能接着聊。里面不写出生日期、时间和地点，但盘面推算结果仍属于个人信息，只发给你信任的 AI。');
  L.push('想要完整的排盘报告（盘图、六力、十六分盘、大运到第四级），或者让 AI 照玄玑的读法跟你深聊，直接装执天玄玑的 Skill：github.com/xuanji-astro/xuanji-skill');
  L.push('');
  L.push('一、口径');
  L.push(`恒星黄道 · Lahiri 岁差 ${dm(d.meta.ayanamsa)} · 整宫制 · 平均交点 · 维姆肖塔里大运。出生时间来源：${SRC[d.time_source]}，误差按前后 ${d.err_min} 分钟算。数据日期：${ymd(today)}。`);
  L.push('');
  L.push('二、三个「我是谁」');
  L.push(`上升：${SIG[A.sign]}（${SK[A.sign]}）${dm(A.deg)}，${nk(A.nak_name)}${pada(A.pada)}`);
  L.push(`月亮星座：${SIG[M.sign]}（${SK[M.sign]}）${dm(d.planets.moon.deg)}——印度人说的「你是什么座」看这个`);
  L.push(`月亮月宿：${nk(M.nak_name)}${pada(M.pada)}，宿主星 ${FULL[d.planets.moon.nak_lord]}——大运从这里起算`);
  L.push('');
  L.push('三、九曜（星：座 度数｜第几宫｜月宿｜状态｜管哪几宫）');
  ORDER.forEach((k) => {
    const p = d.planets[k], st = [];
    if (DIG[p.dignity]) st.push(DIG[p.dignity]);
    if (p.retro && k !== 'rahu' && k !== 'ketu') st.push('逆行');
    if (p.vargottama) st.push('九分同座');
    if (p.combust) st.push('燃烧');
    L.push(`${FULL[k]}：${SIG[p.sign]} ${dm(p.deg)}｜${p.house} 宫｜${NAK[p.nak_name]}宿${p.pada}｜${st.join('、') || '—'}｜${p.rules.length ? p.rules.join('、') + ' 宫' : '—'}`);
  });
  L.push('');
  L.push('四、强弱');
  const sb = d.shadbala;
  L.push('六力（Shadbala，分，括号里是及格线）：' + SEV.slice().sort((a, b) => sb[a].rank - sb[b].rank).map((k) => `${FULL[k]} ${Math.round(sb[k].total_virupa)}（${Math.round(sb[k].min_rupas * 60)}）`).join('、'));
  const low = SEV.filter((k) => sb[k].rupas < sb[k].min_rupas);
  L.push('没过及格线：' + (low.length ? low.map((k) => FULL[k]).join('、') : '没有'));
  L.push('吉凶果报（满分 60，吉／凶）：' + SEV.map((k) => `${FULL[k]} ${d.ishta_kashta[k].ishta.toFixed(0)}／${d.ishta_kashta[k].kashta.toFixed(0)}`).join('、'));
  const bb = d.bhava_bala, hs = [1,2,3,4,5,6,7,8,9,10,11,12].sort((a, b) => bb[a].rank - bb[b].rank);
  L.push('宫位力从强到弱：' + hs.map((h) => h + ' 宫').join('、'));
  L.push('分盘力（Vimshopaka，满分 20）：' + SEV.map((k) => `${FULL[k]} ${d.vimshopaka[k].total.toFixed(1)}`).join('、'));
  const sav = d.ashtakavarga.sav, hsav = (s) => (s - A.sign + 12) % 12 + 1;
  const hi = sav.indexOf(Math.max(...sav)), lo = sav.indexOf(Math.min(...sav));
  L.push(`八分力（SAV，总 337）：最高 ${sav[hi]} 分在 ${hsav(hi)} 宫，最低 ${sav[lo]} 分在 ${hsav(lo)} 宫；28 分以上算偏强`);
  L.push('');
  L.push('五、大运（现在走到哪）');
  const md = d.dasha_days.find((m) => m.start <= today && today < m.end), ad = md.antar.find((a) => a.start <= today && today < a.end), pd = ad.praty.find((q) => q.start <= today && today < q.end);
  L.push(`大运：${FULL[md.lord]}（${ym(md.start)}—${ym(md.end)}）`);
  L.push(`小运：${FULL[ad.lord]}（${ym(ad.start)}—${ym(ad.end)}）`);
  L.push(`第三级：${FULL[pd.lord]}（${ymd(pd.start)}—${ymd(pd.end)}）`);
  const nx = md.antar.filter((a) => a.start > today).slice(0, 3);
  if (nx.length) L.push('接下来的小运：' + nx.map((a) => `${FULL[a.lord]} ${ym(a.start)} 起`).join('、'));
  const i = d.dasha_days.indexOf(md), nm = d.dasha_days[i + 1];
  if (nm) L.push(`下一步大运：${FULL[nm.lord]}，${ym(nm.start)} 起`);
  L.push(`出生时间差 ${d.err_min} 分钟，大运交接日前后约差 ${d.dasha_err_days} 天。`);
  L.push('');
  L.push('六、常被问的几件');
  const ss = d.sade_sati;
  L.push('土星七年半：' + (ss.now ? `现在在第 ${ss.now.phase} 段，到 ${ym(ss.now.end)}` : '现在不在') + (ss.next_start ? `；下一轮 ${ym(ss.next_start)} 开始` : ''));
  const mg = d.manglik, yn = (b) => b ? '有' : '没有';
  L.push(`火星煞：从上升看${yn(mg.from_lagna)}（${mg.house_from_lagna} 宫）、从月亮看${yn(mg.from_moon)}（${mg.house_from_moon} 宫）、从金星看${yn(mg.from_venus)}（${mg.house_from_venus} 宫）`);
  L.push(`罗计夹：${d.kalasarpa.present ? '有' : '没有'}；宫主互换：${d.parivartana.length ? d.parivartana.map((q) => FULL[q[0]] + '和' + FULL[q[1]]).join('、') : '没有'}`);
  const gh = d.ghata_chakra;
  if (gh && gh.month) L.push(`不利日（Ghata，按月亮星座定，碰上这几样大事缓一缓）：约 ${GH_MON[gh.month]} 月（印度历 ${gh.month}）、第 ${gh.tithi.join('、')} 个太阴日（${gh.tithi_group}）、${GH_WEEK[gh.weekday]}、${nk(gh.nakshatra === 'Moola' ? 'Mula' : gh.nakshatra)}`);
  L.push('');
  L.push('七、九分盘（D9）');
  const v9 = d.vargas.D9, vg = ORDER.filter((k) => d.planets[k].vargottama);
  L.push(`上升：${SIG[v9.asc]}；` + (v9.asc_stable ? '出生时间误差内上升不变，宫位可以用' : '出生时间误差内上升会变，只看星落哪个座，不看宫位'));
  L.push('九曜：' + ORDER.map((k) => `${FULL[k]} ${SIG[v9.planets[k].sign]}`).join('、'));
  L.push('九分同座（主盘和九分盘同一个座，力量加倍）：' + (vg.length ? vg.map((k) => FULL[k]).join('、') : '没有'));
  L.push('');
  L.push('八、请这样读（执天玄玑的读法）');
  L.push('1. 只用上面的数据，没写的星、宫、日期不要自己推算；拿不准就说拿不准。');
  L.push('2. 先讲月亮星座和月宿，再讲上升；讲性格用他生活里会遇到的事说，不堆术语。');
  L.push('3. 讲时间先看大运和小运：说这一段是什么气候、适合做什么，不断某一天一定发生什么。');
  L.push('4. 星强不强，六力、庙旺陷、九分盘一起看，不拿一个数字定好坏。');
  L.push('5. 火星煞、七年半、罗计夹只当参考，不吓人，不说灾，不卖化解。');
  L.push('6. 先问他最想知道什么，再按盘回答；他问一件事，就把这件事讲透。');
  L.push('');
  L.push('—— 执天玄玑 · 印占排盘 · xuanji-astro.com ｜ 完整报告和深聊：github.com/xuanji-astro/xuanji-skill');
  return L.join('\n') + '\n';
}
