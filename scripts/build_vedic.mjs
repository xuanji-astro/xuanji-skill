#!/usr/bin/env node
// 印占排盘报告：读 client.mjs vedic 存下的 vedic.json，出静态网页＋PDF＋数据包 txt，再打一个压缩包，都只新建、只给本人读写，不覆盖。
// 用法：node build_vedic.mjs --vedic vedic.json --out 印占排盘.html [--pdf 印占排盘.pdf] [--pack 印占数据包.txt] [--zip 印占排盘.zip] [--style north|south]
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import { existsSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { readPrivateJSON, writePrivateText, writePrivateBytes, reasonOf } from './private_files.mjs';
import { safeData } from './client.mjs';
import { founderQR } from './build_report.mjs';
import { printPDF } from './make_pdf.mjs';
import { renderVedic } from './vedic_render.mjs';

const NEED = ['asc', 'moon', 'planets', 'vargas', 'panchang', 'karakas', 'ashtakavarga', 'sade_sati', 'manglik', 'dasha_days', 'sripati_houses', 'aspects_whole_sign', 'upagraha', 'avakahada', 'shadbala', 'ishta_kashta', 'drishti', 'bhava_bala', 'arudha', 'maitri', 'kalasarpa', 'parivartana', 'vimshopaka', 'today', 'meta', 'time_source', 'err_min', 'dasha_err_days'];
const KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
export function checkVedic(v) {
  if (!v || v.schema !== 'xuanji.vedic/0.1') return 'VEDIC_INVALID';
  if (v.status === 'time_unknown') return 'VEDIC_TIME_UNKNOWN';   // 没有出生时辰没有上升，印占整盘不排
  const c = v.chart;
  if (v.status !== 'ok' || !c || typeof c !== 'object' || NEED.some((k) => !(k in c))) return 'VEDIC_INVALID';
  if (KEYS.some((k) => !c.planets[k]) || Object.keys(c.vargas).length !== 16 || !c.dasha_days.some((m) => m.start <= c.today && c.today < m.end)) return 'VEDIC_INVALID';
  return null;
}

// 画完逐项核对：九曜、十二宫、十六张分盘、当前大运、数据包都要在页面上
const plain = (h) => h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
export function verifyVedic(c, html, pack) {
  const t = plain(html), gaps = [];
  const FULL = { sun: '太阳', moon: '月亮', mars: '火星', mercury: '水星', jupiter: '木星', venus: '金星', saturn: '土星', rahu: '罗睺', ketu: '计都' };
  for (const k of KEYS) if ((t.match(new RegExp(FULL[k], 'g')) || []).length < 3) gaps.push('planets.' + k);
  for (let h = 1; h <= 12; h++) if (!t.includes(`第 ${h} 宫`)) gaps.push('bhava_bala.' + h);
  if ((html.match(/<svg class="yzs/g) || []).length < 21) gaps.push('charts');   // 主盘、另外四张、九分盘、主题六张、八分力、细八张
  const md = c.dasha_days.find((m) => m.start <= c.today && c.today < m.end);
  if (!t.includes(FULL[md.lord] + '大运现在')) gaps.push('dasha_days.now');
  if (!t.replace(/\s/g, '').includes(pack.replace(/\s/g, '').slice(0, 400))) gaps.push('pack');
  if (c.ghata_chakra && c.ghata_chakra.month && !t.includes('不利日')) gaps.push('不利日');   // 引擎有这一栏才查
  for (const k of ['六力', '吉凶果报', '宫位力', '相位', '八分力', '七年半', '罗计夹', '宫主互换', '宫位表', '友敌表', '分盘力', '十六分盘汇总', '配对属性', '副星', '外相点']) if (!t.includes(k)) gaps.push(k);
  return gaps;
}

// 最小的 zip：只放这次新出的几个文件（deflate），文件名按 UTF-8 标记
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zipFiles(files, date = new Date()) {
  const dt = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff, dd = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  const local = [], central = []; let off = 0;
  for (const { name, data } of files) {
    const nm = Buffer.from(name, 'utf8'), z = deflateRawSync(data), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(dt, 10); h.writeUInt16LE(dd, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(z.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
    const ce = Buffer.alloc(46); ce.writeUInt32LE(0x02014b50, 0); ce.writeUInt16LE(20, 4); ce.writeUInt16LE(20, 6); ce.writeUInt16LE(0x0800, 8); ce.writeUInt16LE(8, 10); ce.writeUInt16LE(dt, 12); ce.writeUInt16LE(dd, 14);
    ce.writeUInt32LE(crc, 16); ce.writeUInt32LE(z.length, 20); ce.writeUInt32LE(data.length, 24); ce.writeUInt16LE(nm.length, 28); ce.writeUInt32LE(off, 42);
    local.push(h, nm, z); central.push(ce, nm); off += 30 + nm.length + z.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...local, cd, end]);
}

const FLAGS = ['--vedic', '--out', '--pdf', '--pack', '--zip', '--style'];
export async function main(args) {
  const f = {};
  for (let i = 0; i < args.length; i += 2) { const k = args[i], v = args[i + 1]; if (!FLAGS.includes(k) || !v || v.startsWith('--') || f[k]) throw Error('REPORT_CONFIG_INVALID'); f[k] = v; }
  if (!f['--vedic'] || !f['--out'] || !/\.html?$/i.test(f['--out'])) throw Error('REPORT_CONFIG_INVALID');
  if ((f['--pdf'] && !/\.pdf$/i.test(f['--pdf'])) || (f['--pack'] && !/\.txt$/i.test(f['--pack'])) || (f['--zip'] && !/\.zip$/i.test(f['--zip'])) || (f['--style'] && !['north', 'south'].includes(f['--style']))) throw Error('REPORT_CONFIG_INVALID');
  const outs = ['--out', '--pdf', '--pack', '--zip'].map((k) => f[k]).filter(Boolean);
  if (new Set(outs.map((p) => resolve(p))).size !== outs.length) throw Error('REPORT_CONFIG_INVALID');
  for (const o of outs) if (existsSync(o)) throw Error('OUTPUT_EXISTS');   // 不覆盖：换个文件名再出
  const v = await readPrivateJSON(f['--vedic'], 524288);
  try { safeData(v); } catch { throw Error('REPORT_INVALID'); }
  const bad = checkVedic(v);
  if (bad) throw Error(bad);
  let html, pack;
  try { ({ html, pack } = renderVedic(v.chart, { qr: founderQR(), style: f['--style'] || 'north' })); } catch { throw Error('REPORT_INCOMPLETE'); }
  const gaps = verifyVedic(v.chart, html, pack);
  if (gaps.length) { console.error('REPORT_INCOMPLETE_HINT ' + gaps.slice(0, 8).join('; ')); throw Error('REPORT_INCOMPLETE'); }
  await writePrivateText(f['--out'], html);
  console.log('REPORT_SAVED');
  const files = [{ name: basename(f['--out']), data: Buffer.from(html, 'utf8') }];
  if (f['--pdf']) {
    let r; try { r = await printPDF(html, f['--pdf'], { minPages: 4 }); } catch (e) { r = 'FAILED'; const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); }
    console.log(r === 'SAVED' ? 'PDF_SAVED' : 'PDF_SKIPPED_' + r);
    if (r === 'SAVED') files.unshift({ name: basename(f['--pdf']), data: await readFile(f['--pdf']) });
  }
  if (f['--pack']) { await writePrivateText(f['--pack'], pack); console.log('PACK_SAVED'); }
  if (f['--zip']) { files.push({ name: f['--pack'] ? basename(f['--pack']) : '印占数据包.txt', data: Buffer.from(pack, 'utf8') }); await writePrivateBytes(f['--zip'], zipFiles(files)); console.log('ZIP_SAVED'); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  const allowed = ['REPORT_INVALID', 'REPORT_INCOMPLETE', 'REPORT_CONFIG_INVALID', 'PRIVATE_FILE_INVALID', 'OUTPUT_EXISTS', 'VEDIC_INVALID', 'VEDIC_TIME_UNKNOWN'];
  console.error(allowed.includes(e.message) ? e.message : 'REPORT_FAILED'); const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); process.exitCode = 1;
});
