#!/usr/bin/env node
// 单人品牌报告（Node版；不需要Python）
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 用法：node build_report.mjs --profile profile.json --report report.json --out report.html [--rectify rectify.json]
// 定过时辰的（rectify.json 结果是 a 或 b）：表头改成「出生时辰经定时辰定在某时」，不再报离交界几分钟、两种口径的时柱和压宫头的星（交界另一侧那张盘用的是代表时间）
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readPrivateJSON,writePrivateText } from './private_files.mjs';
import { safeData } from './client.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = JSON.parse(readFileSync(join(HERE, 'report_rules.json'), 'utf8'));
const TEMPLATE = join(HERE, '..', 'template', 'single-brand.html');
// 创始人微信码：个人联系方式，不在 Apache-2.0 授权范围内（见 docs/license-scope.md）；Fork 删掉这张图，报告里那一块就不出
const FOUNDER_QR = join(HERE, '..', 'assets', 'founder-wechat.png');
export function founderQR(path = FOUNDER_QR) {
  let b; try { b = readFileSync(path); } catch { return null; }
  if (b.length > 131072 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;   // 只认 128KB 以内的 PNG
  return 'data:image/png;base64,' + b.toString('base64');
}
const SKILL_VERSION = '0.1.0-rc.7';

const n = (s) => [...String(s ?? '').replaceAll('**', '')].length;
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// 按 a.b.*.c / a[].b 取出所有 [位置, 值]
function collect(obj, path) {
  let out = [['', obj]];
  for (const part of path.split('.')) {
    const arr = part.endsWith('[]'), key = arr ? part.slice(0, -2) : part, nxt = [];
    for (const [where, o] of out) {
      if (key === '*') { if (isObj(o)) for (const [k, v] of Object.entries(o)) nxt.push([`${where}.${k}`.replace(/^\./, ''), v]); continue; }
      const v = isObj(o) ? o[key] : undefined, w = `${where}.${key}`.replace(/^\./, '');
      if (arr) { if (Array.isArray(v)) v.forEach((x, i) => nxt.push([`${w}[${i + 1}]`, x])); }
      else if (v !== undefined && v !== null) nxt.push([w, v]);
    }
    out = nxt;
  }
  return out;
}

// 年份的干支（干支纪年按年份算；年柱换在立春，这里只核「某年＋干支」的写法）
export const yearGanZhi = (y) => '甲乙丙丁戊己庚辛壬癸'[(((y - 4) % 10) + 10) % 10] + '子丑寅卯辰巳午未申酉戌亥'[(((y - 4) % 12) + 12) % 12];
const GZ = '[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]', GZ_NOT_YEAR = '(?![月日时运柱大十步])';
const REL_YEAR = { 前年: -2, 去年: -1, 今年: 0, 明年: 1, 后年: 2 };
// 10-07 Kimi 实测：把 2026 写成「今年乙巳」。报告里「某年＋干支」「X年（某年）」「今年＋干支」都核一遍；大运、月份、柱不算
export function yearGanZhiErrors(text, cur = new Date().getFullYear()) {
  const errs = [], say = (m, y, g) => { if (yearGanZhi(y) !== g) errs.push(`「${m.trim()}」对不上：${y} 年是${yearGanZhi(y)}年。年份的干支照 method.timing.years 里的 gan_zhi 写，不要自己推`); };
  for (const m of text.matchAll(new RegExp(`(?<![\\d–—~～-])((?:19|20)\\d\\d)\\s*年?\\s*(?:是|为|逢|的)?\\s*(?:流年)?\\s*[（(]?\\s*(${GZ})${GZ_NOT_YEAR}`, 'g'))) say(m[0], +m[1], m[2]);
  for (const m of text.matchAll(new RegExp(`(${GZ})年\\s*[（(]\\s*((?:19|20)\\d\\d)(?!\\d|\\s*[–—~～-])`, 'g'))) say(m[0], +m[2], m[1]);
  for (const m of text.matchAll(new RegExp(`(前年|去年|今年|明年|后年)\\s*(?:是|为|逢|的|走到)?\\s*(?:流年)?\\s*[（(]?\\s*(${GZ})${GZ_NOT_YEAR}`, 'g'))) say(m[0], cur + REL_YEAR[m[1]], m[2]);
  return errs;
}
// 验前事里用户答「不准」的年份（misses）：正文不再提。progress、basis 可以记「你说没对上」；同一年另有用户答准的事（在 hits 里）不拦
export function deniedYearErrors(rep) {
  const errs = [], ms = rep.misses;
  if (ms === undefined) return ['要写 misses：验前事里用户答「不准」的年份，写成 [{"year": 2022, "area": "感情"}]；都没否认就写 []'];
  if (!Array.isArray(ms)) return ['misses 要是列表 [...]'];
  const cur = new Date().getFullYear(), years = [];
  ms.forEach((x, i) => {
    if (!isObj(x) || Object.keys(x).some((k) => !['year', 'area'].includes(k)) || !Number.isInteger(x.year) || x.year < 1900 || x.year >= cur || (x.area !== undefined && typeof x.area !== 'string')) errs.push(`misses 第${i + 1}项要写成 {"year": 2022, "area": "感情"}（year 是过去的年份，数字）`);
    else years.push(x.year);
  });
  const hitText = JSON.stringify(rep.hits ?? []);
  const { basis, progress, misses, hits, ...body } = rep, text = JSON.stringify(body);
  for (const y of new Set(years)) {
    if (hitText.includes(String(y))) continue;
    if (new RegExp(`(?<![\\d–—~～-])${y}(?!\\d|\\s*[–—~～-]\\s*\\d)`).test(text)) errs.push(`正文又写了 ${y}：这一年验前事用户说没对上，不再当发生过的事写，也不换个说法再提；要记就记在 progress 或 basis 里`);
  }
  return errs;
}

export function check(rep, prof) {
  const errs = [], R = RULES, hasWest = !!prof.western?.data;
  const get = (path) => collect(rep, path).map(([, v]) => v);
  for (const [path, lim] of Object.entries(R.limits))
    for (const [where, v] of collect(rep, path)) if (typeof v === 'string' && n(v) > lim) errs.push(`${where} 有 ${n(v)} 字，上限 ${lim} 字`);
  for (const [path, [lo, hi]] of Object.entries(R.counts)) {
    if (path === 'crosscheck' && !hasWest) continue;
    const found = collect(rep, path);
    if (!found.length && lo > 0 && !path.includes('*')) errs.push(`${path} 要 ${lo}～${hi} 条，现在没有`);
    for (const [where, v] of found) { const k = Array.isArray(v) ? v.length : -1; if (k < lo || k > hi) errs.push(`${where || path} 要 ${lo}～${hi} 条，现在 ${Math.max(k, 0)} 条`); }
  }
  const need = (path, why = '') => { if (!get(path).some((v) => typeof v === 'string' && v.trim())) errs.push(`${path} 不能空` + (why ? `（${why}）` : '')); };
  for (const p of ['cover.seen', 'skeleton.question', 'skeleton.oneline', 'skeleton.bazi', 'gifts.oneline', 'years.theme', 'years.lesson.question', 'years.lesson.body', 'closing']) need(p);
  for (const s of rep.cover?.support ?? []) if (!R.support.includes(s)) errs.push(`cover.support 只能填 ${R.support.join('／')}`);
  if (R.support.some((s) => !(rep.cover?.support ?? []).includes(s))) errs.push('cover.support 要写全三套：星盘、八字、人格（封面这句要三套都撑得住）');
  { const CP = R.cover_seen_plain ?? {}, raw = String(rep.cover?.seen ?? ''), lines = raw.split('\n').map((x) => x.trim()).filter(Boolean);
    const gan = prof.method?.bazi?.day_master?.gan, pool = CP.pool?.[gan], pl = prof.method?.persona?.base?.line;
    const bad = (x, i) => { for (const re of CP.patterns ?? []) { const m = x.match(new RegExp(re)); if (m) errs.push(`cover.seen 第${i}句里有「${m[0]}」：${CP.message}`); } };
    if (CP.lines && raw.trim() && lines.length !== CP.lines) errs.push(`cover.seen 要 ${CP.lines} 句、换行隔开（第一句八字、第二句星盘夸天赋、第三句人格），现在 ${lines.length} 句`);
    if (lines[0] && pool && !pool.includes(lines[0])) errs.push(`cover.seen 第一句要从 report_rules.json 的 cover_seen_plain.pool「${gan}」那一组里原样挑一句：${pool.join('／')}`);
    if (lines[1]) { bad(lines[1], 2); const k = n(lines[1]), [lo, hi] = CP.line2 ?? [0, 99]; if (k < lo || k > hi) errs.push(`cover.seen 第二句 ${k} 字，要 ${lo}～${hi} 字（两三个短词定本事，再半句落到他做事的样子上）`); }
    if (lines[2]) { if (pl) { if (lines[2] !== pl) errs.push(`cover.seen 第三句照抄出厂底色那句（method.persona.base.line）：${pl}`); } else { bad(lines[2], 3); if (n(lines[2]) > (CP.line3_max ?? 99)) errs.push(`cover.seen 第三句 ${n(lines[2])} 字，上限 ${CP.line3_max} 字`); } } }
  (rep.progress ?? []).forEach((p, i) => { if (!R.progress_states.includes(p.state)) errs.push(`progress 第${i + 1}条 state 只能是 ${R.progress_states.join('／')}`); });
  (rep.hits ?? []).forEach((x, i) => { if (!R.hit_feedback.includes(x.feedback)) errs.push(`hits 第${i + 1}条 feedback 只能是 准／部分准；未确认或否认的候选不能放入`); });
  const feedback=rep.persona_feedback;
  if(feedback!==undefined){
    if(!Array.isArray(feedback)||feedback.length>3)errs.push('persona_feedback 结构无效');
    else {
      const seen=new Set();
      for(const x of feedback){
        if(!isObj(x)||Object.keys(x).some(k=>!['target','feedback','statement'].includes(k))||!R.persona_feedback.targets.includes(x.target)||!R.persona_feedback.values.includes(x.feedback)||typeof x.statement!=='string'||!x.statement.trim()||seen.has(x.target)){errs.push('persona_feedback 字段无效');continue;}
        seen.add(x.target);
        const persona=prof.method?.persona;
        const original=x.target==='base'?persona?.base?.line:persona?.rebirth?.[Number(x.target.slice(-1))]?.scene;
        if(x.statement!==original)errs.push('persona_feedback 必须对应服务器原句');
      }
    }
  }
  const chapters = rep.chapters ?? {};
  const FR = R.focus_rules, focus = rep.focus ?? [];
  for (const k of focus) if (!R.chapters.includes(k)) errs.push(`focus 里的「${k}」不是八个方面之一`);
  if (new Set(focus).size !== focus.length) errs.push('focus 里有重复');
  for (const c of R.chapters) {
    const ch = chapters[c] ?? {}, n = (ch.sections ?? []).length;
    if (focus.includes(c)) { if (n < FR.focus_sections[0] || n > FR.focus_sections[1]) errs.push(`chapters.${c} 是最响的几件事之一，sections 要 ${FR.focus_sections[0]}～${FR.focus_sections[1]} 节，现在 ${n} 节`); }
    else {
      if (!ch.brief) errs.push(`chapters.${c}.brief 不能空（不在 focus 里的方面写一句结论）`);
      if (n < FR.brief_sections[0] || n > FR.brief_sections[1]) errs.push(`chapters.${c} 不在 focus 里，展开看的 sections 要 ${FR.brief_sections[0]}～${FR.brief_sections[1]} 节（每一面都要能点开），现在 ${n} 节`);
    }
  }
  for (const [f, key] of [['question', 'question_total'], ['gold', 'gold_total'], ['warm', 'warm_total']]) {
    const tot = focus.filter((c) => chapters[c]?.[f]).length, [lo, hi] = FR[key];
    if (tot < lo || tot > hi) errs.push(`最响的几件事里 ${f} 要 ${lo}～${hi} 个，现在 ${tot} 个（结构跟着证据走，别每章一样）`);
  }
  const g = chapters.growth ?? {};
  if (focus.includes('growth') && !(g.sections ?? []).some((x) => (x.title ?? '').includes('课题'))) errs.push('成长与课题在 focus 里时，至少一节小标题带「课题」');
  if (!focus.includes('growth') && chapters.growth && !(g.brief ?? '').includes('课题')) errs.push('成长与课题不在 focus 里时，brief 里要点出人生课题（带「课题」二字）');
  for (const c of Object.keys(chapters)) if (!R.chapters.includes(c)) errs.push(`chapters 里多了 ${c}，只能是 ${R.chapters.join('、')}`);
  if (hasWest) {
    for (const k of ['outer', 'middle', 'inner']) need(`skeleton.layers.${k}.body`, '日月升三层都要写');
    const planets = rep.audit?.planets ?? {};
    for (const p of R.audit_planets) for (const f of ['role', 'p1', 'p2', 'p3']) if (!planets[p]?.[f]) errs.push(`audit.planets.${p}.${f} 不能空（下篇逐星审计十颗星都要写）`);
  } else if (rep.audit?.planets || rep.crosscheck?.length) errs.push('没有出生时间，星盘出不了，audit.planets 和 crosscheck 留空');
  (rep.crosscheck ?? []).forEach((c, i) => { const sy = c.systems ?? []; if (sy.length < 2 || sy.some((s) => !R.support.includes(s))) errs.push(`crosscheck 第${i + 1}条 systems 要列出两套以上：八字／星盘／人格（只摆说法一致的；说法不同的写进 basis.differences）`); });
  for (const [where, v] of [...collect(rep, 'skeleton.refs'), ...collect(rep, 'gifts.items[].refs'), ...collect(rep, 'chapters.*.refs')])
    for (const r of v ?? []) if (!/^(星盘|八字|人格)·.+/.test(String(r))) errs.push(`${where} 里的「${r}」要写成「星盘·金星」「八字·日支」「人格·Te」这种格式`);
  for (const [path, fields] of Object.entries(R.required_each ?? {})) for (const [where, v] of collect(rep, path)) for (const f of fields) if (!(v && typeof v === 'object' && v[f])) errs.push(`${where}.${f} 不能空（每条都要写全：${fields.join('、')}）`);
  const yrs = [...collect(rep, 'years.calendar[].span'), ...collect(rep, 'years.decade[].span')].map(([, v]) => String(v ?? '').match(/^\d{4}/)).filter(Boolean).map((m) => +m[0]);
  const cur = new Date().getFullYear();
  if (yrs.length && (yrs.length !== 10 || yrs.some((y, i) => y !== yrs[0] + i) || ![cur, cur + 1].includes(yrs[0]))) errs.push(`years.calendar 接 years.decade 要从今年起一年一张、连续写满十年（${cur}～${cur + 9}），现在是 ${yrs.join('、')}`);
  const quotes = (prof.method?.quotes ?? []).map((q) => q.text ?? '');
  const text0 = JSON.stringify(Object.fromEntries(Object.entries(rep).filter(([k]) => k !== 'basis')));
  for (const w of R.no_copy?.phrases ?? []) if (text0.includes(w) && !quotes.some((q) => q.includes(w))) errs.push(`默认页出现了「${w}」：这是写作说明里的旧例句，换成从这张盘里长出来的话`);
  for (const m of text0.matchAll(new RegExp((R.quote_markers ?? '$^') + '[^「」]{0,8}「([^」]{4,60})」', 'g'))) if (!quotes.some((q) => m[2].includes(q) || q.includes(m[2]))) errs.push(`引了「${m[2]}」：古人的话只能用 method.quotes 里的候选，原文照抄；候选里没有合适的就不引`);
  const sc = rep.strength_check;
  if (sc) {
    if (!R.strength_check.decided.includes(sc.decided)) errs.push('strength_check.decided 只能是 强／弱／不可判');
    (sc.asked ?? []).forEach((a, i) => { if (!R.strength_check.answer.includes(a.answer)) errs.push(`strength_check.asked 第${i + 1}条 answer 只能是 顺／闷／没感觉`); });
  }
  for (const [path, words] of Object.entries(R.forbidden_in ?? {})) for (const [where, v] of collect(rep, path)) for (const w of words) if (typeof v === 'string' && v.includes(w)) errs.push(`${where} 里不要用「${w}」：今年的天象写成「天象 · 落在哪 · 意味着什么」`);
  for (const [path, word] of Object.entries(R.must_contain ?? {})) { const vals = collect(rep, path).map(([, v]) => v).filter((v) => typeof v === 'string'); if (vals.length && !vals.some((v) => v.includes(word))) errs.push(`${path} 里至少要有一节标题带「${word}」（成长与课题要讲人生课题）`); }
  (rep.basis?.confidence ?? []).forEach((c, i) => { if (!R.levels.includes(c.level)) errs.push(`basis.confidence 第${i + 1}条 level 只能是 高／中／欠定`); });
  const { basis, ...dflt } = rep;
  const text = JSON.stringify(dflt);
  for (const w of R.forbidden_default) if (text.includes(w)) errs.push(`默认页出现了「${w}」：概率、置信度只能写进 basis；出厂底色不叫 MBTI；判词由版面显示，正文不写「判词」「花名」「喻物」「白话」，也不用【】；星管哪宫写「X宫主」；身强身弱说「三种判法」`);
  errs.push(...yearGanZhiErrors(JSON.stringify(rep)), ...deniedYearErrors(rep));
  return errs;
}


function privateProfile(prof) {
  const birth=prof.birth||{};
  const values=[birth.date,birth.time,birth.city,birth.place?.name,prof.bazi?.input?.trueSolarTime].filter(v=>typeof v==='string'&&v.length>=4);
  function clean(v) {
    if(typeof v==='string'){for(const s of values)v=v.split(s).join('[已隐藏]');return v;}
    if(Array.isArray(v))return v.map(clean);
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x)]));
    return v;
  }
  const p=clean(prof);
  p.birth={time_known:!!birth.time,sex:birth.sex,time_source:birth.time_source,time_precision:birth.time_precision};
  if(p.bazi?.input)p.bazi.input={time_known:!!birth.time};
  if(p.bazi?.version)delete p.bazi.version.config;
  return p;
}
// 定时辰结果：只取「定在哪个时辰」这一个字段进报告；--profile 要跟结果对得上（b 用 profile_alt.json）
export function rectifiedOf(prof,rect){
  if(rect===undefined||rect===null)return null;
  if(!isObj(rect)||rect.schema!=='xuanji.rectify/0.1'||!['a','b','uncertain'].includes(rect.result)||!isObj(rect.hours)||typeof rect.hours.a!=='string'||typeof rect.hours.b!=='string')throw Error('RECTIFY_INVALID');
  if(rect.result==='uncertain')return null;
  const hour=rect.hours[rect.result],zhi=prof?.bazi?.bazi?.pillars?.hour?.zhi;
  if(!/^[子丑寅卯辰巳午未申酉戌亥]时$/.test(hour))throw Error('RECTIFY_INVALID');
  if(zhi+'时'!==hour)throw Error('RECTIFY_PROFILE_MISMATCH');
  return {hour};
}
export function build(prof,rep,template=readFileSync(TEMPLATE,'utf8'),rect=null) {
  if(!isObj(prof)||prof.schema!=='xuanji.handoff/0.1'||prof.bazi?.status!=='ok'||!isObj(prof.method))throw Error('PROFILE_INVALID');
  if(!isObj(rep)||rep.schema!==RULES.schema)throw Error('REPORT_INVALID');
  const publicProfile=privateProfile(prof);
  try{safeData(publicProfile);safeData(rep);}catch{throw Error('REPORT_INVALID');}
  if(check(rep,prof).length)throw Error('REPORT_RULES_FAILED');
  const rectified=rectifiedOf(prof,rect);
  if(template.split('__XJ_DATA__').length!==2)throw Error('TEMPLATE_INVALID');
  const blob=JSON.stringify({profile:publicProfile,report:rep,rectified,founder_qr:founderQR(),built_at:new Date().toISOString(),skill_version:SKILL_VERSION}).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  return template.replace('__XJ_DATA__',()=>blob);
}
export async function main(args) {
  const flags={};
  for(let i=0;i<args.length;i+=2){const k=args[i],v=args[i+1];if(!['--profile','--report','--out','--rectify'].includes(k)||!v||v.startsWith('--')||flags[k])throw Error('REPORT_CONFIG_INVALID');flags[k]=v;}
  if(!flags['--profile']||!flags['--report']||!flags['--out'])throw Error('REPORT_CONFIG_INVALID');
  const prof=await readPrivateJSON(flags['--profile'],2097152),rep=await readPrivateJSON(flags['--report'],1048576);
  const rect=flags['--rectify']?await readPrivateJSON(flags['--rectify'],262144):null;
  rectifiedOf(prof,rect);
  const issues=check(rep,prof);
  if(issues.length){
    // Static categories only: no manuscript text, user key names or quote values.
    const categories=new Set(issues.map(x=>x.includes('的干支照')?'YEAR_GANZHI':x.includes('misses')||x.includes('没对上')?'DENIED_YEAR':x.includes('上限')?'LENGTH_LIMIT':x.includes('条')?'ITEM_COUNT':x.includes('不能空')?'REQUIRED_FIELD':x.includes('默认页')?'DEFAULT_WORD':x.includes('古人')?'QUOTE_SOURCE':x.includes('连续写满十年')?'YEAR_SEQUENCE':'FIELD_OR_STRUCTURE'));
    console.error('REPORT_RULES_HINT '+[...categories].join(','));throw Error('REPORT_RULES_FAILED');
  }
  const html=build(prof,rep,undefined,rect);
  await writePrivateText(flags['--out'],html);
  console.log('REPORT_SAVED');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href)main(process.argv.slice(2)).catch(e=>{
 const allowed=['PROFILE_INVALID','REPORT_INVALID','REPORT_RULES_FAILED','TEMPLATE_INVALID','REPORT_CONFIG_INVALID','PRIVATE_FILE_INVALID','RECTIFY_INVALID','RECTIFY_PROFILE_MISMATCH'];
 console.error(allowed.includes(e.message)?e.message:'REPORT_FAILED');process.exitCode=1;
});
