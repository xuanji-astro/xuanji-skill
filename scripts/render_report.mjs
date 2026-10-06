// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import {readFile} from 'node:fs/promises';
import {writePrivateText} from './private_files.mjs';
import {pathToFileURL} from 'node:url';
import {realpathSync} from 'node:fs';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function render(report,template){
  if(!report||Array.isArray(report)||typeof report!=='object'||Object.keys(report).some(k=>!['title','summary','sections'].includes(k)))throw Error('REPORT_INVALID');
  for(const k of ['title','summary'])if(typeof report[k]!=='string'||report[k].length>10000)throw Error('REPORT_INVALID');
  if(!Array.isArray(report.sections)||report.sections.length>30)throw Error('REPORT_INVALID');
  for(const s of report.sections)if(!s||Object.keys(s).some(k=>!['title','text'].includes(k))||typeof s.title!=='string'||typeof s.text!=='string'||s.title.length>200||s.text.length>10000)throw Error('REPORT_INVALID');
  for(const marker of ['TITLE','SUMMARY','SECTIONS'])if(template.split('__'+marker+'__').length!==2)throw Error('TEMPLATE_INVALID');
  const sections=report.sections.map(s=>'<section><h2>'+escape(s.title)+'</h2><p>'+escape(s.text)+'</p></section>').join('\n');
  return template.replace(/__(TITLE|SUMMARY|SECTIONS)__/g,(_,k)=>({TITLE:escape(report.title),SUMMARY:escape(report.summary),SECTIONS:sections}[k]));
}
export async function main(args){
  if(args.length!==4||args[0]!=='--input'||args[2]!=='--output')throw Error('USAGE_INVALID');
  const raw=await readFile(args[1]);if(raw.length>512*1024)throw Error('REPORT_INVALID');
  const html=render(JSON.parse(raw),await readFile(new URL('../template/report.html',import.meta.url),'utf8'));
  await writePrivateText(args[3],html);console.log('REPORT_SAVED');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href)main(process.argv.slice(2)).catch(()=>{console.error('REPORT_FAILED');process.exitCode=1;});
