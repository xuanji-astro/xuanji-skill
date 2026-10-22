// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import {pathToFileURL} from 'node:url';
import {realpathSync} from 'node:fs';
import {readPrivateJSON,writePrivateText} from './private_files.mjs';

export const ORIGIN = 'https://api.xuanji-astro.com';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export class ClientError extends Error {
  constructor(code) {super(code);this.code=code;}
}
const fail = code => {throw new ClientError(code);};
export function safeData(data) {
  // The upstream bazi version envelope contains an implementation config label.
  // It is not needed by the public client; omit it instead of relaxing the guard.
  if(object(data.bazi?.version)) delete data.bazi.version.config;
  const pending=[data];
  while(pending.length){const v=pending.pop();if(!v||typeof v!=='object')continue;for(const [k,x]of Object.entries(v)){
    // Persona "stack" is a public array of cognitive functions, not an error stack.
    if((k==='stack'&&typeof x==='string')||/^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret[_-]?key|password|authorization|service[_-]?role[_-]?key|env|config)$/i.test(k))fail('RESPONSE_INVALID');
    if(x&&typeof x==='object')pending.push(x);
  }}
}
const birthKeys = ['date','time','city','gender','time_source','time_precision'];
function birth(v) {
  if (!object(v)||Object.keys(v).some(k=>!birthKeys.includes(k))) fail('INPUT_INVALID');
  if (!v.date||!v.city||!v.gender) fail('MISSING_PARAMETER');
  if (typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) fail('INPUT_INVALID');
  const d=new Date(v.date+'T00:00:00Z');
  if (!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v.date) fail('INPUT_INVALID');
  if (typeof v.city!=='string'||!v.city.trim()||v.city.length>100||!['male','female'].includes(v.gender)) fail('INPUT_INVALID');
  if (v.time!=null&&(typeof v.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))) fail('INPUT_INVALID');
  if(v.time!=null&&v.time_source===undefined) fail('TIME_SOURCE_MISSING');   // 缺少时间来源会让出生证时辰被后续校正覆盖；给了时间就必须说来源
  if(v.time_source!==undefined&&!['birth_certificate','family_clear','family_rough','unknown'].includes(v.time_source)) fail('INPUT_INVALID');
  if(v.time_precision!==undefined&&!['minute','within_15min','within_1h','unknown'].includes(v.time_precision)) fail('INPUT_INVALID');
}
export const KINDS=['health','profile','pair','year','xuanji','vedic'];
// 年度报告（rc.13）：生辰＋哪一年；可选 tz（日子按用户所在时区出）、现在住的地方（中国城市 now_city，国外 now_place {lat,lon}）
function yearInput(v,{needYear=true}={}){
  const {year,tz,now_city,now_place,...b}=v;birth(b);
  if(needYear&&(!Number.isInteger(year)||year<1950||year>2100)) fail('INPUT_INVALID');
  if(!needYear&&year!==undefined&&(!Number.isInteger(year)||year<1950||year>2100)) fail('INPUT_INVALID');
  if(tz!==undefined&&(typeof tz!=='string'||tz.length>64||!/^[A-Za-z0-9_+\-\/]+$/.test(tz))) fail('INPUT_INVALID');
  if(now_city!==undefined&&now_place!==undefined) fail('INPUT_INVALID');
  if(now_city!==undefined&&(typeof now_city!=='string'||!now_city.trim()||now_city.length>100)) fail('INPUT_INVALID');
  if(now_place!==undefined&&(!object(now_place)||Object.keys(now_place).some(k=>k!=='lat'&&k!=='lon')||typeof now_place.lat!=='number'||typeof now_place.lon!=='number'||Math.abs(now_place.lat)>66||Math.abs(now_place.lon)>180)) fail('INPUT_INVALID');
}
// 「玄玑怎么看」（rc.13）：只回结论。rc.14.1 起只给年度、分术用，一事一卜不再调
const THEMES=['year','事业认可','钱','感情','家庭','工作','迁移远方','自我'];
function xuanjiInput(v){
  if(v.kind==='yishi') fail('INPUT_INVALID');   // rc.14.1：一件事成不成不在 Skill 里问玄玑，由创始人断
  if(v.kind==='year'){const {kind,...r}=v;yearInput(r);return;}
  if(v.kind==='fenshu'){const {kind,theme,...r}=v;if(!THEMES.includes(theme)) fail('INPUT_INVALID');yearInput(r,{needYear:theme==='year'});return;}
  fail('INPUT_INVALID');
}
export function validate(kind, input) {
  if(!KINDS.includes(kind)) fail('ENDPOINT_NOT_ALLOWED');
  if(kind==='year'||kind==='xuanji'){if(!object(input)) fail('INPUT_INVALID');kind==='year'?yearInput(input):xuanjiInput(input);if(Buffer.byteLength(JSON.stringify(input),'utf8')>8192) fail('INPUT_TOO_LARGE');return;}
  if(kind==='health'){if(input!==undefined) fail('INPUT_INVALID');return;}
  if(kind==='vedic'){if(!object(input)) fail('INPUT_INVALID');birth(input);if(Buffer.byteLength(JSON.stringify(input),'utf8')>8192) fail('INPUT_TOO_LARGE');return;}   // 印占整盘：只收生辰，跟 profile 一样查
  if(kind==='profile'){
    // 「核一核」的回答（接口 answers）：[{year,pick}]，pick 只能是 弱／强／都沾／记不清，最多 12 条；其余照生辰字段严格查
    // 身强身弱校正（接口 calib）：traits 8 个（A–F 或 null，F＝说不准），events 最多 30 件 {year, domain?, event?, good}；跟接口同一套检查
    const {answers,calib,...b}=object(input)?input:{};
    if(!object(input)) fail('INPUT_INVALID');
    birth(b);
    if(answers!==undefined&&(!Array.isArray(answers)||answers.length>12||!answers.every(x=>object(x)&&Object.keys(x).every(k=>k==='year'||k==='pick')&&Number.isInteger(x.year)&&x.year>1900&&x.year<2100&&['弱','强','都沾','记不清'].includes(x.pick)))) fail('INPUT_INVALID');
    if(calib!==undefined){
      const AREAS=['感情','事业','钱财','学业','健康','家庭'],tr=calib&&calib.traits,ev=calib&&calib.events;
      if(!object(calib)||Object.keys(calib).some(k=>k!=='traits'&&k!=='events')) fail('INPUT_INVALID');
      if(tr!==undefined&&(!Array.isArray(tr)||tr.length>8||!tr.every(x=>x===null||(typeof x==='string'&&/^[A-F]$/.test(x))||(Number.isInteger(x)&&x>=0&&x<6)))) fail('INPUT_INVALID');
      if(ev!==undefined&&(!Array.isArray(ev)||ev.length>30||!ev.every(x=>object(x)&&Object.keys(x).every(k=>['year','domain','event','good'].includes(k))&&Number.isInteger(x.year)&&x.year>1900&&x.year<2100&&typeof x.good==='boolean'
        &&(x.domain===undefined||AREAS.includes(x.domain))&&(x.event===undefined||(typeof x.event==='string'&&x.event.length<=20))))) fail('INPUT_INVALID');
    }
  }
  else {
    if(!object(input)||Object.keys(input).some(k=>!['a','b','relation','met_year'].includes(k))) fail('INPUT_INVALID');
    birth(input.a);birth(input.b);
    if(input.relation!==undefined&&!['恋人','暧昧','前任','家人','朋友','同事','合伙','客户','其他'].includes(input.relation)) fail('INPUT_INVALID');
    if(input.met_year!==undefined&&(!Number.isInteger(input.met_year)||input.met_year<1||input.met_year>9999)) fail('INPUT_INVALID');
  }
  if(Buffer.byteLength(JSON.stringify(input),'utf8')>8192) fail('INPUT_TOO_LARGE');
}

