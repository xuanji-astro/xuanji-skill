// SPDX-License-Identifier: Apache-2.0
// 定时辰结果进报告（--rectify）＋报告生辰自查（check_report）。全是合成数据，不代表真人。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {rectifiedOf,founderQR} from '../scripts/build_report.mjs';
import {needles,found} from '../scripts/check_report.mjs';
import {createPrivateJSON} from '../scripts/create_private_json.mjs';
import {writePrivateText} from '../scripts/private_files.mjs';

const prof=(zhi)=>({bazi:{bazi:{pillars:{hour:{gan:'甲',zhi}}}}});
const rect=(result)=>({schema:'xuanji.rectify/0.1',result,hours:{a:'巳时',b:'午时'}});

test('rectify: a/b 只带「定在哪个时辰」，存疑不带；--profile 跟结果对不上就拒绝',()=>{
  assert.deepEqual(rectifiedOf(prof('巳'),rect('a')),{hour:'巳时'});
  assert.deepEqual(rectifiedOf(prof('午'),rect('b')),{hour:'午时'});
  assert.equal(rectifiedOf(prof('巳'),rect('uncertain')),null);
  assert.equal(rectifiedOf(prof('巳'),null),null);
  assert.throws(()=>rectifiedOf(prof('巳'),rect('b')),/RECTIFY_PROFILE_MISMATCH/);   // b 却用了原来那张盘
  assert.throws(()=>rectifiedOf(prof('巳'),{...rect('a'),schema:'x'}),/RECTIFY_INVALID/);
  assert.throws(()=>rectifiedOf(prof('巳'),{...rect('a'),hours:{a:'<b>',b:'午时'}}),/RECTIFY_INVALID/);
});

test('模板：定过时辰时表头换成「经定时辰定在某时」，不报交界分钟、两种口径时柱、压宫头',async()=>{
  const {readFile}=await import('node:fs/promises');
  const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');
  assert.match(t,/var RF = D\.rectified \|\| null;/);
  assert.match(t,/RF \? '出生时辰经定时辰定在' \+ RF\.hour \+ '（按你说的大事和回答）。'/);
  assert.match(t,/var BD = RF \? null : X\.boundary \|\| null;/);
  assert.match(t,/!\(RF && \/\^\(出生时间接近时辰交界\|出生时刻距\.\*时辰边界\)\/\.test\(w\)\)/);
});

test('check_report: 认得常见写法；地名取全称和最细一级；只回类别',()=>{
  const r={date:'1991-03-12',time:'11:20',city:'浙江省杭州市西湖区',gender:'male'};
  assert.ok(needles(r).date.includes('1991年3月12日'));
  assert.deepEqual(needles(r).place,['浙江省杭州市西湖区','西湖区']);
  assert.deepEqual(found('合成：1991年3月12日 11点20 在西湖区',r),['date','time','place']);
  assert.deepEqual(found('2019 年钱上有过一次大的进出',r),[]);
  assert.deepEqual(found('北京',{a:r,b:{date:'1993-01-02',time:null,city:'北京',gender:'female'}}),['place']);
});

test('check_report CLI: 只打有／没有和类别，不打生辰内容；私有文件才读',{skip:process.platform==='win32'},async()=>{
  const d=await mkdtemp(join(tmpdir(),'xj-check-')),req=join(d,'request.json'),ok=join(d,'ok.html'),bad=join(d,'bad.html');
  await createPrivateJSON(req,{date:'1991-03-12',time:'11:20',city:'浙江省杭州市西湖区',gender:'male'});
  await writePrivateText(ok,'<p>2019 年钱上有过一次大的进出</p>');await writePrivateText(bad,'<p>生于 1991-03-12，西湖区</p>');
  const cli=fileURLToPath(new URL('../scripts/check_report.mjs',import.meta.url));
  const a=spawnSync(process.execPath,[cli,'--request',req,'--report',ok],{encoding:'utf8'});
  assert.equal(a.status,0);assert.equal(a.stdout.trim(),'BIRTH_DATA_ABSENT');
  const b=spawnSync(process.execPath,[cli,'--request',req,'--report',bad],{encoding:'utf8'});
  assert.equal(b.status,1);assert.equal(b.stdout.trim(),'BIRTH_DATA_FOUND date,place');
  assert.ok(!(b.stdout+b.stderr).includes('1991')&&!(b.stdout+b.stderr).includes('西湖'));
  const c=spawnSync(process.execPath,[cli,'--request',req],{encoding:'utf8'});
  assert.equal(c.status,2);assert.equal(c.stderr.trim(),'CHECK_CONFIG_INVALID');
});

test('创始人微信码：从 assets 读成 data URI 嵌进报告（报告不联网）；没有图或不是 PNG 就不出那一块',async()=>{
  const q=founderQR();
  assert.ok(q&&q.startsWith('data:image/png;base64,')&&q.length<180000);
  assert.equal(founderQR('/nonexistent/founder-wechat.png'),null);
  assert.equal(founderQR(fileURLToPath(new URL('../README.md',import.meta.url))),null);
  const {readFile}=await import('node:fs/promises');
  const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');
  assert.match(t,/img-src data:;/);
  assert.match(t,/D\.founder_qr\.indexOf\('data:image\/png;base64,'\) !== 0\) return null;/);
  assert.match(t,/'加我时请备注：来源 · 称呼'/);
  assert.ok(!t.includes('https://xuanji-astro.com/founder-wechat.png'));
});
