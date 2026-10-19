// SPDX-License-Identifier: Apache-2.0
// 三份报告（一事一卜、年度、分术）：查数据、画页面、逐段核对、出文件。全用 tests/fixtures 的合成盘。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkDoc,verifyDoc,renderDoc} from '../scripts/build_doc.mjs';
import {createPrivateJSON} from '../scripts/create_private_json.mjs';
import {assertPrivateFile} from '../scripts/private_files.mjs';
// 只给本人读写：Mac/Linux 看 600，Windows 看访问权限（ACL）——跟 Skill 自己读私有文件用同一道检查
const isPrivate=async(f)=>{await assertPrivateFile(f);if(process.platform!=='win32')assert.equal(statSync(f).mode&0o777,0o600);};

const F=(f)=>JSON.parse(readFileSync(new URL('./fixtures/'+f,import.meta.url),'utf8'));
const fenshuProfile=()=>({...F('profile_sample.json'),vedic:F('vedic_sample_min.json')});
const cases=()=>({
  yishi:{report:F('yishi_report.json'),cast:F('yishi_cast.json'),view:F('xuanji_yishi_view.json')},
  year:{report:F('year_report.json'),profile:F('profile_synth_min.json'),year:F('year_synth.json'),view:F('xuanji_year_synth.json')},
  fenshu:{report:F('fenshu_report.json'),profile:fenshuProfile(),view:F('xuanji_fenshu_view.json'),hits:F('hits.json')},
});
const cats=(iss)=>iss.map(([c])=>c);

test('三份样稿都查得过、画出来每一段字都在页面上',()=>{
  for(const [kind,inp] of Object.entries(cases())){
    assert.deepEqual(checkDoc(kind,inp),[],kind);
    const html=renderDoc(kind,inp,null);
    assert.deepEqual(verifyDoc(inp.report,html,inp.hits),[],kind);
    assert.match(html,/^<!doctype html>/);assert(!html.includes('<script'),kind);   // 静态页，打开不靠脚本
  }
});

test('不能写的词、连着用「亮」、封面放术语都拦下',()=>{
  const c=cases().fenshu;
  c.report.systems.八字.grab='潮来的时候那股劲要用上';
  assert(cats(checkDoc('fenshu',c)).includes('BANNED_WORD'));
  const d=cases().fenshu;d.report.oneline='春天亮一下，秋天再亮一下';
  assert(cats(checkDoc('fenshu',d)).includes('REPEATED_LIANG'));
  const e=cases().year;e.report.cover.seen=e.report.cover.seen.replace('登高望远','木星上天顶');
  assert(cats(checkDoc('year',e)).includes('COVER_TERMS'));
  const f=cases().fenshu;f.report.xuanji.para+='准确率很高';
  assert(cats(checkDoc('fenshu',f)).includes('BANNED_WORD'));
});

test('条数、长度、必填都按说明书查',()=>{
  const c=cases().year;c.report.five.pop();assert(cats(checkDoc('year',c)).includes('ITEM_COUNT'));
  const d=cases().fenshu;d.report.matrix.cells.八字[0]='才华八十八分高/词馆学堂';assert(cats(checkDoc('fenshu',d)).includes('LENGTH_LIMIT'));
  const e=cases().yishi;delete e.report.situation;assert(cats(checkDoc('yishi',e)).includes('REQUIRED_FIELD'));
  const f=cases().fenshu;f.report.cover.stamp='开口说话';assert(cats(checkDoc('fenshu',f)).includes('LENGTH_LIMIT'));
});

test('跟玄玑怎么看对不上就不出：年度要紧的月、分术挑的那一年、一事一卜的月份',()=>{
  const c=cases().year;c.report.glance.key_month_label='3 月';assert(cats(checkDoc('year',c)).includes('VIEW_MISMATCH'));
  const d=cases().fenshu;d.report.xuanji.para=d.report.xuanji.para.replace('2034','2036');assert(cats(checkDoc('fenshu',d)).includes('VIEW_MISMATCH'));
  const e=cases().yishi;e.report.three.xuanji.note='明年 3 月接上';assert(cats(checkDoc('yishi',e)).includes('VIEW_MISMATCH'));
});

test('时辰不详没有印占：报告里写了印占就拦',()=>{
  const c=cases().fenshu;c.profile.vedic={status:'time_unknown'};
  assert(cats(checkDoc('fenshu',c)).includes('VEDIC_WITHOUT_TIME'));
});

test('出厂底色的字母只能是他盘上的',()=>{
  const c=cases().fenshu;c.report.four.出厂底色.em='INTJ';
  assert(cats(checkDoc('fenshu',c)).includes('PERSONA_TYPE'));
});

