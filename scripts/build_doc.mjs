#!/usr/bin/env node
// 三份报告出文件：一事一卜、年度、分术
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 用法：
//   node build_doc.mjs --kind yishi  --cast yishi_cast.json --view xuanji_view.json --report yishi_report.json --out yishi.html [--pdf yishi.pdf]
//   node build_doc.mjs --kind year   --profile profile.json --year year.json --view xuanji_year.json --report year_report.json --out year.html [--pdf year.pdf]
//   node build_doc.mjs --kind fenshu --profile profile.json --view xuanji_fenshu.json --report fenshu_report.json [--year year.json] [--hits hits.json] --out fenshu.html [--pdf fenshu.pdf]
// 先查报告数据（必填、条数、长度、不能写的词、跟玄玑怎么看对不对得上），查不过报 REPORT_RULES_FAILED，提示只给类别和字段路径、不带正文；
// 再整页画好，逐条核对报告里的每一段字都上了页面，少一段报 REPORT_INCOMPLETE；两样都过才新建 HTML（REPORT_SAVED），不覆盖已有文件；
// 带 --pdf 时，电脑上有 Chrome／Edge 这类浏览器就再打一份 PDF（PDF_SAVED），没有就只出 HTML（PDF_SKIPPED_…）
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPrivateJSON, writePrivateText, reasonOf } from './private_files.mjs';
import { safeData } from './client.mjs';
import { founderQR, yearGanZhiErrors } from './build_report.mjs';
import { printPDF } from './make_pdf.mjs';
import { renderYishi, renderYear, renderFenshu } from './doc_render.mjs';

const KINDS = ['yishi', 'year', 'fenshu'];
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const arr = (v) => (Array.isArray(v) ? v : []);
const n = (s) => [...String(s ?? '').replaceAll('**', '').replace(/\s/g, '')].length;
const SYS4 = ['八字', '星盘', '印占', '出厂底色'];

// 按 a.b.*.c / a[] 取出所有 [位置, 值]
function at(obj, path) {
  let out = [['', obj]];
  for (const part of path.split('.')) {
    const many = part.endsWith('[]'), key = many ? part.slice(0, -2) : part, nxt = [];
    for (const [w, o] of out) {
      if (key === '*') { if (isObj(o)) for (const [k, v] of Object.entries(o)) nxt.push([`${w}.${k}`.replace(/^\./, ''), v]); continue; }
      const v = isObj(o) ? o[key] : undefined, w2 = `${w}.${key}`.replace(/^\./, '');
      if (many) { if (Array.isArray(v)) v.forEach((x, i) => nxt.push([`${w2}[${i + 1}]`, x])); }
      else if (v !== undefined && v !== null) nxt.push([w2, v]);
    }
    out = nxt;
  }
  return out;
}

