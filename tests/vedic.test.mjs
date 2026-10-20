// SPDX-License-Identifier: Apache-2.0
// 印占排盘报告：画页面、逐项核对、数据包、压缩包、命令行只新建只给本人读写。全用 tests/fixtures 的合成盘。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { renderVedic } from '../scripts/vedic_render.mjs';
import { vedicPack } from '../scripts/vedic_pack.mjs';
import { checkVedic, verifyVedic, zipFiles } from '../scripts/build_vedic.mjs';
import { chartSVG, ORDER } from '../scripts/vedic_chart.mjs';
import { validate } from '../scripts/client.mjs';
import { createPrivateJSON } from '../scripts/create_private_json.mjs';
import { assertPrivateFile } from '../scripts/private_files.mjs';

const V = () => JSON.parse(readFileSync(new URL('./fixtures/vedic_sample.json', import.meta.url), 'utf8'));

// 读 zip 的中央目录：文件名（UTF-8）和解出来的内容
function unzip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), n = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16); const out = {};
  for (let i = 0; i < n; i++) {
    const flag = buf.readUInt16LE(p + 8), size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString('utf8'), ll = buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    out[name] = { utf8: !!(flag & 0x800), data: inflateRawSync(buf.subarray(off + 30 + ll, off + 30 + ll + size)) };
    p += 46 + nl;
  }
  return out;
}

test('合成盘画得出整页：静态、九曜十二宫十六分盘都在、不印出生日期时间地点', () => {
  const v = V(), { html, pack } = renderVedic(v.chart, { qr: null });
  assert.match(html, /^<!doctype html>/); assert(!html.includes('<script'));
  assert.deepEqual(verifyVedic(v.chart, html, pack), []);
  for (const s of ['1993-08-17', '1993.08.17', '09:40', '杭州']) { assert(!html.includes(s), s); assert(!pack.includes(s), s); }
  assert(!/<img(?![^>]*alt="创始人微信")/.test(html), '盘面不带图片');
  // 不利日（10-19 引擎起有）：报告和数据包都带；拿掉这一栏就报缺
  assert(html.includes('不利日') && pack.includes('不利日（Ghata'));
  assert.deepEqual(verifyVedic(v.chart, html.replace(/不利日/g, ''), pack), ['不利日']);
});

test('数据包：开头结尾推 Skill，带读法，数字跟整盘一致', () => {
  const v = V(), pack = vedicPack(v.chart);
  assert(pack.startsWith('【执天玄玑 · 印占盘数据包】'));
  assert.equal((pack.match(/github\.com\/xuanji-astro\/xuanji-skill/g) || []).length, 2);
  assert(pack.includes('八、请这样读'));
  const sb = v.chart.shadbala, top = Object.keys(sb).sort((a, b) => sb[a].rank - sb[b].rank)[0];
  const FULL = { sun: '太阳', moon: '月亮', mars: '火星', mercury: '水星', jupiter: '木星', venus: '金星', saturn: '土星' };
  assert(pack.includes(`六力（Shadbala，分，括号里是及格线）：${FULL[top]} ${Math.round(sb[top].total_virupa)}`));
  assert.equal(vedicPack(v.chart), pack, '同一份盘拼出来一字不差');
});

test('整盘不对就不出：没有时辰、缺字段、不是印占的回包', () => {
  const v = V();
  assert.equal(checkVedic(v), null);
  assert.equal(checkVedic({ schema: 'xuanji.vedic/0.1', status: 'time_unknown' }), 'VEDIC_TIME_UNKNOWN');
  const a = V(); delete a.chart.shadbala; assert.equal(checkVedic(a), 'VEDIC_INVALID');
  assert.equal(checkVedic({ ...V(), schema: 'xuanji.year/0.1' }), 'VEDIC_INVALID');
  const b = V(); const { html, pack } = renderVedic(b.chart); assert.deepEqual(verifyVedic(b.chart, html.replace(/宫位力/g, ''), pack), ['宫位力']);
});