export async function callAPI(kind,input,{fetchImpl=globalThis.fetch,timeoutMs=90000}={}) {
  validate(kind,input);
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>90000) fail('CONFIG_INVALID');
  if(typeof fetchImpl!=='function') fail('ENVIRONMENT_UNSUPPORTED');
  const controller=new AbortController();let timer;
  try {
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ClientError('API_TIMEOUT'));},timeoutMs);});
    const operation=(async()=>{
      let response;
      try {response=await fetchImpl(ORIGIN+'/v1/'+kind,{method:kind==='health'?'GET':'POST',headers:{'Content-Type':'application/json'},body:kind==='health'?undefined:JSON.stringify(input),redirect:'error',signal:controller.signal});}
      catch {fail(controller.signal.aborted?'API_TIMEOUT':'NETWORK_UNAVAILABLE');}
      // Do not parse or expose raw error bodies (may include stack/config/secrets).
      if(response.status===429) fail('RATE_LIMITED');
      if(response.status>=500) fail('API_UNAVAILABLE');
      if(response.status!==200) fail('API_REJECTED');
      let data;
      try {
        const reader=response.body.getReader();let bytes=0;const chunks=[];
        while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2*1024*1024){await reader.cancel();fail('RESPONSE_TOO_LARGE');}chunks.push(value);}
        data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch(e) {if(e instanceof ClientError)throw e;fail('RESPONSE_INVALID');}
      if(!object(data)||data.error) fail('RESPONSE_INVALID');
      safeData(data);
      if(kind==='health') {if(data.ok!==true||typeof data.ready!=='boolean')fail('RESPONSE_INVALID');}
      else if(kind==='profile') {if(data.schema!=='xuanji.handoff/0.1'||!object(data.method))fail('RESPONSE_INVALID');}
      else if(kind==='year') {if(data.schema!=='xuanji.year/0.1'||!object(data.bazi))fail('RESPONSE_INVALID');}
      else if(kind==='xuanji') {if(data.schema!=='xuanji.view/0.1'||!['year','fenshu'].includes(data.kind))fail('RESPONSE_INVALID');}
      else if(kind==='vedic') {if(data.schema!=='xuanji.vedic/0.1'||!['ok','time_unknown'].includes(data.status)||(data.status==='ok'&&!object(data.chart)))fail('RESPONSE_INVALID');}
      else if(data.schema!=='xuanji.pair/0.1'||!object(data.scope))fail('RESPONSE_INVALID');
      return data;
    })();
    return await Promise.race([operation,timeout]);
  } finally {clearTimeout(timer);}
}

