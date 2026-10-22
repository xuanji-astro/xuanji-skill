// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert';
import {cast,validateRequest,localOf} from '../scripts/yishi.mjs';

const R={question:'年底前能不能拿到这家公司的 offer',question_type:'career',asked_at:'2026-10-18T20:36+08:00',numbers:[3,8,6],waiying:{status:'given',text:'在地铁上，听见报站下一站人民广场，旁边有人打电话说已经定了'},span:'一季内'};

test('样稿那一卦：六爻天雷无妄变泽雷随，梅花火地晋用生体', () => {
  const c=cast(R);
  assert.equal(c.liuyao.original.name,'天雷无妄');
  assert.equal(c.liuyao.changed.name,'泽雷随');
  assert.equal(c.meihua.original.name,'火地晋');
  assert.equal(c.meihua.tiYong.relation,'用生体');
  assert.equal(c.asked.local,'2026-10-18 20:36');
});

test('rc.14.1 免费版只出盘：用神成败、六爻应期、梅花应期都不在结果里，盘面照全', () => {
  const c=cast(R),j=JSON.stringify(c);
  assert.equal(c.schema,'xuanji.yishi_cast/0.2');
  assert.equal(c.meihua_timing,undefined);
  assert.equal(c.liuyao.timing,undefined); assert.equal(c.liuyao.timingSummary,undefined);
  assert.equal(c.liuyao.yongshen.judgment,undefined);
  for(const k of ['"timing"','"timingSummary"','"timingCandidates"','"judgment"','"mostLikely"','"timingReal"','"verdict"'])assert.ok(!j.includes(k),k);
  assert.ok(c.liuyao.yongshen.primary.liuQin); assert.equal(c.liuyao.yaos.length,6);   // 用神、六爻照给
  assert.ok(c.meihua.texts.movingYaoCi); assert.ok(c.meihua.tiYong.ti.seasonState);    // 卦辞、体用照给
});

test('外应必须先收：没有外应字段不起卦；说没有就写 none，照常起', () => {
  const {waiying,...noW}=R;
  assert.throws(()=>validateRequest(noW),e=>e.code==='WAIYING_REQUIRED');
  assert.doesNotThrow(()=>cast({...R,waiying:{status:'none'}}));
});

test('起卦时刻只认他报的当地钟点和时区，不拿机器时间', () => {
  assert.deepEqual(localOf('2026-10-18T05:36-07:00'),{year:2026,month:10,day:18,hour:5,minute:36});
  assert.throws(()=>validateRequest({...R,asked_at:'2026-10-18 20:36'}),e=>e.code==='ASKED_AT_INVALID');
  assert.throws(()=>validateRequest({...R,asked_at:'2026-02-30T20:36+08:00'}),e=>e.code==='ASKED_AT_INVALID');
});

test('没报数：梅花按时间起；报数只收 2～3 个正整数', () => {
  const {numbers,...noN}=R;
  const c=cast(noN); assert.equal(c.meihua_by,'time'); assert.ok(c.meihua.original.name);
  assert.throws(()=>validateRequest({...R,numbers:[3]}),e=>e.code==='NUMBERS_INVALID');
  assert.throws(()=>validateRequest({...R,numbers:[3,0,6]}),e=>e.code==='NUMBERS_INVALID');
});

test('不认的字段、超长问题、没写时限都拦下', () => {
  assert.throws(()=>validateRequest({...R,birth:'1990-01-01'}),e=>e.code==='INPUT_INVALID');
  assert.throws(()=>validateRequest({...R,question:'x'.repeat(81)}),e=>e.code==='QUESTION_INVALID');
  const {span,...noSpan}=R; assert.throws(()=>validateRequest(noSpan),e=>e.code==='SPAN_INVALID');
});