// 每份报告：必填（空就不行）、条数 [少, 多]、长度上限（去掉空格和 ** 数字数）
const SPEC = {
  yishi: {
    need: ['verdict', 'headline', 'three.liuyao.verdict', 'three.meihua.verdict', 'three.xuanji.note', 'glance.key_date.label', 'glance.points', 'axis', 'cross.zones', 'cross.para', 'situation.them_lack', 'situation.you_hold', 'situation.guard',
      'route.start', 'route.main', 'route.end.text', 'advisors', 'detail.liuyao.summary', 'detail.liuyao.steps', 'detail.meihua.summary', 'detail.meihua.steps', 'detail.xuanji.summary', 'detail.xuanji.steps', 'loop.stairs', 'loop.remember', 'loop.back_msg', 'doors', 'next_questions'],
    count: { headline: [2, 4], 'glance.points': [3, 3], axis: [2, 6], 'route.main': [2, 8], advisors: [1, 3], 'loop.stairs': [3, 3], doors: [1, 2], next_questions: [2, 3] },
    max: { verdict: 2, verdict_note: 6, 'headline[]': 16, 'glance.points[].title': 8, 'glance.points[].sub': 18, 'loop.remember': 40, 'loop.back_msg': 24, 'next_questions[]': 30 },
  },
  year: {
    need: ['year', 'cover.seen', 'cover.evidence', 'cover.stamp', 'keyword', 'oneline', 'four.八字.text', 'four.星盘.text', 'four.出厂底色.text', 'glance.key_line', 'glance.points', 'plan.steps', 'plan.remember',
      'climate.seasons', 'past.statement', 'life.sections', 'five', 'threads.lanes', 'months', 'xuanji.big', 'doors', 'loop.stairs', 'loop.nots', 'loop.remember', 'loop.back_msg', 'next_questions'],
    count: { 'plan.steps': [5, 6], 'climate.seasons': [3, 3], five: [5, 5], 'threads.lanes': [3, 4], months: [12, 12], doors: [2, 2], 'loop.stairs': [3, 3], 'loop.nots': [2, 2], next_questions: [3, 3] },
    max: { 'cover.stamp': 2, keyword: 2, oneline: 60, 'four.*.text': 14, 'four.*.em': 6, 'plan.steps[].title': 22, 'plan.remember': 40, 'loop.remember': 40, 'loop.back_msg': 24, 'next_questions[]': 30 },
  },
  fenshu: {
    need: ['question', 'cover.seen', 'cover.evidence', 'cover.stamp', 'oneline', 'four.八字.text', 'four.星盘.text', 'four.出厂底色.text', 'matrix.rows', 'matrix.cells', 'plan.ladder', 'plan.steps', 'plan.remember',
      'systems.八字.conclusion', 'systems.星盘.conclusion', 'systems.出厂底色.conclusion', 'agree', 'differ', 'check', 'xuanji.big', 'xuanji.para', 'doors', 'next_questions'],
    count: { 'matrix.rows': [3, 3], 'plan.ladder': [3, 7], 'plan.steps': [4, 7], agree: [2, 5], differ: [2, 4], check: [2, 3], doors: [2, 2], next_questions: [3, 3] },
    max: { question: 80, 'cover.stamp': 2, oneline: 70, 'four.*.text': 14, 'four.*.em': 6, 'matrix.rows[]': 4, 'plan.ladder[].title': 8, 'plan.ladder[].sub': 18, 'plan.steps[].title': 22, 'plan.remember': 40, 'systems.*.verdict': 8, 'next_questions[]': 30 },
  },
};
// 不能写的词：说明书里不让写的口头禅、玄玑怎么看背后的术名、把握写成数字
const BANNED = ['那股劲', '这股劲', '带劲', '不轻，但', 'KP', '西洋卜卦', '判词', '接口', '%', '％', '概率', '准确率', '命中率', '【', '】'];
// 封面三句里不放术语（术语挪到「依据」）
const COVER_TERMS = ['宫', '大运', '流年', '正官', '七杀', '偏财', '正财', '伤官', '食神', '偏印', '正印', '比肩', '劫财', '冥王', '海王', '天王', '土星', '木星', '水星', '金星', '火星', '上升', '天顶', '相位', '格局'];
const MBTI = /(?<![A-Z])[EI][NS][TF][JP](?![A-Z])/g;

function strings(o, path = '', out = []) {
  if (typeof o === 'string') out.push([path, o]);
  else if (Array.isArray(o)) o.forEach((x, i) => strings(x, `${path}[${i + 1}]`, out));
  else if (isObj(o)) for (const [k, v] of Object.entries(o)) strings(v, path ? `${path}.${k}` : k, out);
  return out;
}

