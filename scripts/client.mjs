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
  if(v.time_source!==undefined&&!['birth_certificate','family_clear','family_rough','unknown'].includes(v.time_source)) fail('INPUT_INVALID');
  if(v.time_precision!==undefined&&!['minute','within_15min','within_1h','unknown'].includes(v.time_precision)) fail('INPUT_INVALID');
}
export function validate(kind, input) {
  if(!['health','profile','pair'].includes(kind)) fail('ENDPOINT_NOT_ALLOWED');
  if(kind==='health'){if(input!==undefined) fail('INPUT_INVALID');return;}
  if(kind==='profile'){
    // 「核一核」的回答（接口 answers）：[{year,pick}]，pick 只能是 弱／强／都沾／记不清，最多 12 条；其余照生辰字段严格查
    const {answers,...b}=object(input)?input:{};
    if(!object(input)) fail('INPUT_INVALID');
    birth(b);
    if(answers!==undefined&&(!Array.isArray(answers)||answers.length>12||!answers.every(x=>object(x)&&Object.keys(x).every(k=>k==='year'||k==='pick')&&Number.isInteger(x.year)&&x.year>1900&&x.year<2100&&['弱','强','都沾','记不清'].includes(x.pick)))) fail('INPUT_INVALID');
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
      else if(data.schema!=='xuanji.pair/0.1'||!object(data.scope))fail('RESPONSE_INVALID');
      return data;
    })();
    return await Promise.race([operation,timeout]);
  } finally {clearTimeout(timer);}
}

export async function main(args) {
  const [kind,...flags]=args;let inputPath,outputPath,timeoutMs=90000;
  for(let i=0;i<flags.length;i+=2){const key=flags[i],value=flags[i+1];if(!value||value.startsWith('--'))fail('CONFIG_INVALID');if(key==='--input'&&!inputPath)inputPath=value;else if(key==='--output'&&!outputPath)outputPath=value;else if(key==='--timeout-ms')timeoutMs=Number(value);else fail('CONFIG_INVALID');}
  if(!['health','profile','pair'].includes(kind))fail('ENDPOINT_NOT_ALLOWED');
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
