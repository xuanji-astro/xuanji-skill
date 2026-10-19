// SPDX-License-Identifier: Apache-2.0
// 报告摘要与分段续写。全用 tests/fixtures 的合成盘。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeBrief} from '../scripts/brief.mjs';
import {mergePart,PARTS} from '../scripts/report_parts.mjs';
import {createPrivateJSON} from '../scripts/create_private_json.mjs';

test('brief 一次给写作规则和必要盘面，明显小于整份 profile，且不带原始生辰',async()=>{
  const raw=await readFile(new URL('./fixtures/profile_sample.json',import.meta.url),'utf8'),profile=JSON.parse(raw),brief=JSON.stringify(makeBrief(profile));
  assert.equal(brief.includes(profile.birth.date),false);assert.equal(brief.includes(profile.birth.time),false);assert.equal(brief.includes(profile.birth.city),false);
  assert.equal(brief.includes('report_rules'),true);assert.equal(brief.includes('method'),true);assert(brief.length<raw.length*.7,`${brief.length}/${raw.length}`);
});

test('分段清单固定十二段、八章各自一个带序号文件；合并拒绝串章和额外字段',()=>{
  assert.equal(PARTS.length,12);for(const c of ['career','wealth','study','love','family','social','health','growth'])assert(PARTS.some(([n,,x])=>x===c&&/^\d\d-chapter-/.test(n)));
  const report={};assert.equal(mergePart(report,{chapters:{career:{brief:'合成'}}},PARTS[2]),null);
  assert.match(mergePart({}, {chapters:{wealth:{}}},PARTS[2]),/chapters\.career/);
  assert.match(mergePart({}, {years:{},extra:true},PARTS[10]),/多了字段 extra/);
});

test('分段命令中断后只列缺失/不合格段并非零退出，不打印合格段',async()=>{
  const root=await mkdtemp(join(tmpdir(),'xj-parts-')),dir=join(root,'parts');
  const {mkdir}=await import('node:fs/promises');await mkdir(dir);
  const profile=fileURLToPath(new URL('./fixtures/profile_sample.json',import.meta.url));
  await createPrivateJSON(join(dir,'01-overview.json'),{schema:'xuanji.report/0.5'});
  const cli=fileURLToPath(new URL('../scripts/report_parts.mjs',import.meta.url));
  const r=spawnSync(process.execPath,[cli,'--profile',profile,'--dir',dir,'--out',join(root,'report.json')],{encoding:'utf8'});
  // fixture 在仓库里不是 600 私有文件，先证明输入权限失败也是非零；再复制成私有文件测续写清单。
  assert.equal(r.status,1);
  const privateProfile=join(root,'profile.json');await createPrivateJSON(privateProfile,JSON.parse(await readFile(profile,'utf8')));
  const q=spawnSync(process.execPath,[cli,'--profile',privateProfile,'--dir',dir,'--out',join(root,'report.json')],{encoding:'utf8'});
  assert.equal(q.status,1);assert.match(q.stderr,/PART_MISSING_OR_PRIVATE 02-skeleton-gifts\.json/);assert(!q.stderr.includes('PART_MISSING_OR_PRIVATE 01-overview.json'));assert.equal(q.stdout,'');
});

test('brief CLI 配置错误和分段 CLI 配置错误都非零退出',()=>{
  for(const name of ['brief.mjs','report_parts.mjs']){const cli=fileURLToPath(new URL('../scripts/'+name,import.meta.url)),r=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.notEqual(r.status,0);}
});

test('禁用词这类不带字段路径的错，算到真正写了这个词的那一段，不一律算在第 1 段（rc.12 验收：宿主在第 1 段里找不到词、绕了几十轮）',async()=>{
  const root=await mkdtemp(join(tmpdir(),'xj-parts-word-')),dir=join(root,'parts');
  const {mkdir}=await import('node:fs/promises');await mkdir(dir);
  const profile=join(root,'profile.json');await createPrivateJSON(profile,JSON.parse(await readFile(new URL('./fixtures/profile_sample.json',import.meta.url),'utf8')));
  await createPrivateJSON(join(dir,'01-overview.json'),{schema:'xuanji.report/0.5'});
  await createPrivateJSON(join(dir,'05-chapter-study.json'),{chapters:{study:{brief:'格局花名说你读书靠悟性。'}}});
  const cli=fileURLToPath(new URL('../scripts/report_parts.mjs',import.meta.url));
  const q=spawnSync(process.execPath,[cli,'--profile',profile,'--dir',dir,'--out',join(root,'report.json')],{encoding:'utf8'});
  assert.equal(q.status,1);
  assert.match(q.stderr,/PART_INVALID 05-chapter-study\.json 默认页出现了「花名」/);
  assert(!/PART_INVALID 01-overview\.json 默认页出现了「花名」/.test(q.stderr));
});