// 查报告数据：返回 [类别, 字段路径]；只看结构和写法，不评内容
export function checkDoc(kind, { report: R, profile, year: Y, view, cast, hits } = {}) {
  const bad = [], say = (cat, path) => bad.push([cat, path]);
  if (!KINDS.includes(kind)) return [['KIND', 'kind']];
  if (!isObj(R) || R.schema !== `xuanji.${kind}_report/0.1`) return [['REPORT_SCHEMA', 'schema']];
  const S = SPEC[kind];
  for (const p of S.need) { const v = at(R, p); if (!v.length || v.some(([, x]) => x === '' || (Array.isArray(x) && !x.length) || (isObj(x) && !Object.keys(x).length))) say('REQUIRED_FIELD', p); }
  for (const [p, [lo, hi]] of Object.entries(S.count)) { const v = at(R, p)[0]?.[1]; if (Array.isArray(v) && (v.length < lo || v.length > hi)) say('ITEM_COUNT', p); }
  for (const [p, m] of Object.entries(S.max)) for (const [w, v] of at(R, p)) if (typeof v === 'string' && n(v) > m) say('LENGTH_LIMIT', w);
  const all = strings(R);
  for (const [w, v] of all) {
    if (n(v) > 400) say('LENGTH_LIMIT', w);
    if (/<[a-z/!]/i.test(v)) say('NO_HTML', w);
    if (BANNED.some((b) => v.includes(b))) say('BANNED_WORD', w);
  }
  const text = all.map(([, v]) => v).join('\n');
  if ((text.match(/亮/g) || []).length - (text.match(/月亮/g) || []).length > 1) say('REPEATED_LIANG', '*');
  if (yearGanZhiErrors(text, kind === 'year' && Number.isInteger(R.year) ? R.year : undefined).length) say('YEAR_GANZHI', '*');

  // 封面三句：三行；第二句 14～28 字；三句里不放术语；印章两个字
  if (kind !== 'yishi' && isObj(R.cover) && typeof R.cover.seen === 'string') {
    const lines = R.cover.seen.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length !== 3) say('COVER_LINES', 'cover.seen');
    else { const c = n(lines[1].replace(/[，。；、：！？「」]/g, '')); if (c < 14 || c > 28) say('COVER_LINES', 'cover.seen'); }
    if (COVER_TERMS.some((t) => R.cover.seen.includes(t)) || MBTI.test(R.cover.seen)) say('COVER_TERMS', 'cover.seen');
    MBTI.lastIndex = 0;
  }
  // 出厂底色的字母只能是他盘上的那几个
  const persona = profile?.method?.persona;
  if (persona) {
    const ok = new Set([persona.base?.type, ...arr(persona.rebirth).map((r) => r.type), profile.astro_mbti?.base_type].filter(Boolean));
    for (const m of text.matchAll(MBTI)) if (!ok.has(m[0])) { say('PERSONA_TYPE', '*'); break; }
  }
  // 时辰不详没有印占：报告里就不写印占那几块
  if (profile && kind !== 'yishi' && profile.vedic?.status !== 'ok') {
    for (const p of ['four.印占', 'systems.印占', 'matrix.cells.印占']) if (at(R, p).length) say('VEDIC_WITHOUT_TIME', p);
  }

  // 图上紫圈里的数字＝下面第几步：每个数字只出现一次，而且有那一步
  if (kind !== 'yishi' && isObj(R.plan)) {
    const marks = [...at(R.plan, 'graph.left[].step'), ...at(R.plan, 'graph.right.top.step'), ...at(R.plan, 'graph.right.bottom.step'), ...at(R.plan, 'graph.merge.step'), ...at(R.plan, 'graph.base.step'), ...at(R.plan, 'ladder[].step'), ...at(R.plan, 'side.step')].map(([, v]) => String(v));
    const total = arr(R.plan.steps).length;
    if (new Set(marks).size !== marks.length || marks.some((m) => !/^\d+$/.test(m) || +m < 1 || +m > total)) say('STEP_MARKS', 'plan');
  }
  if (kind === 'yishi') {
    if (!isObj(cast) || cast.schema !== 'xuanji.yishi_cast/0.1' || !isObj(cast.liuyao) || !isObj(cast.meihua)) say('CAST_INVALID', 'cast');
    if (view != null && (view.schema !== 'xuanji.view/0.1' || view.kind !== 'yishi')) say('VIEW_INVALID', 'view');
    // 玄玑怎么看给了日子：报告里玄玑那一格要说到同一个月
    const mo = view?.window?.start ? String(+view.window.start.slice(5, 7)) : null;
    if (mo && typeof R.three?.xuanji?.note === 'string' && !new RegExp(`(?<!\\d)${mo}\\s*月`).test(R.three.xuanji.note)) say('VIEW_MISMATCH', 'three.xuanji.note');
  }
  if (kind === 'year') {
    if (!isObj(Y) || Y.schema !== 'xuanji.year/0.1' || !arr(Y.bazi?.months).length) say('YEAR_INVALID', 'year');
    if (!isObj(view) || view.schema !== 'xuanji.view/0.1' || view.kind !== 'year') say('VIEW_INVALID', 'view');
    else {
      if (R.year !== Y?.year || view.year !== Y?.year) say('VIEW_MISMATCH', 'year');
      // 要紧的月以玄玑怎么看为准
      const mo = view.key?.month ? String(+view.key.month.slice(5, 7)) : null;
      if (mo && typeof R.glance?.key_month_label === 'string' && !new RegExp(`(?<!\\d)${mo}\\s*月`).test(R.glance.key_month_label)) say('VIEW_MISMATCH', 'glance.key_month_label');
    }
    if (!profile) say('PROFILE_INVALID', 'profile');
  }
  if (kind === 'fenshu') {
    if (!isObj(view) || view.schema !== 'xuanji.view/0.1' || view.kind !== 'fenshu') say('VIEW_INVALID', 'view');
    else if (view.key_window?.year) {
      // 玄玑怎么看那一卷要说到它挑的那一年
      const xj = `${R.xuanji?.big ?? ''}${R.xuanji?.para ?? ''}`;
      if (!xj.includes(String(view.key_window.year))) say('VIEW_MISMATCH', 'xuanji');
    }
    if (!profile) say('PROFILE_INVALID', 'profile');
    // 格子每格最多两行、每行六个字以内；四套盘每套三格
    for (const k of SYS4) { const c = R.matrix?.cells?.[k]; if (c === undefined) continue; if (!Array.isArray(c) || c.length !== 3) say('ITEM_COUNT', `matrix.cells.${k}`); else c.forEach((v, i) => { const seg = String(v).split('/'); if (seg.length > 3 || seg.some((s) => n(s) > 6)) say('LENGTH_LIMIT', `matrix.cells.${k}[${i + 1}]`); }); }
    // 对过的事：hit_id 必须是他在对话里说过、记进 hits.json 的那一条
    const ids = new Set(arr(hits?.items).map((h) => h.id));
    if (hits != null && (hits.schema !== 'xuanji.hits/0.1' || !Array.isArray(hits.items) || hits.items.some((h) => !isObj(h) || !/^[a-z0-9-]{1,32}$/.test(h.id) || typeof h.said !== 'string' || !h.said || n(h.said) > 200))) say('HITS_INVALID', 'hits');
    arr(R.check).forEach((c, i) => { if (c?.hit_id !== undefined && !ids.has(c.hit_id)) say('HIT_UNKNOWN', `check[${i + 1}].hit_id`); if (c?.hit_id === undefined && !c?.msg) say('REQUIRED_FIELD', `check[${i + 1}].msg`); });
  }
  return bad;
}

