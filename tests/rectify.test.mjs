// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,stat,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {candidate,plan,score,RULES,domainOf,AREAS} from '../scripts/rectify.mjs';
import {createPrivateJSON} from '../scripts/create_private_json.mjs';

// 以下全是合成数据：只造打分要用的几个字段，不代表真人
const NOW=new Date('2026-10-04T12:00:00Z');
function prof({gz,fav=['木','火'],unfav=['金','水'],lit={},hour={branch:'巳',minutes_from_prev:107,minutes_to_next:13,prev_branch:'辰',next_branch:'午',near:true}}){
  const years=[];
  for(let y=2002;y<=2035;y++){const L=lit[y]||{};years.push({year:y,age:y-1990,gan_zhi:'',bazi:L.bazi||{},west:L.west||{}});}
  return {schema:'xuanji.handoff/0.1',birth:{date:'1990-03-15',city:'浙江省杭州市',sex:'female'},bazi:{bazi:{pillars:{hour:{ganZhi:gz}}}},
    method:{boundary:{hour},bazi:{useful:{favorable:fav,unfavorable:unfav}},timing:{years}}};
}
const w=(n)=>({w:n,why:[]});
const A=(o={})=>prof({gz:'甲子',lit:{2015:{bazi:{工作:w(3)}},2018:{west:{感情:w(2.5)}},2011:{bazi:{钱:w(2.6)}},2013:{bazi:{家庭:w(2.2)}}},...o});
const B=(o={})=>prof({gz:'乙丑',lit:{2016:{bazi:{钱:w(3)}},2019:{west:{家庭:w(2.5)}},2010:{bazi:{感情:w(2.8)}},2012:{bazi:{工作:w(2.4)}}},...o});
const ask=(a,b,ev)=>plan(a,b,ev,{now:NOW});

