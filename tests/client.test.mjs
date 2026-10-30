// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertPrivateFile} from '../scripts/private_files.mjs';
import {callAPI,validate,ORIGIN} from '../scripts/client.mjs';
import {render} from '../scripts/render_report.mjs';
const birth=()=>({date:'1996-05-20',time:'10:30',city:'浙江省杭州市西湖区',gender:'female',time_source:'unknown'});   // 给了时间必须写来源
const profile=()=>({schema:'xuanji.handoff/0.1',method:{},bazi:{status:'ok'}});
const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('normal request uses exact first-party URL, POST body, no secrets/redirects',async()=>{
 let seen;const data=await callAPI('profile',birth(),{fetchImpl:async(url,options)=>{seen={url,options};return response(profile());}});
 assert.equal(seen.url,ORIGIN+'/v1/profile');assert.equal(seen.options.redirect,'error');assert.equal(seen.options.method,'POST');
 assert.deepEqual(JSON.parse(seen.options.body),birth());assert.equal(seen.options.headers.Authorization,undefined);assert.equal(data.schema,'xuanji.handoff/0.1');
});
test('pair normal contract',async()=>{const data=await callAPI('pair',{a:birth(),b:birth(),relation:'朋友'},{fetchImpl:async()=>response({schema:'xuanji.pair/0.1',scope:{}})});assert.equal(data.schema,'xuanji.pair/0.1');});
test('health has no body and requires truthful readiness',async()=>{assert.equal((await callAPI('health',undefined,{fetchImpl:async(u,o)=>{assert.equal(o.method,'GET');assert.equal(o.body,undefined);return response({ok:true,ready:false});}})).ready,false);});
test('missing and illegal parameters rejected before network',async()=>{
 let calls=0;const f=async()=>{calls++;return response(profile());};
 for(const b of [{}, {...birth(),date:'2026-02-30'},{...birth(),time:'25:00'},{...birth(),gender:'x'},{...birth(),consent:true},{...birth(),token:'synthetic-marker'}])await assert.rejects(callAPI('profile',b,{fetchImpl:f}));
 assert.equal(calls,0);assert.throws(()=>validate('pair',{a:birth(),b:birth(),relation:'unknown'}));
});
test('save, third party and arbitrary endpoints blocked',()=>{for(const kind of ['profile/save','pair/save','https://example.test','../admin'])assert.throws(()=>validate(kind,birth()),/ENDPOINT_NOT_ALLOWED/);});
test('timeout bounded even when transport ignores abort',async()=>{await assert.rejects(callAPI('profile',birth(),{fetchImpl:()=>new Promise(()=>{}),timeoutMs:5}),/API_TIMEOUT/);});
test('5xx and rate limit never expose upstream error or stack',async()=>{
 const raw={stack:'synthetic-internal-stack',secret:'synthetic-secret'};
 for(const [status,code] of [[500,'API_UNAVAILABLE'],[503,'API_UNAVAILABLE'],[429,'RATE_LIMITED'],[400,'API_REJECTED'],[302,'API_REJECTED']])await assert.rejects(callAPI('profile',birth(),{fetchImpl:async()=>response(raw,status)}),e=>e.message===code&&!e.message.includes('synthetic'));
});
test('network error does not leak configuration',async()=>{await assert.rejects(callAPI('profile',birth(),{fetchImpl:async()=>{throw Error('synthetic-secret at synthetic-path');}}),/NETWORK_UNAVAILABLE/);});
test('malformed and unexpected responses rejected',async()=>{
 for(const data of [null,[],{}, {error:'synthetic'}, {schema:'wrong',method:{}}])await assert.rejects(callAPI('profile',birth(),{fetchImpl:async()=>response(data)}),/RESPONSE_INVALID/);
 await assert.rejects(callAPI('profile',birth(),{fetchImpl:async()=>new Response('{')}),/RESPONSE_INVALID/);
});
test('large response bounded',async()=>{await assert.rejects(callAPI('profile',birth(),{fetchImpl:async()=>new Response('x'.repeat(2*1024*1024+1))}),/RESPONSE_TOO_LARGE/);});
test('even successful envelopes cannot return secret/config/stack fields',async()=>{
 for(const k of ['stack','api_key','access_token','password','config'])await assert.rejects(callAPI('profile',birth(),{fetchImpl:async()=>response({...profile(),method:{[k]:'synthetic-marker'}})}),/RESPONSE_INVALID/);
});
test('public cognitive function stack array is not an error stack',async()=>{assert((await callAPI('profile',birth(),{fetchImpl:async()=>response({...profile(),method:{persona:{base:{stack:[{function:'Ni'}]}}}})})).method.persona.base.stack.length===1);});
test('config and missing runtime fail safely',async()=>{await assert.rejects(callAPI('profile',birth(),{timeoutMs:0}),/CONFIG_INVALID/);await assert.rejects(callAPI('profile',birth(),{fetchImpl:null}),/ENVIRONMENT_UNSUPPORTED/);});
test('CLI missing config/error outputs contain no stack or local path',()=>{
 const path=new URL('../scripts/client.mjs',import.meta.url);
 for(const args of [[],['profile'],['health','--api','https://example.test'],['profile','--input','missing-synthetic.json','--output','unused.json']]){
 const r=spawnSync(process.execPath,[fileURLToPath(path),...args],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/^[A-Z_]+\n$/);assert.equal(r.stdout,'');
 }
});
test('renderer escapes executable content and replacement markers in user text',async()=>{
 const template=await readFile(new URL('../template/report.html',import.meta.url),'utf8');
 const html=render({title:'<script>alert(1)</script>',summary:'__SECTIONS__',sections:[{title:'<img>',text:'</p><script>synthetic()</script>'}]},template);
 assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('__SECTIONS__'));assert(!/src=|fetch\(/i.test(html));assert(html.includes("default-src 'none'"));
});
test('renderer only accepts public presentation schema',async()=>{
 const t=await readFile(new URL('../template/report.html',import.meta.url),'utf8');
 for(const r of [null,{title:'t',summary:'s',sections:[],birth:birth()},{title:'t',summary:'s',sections:[{title:'t',text:3}]}])assert.throws(()=>render(r,t),/REPORT_INVALID/);
});
test('clean command-line report creation and no overwrite',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'xuanji-report-test-'));const input=join(dir,'synthetic.json'),output=join(dir,'result.html');
 await writeFile(input,JSON.stringify({title:'合成样本',summary:'合成解释',sections:[{title:'依据',text:'测试'}]}));
 const script=fileURLToPath(new URL('../scripts/render_report.mjs',import.meta.url));
 const a=spawnSync(process.execPath,[script,'--input',input,'--output',output],{encoding:'utf8'});assert.equal(a.status,0);assert.equal(a.stdout,'REPORT_SAVED\n');await assertPrivateFile(output);
 const b=spawnSync(process.execPath,[script,'--input',input,'--output',output],{encoding:'utf8'});assert.equal(b.status,1);assert.equal(b.stderr,'REPORT_FAILED\n');
});
test('skill entry and referenced resources are installable',async()=>{
 const root=new URL('../',import.meta.url);const skill=await readFile(new URL('SKILL.md',root),'utf8');
 assert(skill.startsWith('---\nname: xuanji\ndescription: '));assert(skill.split('\n---\n')[0].length<1200);
 for(const path of ['README.md','LICENSE','NOTICE','TRADEMARKS.md','docs/api.md','scripts/client.mjs','scripts/render_report.mjs','template/report.html'])assert((await stat(new URL(path,root))).isFile());
});