// 报告里的每一段字都要上页面：把 HTML 去掉标签，按段落、斜杠、换行拆开逐段找
const NOT_SHOWN = new Set(['schema', 'color', 'kind', 'source', 'sys', 'type', 'tag', 'key', 'step', 'hit_id', 'index', 'level', 'after', 'month']);
const plain = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s/g, '');
export function verifyDoc(report, html, hits) {
  const page = plain(html), gaps = [];
  const walk = (o, path, key) => {
    if (NOT_SHOWN.has(key)) return;
    if (typeof o === 'string') {
      for (const frag of o.split(/\n|\//)) { const f = frag.replaceAll('**', '').replace(/\s/g, ''); if (f && !page.includes(f)) { gaps.push(path); break; } }
    } else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${path}[${i + 1}]`, key));
    else if (isObj(o)) for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k, k);
  };
  const ids = new Set(arr(report.check).map((c) => c.hit_id).filter(Boolean));
  // 对上了的那条显示绿勾和他说过的话，「回到对话里发」那句就不再出
  const done = new Set(arr(hits?.items).map((h) => h.id));
  walk(Array.isArray(report.check) ? { ...report, check: report.check.map((c) => (done.has(c?.hit_id) ? { ...c, msg: undefined, label: undefined } : c)) } : report, '', '');
  for (const h of arr(hits?.items)) if (ids.has(h.id) && !page.includes(h.said.replace(/\s/g, ''))) gaps.push(`hits.${h.id}`);
  return gaps;
}

export function renderDoc(kind, inp, qr = founderQR()) {
  const { report, profile, year, view, cast, hits } = inp;
  if (kind === 'yishi') return renderYishi({ cast, view, report, qr });
  if (kind === 'year') return renderYear({ prof: profile, year, view, report, qr });
  return renderFenshu({ report, hits, qr });
}

const FLAGS = ['--kind', '--report', '--out', '--pdf', '--cast', '--view', '--profile', '--year', '--hits'];
const NEEDS = { yishi: ['--cast', '--report', '--out'], year: ['--profile', '--year', '--view', '--report', '--out'], fenshu: ['--profile', '--view', '--report', '--out'] };
const ALLOWED = { yishi: ['--cast', '--view'], year: ['--profile', '--year', '--view'], fenshu: ['--profile', '--view', '--year', '--hits'] };
export async function main(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) { const k = args[i], v = args[i + 1]; if (!FLAGS.includes(k) || !v || v.startsWith('--') || flags[k]) throw Error('REPORT_CONFIG_INVALID'); flags[k] = v; }
  const kind = flags['--kind'];
  if (!KINDS.includes(kind) || NEEDS[kind].some((k) => !flags[k])) throw Error('REPORT_CONFIG_INVALID');
  if (Object.keys(flags).some((k) => !['--kind', '--report', '--out', '--pdf', ...ALLOWED[kind]].includes(k))) throw Error('REPORT_CONFIG_INVALID');
  if (!/\.html?$/i.test(flags['--out']) || (flags['--pdf'] && (resolve(flags['--pdf']) === resolve(flags['--out']) || !/\.pdf$/i.test(flags['--pdf'])))) throw Error('REPORT_CONFIG_INVALID');
  for (const o of [flags['--out'], flags['--pdf']]) if (o && existsSync(o)) throw Error('OUTPUT_EXISTS');   // 不覆盖：换个文件名再出
  const read = (k, max) => (flags[k] ? readPrivateJSON(flags[k], max) : null);
  const inp = { report: await read('--report', 1048576), profile: await read('--profile', 2097152), year: await read('--year', 2097152), view: await read('--view', 65536), cast: await read('--cast', 262144), hits: await read('--hits', 262144) };
  for (const v of Object.values(inp)) if (v) { try { safeData(v); } catch { throw Error('REPORT_INVALID'); } }
  const issues = checkDoc(kind, inp);
  if (issues.length) { console.error('REPORT_RULES_HINT ' + issues.slice(0, 12).map(([c, p]) => `${c}:${p}`).join(',')); throw Error('REPORT_RULES_FAILED'); }
  let html;
  try { html = renderDoc(kind, inp); } catch { throw Error('REPORT_INCOMPLETE'); }   // 画不出来＝数据缺了渲染要的东西
  const gaps = verifyDoc(inp.report, html, inp.hits);
  if (gaps.length) { console.error('REPORT_INCOMPLETE_HINT ' + gaps.slice(0, 8).join('; ')); throw Error('REPORT_INCOMPLETE'); }   // 只报字段路径，不报正文
  await writePrivateText(flags['--out'], html);
  console.log('REPORT_SAVED');
  if (flags['--pdf']) { let r; try { r = await printPDF(html, flags['--pdf']); } catch (e) { r = 'FAILED'; const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); } console.log(r === 'SAVED' ? 'PDF_SAVED' : 'PDF_SKIPPED_' + r); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  const allowed = ['REPORT_INVALID', 'REPORT_RULES_FAILED', 'REPORT_INCOMPLETE', 'REPORT_CONFIG_INVALID', 'PRIVATE_FILE_INVALID', 'OUTPUT_EXISTS'];
  console.error(allowed.includes(e.message) ? e.message : 'REPORT_FAILED'); const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); process.exitCode = 1;
});
