#!/usr/bin/env node
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 一事一卜起卦：六爻按提问那一刻起，梅花按他报的数起（没报数按时间起）；只在本地算，不联网、不发给接口。
// rc.14.1 起只出盘：用神的成败判断、应期、梅花应期都不进结果（成不成、哪天见分晓由创始人断）。
// 外应必须先收（没有就写 none），再起卦：先看卦再问外应，容易倒着编。
// 用法：node <skill目录>/scripts/yishi.mjs cast --input yishi_request.json --output yishi_cast.json
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {realpathSync} from 'node:fs';
import {readPrivateJSON,writePrivateText} from './private_files.mjs';

const require=createRequire(import.meta.url);
const Liuyao=require('./engines/liuyao_engine.cjs');
const Meihua=require('./engines/meihua_engine.cjs');

export class YishiError extends Error{constructor(code){super(code);this.code=code;}}
const fail=(code)=>{throw new YishiError(code);};
const object=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const TYPES=['career','relationship','contact','money','litigation','travel_near','travel_far','travel_abroad','recovery'];
export const SPANS=['七日内','一季内','一年及以上'];

export function validateRequest(r){
  if(!object(r))fail('INPUT_INVALID');
  const keys=['question','question_type','asked_at','numbers','waiying','asker','gender','span'];
  if(Object.keys(r).some(k=>!keys.includes(k)))fail('INPUT_INVALID');
  if(typeof r.question!=='string'||!r.question.trim()||r.question.length>80)fail('QUESTION_INVALID');
  if(!TYPES.includes(r.question_type))fail('QUESTION_TYPE_INVALID');
  if(typeof r.asked_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(r.asked_at))fail('ASKED_AT_INVALID');
  localOf(r.asked_at);   // 日期要真存在（2 月 30 号这类拦下）
  if(r.numbers!==undefined&&(!Array.isArray(r.numbers)||r.numbers.length<2||r.numbers.length>3||!r.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=9999)))fail('NUMBERS_INVALID');
  // 外应：先收再起卦；没有就是 none，不硬凑
  if(!object(r.waiying)||!['none','given'].includes(r.waiying.status))fail('WAIYING_REQUIRED');
  if(r.waiying.status==='given'&&(typeof r.waiying.text!=='string'||!r.waiying.text.trim()||r.waiying.text.length>200))fail('WAIYING_INVALID');
  if(r.asker!==undefined&&!['self','proxy_asked','proxy_self'].includes(r.asker))fail('INPUT_INVALID');
  if(r.gender!==undefined&&!['male','female'].includes(r.gender))fail('INPUT_INVALID');
  if(!SPANS.includes(r.span))fail('SPAN_INVALID');
}

// 提问那一刻的当地钟点（照他报的时区偏移，不拿机器时间顶替）
export function localOf(iso){
  const m=iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(Z|([+-])(\d{2}):(\d{2}))$/);
  const off=m[6]==='Z'?0:(m[7]==='+'?1:-1)*(+m[8]*60+ +m[9]);
  const t=new Date(iso);if(!Number.isFinite(t.getTime()))fail('ASKED_AT_INVALID');
  const l=new Date(t.getTime()+off*60000);
  const v={year:l.getUTCFullYear(),month:l.getUTCMonth()+1,day:l.getUTCDate(),hour:l.getUTCHours(),minute:l.getUTCMinutes()};
  if(v.year!==+m[1]||v.month!==+m[2]||v.day!==+m[3]||v.hour!==+m[4]||v.minute!==+m[5])fail('ASKED_AT_INVALID');
  return v;
}
const pad=(n)=>String(n).padStart(2,'0');
// rc.14.1：免费版只给盘，不给结论和日子。程序结果里先拿掉，宿主手里没有，就说不出来
const NOT_FREE=new Set(['timing','timingSummary','timingCandidates','judgment']);
export function panOnly(o){
  if(Array.isArray(o))return o.map(panOnly);
  if(!object(o))return o;
  const r={};for(const [k,v] of Object.entries(o))if(!NOT_FREE.has(k))r[k]=panOnly(v);
  return r;
}

export function cast(r){
  validateRequest(r);
  const local=localOf(r.asked_at),extra={question_type:r.question_type,asker:r.asker||'self',...(r.gender?{gender:r.gender}:{})};
  const liuyao=Liuyao.castByTime({...local,...extra});
  const meihua=r.numbers?Meihua.castByNumbers({numbers:r.numbers.slice(),...local}):Meihua.castByTime({...local});
  return {
    schema:'xuanji.yishi_cast/0.2',
    asked:{local:`${local.year}-${pad(local.month)}-${pad(local.day)} ${pad(local.hour)}:${pad(local.minute)}`,at:r.asked_at},
    question:r.question,question_type:r.question_type,span:r.span,asker:extra.asker,waiying:r.waiying,
    liuyao:panOnly(liuyao),meihua:panOnly(meihua),meihua_by:r.numbers?'numbers':'time',
  };
}

export async function main(args){
  const [cmd,...flags]=args;let input,output;
  for(let i=0;i<flags.length;i+=2){const k=flags[i],v=flags[i+1];if(!v||v.startsWith('--'))fail('CONFIG_INVALID');if(k==='--input'&&!input)input=v;else if(k==='--output'&&!output)output=v;else fail('CONFIG_INVALID');}
  if(cmd!=='cast'||!input||!output)fail('CONFIG_INVALID');
  let r;try{r=await readPrivateJSON(input,8192);}catch{fail('INPUT_FILE_INVALID');}
  const data=cast(r);
  try{await writePrivateText(output,JSON.stringify(data,null,2)+'\n');}catch(e){fail(String(e&&e.message).includes('EXIST')?'OUTPUT_EXISTS':'OUTPUT_FILE_UNAVAILABLE');}
  console.log('CAST_SAVED');   // 不把问题、卦面打进工具日志
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){main(process.argv.slice(2)).catch(e=>{console.error(e instanceof YishiError?e.code:'YISHI_FAILED');process.exitCode=1;});}
