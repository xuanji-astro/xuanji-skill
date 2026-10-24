// SPDX-License-Identifier: Apache-2.0
// 紫微排盘报告：画页面、逐项核对、数据包、压缩包、命令行只新建只给本人读写。全用 tests/fixtures 的合成盘（编的生辰，接口 rc.15 本地算出来的）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { renderZiwei } from '../scripts/ziwei_render.mjs';
import { ziweiPack, ORDER, mingStars } from '../scripts/ziwei_pack.mjs';
import { checkZiwei, verifyZiwei } from '../scripts/build_ziwei.mjs';
import { validate } from '../scripts/client.mjs';
import { createPrivateJSON } from '../scripts/create_private_json.mjs';
import { assertPrivateFile } from '../scripts/private_files.mjs';

const Z = () => JSON.parse(readFileSync(new URL('./fixtures/ziwei_synthetic.json', import.meta.url), 'utf8'));
function unzip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), n = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16); const out = {};
  for (let i = 0; i < n; i++) {
    const size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString('utf8'), ll = buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    out[name] = inflateRawSync(buf.subarray(off + 30 + ll, off + 30 + ll + size));
    p += 46 + nl;
  }
  return out;
}

test('合成盘过检查；缺宫、主星重复、没时辰都拦下', () => {
  const v = Z();
  assert.equal(checkZiwei(v), null);
  assert.equal(checkZiwei({ ...v, status: 'time_unknown', chart: undefined }), 'ZIWEI_TIME_UNKNOWN');
  const a = Z(); a.chart.palaces.pop(); assert.equal(checkZiwei(a), 'ZIWEI_INVALID');
  const b = Z(); const p = b.chart.palaces.find((x) => x.major.length && x.name !== '命宫'); p.major.push({ ...p.major[0] }); assert.equal(checkZiwei(b), 'ZIWEI_INVALID');
  assert.equal(checkZiwei({ ...v, schema: 'xuanji.vedic/0.1' }), 'ZIWEI_INVALID');
});

test('页面：十二宫格子齐、中间信息卡、四化表、大限、数据包都在；逐项核对零缺口', () => {
  const c = Z().chart, { html, pack } = renderZiwei(c, { timeSource: 'family_clear' });
  assert.deepEqual(verifyZiwei(c, html, pack), []);
  assert.equal((html.match(/class="zc[ "]/g) || []).length, 12);
  assert.match(html, /class="zm"/);
  for (const x of c.sihua) assert.ok(html.includes(`h-${x.hua}`));
  assert.ok(!/<script/i.test(html), '报告打开不靠脚本');
});

test('报告照吉真印真太阳时、北京时间、农历时间和节气四柱；数据包不印出生日期、钟点和农历', () => {
  const v = Z(), c = v.chart, { html, pack } = renderZiwei(c);
  for (const s of [c.time.true_solar, c.time.clock, c.lunar.ganzhi_text]) assert.ok(html.includes(s), s);
  for (const p of c.pillars) assert.ok(html.includes(p[0]) && html.includes(p[1]));
  const date = c.time.clock.slice(0, 10);
  for (const s of [date, date.replace(/-/g, '.'), c.time.clock.slice(11), c.time.true_solar.slice(11), c.lunar.text, c.lunar.ganzhi_text]) assert.ok(!pack.includes(s), s);
});

test('数据包：口径、基本、十二宫一宫一行、生年四化、大限流年、读法；命宫无主星借迁移', () => {
  const c = Z().chart, pack = ziweiPack(c, { timeSource: 'family_clear' });
  assert.ok(pack.startsWith('【执天玄玑 · 紫微斗数盘数据包】'));
  for (const n of ORDER) assert.ok(pack.includes('\n' + n), n);
  for (const k of ['一、口径', '二、基本', '三、十二宫', '四、生年四化', '五、大限和流年', '六、请这样读', 'github.com/xuanji-astro/xuanji-skill']) assert.ok(pack.includes(k), k);
  const e = Z().chart; const m = e.palaces.find((p) => p.name === '命宫'); m.major = [];
  const r = mingStars(e); assert.equal(r.borrowed, true); assert.deepEqual(r.stars, e.palaces.find((p) => p.name === '迁移').major);
  assert.ok(ziweiPack(e).includes('借对宫迁移'));
});

test('接口：ziwei 只收生辰字段', () => {
  validate('ziwei', { date: '1990-08-17', time: '09:40', city: '上海市', gender: 'female', time_source: 'family_clear' });
  assert.throws(() => validate('ziwei', { date: '1990-08-17', time: '09:40', city: '上海市', gender: 'female', answers: [] }), /INPUT_INVALID/);
  assert.throws(() => validate('ziwei', { date: '1990-08-17', city: '上海市' }), /MISSING_PARAMETER/);
});

test('命令行：网页、数据包、压缩包只新建、只给本人读写；不覆盖；没有时辰不出', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xj-ziwei-')), cli = fileURLToPath(new URL('../scripts/build_ziwei.mjs', import.meta.url));
  const zp = join(root, 'ziwei.json'); await createPrivateJSON(zp, Z());
  const o = (n) => join(root, n), args = ['--ziwei', zp, '--out', o('紫微排盘.html'), '--pack', o('紫微数据包.txt'), '--zip', o('紫微排盘.zip')];
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.deepEqual(r.stdout.trim().split('\n'), ['REPORT_SAVED', 'PACK_SAVED', 'ZIP_SAVED']);
  for (const n of ['紫微排盘.html', '紫微数据包.txt', '紫微排盘.zip']) { assert(existsSync(o(n))); await assertPrivateFile(o(n)); if (process.platform !== 'win32') assert.equal(statSync(o(n)).mode & 0o777, 0o600); }
  const z = unzip(readFileSync(o('紫微排盘.zip')));
  assert.deepEqual(Object.keys(z).sort(), ['紫微排盘.html', '紫微数据包.txt'].sort());
  assert.equal(z['紫微数据包.txt'].toString(), readFileSync(o('紫微数据包.txt'), 'utf8'));
  const again = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(again.status, 1); assert.match(again.stderr, /OUTPUT_EXISTS/);
  const tu = join(root, 'tu.json'); await createPrivateJSON(tu, { schema: 'xuanji.ziwei/0.1', version: {}, time_source: 'unknown', status: 'time_unknown' });
  const t = spawnSync(process.execPath, [cli, '--ziwei', tu, '--out', o('t.html')], { encoding: 'utf8' });
  assert.equal(t.status, 1); assert.match(t.stderr, /ZIWEI_TIME_UNKNOWN/); assert(!existsSync(o('t.html')));
  for (const bad of [['--ziwei', zp], ['--ziwei', zp, '--out', o('x.txt')], ['--ziwei', zp, '--out', o('z.html'), '--zip', o('z.html')], ['--ziwei', zp, '--out', o('y.html'), '--style', 'south']]) {
    assert.match(spawnSync(process.execPath, [cli, ...bad], { encoding: 'utf8' }).stderr, /REPORT_CONFIG_INVALID/);
  }
});
