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
const birth=()=>({date:'1996-05-20',time:'10:30',city:'浙江省杭州市西湖区',gender:'female'});
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