test('candidate：卡在交界、不是出生证 → 交界另一侧；出生证、离得远都不提',()=>{
  const req={date:'1990-03-15',time:'10:56',city:'浙江省杭州市',gender:'female',time_source:'family_rough',time_precision:'within_15min'};
  const c=candidate(A(),req);
  assert.equal(c.side,'next');assert.equal(c.to,'午');assert.equal(c.request.date,'1990-03-15');
  assert.equal(c.request.time,'11:11');   // 离交界 13 分钟，再过 2 分钟（不超出 15 分钟的精度）
  assert.equal(candidate(A(),{...req,time_source:'birth_certificate',time_precision:'minute'}),null);
  assert.ok(candidate(A(),{...req,time_source:'birth_certificate',time_precision:'within_15min'}));
  const far={branch:'巳',minutes_from_prev:60,minutes_to_next:60,prev_branch:'辰',next_branch:'午',near:false};
  assert.equal(candidate(A({hour:far}),req),null);
  assert.equal(candidate(A({hour:{...far,minutes_to_next:40,minutes_from_prev:80}}),{...req,time_precision:'within_1h'}).request.time,'11:44');
  assert.equal(candidate(A(),{...req,time:null}),null);
});
test('candidate：往前跨过半夜要换日期',()=>{
  const h={branch:'子',minutes_from_prev:4,minutes_to_next:116,prev_branch:'亥',next_branch:'丑',near:true};
  const c=candidate(A({hour:h}),{date:'1990-03-15',time:'00:03',city:'浙江省杭州市',gender:'female',time_source:'unknown'});
  assert.equal(c.side,'prev');assert.equal(c.request.date,'1990-03-14');assert.equal(c.request.time,'23:51');
});
test('ask：只问两张盘说法相反的年份，不问用户已经说过的年份，问题里不写哪张盘',()=>{
  const q=ask(A(),B(),{events:[{year:2015,domain:'工作'}]});
  const ys=q.targeted.map(x=>x.year);
  assert.ok(!ys.includes(2015));assert.equal(q.targeted.length,4);
  assert.deepEqual(ys,[...ys].sort((a,b)=>a-b));
  for(const x of q.targeted){assert.deepEqual(Object.keys(x).sort(),['ask','domain','eg','id','question','year']);assert.ok(!/A|B|盘/.test(x.question));
    assert.equal(x.question,`${x.year} 年，${x.ask}比如${x.eg}。`);assert.ok(!/明显的变动/.test(x.question),'10-10 起不问「明显的变动」');}
  assert.equal(q.follow_up,'对你来说是好事还是坏事？');assert.deepEqual(q.answers,{targeted:['有','没有','记不清'],good:['好事','坏事']});
  assert.ok(!('feel' in q),'10-10 起不单独问体感');
  assert.equal(new Set(ys).size,ys.length);
});
test('第一票：大事站在原时间那边 → 定原时间；站在另一边 → 定另一边',()=>{
  const ev={events:[{year:2015,domain:'工作'},{year:2018,domain:'感情'}]},q=ask(A(),B(),ev);
  const r=score(A(),B(),ev,q,{});
  assert.equal(r.first_vote.vote,'a');assert.equal(r.result,'a');assert.equal(r.use_profile,'a');assert.equal(r.hours.a,'子时');
  const ev2={events:[{year:2016,domain:'钱'},{year:2019,domain:'家庭'}]},r2=score(A(),B(),ev2,ask(A(),B(),ev2),{});
  assert.equal(r2.result,'b');
});
test('阈值以下不记票：一边一件、权重差不到 25% → 时辰存疑',()=>{
  const ev={events:[{year:2015,domain:'工作'},{year:2016,domain:'钱'}]},r=score(A(),B(),ev,ask(A(),B(),ev),{});
  assert.equal(r.first_vote.vote,null);assert.equal(r.result,'uncertain');assert.equal(r.use_profile,null);
  const one={events:[{year:2015,domain:'工作'}]},r1=score(A(),B(),one,ask(A(),B(),one),{});
  assert.equal(r1.first_vote.vote,null,'只有 1 件站在一边，不够 2 件');
});
test('补问：「有」算给预言它的那张盘，「没有」算给另一张，「记不清」（老说法「没印象」）不计',()=>{
  const ev={events:[]},q=ask(A(),B(),ev),ans={targeted:{}};
  const sideOf=(x)=>[2011,2013,2015,2018].includes(x.year)?'a':'b';
  for(const x of q.targeted)ans.targeted[x.id]=sideOf(x)==='a'?'有':'没有';
  const r=score(A(),B(),ev,q,ans);
  assert.equal(r.first_vote.asked.answered,4);assert.equal(r.first_vote.vote,'a');assert.equal(r.result,'a');
  for(const x of q.targeted)ans.targeted[x.id]='记不清';
  const r2=score(A(),B(),ev,q,ans);assert.equal(r2.first_vote.asked.unsure,4);assert.equal(r2.result,'uncertain');
  for(const x of q.targeted)ans.targeted[x.id]='没印象';
  assert.equal(score(A(),B(),ev,q,ans).first_vote.asked.unsure,4);
});
test('第二票（10-10）：大事和补问「有」后追问的好事坏事；只看两张盘说法相反的年份，至少 2 件指向同一张才算',()=>{
  const b=()=>B({fav:['金','水'],unfav:['木','火']});   // A 喜木火忌金水，B 反过来：乙巳（木火）A 顺 B 闷，庚子（金水）A 闷 B 顺
  const ev={events:[{year:2025,domain:'事业',event:'升职',good:true},{year:2020,domain:'钱财',event:'投资亏损',good:false}]};
  const r=score(A(),b(),ev,ask(A(),b(),ev),{});
  assert.equal(r.feel_vote.vote,'a');assert.deepEqual(r.feel_vote.points,{a:2,b:0,mixed_years:0});assert.equal(r.feel_vote.need_extra,false);
  const one={events:[{year:2025,domain:'事业',event:'升职',good:true}]};assert.equal(score(A(),b(),one,ask(A(),b(),one),{}).feel_vote.vote,null,'只有 1 件不够');
  const mix={events:[{year:2025,domain:'事业',event:'升职',good:true},{year:2025,domain:'感情',event:'分手',good:false},{year:2020,domain:'钱财',event:'投资亏损',good:false}]};
  const rm=score(A(),b(),mix,ask(A(),b(),mix),{});assert.equal(rm.feel_vote.points.mixed_years,1);assert.equal(rm.feel_vote.vote,null,'同一年好坏都有，那年不记');
  const same={events:[{year:2025,domain:'事业',event:'升职',good:true},{year:2020,domain:'钱财',event:'投资亏损',good:false}]};
  assert.equal(score(A(),B(),same,ask(A(),B(),same),{}).feel_vote.applicable,false,'两张盘喜忌一样，没有说法相反的年份');
  // 补问答「有」再追问好坏，也进这一票；没答「有」不许填好坏
  const wide=()=>B({fav:['金','水'],unfav:['木','火'],lit:{2025:{bazi:{钱:w(3)}},2020:{bazi:{感情:w(3)}}}});
  const q=ask(A(),wide(),{events:[]}),t25=q.targeted.find(x=>x.year===2025),t20=q.targeted.find(x=>x.year===2020);
  assert.ok(t25&&t20,'2025、2020 两年会被补问');
  const ra=score(A(),wide(),{events:[]},q,{targeted:{[t25.id]:'有',[t20.id]:'有'},good:{[t25.id]:'坏事',[t20.id]:'好事'}});
  assert.equal(ra.feel_vote.vote,'b');
  assert.throws(()=>score(A(),wide(),{events:[]},q,{targeted:{[t25.id]:'没有'},good:{[t25.id]:'好事'}}),/INPUT_INVALID/);
});
test('具体的事归到哪个方面（命理组 10-10）',()=>{
  const d=(domain,event)=>domainOf({domain,event});
  assert.equal(d('事业','跳槽'),'工作');assert.equal(d('事业','升职'),'事业认可');assert.equal(d('事业','降职'),'事业认可');
  assert.equal(d('学业','高考'),'事业认可');assert.equal(d('学业','休学'),'工作');assert.equal(d('学业','留学'),'迁移远方');
  assert.equal(d('家庭','搬家移民'),'迁移远方');assert.equal(d('家庭','孩子出生'),'家庭');assert.equal(d('钱财','买房'),'钱');assert.equal(d('感情','结婚'),'感情');
  assert.equal(d('健康','大病'),null);assert.equal(d('工作'),'工作');assert.equal(d('迁移远方'),'迁移远方');
  for(const [k,list] of Object.entries(AREAS))for(const e of list)assert.ok(domainOf({domain:k,event:e})!==undefined);
  const ev={events:[{year:2015,domain:'事业',event:'跳槽',good:true},{year:2018,domain:'感情',event:'结婚'}]},r=score(A(),B(),ev,ask(A(),B(),ev),{});
  assert.equal(r.first_vote.vote,'a','新格式的大事照样进第一票');
  const h={events:[{year:2015,domain:'健康',event:'大病',good:false}]};assert.equal(score(A(),B(),h,ask(A(),B(),h),{}).first_vote.told.other,1);
});
test('一比一：子女佐证打破平局；零比零：子女只给倾向，不单独定',()=>{
  const b=()=>B({fav:['金','水'],unfav:['木','火']});
  const ev={events:[{year:2015,domain:'工作'},{year:2018,domain:'感情'}],children:[{year:2015,month:6}]},q=ask(A(),b(),ev);
  ev.events.push({year:2025,domain:'事业',event:'失业',good:false},{year:2020,domain:'钱财',event:'意外之财',good:true});
  const r=score(A(),b(),ev,ask(A(),b(),ev),{});   // 第一票 A、体感 B；2015 乙未冲乙丑时柱（B 强佐证），对甲子只是六害
  assert.equal(r.first_vote.vote,'a');assert.equal(r.feel_vote.vote,'b');assert.equal(r.children.lean,'b');
  assert.equal(r.result,'b');assert.equal(r.tie_broken_by_children,true);
  const ev0={events:[],children:[{year:2015,month:6}]},r0=score(A(),B(),ev0,ask(A(),B(),ev0),{});
  assert.equal(r0.result,'uncertain');assert.equal(r0.lean,'b');assert.equal(r0.tie_broken_by_children,false);
  const jan={events:[],children:[{year:2016,month:1}]},rj=score(A(),B(),jan,ask(A(),B(),jan),{});
  assert.equal(rj.children.b.strong,1,'1 月出生算上一年（乙未）');
  const feb={events:[],children:[{year:2016,month:2}]};assert.equal(score(A(),B(),feb,ask(A(),B(),feb),{}).children.used,0,'2 月没说日子，立春前后说不准，不用');
});
test('输入只收年份和方面；问过的题跟 ask 对不上就停',()=>{
  for(const ev of [{events:[{year:2015,domain:'工作',note:'离婚'}]},{events:[{year:2015,domain:'运动'}]},{events:[{year:2015,domain:'事业',event:'结婚'}]},{events:[{year:2015,domain:'事业',good:'好'}]},
    {events:Array(13).fill({year:2015,domain:'工作'})},{events:[],extra:1},{children:[{year:2015,name:'x'}]}])
    assert.throws(()=>ask(A(),B(),ev),/INPUT_INVALID/);
  const ev={events:[{year:2015,domain:'工作'}]},q=ask(A(),B(),ev);
  assert.throws(()=>score(A(),B(),{events:[{year:2018,domain:'感情'}]},q,{}),/ASK_MISMATCH/);
  assert.throws(()=>score(A(),B(),ev,q,{targeted:{t9:'有'}}),/INPUT_INVALID/);
  assert.throws(()=>score(A(),B(),ev,q,{targeted:{t1:'应该有'}}),/INPUT_INVALID/);
  assert.throws(()=>score(A(),B(),ev,{...q,targeted:q.targeted.map((x,i)=>i?x:{...x,question:'暗示用户答案'})},{}),/ASK_MISMATCH/);
  const otherBirth=B();otherBirth.birth.date='1991-03-15';
  assert.throws(()=>ask(A(),otherBirth,{events:[]}),/RECTIFY_PROFILE_MISMATCH/);
  const nextDay=B();nextDay.birth.date='1990-03-16';
  assert.equal(ask(A(),nextDay,{events:[]}).schema,'xuanji.rectify.ask/0.2');
  assert.throws(()=>score(A(),A(),ev,q,{}),/RECTIFY_SAME_HOUR/);
  assert.throws(()=>plan({schema:'x'},B(),ev),/PROFILE_INVALID/);
});
test('规则常数照 10-04 定案',()=>{assert.equal(RULES.ratio,1.25);assert.equal(RULES.minSide,2);assert.equal(RULES.askEach,2);});