export async function main(args) {
  const [kind,...flags]=args;let inputPath,outputPath,timeoutMs=90000;
  for(let i=0;i<flags.length;i+=2){const key=flags[i],value=flags[i+1];if(!value||value.startsWith('--'))fail('CONFIG_INVALID');if(key==='--input'&&!inputPath)inputPath=value;else if(key==='--output'&&!outputPath)outputPath=value;else if(key==='--timeout-ms')timeoutMs=Number(value);else fail('CONFIG_INVALID');}
  if(!KINDS.includes(kind))fail('ENDPOINT_NOT_ALLOWED');
  if(kind!=='health'&&(!inputPath||!outputPath))fail('MISSING_PARAMETER');
  if(kind==='health'&&inputPath)fail('INPUT_INVALID');
  let input;
  if(inputPath){try{input=await readPrivateJSON(inputPath,8192);}catch{fail('INPUT_FILE_INVALID');}}
  const data=await callAPI(kind,input,{timeoutMs});
  if(outputPath){try{await writePrivateText(outputPath,JSON.stringify(data,null,2)+'\n');}catch{fail('OUTPUT_FILE_UNAVAILABLE');}}
  // Never print calculated user data or local paths to tool logs.
  console.log(kind==='health'?(data.ready?'API_READY':'API_WARMING'):'RESULT_SAVED');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){main(process.argv.slice(2)).catch(e=>{console.error(e instanceof ClientError?e.code:'CLIENT_FAILED');process.exitCode=1;});}
