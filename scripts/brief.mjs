#!/usr/bin/env node
// 把写 report.json 要反复翻的盘面和程序规则压成一次可读的 JSON；不输出原始生辰。
// SPDX-License-Identifier: Apache-2.0
import {readFileSync,realpathSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readPrivateJSON,reasonOf} from './private_files.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
const RULES=JSON.parse(readFileSync(join(HERE,'report_rules.json'),'utf8'));
const isObj=(v)=>v&&typeof v==='object'&&!Array.isArray(v);

function scrub(value,secrets){
  if(typeof value==='string'){let s=value;for(const x of secrets)if(x.length>=4)s=s.split(x).join('[已隐藏]');return s;}
  if(Array.isArray(value))return value.map((v)=>scrub(v,secrets));
  if(isObj(value))return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,scrub(v,secrets)]));
  return value;
}

export function makeBrief(profile,rules=RULES){
  if(!isObj(profile)||profile.schema!=='xuanji.handoff/0.1'||profile.bazi?.status!=='ok'||!isObj(profile.method))throw Error('PROFILE_INVALID');
  const birth=profile.birth??{},secrets=[birth.date,birth.time,birth.city,birth.place?.name,profile.bazi?.input?.trueSolarTime].filter((v)=>typeof v==='string');
  const plate={
    time_known:!!birth.time,
    sex:birth.sex,
    western_available:!!profile.western?.data,
    pillars:profile.bazi?.bazi?.pillars,
    luck:profile.bazi?.bazi?.luck?.cycles,
    method:profile.method
  };
  return {schema:'xuanji.report-brief/0.1',report_schema:rules.schema,report_rules:rules,plate:scrub(plate,secrets)};
}

export async function main(args){
  if(args.length!==1||args[0].startsWith('--'))throw Error('BRIEF_CONFIG_INVALID');
  const profile=await readPrivateJSON(args[0],2097152);
  process.stdout.write(JSON.stringify(makeBrief(profile))+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href)main(process.argv.slice(2)).catch((e)=>{
  console.error(['BRIEF_CONFIG_INVALID','PROFILE_INVALID','PRIVATE_FILE_INVALID'].includes(e.message)?e.message:'BRIEF_FAILED');
  const w=reasonOf(e);if(w)console.error('WINDOWS_REASON '+w);process.exitCode=1;
});
