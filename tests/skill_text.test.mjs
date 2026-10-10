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

// 10-06 用户反馈那批规则（身强身弱 v1.3、学龄、换挡年、周岁）落到写法和模板
test('身强身弱：实锤只认用户核过的，待定两种原因都问体感，西盘不进（v1.4）',async()=>{
  const skill=await read('SKILL.md'),jd=await read('reference/解读.md'),bg=await read('reference/报告.md');
  assert.match(skill,/实锤只认核过的/);
  for(const k of ['硬分歧','孤票'])assert.match(skill,new RegExp(k));
  for(const t of [skill,jd,bg])assert.doesNotMatch(t,/尺子有方向|西盘也同向/);
  // 10-08：身强身弱待定时问体感 → 核一核（同一轮核身强身弱和派别，接口收 answers 自己定案）
  assert.match(skill,/\*\*核一核\*\*/);
  assert.match(skill,/`answers`/);
  assert.match(skill,/不讲「几派并列」/);
  assert.match(skill,/一定在出报告之前/);
  assert.doesNotMatch(skill,/`ask\.first_ask`|if_smooth/);
  assert.match(jd,/按强弱下断语的话一律收起来/);
  assert.match(jd,/神煞只讲特质，不讲分数/);
  assert.match(bg,/没核过、票有方向，写「偏强」「偏弱」/);
});

test('岁数周岁、22 周岁及以下按学业说、换挡年单说',async()=>{
  const skill=await read('SKILL.md'),jd=await read('reference/解读.md'),bg=await read('reference/报告.md'),api=await read('docs/api.md');
  assert.match(skill,/岁数一律说周岁/);
  assert.match(jd,/### 岁数、学龄、换挡年/);
  assert.match(jd,/`method.timing.shift_years`/);
  assert.match(bg,/`span` 照抄 `method.bazi.luck` 那一步的 `label`/);
  assert.match(api,/`method.timing.shift_years\[\]`/);
  assert.match(await read('scripts/report_rules.json'),/"years\.life\[\]\.span": 28,/);   // 「3 周岁起运 · 丙辰（1997–2007）」22 个字
});

test('模板：大运周岁、强弱只在实锤放行、学业说法、换挡年标记',async()=>{
  const t=await read('template/single-brand.html');
  assert.match(t,/c\.startAgeFull != null/);
  assert.match(t,/岁数按周岁/);
  assert.match(t,/function strengthFirm\(\)/);
  assert.doesNotMatch(t,/尺子有方向|V\.west|west_agrees/);
  assert.match(t,/用你的经历核过才算定/);
  assert.match(t,/事业认可: '考试升学'/);
  assert.match(t,/function shiftText\(ty\)/);
});

test('三派看法卡：替用户先定的写「先按」、报告不放按钮；三派都对不上只一句陪伴的话、流年条不出',async()=>{
  const t=await read('template/single-brand.html');
  assert.match(t,/'先按' \+ SCH_NAME\[cur\] \+ gm \+ '来说'/);
  assert.match(t,/'（取' \+ S\.格局\.name \+ '）'/, '格局派自己取的格名只放在三派看法卡里，盘面「格局」那栏照旧是排盘的格名');
  assert.match(t,/往后的经历，玄玑陪你一起再核/);
  assert.doesNotMatch(t,/xj-kk|'核一核'\)/, '报告不放核一核按钮：核一核在出报告之前做');
  assert.match(t,/SCx\.check === '降置信'\) return null/);
  assert.doesNotMatch(t,/只当参考/);
});