const cli=fileURLToPath(new URL('../scripts/rectify.mjs',import.meta.url));
test('命令行：结果写进 600 文件，终端只打固定代码；输入文件不是 600 就拒绝',{skip:process.platform==='win32'},async()=>{
  const d=await mkdtemp(join(tmpdir(),'xuanji-rectify-')),f=(n)=>join(d,n);
  const req={date:'1990-03-15',time:'10:56',city:'浙江省杭州市',gender:'female',time_source:'family_rough',time_precision:'within_15min'};
  await createPrivateJSON(f('profile.json'),A());await createPrivateJSON(f('request.json'),req);
  let r=spawnSync(process.execPath,[cli,'check','--profile',f('profile.json'),'--request',f('request.json'),'--output',f('request_alt.json')],{encoding:'utf8'});
  assert.equal(r.stdout.trim(),'RECTIFY_CANDIDATE_SAVED');assert.equal((await stat(f('request_alt.json'))).mode&0o777,0o600);
  assert.ok(!r.stdout.includes('1990')&&!r.stderr.includes('1990'));
  await createPrivateJSON(f('profile_alt.json'),B());
  const ev={events:[{year:2015,domain:'工作'},{year:2018,domain:'感情'}]};await createPrivateJSON(f('events.json'),ev);
  r=spawnSync(process.execPath,[cli,'ask','--a',f('profile.json'),'--b',f('profile_alt.json'),'--events',f('events.json'),'--output',f('ask.json')],{encoding:'utf8'});
  assert.equal(r.stdout.trim(),'RECTIFY_QUESTIONS_SAVED');
  await createPrivateJSON(f('answers.json'),{});
  r=spawnSync(process.execPath,[cli,'score','--a',f('profile.json'),'--b',f('profile_alt.json'),'--events',f('events.json'),'--ask',f('ask.json'),'--answers',f('answers.json'),'--output',f('rectify.json')],{encoding:'utf8'});
  assert.equal(r.stdout.trim(),'RECTIFY_RESULT_SAVED');
  const out=JSON.parse(await readFile(f('rectify.json'),'utf8'));assert.equal(out.schema,'xuanji.rectify/0.1');assert.ok(['a','b','uncertain'].includes(out.result));
  r=spawnSync(process.execPath,[cli,'score','--a',f('profile.json'),'--b',f('profile_alt.json'),'--events',f('events.json'),'--ask',f('ask.json'),'--answers',f('answers.json'),'--output',f('rectify.json')],{encoding:'utf8'});
  assert.equal(r.stderr.trim(),'OUTPUT_FILE_UNAVAILABLE','不覆盖已有文件');
  const {writeFile}=await import('node:fs/promises');await writeFile(f('loose.json'),JSON.stringify(ev),{mode:0o644});
  r=spawnSync(process.execPath,[cli,'ask','--a',f('profile.json'),'--b',f('profile_alt.json'),'--events',f('loose.json'),'--output',f('ask2.json')],{encoding:'utf8'});
  assert.equal(r.stderr.trim(),'INPUT_FILE_INVALID');
});
test('定时辰脚本不联网：不调用 fetch、http、client 的请求函数',async()=>{
  const src=await readFile(cli,'utf8');
  assert.ok(!/\bfetch\s*\(|node:https?|callAPI/.test(src));
});
test('ask（10-13）：22 岁及以下问学业；同一种问法的几个年份并成一题，打分仍按每一年',()=>{
  const a=prof({gz:'甲子',lit:{2011:{bazi:{事业认可:w(3)}},2016:{bazi:{事业认可:w(3)}}}}),b=prof({gz:'乙丑',lit:{2020:{bazi:{事业认可:w(3)}},2024:{bazi:{事业认可:w(3)}}}});
  const q=ask(a,b,{events:[]});
  const y11=q.targeted.find(x=>x.year===2011);assert.ok(y11&&/学业/.test(y11.question)&&!/职位/.test(y11.question),'2011 年 21 岁问学业');
  const big=q.groups.find(g=>g.years.length>1);assert.ok(big,'职位那几年并成一题');
  assert.equal(big.question,`${big.years.join('、')} 这几年，你的职位或名声有没有变？比如升职、降职、考上学校、拿奖、被公开表扬或批评。哪一年有，就说哪一年。`);
  assert.equal(q.groups.reduce((n,g)=>n+g.ids.length,0),q.targeted.length);
  const ans={targeted:Object.fromEntries(q.targeted.map(x=>[x.id,'没有'])),good:{}};
  assert.doesNotThrow(()=>score(a,b,{events:[]},q,ans));
});
test('candidate（10-13）：给了时间没写来源就停（TIME_SOURCE_MISSING），不提议定时辰',()=>{
  const req={date:'1990-03-15',time:'10:56',city:'浙江省杭州市',gender:'female',time_precision:'minute'};
  assert.throws(()=>candidate(A(),req),e=>e.code==='TIME_SOURCE_MISSING');
});
