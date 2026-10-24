// SPDX-License-Identifier: Apache-2.0
// 紫微专题报告：骨架、依据、四化亮度落宫跟盘对得上、篇幅、出文件。合成盘＋一份照 Skill 流程写出来的夫妻宫样稿。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkDoc, verifyDoc, renderDoc } from '../scripts/build_doc.mjs';
import { periods, TOPICS } from '../scripts/ziwei_doc.mjs';
import { createPrivateJSON } from '../scripts/create_private_json.mjs';
import { assertPrivateFile } from '../scripts/private_files.mjs';

const F = (f) => JSON.parse(readFileSync(new URL('./fixtures/' + f, import.meta.url), 'utf8'));
const inp = () => ({ report: F('ziwei_report_fuqi.json'), ziwei: F('ziwei_synthetic.json') });
const cats = (c) => checkDoc('ziwei', c).map(([k]) => k);
const addTo = (c, s) => { c.report.sections[0].paras[0] += s; return c; };

test('样稿查得过；画出来每一段字都在页面上；三方四正小盘和大限流年四化照盘画', () => {
  const c = inp();
  assert.deepEqual(checkDoc('ziwei', c), []);
  const html = renderDoc('ziwei', c, null);
  assert.deepEqual(verifyDoc(c.report, html), []);
  assert(!html.includes('<script'));
  assert.equal((html.match(/class="zd-c[ "]/g) || []).length, 12);
  assert.match(html, /zd-c on[^>]*>.*?夫妻/s);
  const pr = periods(c.ziwei.chart);
  assert.equal(pr.length, 4); assert.match(pr[0].label, /^这步大限/);
  assert.deepEqual(pr[1].hua.map((h) => h.star + h.hua + h.palace), ['天同禄财帛', '天机权命宫', '文昌科田宅', '廉贞忌交友']);
});

test('四化、亮度、四化落宫跟盘对不上都拦下', () => {
  assert(cats(addTo(inp(), '今年文昌化忌，文书上多留心。')).includes('ZIWEI_SIHUA'));   // 2026 是文昌化科
  assert(cats(addTo(inp(), '太阳（陷）的人不张扬。')).includes('ZIWEI_BRIGHTNESS'));   // 盘上太阳是「不」
  assert(cats(addTo(inp(), '贪狼化禄在交友，朋友帮你。')).includes('ZIWEI_PALACE'));   // 贪狼在兄弟
  assert.deepEqual(checkDoc('ziwei', addTo(inp(), '贪狼化禄在兄弟，同辈帮你。')).filter(([k]) => k.startsWith('ZIWEI')), []);
});

test('骨架段名、依据的星、篇幅、题目、封面术语都查', () => {
  const a = inp(); [a.report.sections[0].title, a.report.sections[1].title] = [a.report.sections[1].title, a.report.sections[0].title];
  assert(cats(a).includes('ZIWEI_SECTIONS'));
  const b = inp(); b.report.sections[0].basis = [{ palace: '夫妻', stars: ['紫微'] }];
  assert(cats(b).includes('ZIWEI_BASIS'));
  const b2 = inp(); b2.report.sections[0].basis = [{ palace: '夫妻', stars: '太阳、太阴' }];   // 顿号隔开的一串也认
  assert(!cats(b2).includes('ZIWEI_BASIS'));
  const d = inp(); d.report.sections[1].paras = d.report.sections[1].paras.map((p) => p.slice(0, 60));
  assert(cats(d).includes('LENGTH_SHORT'));
  const e = inp(); e.report.years = e.report.years.slice(0, 3);
  assert(cats(e).includes('ITEM_COUNT'));
  assert.deepEqual(checkDoc('ziwei', { ...inp(), report: { ...inp().report, topic: 'jibing' } }).map(([k]) => k), ['ZIWEI_TOPIC']);
  const g = inp(); g.report.cover.seen = ['夫妻宫里太阳化禄，福气照人', ...g.report.cover.seen.slice(1)];
  assert(cats(g).includes('COVER_TERMS'));
  const h = inp(); h.report.cover.seen = h.report.cover.seen.join('\n');   // 三句写成一串、一句一行也认
  assert.deepEqual(checkDoc('ziwei', h), []);
  assert.equal(Object.keys(TOPICS).length, 3);
});

test('命令行：只新建、只给本人读写；没给盘、查不过都不出文件', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xj-zwdoc-')), cli = fileURLToPath(new URL('../scripts/build_doc.mjs', import.meta.url)), c = inp();
  const zp = join(root, 'ziwei.json'), rp = join(root, 'ziwei_report.json'); await createPrivateJSON(zp, c.ziwei); await createPrivateJSON(rp, c.report);
  const out = join(root, '紫微_夫妻宫.html');
  const r = spawnSync(process.execPath, [cli, '--kind', 'ziwei', '--ziwei', zp, '--report', rp, '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout.trim(), 'REPORT_SAVED');
  await assertPrivateFile(out); if (process.platform !== 'win32') assert.equal(statSync(out).mode & 0o777, 0o600);
  assert.match(spawnSync(process.execPath, [cli, '--kind', 'ziwei', '--ziwei', zp, '--report', rp, '--out', out], { encoding: 'utf8' }).stderr, /OUTPUT_EXISTS/);
  assert.match(spawnSync(process.execPath, [cli, '--kind', 'ziwei', '--report', rp, '--out', join(root, 'a.html')], { encoding: 'utf8' }).stderr, /REPORT_CONFIG_INVALID/);
  const bp = join(root, 'bad.json'); await createPrivateJSON(bp, addTo(inp(), '今年文昌化忌。').report);
  const q = spawnSync(process.execPath, [cli, '--kind', 'ziwei', '--ziwei', zp, '--report', bp, '--out', join(root, 'b.html')], { encoding: 'utf8' });
  assert.equal(q.status, 1); assert.match(q.stderr, /REPORT_RULES_HINT ZIWEI_SIHUA:\*/); assert(!q.stderr.includes('文昌')); assert(!existsSync(join(root, 'b.html')));
});