test('对过的事：hits.json 里有的显示绿勾和他的话；没有的不能写成对上了',()=>{
  const c=cases().fenshu,html=renderDoc('fenshu',c,null);
  assert(html.includes('已对上'));assert(html.includes(c.hits.items[0].said));
  assert(!html.includes('对一对：2016 年'));   // 对上了就不再让他回去发
  const d=cases().fenshu;d.hits={schema:'xuanji.hits/0.1',items:[]};
  assert(cats(checkDoc('fenshu',d)).includes('HIT_UNKNOWN'));
  const e=cases().fenshu,h=renderDoc('fenshu',{...e,hits:null},null);
  assert(!h.includes('已对上'));assert(h.includes('对一对：2016 年'));
});

test('页面上少一段字就报出来',()=>{
  const c=cases().fenshu,html=renderDoc('fenshu',c,null);
  const cut=html.replace(c.report.systems.印占.guard,'');
  assert.deepEqual(verifyDoc(c.report,cut,c.hits),['systems.印占.guard']);
});

test('命令行：私有输入才读；出 HTML 只新建、只给本人读写；不覆盖',async()=>{
  const root=await mkdtemp(join(tmpdir(),'xj-doc-')),cli=fileURLToPath(new URL('../scripts/build_doc.mjs',import.meta.url));
  const c=cases().fenshu,p={};
  for(const [k,v] of Object.entries({report:c.report,profile:c.profile,view:c.view,hits:c.hits})){p[k]=join(root,k+'.json');await createPrivateJSON(p[k],v);}
  const out=join(root,'fenshu.html'),args=['--kind','fenshu','--profile',p.profile,'--view',p.view,'--report',p.report,'--hits',p.hits,'--out',out];
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'REPORT_SAVED');
  assert(existsSync(out));await isPrivate(out);
  const again=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(again.status,1);assert.match(again.stderr,/OUTPUT_EXISTS/);
  // 一事一卜不收 --profile；年度少了 --year 也不行
  const bad=spawnSync(process.execPath,[cli,'--kind','yishi','--cast',p.report,'--profile',p.profile,'--report',p.report,'--out',join(root,'y.html')],{encoding:'utf8'});
  assert.match(bad.stderr,/REPORT_CONFIG_INVALID/);
  const bad2=spawnSync(process.execPath,[cli,'--kind','year','--profile',p.profile,'--view',p.view,'--report',p.report,'--out',join(root,'z.html')],{encoding:'utf8'});
  assert.match(bad2.stderr,/REPORT_CONFIG_INVALID/);
  // 查不过：提示只给类别和字段路径，不带正文
  const broken={...c.report,oneline:'这一年那股劲很足'},bp=join(root,'broken.json');await createPrivateJSON(bp,broken);
  const q=spawnSync(process.execPath,[cli,'--kind','fenshu','--profile',p.profile,'--view',p.view,'--report',bp,'--out',join(root,'b.html')],{encoding:'utf8'});
  assert.equal(q.status,1);assert.match(q.stderr,/REPORT_RULES_HINT BANNED_WORD:oneline/);assert(!q.stderr.includes('那股劲'));assert(!existsSync(join(root,'b.html')));
});

test('对过的事：hits.mjs 没有就私有新建，有就同 id 换新、别的照旧；只收三个字段',async()=>{
  const root=await mkdtemp(join(tmpdir(),'xj-hits-')),cli=fileURLToPath(new URL('../scripts/hits.mjs',import.meta.url)),f=join(root,'hits.json');
  const add=(o)=>spawnSync(process.execPath,[cli,'add',f],{input:JSON.stringify(o),encoding:'utf8'});
  let r=add({id:'h-2016',statement:'2016 年去了新地方',said:'换了城市'});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'HITS_SAVED');
  await isPrivate(f);
  r=add({id:'h-2023',statement:'2023 年重新想过要干什么',said:'那年想辞职'});assert.equal(r.status,0,r.stderr);
  r=add({id:'h-2016',statement:'2016 年去了新地方',said:'换了城市，开始学剪辑'});assert.equal(r.status,0,r.stderr);
  const doc=JSON.parse(readFileSync(f,'utf8'));
  assert.equal(doc.schema,'xuanji.hits/0.1');assert.deepEqual(doc.items.map(h=>h.id),['h-2023','h-2016']);assert.equal(doc.items[1].said,'换了城市，开始学剪辑');
  await isPrivate(f);
  assert.match(add({id:'H 2016',statement:'x',said:'y'}).stderr,/HIT_INVALID/);
  assert.match(add({id:'h-1',statement:'x',said:'y',birth:'1990-01-01'}).stderr,/HIT_INVALID/);
});

test('图上紫圈的数字一个一步：重了、超出步数都拦',()=>{
  const c=cases().year;c.report.plan.graph.left[3].step='6';assert(cats(checkDoc('year',c)).includes('STEP_MARKS'));
  const d=cases().fenshu;d.report.plan.ladder[0].step='9';assert(cats(checkDoc('fenshu',d)).includes('STEP_MARKS'));
});
