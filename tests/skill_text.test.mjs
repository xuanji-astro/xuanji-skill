// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 宿主照 SKILL 和 reference 里的命令原样执行：命令要用 Skill 目录的绝对路径，文件写在用户的工作目录（10-06 Kimi Code 实测把生辰写进了 Skill 安装目录）
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=(p)=>readFile(new URL(p,root),'utf8');

test('SKILL 写明文件只建在用户工作目录、不进 Skill 目录',async()=>{
  const skill=await read('SKILL.md');
  assert.match(skill,/\*\*文件放在哪\*\*/);
  assert.match(skill,/不要 `cd` 进本 Skill 的安装目录/);
});

test('SKILL 和 reference 里给宿主执行的命令都用 <skill目录>/scripts/，不写包内相对路径',async()=>{
  for(const p of ['SKILL.md','reference/定时辰.md','reference/报告.md','reference/解读.md','reference/合盘.md']){
    const t=await read(p);
    assert.equal((t.match(/node scripts\//g)||[]).length,0,p+' 里还有 node scripts/');
  }
});
