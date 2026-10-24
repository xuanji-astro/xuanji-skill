// 紫微数据包：把紫微整盘（/v1/ziwei 回来的 chart）拼成一段纯文字，用户可以整段贴给别的 AI。
// 不写出生日期、时间、地点和农历生日；开头结尾带一句：想要完整报告、照玄玑的读法深聊，直接用执天玄玑 Skill。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
export const ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
const SRC = { birth_certificate: '出生证', family_clear: '家里记得清楚', family_rough: '家里记得大概', unknown: '不清楚来源' };
const BASIS = { paipan: '跟八字同一个真太阳时', local: '按出生地经度和均时差算的真太阳时' };
export const HUA = ['禄', '权', '科', '忌'];
const ymd = (s) => s.replace(/-/g, '.');
export const starText = (s) => s.name + (s.brightness ? `（${s.brightness}）` : '') + (s.mutagen ? `化${s.mutagen}` : '');
export const byName = (c) => Object.fromEntries(c.palaces.map((p) => [p.name, p]));
// 命宫没有主星：借对宫（迁移）的主星看，通行读法
export function mingStars(c) {
  const P = byName(c), m = P['命宫'];
  return m.major.length ? { stars: m.major, borrowed: false } : { stars: P['迁移'].major, borrowed: true };
}
const huaLine = (arr) => arr.map((n, i) => `${n}化${HUA[i]}`).join('、');

export function ziweiPack(c, { timeSource = 'unknown' } = {}) {
  const P = byName(c), L = [], ms = mingStars(c), now = c.now;
  L.push('【执天玄玑 · 紫微斗数盘数据包】');
  L.push('这是执天玄玑（xuanji-astro.com）排的一张紫微斗数盘，贴给你常用的 AI 就能接着聊。里面不写出生日期、时间和地点，但盘面推算结果仍属于个人信息，只发给你信任的 AI。');
  L.push('想要完整的排盘报告（盘图、十二宫细表、大限流年四化），或者让 AI 照玄玑的读法跟你深聊，直接装执天玄玑的 Skill：github.com/xuanji-astro/xuanji-skill');
  L.push('');
  L.push('一、口径');
  L.push(`三合派通行安星。时辰用${BASIS[c.time.basis] || '真太阳时'}，23 点以后算第二天子时；年按农历正月初一换；${c.lunar.leap ? '这张盘生在闰月，' : ''}${c.lunar.leap_rule}。出生时间来源：${SRC[timeSource] || SRC.unknown}。数据日期：${ymd(c.today)}。`);
  L.push('');
  L.push('二、基本');
  L.push(`${c.yinyang} · ${c.five_elements} · 命主${c.soul} · 身主${c.body}`);
  L.push(`命宫在${P['命宫'].stem}${P['命宫'].branch}，主星：${ms.stars.length ? ms.stars.map(starText).join('、') : '无'}${ms.borrowed ? '（命宫无主星，借对宫迁移的主星看）' : ''}`);
  const body = c.palaces.find((p) => p.is_body);
  L.push(`身宫落在${body.name}（${body.stem}${body.branch}）`);
  if (c.pillars) L.push(`八字四柱：${c.pillars.join(' ')}`);
  L.push('');
  L.push('三、十二宫（宫：干支｜主星｜辅星｜杂曜｜大限虚岁）');
  for (const n of ORDER) {
    const p = P[n];
    L.push(`${n}${p.is_body ? '（身宫）' : ''}：${p.stem}${p.branch}｜${p.major.map(starText).join('、') || '无主星'}｜${p.minor.map(starText).join('、') || '—'}｜${p.adjective.map((s) => s.name + (s.brightness ? `（${s.brightness}）` : '')).join('、') || '—'}｜${p.decadal.start}～${p.decadal.end} 岁`);
  }
  L.push('');
  L.push('四、生年四化');
  L.push(c.sihua.map((x) => `化${x.hua}：${x.star}，在${x.palace}`).join('；'));
  L.push('');
  L.push('五、大限和流年');
  if (now.decadal) L.push(`现在虚岁 ${now.nominal_age}，走${now.decadal.palace}这一步大限（${now.decadal.start}～${now.decadal.end} 岁，${now.decadal.stem}${now.decadal.branch}），大限四化：${huaLine(now.decadal.mutagen)}`);
  if (now.lunar_today) L.push(`今天是农历${now.lunar_today.text}`);
  for (const y of now.years) L.push(`${y.year} 年 ${y.stem}${y.branch}：流年命宫在${y.palace}，流年四化：${huaLine(y.mutagen)}`);
  const left = (now.years[0] && now.years[0].months || []).filter((m) => m.when && m.when !== 'past');
  if (left.length) L.push(`今年还没过的流月：${left.map((m) => `${m.month}在${m.palace}${m.when === 'now' ? '（这个月）' : ''}`).join('、')}`);
  L.push('');
  L.push('六、请这样读（执天玄玑的读法）');
  L.push('1. 只用上面的数据，没写的星、宫、四化不要自己推算；拿不准就说拿不准。');
  L.push('2. 宫名、星名照说：先说哪一宫、什么星、亮度、化什么，再说这颗星管什么，最后落到他身上。先讲命宫主星，再看三方四正（命宫、财帛、官禄、迁移）；命宫无主星就借迁移的主星说。');
  L.push('3. 四化是重点：禄看顺和得，权看抓得住的事，科看名声和贵人，忌看最在意、最磕绊的地方，忌不当灾说。');
  L.push('4. 讲时间先看大限，再看流年：说这几年是什么气候、适合做什么，不断某一天一定发生什么；讲流月只讲还没过的。');
  L.push('5. 星的亮度只说力气大小和用在哪，落陷不吓人；煞星、化忌只当提醒，不说灾，不卖化解。');
  L.push('6. 先问他最想知道什么，再按盘回答；他问一件事，就把这件事讲透。');
  L.push('');
  L.push('—— 执天玄玑 · 紫微排盘 · xuanji-astro.com ｜ 完整报告和深聊：github.com/xuanji-astro/xuanji-skill');
  return L.join('\n') + '\n';
}
