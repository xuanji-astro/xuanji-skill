// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 定时辰：出生时间卡在时辰交界时，拿交界两侧两张盘，对用户说的大事（哪年、什么事、好事坏事）和专门问的年份打分。
// 只读接口返回和用户的回答，不排盘、不联网；用户说的大事只在本地文件里，不发给接口。规则见 reference/定时辰.md。
import {pathToFileURL} from 'node:url';
import {realpathSync} from 'node:fs';
import {readPrivateJSON,writePrivateText} from './private_files.mjs';
import {validate} from './client.mjs';

export class RectifyError extends Error{constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new RectifyError(code);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

export const DOMAINS=['工作','事业认可','感情','家庭','钱','迁移远方'];
// 10-10 起（命理组定案）：用户说大事跟身强身弱校正同一套——方面（感情、事业、钱财、学业、健康、家庭）＋具体的事＋好事还是坏事，
// 同一份大事两处用。具体的事归到上面六个方面算第一票（命理组 10-10）；健康不进第一票，只进体感票的好坏
export const AREAS={
  感情:['初恋','遇到正缘','订婚','结婚','冷战','分手','离婚','复合','被骗'],
  事业:['找到工作','升职','降职','跳槽','创业','公司倒闭','失业','转行'],
  钱财:['第一桶金','投资赚钱','意外之财','买房','买车','投资亏损','负债','破产'],
  学业:['高考','考研','留学','休学','考试受阻','考证','获奖'],
  健康:['大病','意外受伤','心理困扰','减肥成功'],
  家庭:['孩子出生','亲人离世','安家置业','搬家移民','家道中落','家庭变故'],
};
const AREA_DOMAIN={感情:'感情',事业:'工作',钱财:'钱',学业:'事业认可',健康:null,家庭:'家庭'};   // 学业照 10-06 学龄口径：考试升学＝事业认可
const EVENT_DOMAIN={升职:'事业认可',降职:'事业认可',休学:'工作',留学:'迁移远方',搬家移民:'迁移远方'};
// 一件大事归到哪个方面：具体的事有单列的按单列，其余按方面；老格式直接写六个方面之一的照旧
export const domainOf=e=>(e.event&&EVENT_DOMAIN[e.event])||(e.domain in AREA_DOMAIN?AREA_DOMAIN[e.domain]:e.domain);
export const RULES={
  lit:2,          // 一套体系的引动强度到 2 才算这一年这一块亮（跟验前事同一条线）
  ratio:1.25,     // 第一票：一边的权重和要高出另一边 25% 以上
  minSide:2,      // 第一票：至少 2 件站在同一边；阈值以下不记票
  askEach:2,      // 补问：两张盘说法相反的年份，两边各挑 2 个
  minAge:16,      // 补问和体感只问 16 岁以后
  feelMin:2,      // 体感票：至少 2 件指向同一张盘，且多过另一张（10-10 起体感不再单独问，用大事和补问里的好事坏事）
  maxEvents:12,   // 大事最多 12 件（跟身强身弱校正共用一份，10-10 从 8 放到 12）
};
// 补问（10-10 改）：不问「有没有明显的变动」，问有没有这几类事，后面带「比如」；答「有」再追问一句好事还是坏事（命理组 10-10）
const Q={
  工作:['你有没有换工作？','找到工作、跳槽、转行、失业、创业'],
  事业认可:['你的职位或名声有没有变？','升职、降职、考上学校、拿奖、被公开表扬或批评'],
  感情:['你有没有开始或结束一段感情？','恋爱、订婚、结婚、分手、离婚、复合'],
  家庭:['你家里有没有大事？','添了孩子、亲人离世、家人分开、买房或换了住处'],
  钱:['你有没有一笔大的进账或花销？','买房买车、投资大赚大亏、欠下大债'],
  迁移远方:['你有没有去别的地方生活？','搬到别的城市、出国、去外地上学或工作'],
};
// 10-13 åå§äºº 实测：2011 年她在读高中，补问还在问「职位或名声」——那一年 22 岁及以下的，工作和事业认可两块换学业的问法（同 10-06 验前事学龄口径）
const Q_STUDY={
  工作:['你的学业有没有转向？','转学、换专业、休学、开始实习或打工'],
  事业认可:['你在学业上有没有大的变化？','升学考试、考上或没考上、转学、拿奖、被公开表扬或批评'],
};
const studyAge=age=>Number.isFinite(age)&&age<=22;
const QQ=(d,age)=>studyAge(age)&&Q_STUDY[d]?Q_STUDY[d]:Q[d];
const QT=(d,y,age)=>`${y} 年，${QQ(d,age)[0]}比如${QQ(d,age)[1]}。`;
// 10-13 她：「你这啥问题，124 都长一样」——同一种问法的几个年份并成一题问；打分仍按每一年各记一条（targeted）
function groupsOf(T){
  const g=new Map();
  for(const k of T){const [ask,eg]=QQ(k.domain,k.age),key=ask+'|'+eg;if(!g.has(key))g.set(key,{ids:[],years:[],ask,eg});const x=g.get(key);x.ids.push(k.id);x.years.push(k.year);}
  return [...g.values()].map(x=>({...x,question:x.years.length>1?`${x.years.join('、')} 这几年，${x.ask}比如${x.eg}。哪一年有，就说哪一年。`:`${x.years[0]} 年，${x.ask}比如${x.eg}。`}));
}
export const FOLLOW='对你来说是好事还是坏事？';

// 干支五行和地支关系：公开的通用表，只用来比流年和时柱
const EL={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水',子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const GAN='甲乙丙丁戊己庚辛壬癸',ZHI='子丑寅卯辰巳午未申酉戌亥';
const pairs=s=>Object.fromEntries(s.split(' ').flatMap(p=>[[p[0],p[1]],[p[1],p[0]]]));
const CHONG=pairs('子午 丑未 寅申 卯酉 辰戌 巳亥'),HE=pairs('子丑 寅亥 卯戌 辰酉 巳申 午未'),HAI=pairs('子未 丑午 寅巳 卯辰 申亥 酉戌');
const XING=new Set(['寅巳','巳申','申寅','丑戌','戌未','未丑','子卯','卯子','辰辰','午午','酉酉','亥亥']);
const KE={木:'土',土:'水',水:'火',火:'金',金:'木'};
const yearGZ=y=>GAN[((y-4)%10+10)%10]+ZHI[((y-4)%12+12)%12];

const nowYear=now=>(now instanceof Date?now:new Date()).getFullYear();
const pad=n=>String(n).padStart(2,'0');

function chart(p){
  if(!object(p)||p.schema!=='xuanji.handoff/0.1'||!object(p.method))fail('PROFILE_INVALID');
  const years=p.method.timing?.years,hour=p.bazi?.bazi?.pillars?.hour,u=p.method.bazi?.useful;
  if(!Array.isArray(years)||!years.length||!object(hour)||typeof hour.ganZhi!=='string'||hour.ganZhi.length!==2)fail('PROFILE_INVALID');
  const els=v=>Array.isArray(v)&&v.every(x=>'木火土金水'.includes(x)&&x.length===1)?v:[];
  const Y=new Map();
  for(const r of years){if(!object(r)||!Number.isInteger(r.year))fail('PROFILE_INVALID');Y.set(r.year,r);}
  return {Y,gz:hour.ganZhi,fav:els(u?.favorable),unfav:els(u?.unfavorable),branch:p.method.boundary?.hour?.branch??null,birth:object(p.birth)?p.birth:{}};
}
const lit=v=>object(v)&&typeof v.w==='number'&&v.w>=RULES.lit?v.w:0;
export function weight(c,year,dom){const r=c.Y.get(year);return r?Math.round((lit(r.bazi?.[dom])+lit(r.west?.[dom]))*10)/10:0;}

// ── 第一步：要不要定、交界另一侧取哪个时间 ──
export function candidate(profile,req){
  validate('profile',req);
  const h=profile?.method?.boundary?.hour;
  if(!req.time||!object(h)||!Number.isFinite(h.minutes_from_prev)||!Number.isFinite(h.minutes_to_next))return null;
  const prec=req.time_precision;
  if(req.time_source==='birth_certificate'&&!['within_15min','within_1h'].includes(prec))return null;   // 出生证的时间按出生证排，不来回翻
  const lim=prec==='within_1h'?60:15,reach=d=>prec==='within_1h'?d<=60:d<15;
  const p=Math.ceil(h.minutes_from_prev),n=Math.ceil(h.minutes_to_next);
  const sides=[['prev',p],['next',n]].filter(([,d])=>reach(d)).sort((a,b)=>a[1]-b[1]);
  if(!sides.length)return null;
  const [side,d]=sides[0],m=Math.max(1,Math.min(8,lim-d)),shift=side==='prev'?-(d+m):(d+m);
  if(shift===0||Math.abs(shift)>lim) return null;
  const t=new Date(Date.parse(`${req.date}T${req.time}:00Z`)+shift*60000);
  return {side,from:h.branch,to:side==='prev'?h.prev_branch:h.next_branch,
    request:{...req,date:t.toISOString().slice(0,10),time:`${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`}};
}

// ── 用户输入：只收年份和方面，不收描述 ──
function inputOf(v){
  if(!object(v)||Object.keys(v).some(k=>!['events','children'].includes(k)))fail('INPUT_INVALID');
  const ev=v.events??[],ch=v.children??[];
  if(!Array.isArray(ev)||ev.length>RULES.maxEvents||!Array.isArray(ch)||ch.length>6)fail('INPUT_INVALID');
  // 一件大事：year＋domain（方面：感情、事业、钱财、学业、健康、家庭；老格式的六个方面也收）＋event（可不填，填了要是这个方面里的）＋good（好事 true、坏事 false，可不填）
  for(const e of ev)if(!object(e)||Object.keys(e).some(k=>!['year','domain','event','good'].includes(k))||!Number.isInteger(e.year)||e.year<1900||e.year>2100
    ||!(DOMAINS.includes(e.domain)||AREAS[e.domain])||(e.event!=null&&!(AREAS[e.domain]&&AREAS[e.domain].includes(e.event)))||(e.good!=null&&typeof e.good!=='boolean'))fail('INPUT_INVALID');
  for(const c of ch)if(!object(c)||Object.keys(c).some(k=>!['year','month','day'].includes(k))||!Number.isInteger(c.year)||c.year<1900||c.year>2100||(c.month!=null&&(!Number.isInteger(c.month)||c.month<1||c.month>12))||(c.day!=null&&(!Number.isInteger(c.day)||c.day<1||c.day>31)))fail('INPUT_INVALID');
  return {events:ev,children:ch};
}
function pairOf(pa,pb){
  const A=chart(pa),B=chart(pb);
  if(A.gz===B.gz)fail('RECTIFY_SAME_HOUR');
  const dayA=Date.parse(`${A.birth.date}T00:00:00Z`),dayB=Date.parse(`${B.birth.date}T00:00:00Z`);
  if(!Number.isFinite(dayA)||!Number.isFinite(dayB)||Math.abs(dayA-dayB)>86400000||A.birth.city!==B.birth.city||A.birth.sex!==B.birth.sex)fail('RECTIFY_PROFILE_MISMATCH');
  return [A,B];
}

// ── 第二步：挑要问的年份（问题里不写哪张盘该有）──
function litKeys(c,nowY){
  const out=[];
  for(const [y,r] of c.Y){if(y>=nowY||!(r.age>=RULES.minAge))continue;for(const d of DOMAINS){const w=weight(c,y,d);if(w>0)out.push({year:y,domain:d,w});}}
  return out;
}
function targeted(A,B,input,nowY){
  const told=new Set(input.events.map(e=>e.year)),used=new Set(),out=[];
  const pick=(X,Y)=>litKeys(X,nowY).filter(k=>weight(Y,k.year,k.domain)===0&&!told.has(k.year)).sort((p,q)=>q.w-p.w||q.year-p.year||DOMAINS.indexOf(p.domain)-DOMAINS.indexOf(q.domain));
  const L={a:pick(A,B),b:pick(B,A)},n={a:0,b:0};
  for(let round=0;round<RULES.askEach;round++)for(const s of ['a','b']){
    const k=L[s].find(x=>!used.has(x.year));if(!k||n[s]>=RULES.askEach)continue;used.add(k.year);n[s]++;out.push({...k,side:s});
  }
  return out.sort((p,q)=>p.year-q.year||DOMAINS.indexOf(p.domain)-DOMAINS.indexOf(q.domain)).map((k,i)=>({id:'t'+(i+1),...k,age:(A.Y.get(k.year)||{}).age}));
}
function predict(c,gz){const e=[EL[gz[0]],EL[gz[1]]];if(e.every(x=>c.fav.includes(x)))return '顺';if(e.every(x=>c.unfav.includes(x)))return '闷';return null;}
export function plan(pa,pb,events,{now}={}){
  const [A,B]=pairOf(pa,pb),input=inputOf(events),nowY=nowYear(now);
  const t=targeted(A,B,input,nowY);
  return {schema:'xuanji.rectify.ask/0.2',now_year:nowY,
    targeted:t.map(k=>({id:k.id,year:k.year,domain:k.domain,question:QT(k.domain,k.year,k.age),ask:QQ(k.domain,k.age)[0],eg:QQ(k.domain,k.age)[1]})),
    groups:groupsOf(t).map(g=>({ids:g.ids,years:g.years,question:g.question})),
    follow_up:FOLLOW,ask_children:true,
    answers:{targeted:['有','没有','记不清'],good:['好事','坏事']}};
}

// ── 第三步：打分 ──
function childYear(c){
  if(c.month===1||(c.month===2&&c.day!=null&&c.day<4))return c.year-1;   // 立春前出生，算上一年的干支
  if(c.month===2&&(c.day==null||c.day===4))return null;                   // 立春前后说不准，不用
  return c.year;
}
function childHits(c,years){
  let strong=0,weak=0;
  for(const y of years){
    const gz=yearGZ(y),[yg,yz]=gz,[hg,hz]=c.gz;
    const chong=CHONG[yz]===hz,fanyin=chong&&(KE[EL[yg]]===EL[hg]||KE[EL[hg]]===EL[yg]);
    if(chong||HE[yz]===hz||gz===c.gz||fanyin)strong++;
    else if(XING.has(yz+hz)||XING.has(hz+yz)||HAI[yz]===hz)weak++;
  }
  return {strong,weak,score:strong+(weak>=2?1:0)};
}
export function score(pa,pb,events,ask,answers){
  const [A,B]=pairOf(pa,pb),input=inputOf(events);
  if(!object(ask)||ask.schema!=='xuanji.rectify.ask/0.2'||!Number.isInteger(ask.now_year))fail('ASK_INVALID');
  if(!object(answers)||Object.keys(answers).some(k=>!['targeted','good'].includes(k)))fail('INPUT_INVALID');
  const ta=answers.targeted??{},ga=answers.good??{};
  if(!object(ta)||!object(ga))fail('INPUT_INVALID');
  // 重算要问的年份，跟 ask.json 对不上就停（防止换了盘或改了大事再打分）
  const T=targeted(A,B,input,ask.now_year);
  const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if(!same(T.map(k=>[k.id,k.year,k.domain,QT(k.domain,k.year,k.age)]),(ask.targeted??[]).map(k=>[k.id,k.year,k.domain,k.question])))fail('ASK_MISMATCH');
  // 补问回答：有／没有／记不清（老说法「没印象」照收）；答了「有」的才能追问好事坏事
  for(const [k,v] of Object.entries(ta))if(!T.some(x=>x.id===k)||!['有','没有','记不清','没印象'].includes(v))fail('INPUT_INVALID');
  for(const [k,v] of Object.entries(ga))if(ta[k]!=='有'||!['好事','坏事'].includes(v))fail('INPUT_INVALID');

  // 第一票：用户说的大事（按权重）＋专门问的年份（准／不准才算），分开记账、合并判票
  const told={a:0,b:0,side:{a:0,b:0},used:0,skipped:0,other:0},asked={a:0,b:0,side:{a:0,b:0},answered:0,unsure:0};
  for(const e of input.events){
    const d=domainOf(e);if(!d){told.other++;continue;}   // 健康：不进第一票
    const a=weight(A,e.year,d),b=weight(B,e.year,d);
    if(!A.Y.has(e.year)){told.skipped++;continue;}
    told.used++;told.a+=a;told.b+=b;if(a>b)told.side.a++;else if(b>a)told.side.b++;
  }
  for(const k of T){
    const v=ta[k.id];if(v==null)continue;if(v==='记不清'||v==='没印象'){asked.unsure++;continue;}
    const s=v==='有'?k.side:(k.side==='a'?'b':'a');asked.answered++;asked[s]+=k.w;asked.side[s]++;
  }
  const r1=x=>Math.round(x*10)/10;
  const tot={a:r1(told.a+asked.a),b:r1(told.b+asked.b)},side={a:told.side.a+asked.side.a,b:told.side.b+asked.side.b};
  const passes=(x,y)=>tot[x]>0&&tot[x]>=RULES.ratio*tot[y]&&side[x]>=RULES.minSide;
  const v1=passes('a','b')?'a':passes('b','a')?'b':null;

  // 第二票：体感（命理组 10-10）。不再单独问「整体往上还是往下」，用用户说的每件大事、补问答「有」后追问的好事坏事：
  // 只看两张盘说法相反的年份（流年两个字，一张全在喜里＝顺、另一张全在忌里＝闷）；好事记给说顺的那张，坏事记给说闷的那张；
  // 同一年好坏都有的那年不记；16 岁以前的不记；至少 2 件指向同一张、并且多过另一张才算一票
  const items=[...input.events.filter(e=>typeof e.good==='boolean').map(e=>({year:e.year,good:e.good,from:'told'})),
    ...T.filter(k=>ta[k.id]==='有'&&ga[k.id]).map(k=>({year:k.year,good:ga[k.id]==='好事',from:'asked'}))];
  const mixed=new Set(items.filter(x=>items.some(y=>y.year===x.year&&y.good!==x.good)).map(x=>x.year));
  const pts={a:0,b:0,mixed_years:mixed.size,used:0};
  for(const it of items){
    const r=A.Y.get(it.year);if(mixed.has(it.year)||!r||!(r.age>=RULES.minAge))continue;
    const gz=yearGZ(it.year),pa=predict(A,gz),pb=predict(B,gz);if(!pa||!pb||pa===pb)continue;
    pts.used++;pts[it.good===(pa==='顺')?'a':'b']++;
  }
  const v2=pts.a>=RULES.feelMin&&pts.a>pts.b?'a':pts.b>=RULES.feelMin&&pts.b>pts.a?'b':null;

  // 子女：只打破平局，不单独成票
  const cy=input.children.map(childYear).filter(y=>y!=null);
  const kid={used:cy.length,a:childHits(A,cy),b:childHits(B,cy)};
  const lean=kid.a.score>kid.b.score?'a':kid.b.score>kid.a.score?'b':null;

  const votes=[v1,v2].filter(Boolean),na=votes.filter(x=>x==='a').length,nb=votes.length-na;
  let result='uncertain',tie=false;
  if(na>nb)result='a';else if(nb>na)result='b';
  else if(na===1&&nb===1&&lean){result=lean;tie=true;}
  const hours={a:A.gz[1]+'时',b:B.gz[1]+'时'};
  return {schema:'xuanji.rectify/0.1',result,use_profile:result==='uncertain'?null:result,hours,
    lean:result==='uncertain'?lean:null,tie_broken_by_children:tie,
    first_vote:{vote:v1,total:tot,items_on_side:side,told:{a:r1(told.a),b:r1(told.b),used:told.used,skipped:told.skipped,other:told.other},asked:{a:r1(asked.a),b:r1(asked.b),answered:asked.answered,unsure:asked.unsure}},
    feel_vote:{applicable:pts.used>0,vote:v2,points:{a:pts.a,b:pts.b,mixed_years:pts.mixed_years},need_extra:false},
    children:{used:kid.used,a:kid.a,b:kid.b,lean},
    rules:RULES};
}

// ── 命令行：结果只写进本人可读的文件，终端只打固定代码 ──
export async function main(args){
  const [cmd,...flags]=args,o={};
  for(let i=0;i<flags.length;i+=2){const k=flags[i],v=flags[i+1];if(!/^--(profile|request|output|a|b|events|ask|answers)$/.test(k)||!v||v.startsWith('--')||o[k])fail('CONFIG_INVALID');o[k]=v;}
  const need=ks=>{for(const k of ks)if(!o['--'+k])fail('MISSING_PARAMETER');};
  const read=async(p,max)=>{try{return await readPrivateJSON(p,max);}catch{fail('INPUT_FILE_INVALID');}};
  const write=async(p,v)=>{try{await writePrivateText(p,JSON.stringify(v,null,2)+'\n');}catch{fail('OUTPUT_FILE_UNAVAILABLE');}};
  const BIG=2*1024*1024;
  if(cmd==='check'){
    need(['profile','request','output']);
    const c=candidate(await read(o['--profile'],BIG),await read(o['--request'],8192));
    if(!c){console.log('RECTIFY_NOT_NEEDED');return;}
    await write(o['--output'],c.request);console.log('RECTIFY_CANDIDATE_SAVED');return;
  }
  if(cmd==='ask'){
    need(['a','b','events','output']);
    await write(o['--output'],plan(await read(o['--a'],BIG),await read(o['--b'],BIG),await read(o['--events'],8192)));
    console.log('RECTIFY_QUESTIONS_SAVED');return;
  }
  if(cmd==='score'){
    need(['a','b','events','ask','answers','output']);
    await write(o['--output'],score(await read(o['--a'],BIG),await read(o['--b'],BIG),await read(o['--events'],8192),await read(o['--ask'],65536),await read(o['--answers'],8192)));
    console.log('RECTIFY_RESULT_SAVED');return;
  }
  fail('CONFIG_INVALID');
}
const CODES=['CONFIG_INVALID','MISSING_PARAMETER','INPUT_FILE_INVALID','INPUT_INVALID','OUTPUT_FILE_UNAVAILABLE','PROFILE_INVALID','RECTIFY_SAME_HOUR','RECTIFY_PROFILE_MISMATCH','ASK_INVALID','ASK_MISMATCH','MISSING_PARAMETER'];
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){main(process.argv.slice(2)).catch(e=>{console.error(e instanceof RectifyError&&CODES.includes(e.code)?e.code:(e?.code&&/^[A-Z_]+$/.test(e.code)?e.code:'RECTIFY_FAILED'));process.exitCode=1;});}