test('核一核的回答 answers：只收 [{year,pick}]，pick 只能是 弱／强／都沾／记不清，最多 12 条；别的字段照旧拒',()=>{
 validate('profile',{...birth(),answers:[{year:2023,pick:'强'},{year:2021,pick:'都沾'}]});
 for(const answers of [[{year:2023,pick:'顺'}],[{year:2023,pick:'强',note:'x'}],[{year:'2023',pick:'强'}],'x',Array.from({length:13},(_,i)=>({year:2000+i,pick:'弱'}))])
  assert.throws(()=>validate('profile',{...birth(),answers}),/INPUT_INVALID/);
 assert.throws(()=>validate('profile',{...birth(),strength:'强'}),/INPUT_INVALID/);
});
test('身强身弱校正 calib：traits 8 个 A–F 或 null（F＝说不准），events 最多 30 件；别的字段、坏值都拒',()=>{
 validate('profile',{...birth(),calib:{traits:['D','B',null,'A','C','B','D','E'],events:[{year:2016,domain:'事业',event:'跳槽',good:true},{year:2022,good:false}]}});
 validate('profile',{...birth(),calib:{traits:[0,4,5,'F']}});
 for(const calib of [[],'x',{traits:['G']},{traits:[6]},{traits:Array(9).fill('A')},{events:[{year:2016,domain:'运动',good:true}]},{events:[{year:2016,good:'好'}]},{events:[{year:2016,good:true,note:'细节'}]},
   {events:Array.from({length:31},(_,i)=>({year:1990+i,good:true}))},{traits:['A'],extra:1}])
  assert.throws(()=>validate('profile',{...birth(),calib}),/INPUT_INVALID/,JSON.stringify(calib).slice(0,60));
});
test('rc.16 校正：一段时间 periods、转折年 turns、方面加「人际」；跟接口 rc.16 同一套检查',()=>{
 validate('profile',{...birth(),calib:{traits:[null,null,null,null,null,null,null,null],periods:[{from:2020,to:2023,good:false}],turns:[{year:2024,up:true}]}});
 validate('profile',{...birth(),calib:{events:[{year:2019,domain:'人际',event:'遇到贵人',good:true}],periods:[{from:2001,to:2016,good:true}],turns:[]}});
 for(const calib of [{periods:[{from:2023,to:2020,good:true}]},{periods:[{from:2000,to:2016,good:true}]},{periods:[{from:2020,to:2023}]},{periods:[{from:2020,to:2023,good:true,note:'x'}]},
   {periods:Array.from({length:7},(_,i)=>({from:2000+i,to:2001+i,good:true}))},{periods:{from:2020,to:2023,good:true}},
   {turns:[{year:2024}]},{turns:[{year:2024,up:'好'}]},{turns:[{year:1900,up:true}]},{turns:Array.from({length:7},(_,i)=>({year:2010+i,up:true}))},{turns:[{year:2024,up:true,why:'x'}]},
   {events:[{year:2016,domain:'社交',good:true}]}])
  assert.throws(()=>validate('profile',{...birth(),calib}),/INPUT_INVALID/,JSON.stringify(calib).slice(0,60));
});
test('给了出生时间却没写来源：TIME_SOURCE_MISSING',async()=>{
  const {validate}=await import('../scripts/client.mjs');
  assert.throws(()=>validate('profile',{date:'1996-05-20',time:'10:30',city:'浙江省杭州市西湖区',gender:'female'}),e=>e.code==='TIME_SOURCE_MISSING');
  assert.doesNotThrow(()=>validate('profile',{date:'1996-05-20',time:'10:30',city:'浙江省杭州市西湖区',gender:'female',time_source:'birth_certificate',time_precision:'minute'}));
  assert.doesNotThrow(()=>validate('profile',{date:'1996-05-20',city:'浙江省杭州市西湖区',gender:'female'}));
});

