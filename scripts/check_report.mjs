#!/usr/bin/env node
// 报告自查：报告里有没有出现用户的出生日期、时间、出生地。只打「有／没有」和类别，不打任何生辰内容。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 用法：node check_report.mjs --request request.json --report report.html [--report report.json]
// 不要自己在命令或 node -e 里写生辰去搜：命令和输出会留在宿主的记录里。
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readPrivateJSON, readPrivateText } from './private_files.mjs';

const pad = (x) => String(x).padStart(2, '0');
// 一个人的出生信息 → 要搜的写法（同一个日期、时间常见的几种写法；地名取全称和最细的一级）
export function needles(b) {
  const out = { date: [], time: [], place: [] };
  if (b && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    const [y, m, d] = b.date.split('-'), M = +m, Dd = +d;
    out.date.push(b.date, `${y}/${m}/${d}`, `${y}.${m}.${d}`, `${y}${m}${d}`, `${y}年${M}月${Dd}日`, `${y}年${m}月${d}日`, `${y}/${M}/${Dd}`, `${y}.${M}.${Dd}`);
  }
  if (b && typeof b.time === 'string' && /^\d{1,2}:\d{2}$/.test(b.time)) {
    const [h, mi] = b.time.split(':'), H = +h;
    out.time.push(`${pad(H)}:${mi}`, `${H}:${mi}`, `${H}点${mi}`, `${H}时${mi}分`, `${H}点${+mi}分`);
  }
  if (b && typeof b.city === 'string' && b.city.trim()) {
    const c = b.city.replace(/\s+/g, '');
    out.place.push(c);
    const parts = c.match(/.+?(省|自治区|特别行政区|自治州|地区|市|盟|区|县|旗)/g) || [];
    const last = parts.length ? parts[parts.length - 1] : c;
    if (last.length >= 2) out.place.push(last);
  }
  return out;
}
export function found(text, request) {
  const people = request && (request.a || request.b) ? [request.a, request.b] : [request];
  const hit = new Set();
  for (const p of people) for (const [k, list] of Object.entries(needles(p))) if (list.some((s) => s && text.includes(s))) hit.add(k);
  return ['date', 'time', 'place'].filter((k) => hit.has(k));
}
export async function main(args) {
  let req = null; const reps = [];
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i], v = args[i + 1];
    if (!v || v.startsWith('--')) throw Error('CHECK_CONFIG_INVALID');
    if (k === '--request' && !req) req = v; else if (k === '--report') reps.push(v); else throw Error('CHECK_CONFIG_INVALID');
  }
  if (!req || !reps.length) throw Error('CHECK_CONFIG_INVALID');
  const request = await readPrivateJSON(req, 65536);
  const hit = new Set();
  for (const r of reps) for (const k of found(await readPrivateText(r, 2097152), request)) hit.add(k);
  console.log(hit.size ? 'BIRTH_DATA_FOUND ' + [...hit].join(',') : 'BIRTH_DATA_ABSENT');
  if (hit.size) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  console.error(['CHECK_CONFIG_INVALID', 'PRIVATE_FILE_INVALID'].includes(e.message) ? e.message : 'CHECK_FAILED'); process.exitCode = 2;
});