test('盘图：白盘面金边四芒星，北印南印都画得出，同一份数据画出来一样', () => {
  const c = V().chart, items = ORDER.map((k) => ({ key: k, sign: c.planets[k].sign, deg: c.planets[k].deg, retro: c.planets[k].retro, dignity: c.planets[k].dignity }));
  const a = chartSVG({ asc: c.asc.sign, items, big: true }), s = chartSVG({ asc: c.asc.sign, items, big: true, style: 'south' });
  assert.match(a, /^<svg class="yzs"/); assert.match(s, /^<svg class="yzs"/);
  assert(a.includes('yz-pl') && a.includes('<rect'));
  assert.equal(a.replace(/yzp\d+/g, ''), chartSVG({ asc: c.asc.sign, items, big: true }).replace(/yzp\d+/g, ''));
});

test('压缩包：文件名按 UTF-8 标记，解出来跟原文件一样', () => {
  const z = unzip(zipFiles([{ name: '印占排盘.html', data: Buffer.from('<p>盘</p>') }, { name: '印占数据包.txt', data: Buffer.from('数据包\n') }]));
  assert.deepEqual(Object.keys(z), ['印占排盘.html', '印占数据包.txt']);
  assert(z['印占数据包.txt'].utf8); assert.equal(z['印占数据包.txt'].data.toString(), '数据包\n');
});

test('接口：vedic 只收生辰字段', () => {
  validate('vedic', { date: '1993-08-17', time: '09:40', city: '浙江省杭州市西湖区', gender: 'female', time_source: 'birth_certificate' });
  assert.throws(() => validate('vedic', { date: '1993-08-17', time: '09:40', city: '杭州', gender: 'female', answers: [] }), /INPUT_INVALID/);
  assert.throws(() => validate('vedic', { date: '1993-08-17', city: '杭州' }), /MISSING_PARAMETER/);
});

test('命令行：私有输入才读；网页、数据包、压缩包只新建、只给本人读写；不覆盖；没有时辰不出', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xj-vedic-')), cli = fileURLToPath(new URL('../scripts/build_vedic.mjs', import.meta.url));
  const vp = join(root, 'vedic.json'); await createPrivateJSON(vp, V());
  const o = (n) => join(root, n), args = ['--vedic', vp, '--out', o('印占排盘.html'), '--pack', o('印占数据包.txt'), '--zip', o('印占排盘.zip')];
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.deepEqual(r.stdout.trim().split('\n'), ['REPORT_SAVED', 'PACK_SAVED', 'ZIP_SAVED']);
  for (const n of ['印占排盘.html', '印占数据包.txt', '印占排盘.zip']) { assert(existsSync(o(n))); await assertPrivateFile(o(n)); if (process.platform !== 'win32') assert.equal(statSync(o(n)).mode & 0o777, 0o600); }
  const z = unzip(readFileSync(o('印占排盘.zip')));
  assert.deepEqual(Object.keys(z).sort(), ['印占排盘.html', '印占数据包.txt'].sort());
  assert.equal(z['印占数据包.txt'].data.toString(), readFileSync(o('印占数据包.txt'), 'utf8'));
  const again = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(again.status, 1); assert.match(again.stderr, /OUTPUT_EXISTS/);
  const tu = join(root, 'tu.json'); await createPrivateJSON(tu, { schema: 'xuanji.vedic/0.1', version: {}, time_source: 'unknown', status: 'time_unknown' });
  const t = spawnSync(process.execPath, [cli, '--vedic', tu, '--out', o('t.html')], { encoding: 'utf8' });
  assert.equal(t.status, 1); assert.match(t.stderr, /VEDIC_TIME_UNKNOWN/); assert(!existsSync(o('t.html')));
  for (const bad of [['--vedic', vp], ['--vedic', vp, '--out', o('x.txt')], ['--vedic', vp, '--out', o('y.html'), '--style', 'east'], ['--vedic', vp, '--out', o('z.html'), '--zip', o('z.html')]]) {
    assert.match(spawnSync(process.execPath, [cli, ...bad], { encoding: 'utf8' }).stderr, /REPORT_CONFIG_INVALID/);
  }
});
