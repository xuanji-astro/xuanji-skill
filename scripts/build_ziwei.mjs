#!/usr/bin/env node
// 紫微排盘报告：读 client.mjs ziwei 存下的 ziwei.json，出静态网页＋PDF＋数据包 txt，再打一个压缩包，都只新建、只给本人读写，不覆盖。
// 用法：node build_ziwei.mjs --ziwei ziwei.json --out 紫微排盘.html [--pdf 紫微排盘.pdf] [--pack 紫微数据包.txt] [--zip 紫微排盘.zip]
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import { existsSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPrivateJSON, writePrivateText, writePrivateBytes, reasonOf } from './private_files.mjs';
import { safeData } from './client.mjs';
import { founderQR } from './build_report.mjs';
import { printPDF } from './make_pdf.mjs';
import { zipFiles } from './build_vedic.mjs';
import { renderZiwei } from './ziwei_render.mjs';
import { ORDER } from './ziwei_pack.mjs';

const MAJOR = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
const BR = '子丑寅卯辰巳午未申酉戌亥';
export function checkZiwei(v) {
  if (!v || v.schema !== 'xuanji.ziwei/0.1') return 'ZIWEI_INVALID';
  if (v.status === 'time_unknown') return 'ZIWEI_TIME_UNKNOWN';   // 没有出生时辰安不了命宫，紫微不排
  const c = v.chart;
  if (v.status !== 'ok' || !c || typeof c !== 'object' || !Array.isArray(c.palaces) || c.palaces.length !== 12) return 'ZIWEI_INVALID';
  const names = c.palaces.map((p) => p.name), brs = c.palaces.map((p) => p.branch);
  if (ORDER.some((n) => !names.includes(n)) || [...BR].some((b) => !brs.includes(b)) || c.palaces.filter((p) => p.is_body).length !== 1) return 'ZIWEI_INVALID';
  const majors = c.palaces.flatMap((p) => (p.major || []).map((s) => s.name));
  if (MAJOR.some((n) => majors.filter((x) => x === n).length !== 1)) return 'ZIWEI_INVALID';
  if (!Array.isArray(c.sihua) || c.sihua.length !== 4 || !c.now || !Array.isArray(c.now.years) || !c.time || !c.lunar) return 'ZIWEI_INVALID';
  if (!c.doujun || !Array.isArray(c.tongxian) || !Array.isArray(c.now.decade_years) || c.palaces.some((p) => !Array.isArray(p.xiaoxian) || !Array.isArray(p.liunian) || !Array.isArray(p.self_hua) || !Array.isArray(p.opp_in) || !Array.isArray(p.adjective) || p.adjective.some((s) => !s || typeof s.name !== 'string'))) return 'ZIWEI_INVALID';   // 吉真那几样（rc.15 接口）都要有
  return null;
}

// 画完逐项核对：十二宫、十四主星、四化、大限、数据包都要在页面上
const plain = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<br>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
export function verifyZiwei(c, html, pack) {
  const t = plain(html), gaps = [];
  for (const n of ORDER) if ((t.match(new RegExp(n, 'g')) || []).length < 3) gaps.push('palace.' + n);
  for (const n of MAJOR) if ((t.match(new RegExp(n, 'g')) || []).length < 2) gaps.push('star.' + n);
  if ((html.match(/class="zc[ "]/g) || []).length !== 12) gaps.push('grid');
  for (const x of c.sihua) if (!t.includes(x.star + x.hua)) gaps.push('sihua.' + x.hua);
  if (c.now.decadal && !/class="zc2 zon"/.test(html)) gaps.push('decadal.now');
  if (!t.replace(/\s/g, '').includes(pack.replace(/\s/g, '').slice(0, 400))) gaps.push('pack');
  for (const k of ['十二宫', '四化', '大限', '流年', '小限', '五行局', '子斗', '正北方', '本宫自化', '对宫化入', '真太阳时']) if (!t.includes(k)) gaps.push(k);
  if (c.now.years[0] && !t.includes('流月')) gaps.push('流月');
  return gaps;
}

const FLAGS = ['--ziwei', '--out', '--pdf', '--pack', '--zip'];
export async function main(args) {
  const f = {};
  for (let i = 0; i < args.length; i += 2) { const k = args[i], v = args[i + 1]; if (!FLAGS.includes(k) || !v || v.startsWith('--') || f[k]) throw Error('REPORT_CONFIG_INVALID'); f[k] = v; }
  if (!f['--ziwei'] || !f['--out'] || !/\.html?$/i.test(f['--out'])) throw Error('REPORT_CONFIG_INVALID');
  if ((f['--pdf'] && !/\.pdf$/i.test(f['--pdf'])) || (f['--pack'] && !/\.txt$/i.test(f['--pack'])) || (f['--zip'] && !/\.zip$/i.test(f['--zip']))) throw Error('REPORT_CONFIG_INVALID');
  const outs = ['--out', '--pdf', '--pack', '--zip'].map((k) => f[k]).filter(Boolean);
  if (new Set(outs.map((p) => resolve(p))).size !== outs.length) throw Error('REPORT_CONFIG_INVALID');
  for (const o of outs) if (existsSync(o)) throw Error('OUTPUT_EXISTS');   // 不覆盖：换个文件名再出
  const v = await readPrivateJSON(f['--ziwei'], 262144);
  try { safeData(v); } catch { throw Error('REPORT_INVALID'); }
  const bad = checkZiwei(v);
  if (bad) throw Error(bad);
  let html, pack;
  try { ({ html, pack } = renderZiwei(v.chart, { qr: founderQR(), timeSource: v.time_source })); } catch { throw Error('REPORT_INCOMPLETE'); }
  const gaps = verifyZiwei(v.chart, html, pack);
  if (gaps.length) { console.error('REPORT_INCOMPLETE_HINT ' + gaps.slice(0, 8).join('; ')); throw Error('REPORT_INCOMPLETE'); }
  await writePrivateText(f['--out'], html);
  console.log('REPORT_SAVED');
  const files = [{ name: basename(f['--out']), data: Buffer.from(html, 'utf8') }];
  if (f['--pdf']) {
    let r; try { r = await printPDF(html, f['--pdf'], { minPages: 2 }); } catch (e) { r = 'FAILED'; const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); }
    console.log(r === 'SAVED' ? 'PDF_SAVED' : 'PDF_SKIPPED_' + r);
    if (r === 'SAVED') files.unshift({ name: basename(f['--pdf']), data: await readFile(f['--pdf']) });
  }
  if (f['--pack']) { await writePrivateText(f['--pack'], pack); console.log('PACK_SAVED'); }
  if (f['--zip']) { files.push({ name: f['--pack'] ? basename(f['--pack']) : '紫微数据包.txt', data: Buffer.from(pack, 'utf8') }); await writePrivateBytes(f['--zip'], zipFiles(files)); console.log('ZIP_SAVED'); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  const allowed = ['REPORT_INVALID', 'REPORT_INCOMPLETE', 'REPORT_CONFIG_INVALID', 'PRIVATE_FILE_INVALID', 'OUTPUT_EXISTS', 'ZIWEI_INVALID', 'ZIWEI_TIME_UNKNOWN'];
  console.error(allowed.includes(e.message) ? e.message : 'REPORT_FAILED'); const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); process.exitCode = 1;
});