test('只开健康、单人、合盘、年度、玄玑怎么看五个端点，别的一律拒绝、不联网', async () => {
  const {validate,callAPI}=await import('../scripts/client.mjs');
  for (const k of ['save','horary','admin']) assert.throws(()=>validate(k,{}),/ENDPOINT_NOT_ALLOWED/);
  await assert.rejects(callAPI('save',{},{fetchImpl:async()=>{throw new Error('不该联网');}}),/ENDPOINT_NOT_ALLOWED/);
});

const B={date:'1996-05-20',time:'10:30',city:'浙江省杭州市西湖区',gender:'female',time_source:'birth_certificate'};
test('年度：生辰＋年份，可选时区和现在住的地方；不认的字段、两种住处一起给都拒绝', async () => {
  const {validate}=await import('../scripts/client.mjs');
  assert.doesNotThrow(()=>validate('year',{...B,year:2027}));
  assert.doesNotThrow(()=>validate('year',{...B,year:2027,tz:'America/Los_Angeles',now_place:{lat:33.7,lon:-117.8}}));
  assert.doesNotThrow(()=>validate('year',{...B,year:2027,now_city:'上海'}));
  assert.throws(()=>validate('year',{...B}),/INPUT_INVALID/);
  assert.throws(()=>validate('year',{...B,year:2027,now_city:'上海',now_place:{lat:1,lon:1}}),/INPUT_INVALID/);
  assert.throws(()=>validate('year',{...B,year:2027,name:'张三'}),/INPUT_INVALID/);
  assert.throws(()=>validate('year',{...B,year:2027,tz:'Asia/Shanghai?x=1'}),/INPUT_INVALID/);
});
test('玄玑怎么看：rc.14.1 起一事一卜不再问（怎么填都拦）；年度、分术照年度的规矩', async () => {
  const {validate}=await import('../scripts/client.mjs');
  assert.throws(()=>validate('xuanji',{kind:'yishi',question_type:'career',asked_at:'2026-10-18T20:36+08:00',city:'上海'}),/INPUT_INVALID/);
  assert.throws(()=>validate('xuanji',{kind:'yishi',question_type:'money',asked_at:'2026-10-18T05:36-07:00',lat:33.7,lon:-117.8}),/INPUT_INVALID/);
  assert.throws(()=>validate('xuanji',{kind:'yishi',question_type:'career',asked_at:'2026-10-18T20:36+08:00',city:'上海',question:'能拿到offer吗'}),/INPUT_INVALID/);
  assert.throws(()=>validate('xuanji',{kind:'yishi',question_type:'career',asked_at:'2026-10-18T20:36+08:00',city:'上海',number:79}),/INPUT_INVALID/);
  assert.throws(()=>validate('xuanji',{kind:'yishi',question_type:'career',asked_at:'2026-10-18 20:36',city:'上海'}),/INPUT_INVALID/);
  assert.doesNotThrow(()=>validate('xuanji',{kind:'year',...B,year:2027}));
  assert.doesNotThrow(()=>validate('xuanji',{kind:'fenshu',theme:'钱',...B}));
  assert.doesNotThrow(()=>validate('xuanji',{kind:'fenshu',theme:'year',...B,year:2027}));
  assert.throws(()=>validate('xuanji',{kind:'fenshu',theme:'year',...B}),/INPUT_INVALID/);
  assert.throws(()=>validate('xuanji',{kind:'fenshu',theme:'运势',...B}),/INPUT_INVALID/);
  assert.throws(()=>validate('xuanji',{kind:'kp',...B}),/INPUT_INVALID/);
});
test('年度、玄玑怎么看的回包要认得出是自己那一种，不认的不收', async () => {
  const {callAPI}=await import('../scripts/client.mjs');
  const ok=(data)=>async()=>({status:200,body:{getReader:()=>{let d=false;return {read:async()=>d?{done:true}:(d=true,{done:false,value:Buffer.from(JSON.stringify(data))}),cancel:async()=>{}};}}});
  const y=await callAPI('year',{...B,year:2027},{fetchImpl:ok({schema:'xuanji.year/0.1',bazi:{months:[]}})});
  assert.equal(y.schema,'xuanji.year/0.1');
  await assert.rejects(callAPI('year',{...B,year:2027},{fetchImpl:ok({schema:'xuanji.handoff/0.1',method:{}})}),/RESPONSE_INVALID/);
  const v=await callAPI('xuanji',{kind:'fenshu',theme:'钱',...B},{fetchImpl:ok({schema:'xuanji.view/0.1',kind:'fenshu',verdict:'成'})});
  assert.equal(v.verdict,'成');
  await assert.rejects(callAPI('xuanji',{kind:'fenshu',theme:'钱',...B},{fetchImpl:ok({schema:'xuanji.view/0.1',kind:'yishi',verdict:'成'})}),/RESPONSE_INVALID/);
});
