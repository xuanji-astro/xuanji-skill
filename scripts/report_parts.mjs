#!/usr/bin/env node
// 分段报告稿：每章一个私有 JSON；只报缺失或不合格的段，全部通过才合成 report.json。
// SPDX-License-Identifier: Apache-2.0
import {realpathSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readPrivateJSON,writePrivateText,reasonOf} from './private_files.mjs';
import {check} from './build_report.mjs';

const CHAPTERS=['career','wealth','study','love','family','social','health','growth'];
export const PARTS=[
  ['01-overview.json',['schema','name','cover','progress','hits','misses','persona_feedback','crosscheck','focus','strength_check','open_question','next_questions','basis']],
  ['02-skeleton-gifts.json',['skeleton','gifts']],
  ...CHAPTERS.map((c,i)=>[`${String(i+3).padStart(2,'0')}-chapter-${c}.json`,['chapters'],c]),
  ['11-years.json',['years']],
  ['12-audit-closing.json',['audit','closing']]
];
const isObj=(v)=>v&&typeof v==='object'&&!Array.isArray(v);

export function mergePart(target,value,spec){
  if(!isObj(value))return '根必须是 JSON 对象';
  const allowed=new Set(spec[1]),extra=Object.keys(value).filter((k)=>!allowed.has(k));
  if(extra.length)return `多了字段 ${extra.join(',')}`;
  if(spec[2]){
    const cs=value.chapters;
    if(!isObj(cs)||Object.keys(cs).length!==1||!Object.hasOwn(cs,spec[2]))return `只应包含 chapters.${spec[2]}`;
  }
  for(const [k,v] of Object.entries(value)){
    if(Object.hasOwn(target,k)&&k!=='chapters')return `字段 ${k} 重复`;
    if(k==='chapters')target.chapters={...(target.chapters??{}),...v};else target[k]=v;
  }
  return null;
}

// 禁用词这类不带字段路径的错：在各段原文里找这个词，算到真正写了它的那几段（basis 不算，跟整份检查一样）
function wordOwners(issue,raw){
  const w=issue.match(/出现了「(.+?)」/)?.[1];if(!w||!raw)return null;
  const hit=[...raw].filter(([,v])=>{const {basis,...rest}=isObj(v)?v:{};return JSON.stringify(rest).includes(w);}).map(([f])=>f);
  return hit.length?hit:null;
}
function issuePart(issue){
  const m=issue.match(/chapters\.([a-z]+)/);if(m)return PARTS.find(([,,c])=>c===m[1])?.[0];
  if(/成长与课题/.test(issue))return '10-chapter-growth.json';
  if(/^(years\.|今年|年份|正文又写了)|十年|流年/.test(issue))return '11-years.json';
  if(/^(audit\.|closing)|逐星|相位/.test(issue))return '12-audit-closing.json';
  if(/^(skeleton\.|gifts\.)|天赋/.test(issue))return '02-skeleton-gifts.json';
  return '01-overview.json';
}

export async function combine(profilePath,dir,outPath){
  const profile=await readPrivateJSON(profilePath,2097152),report={},present=new Set(),raw=new Map();let bad=false;
  for(const spec of PARTS){
    const file=join(dir,spec[0]);let value;
    try{value=await readPrivateJSON(file,262144);}catch(e){
      console.error(`${e.message==='PRIVATE_FILE_INVALID'?'PART_MISSING_OR_PRIVATE':'PART_INVALID'} ${spec[0]}`);bad=true;continue;
    }
    const problem=mergePart(report,value,spec);if(problem){console.error(`PART_INVALID ${spec[0]} ${problem}`);bad=true;}else{present.add(spec[0]);raw.set(spec[0],value);}
  }
  const issues=check(report,profile);
  const owned=[];
  for(const issue of issues){
    const owners=wordOwners(issue,raw)??[issuePart(issue)];
    for(const owner of owners){
      if(!present.has(owner))continue;
      if(present.size<PARTS.length&&owner==='01-overview.json'&&(/整份报告|覆盖：最响|最响的几件事里/.test(issue)))continue;
      owned.push([owner,issue]);
    }
  }
  const localIssues=owned;
  for(const [owner,issue] of owned)console.error(`PART_INVALID ${owner} ${issue}`);
  if(bad||localIssues.length||issues.length&&present.size===PARTS.length)return false;
  await writePrivateText(outPath,JSON.stringify(report,null,2)+'\n');
  console.log('REPORT_PARTS_MERGED');return true;
}

export async function main(args){
  const f={};for(let i=0;i<args.length;i+=2){const k=args[i],v=args[i+1];if(!['--profile','--dir','--out'].includes(k)||!v||v.startsWith('--')||f[k])throw Error('PARTS_CONFIG_INVALID');f[k]=v;}
  if(!f['--profile']||!f['--dir']||!f['--out'])throw Error('PARTS_CONFIG_INVALID');
  const rel=relative(resolve(f['--dir']),resolve(f['--out']));if(rel===''||(!rel.startsWith('..')&&!isAbsolute(rel)))throw Error('PARTS_CONFIG_INVALID');
  if(!(await combine(f['--profile'],f['--dir'],f['--out'])))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href)main(process.argv.slice(2)).catch((e)=>{
  console.error(['PARTS_CONFIG_INVALID','PRIVATE_FILE_INVALID','PRIVATE_CREATE_FAILED'].includes(e.message)?e.message:'PARTS_FAILED');
  const w=reasonOf(e);if(w)console.error('WINDOWS_REASON '+w);process.exitCode=1;
});
