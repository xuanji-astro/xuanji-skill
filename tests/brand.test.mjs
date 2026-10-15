import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,stat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createPrivateJSON} from '../scripts/create_private_json.mjs';
import {build,check} from '../scripts/build_report.mjs';
import {prerender,verifyReport,serialize} from '../scripts/prerender.mjs';
import {checkPDF,browserCandidates,findBrowser} from '../scripts/make_pdf.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {readPrivateJSON,assertPrivateFile} from '../scripts/private_files.mjs';
function fixtures(){
 const year=new Date().getFullYear();const section={title:'结构观察',body:'合成测试文字，不代表真人或未来承诺。'};
 const calendar=Array.from({length:3},(_,i)=>({span:String(year+i),title:'合成观察',body:'保留自主判断。',first_half:'观察',second_half:'复核',do:'记录',avoid:'冲动',basis:'合成接口依据',areas:[{area:'事业',text:'合成'},{area:'学业',text:'合成'}]}));
 const chapters=Object.fromEntries(['career','wealth','study','love','family','social','health','growth'].map(k=>[k,{brief:k==='growth'?'人生课题需要慢慢观察':'观察后再判断',sections:[section,section]}]));
 chapters.career.question='你是否想了解这个结构？';chapters.career.gold='结构不替代选择。';
 const rep={schema:'xuanji.report/0.5',cover:{seen:'合成样本第一句。\n合成样本第二句，夸你的本事，写到二十字上下。\n合成原句，不代表真人。',support:['星盘','八字','人格']},progress:Array.from({length:3},()=>({state:'待确认',item:'合成样本待确认'})),hits:[],misses:[],crosscheck:[],skeleton:{question:'你想从哪里开始？',oneline:'用结构帮助观察。',bazi:'合成说明。'},gifts:{oneline:'善用已有优势。',items:Array.from({length:3},()=>section)},focus:['career','love'],chapters,years:{theme:'合成节奏',lesson:{question:'你想观察什么？',body:'保留自己的判断。'},forces:[section],windows:Array.from({length:4},()=>({when:'合成月份',area:'事业',title:'观察窗口',body:'仅为格式测试。'})),calendar,decade:Array.from({length:7},(_,i)=>({span:String(year+3+i),title:'合成',body:'合成观察',basis:'合成依据'})),life:Array.from({length:6},()=>({span:'合成年龄',title:'节奏观察',body:'合成文字'}))},closing:'合成测试结束。',audit:{aspects:Array.from({length:3},()=>({aspect:'合成相位',body:'合成'}))},next_questions:['如何看待当前结构？','怎样观察行动？','如何记录经验？','如何理解变化？'],basis:{}};
 const prof={schema:'xuanji.handoff/0.1',birth:{date:'1996-05-20',time:'10:30',city:'合成地点',sex:'female'},bazi:{status:'ok',input:{trueSolarTime:'1996-05-20T10:30:00',longitude:120},version:{config:'implementation-label'}},method:{}};
 return {prof,rep};
}
/* 10-14 报告生成时整份画好、核对完整才出文件：简化的假盘画出来本来就缺东西，出文件的测试改用接口算的一份完整编造盘（1993-08-17 杭州，虚构），合成稿照它补齐 */
function fullFixtures(){
 const prof=JSON.parse(readFileSync(new URL('./fixtures/profile_sample.json',import.meta.url),'utf8'));const {rep}=fixtures();
 const lines=rep.cover.seen.split('\n');lines[0]=JSON.parse(readFileSync(new URL('../scripts/report_rules.json',import.meta.url),'utf8')).cover_seen_plain.pool[prof.bazi.bazi.pillars.day.gan][0];lines[2]=prof.method.persona.base.cover_line;rep.cover.seen=lines.join('\n');
 rep.crosscheck=[{theme:'做事有主见',systems:['八字','星盘'],note:zh(60)},{theme:'重情重义',systems:['星盘','人格'],note:zh(60)}];
 rep.skeleton.layers={outer:{title:'外层',body:zh(200)},middle:{title:'中层',body:zh(200)},inner:{title:'内层',body:zh(200)}};
 const R3=['星盘·太阳','八字·日支','人格·Te'];rep.gifts.items=rep.gifts.items.map((x,i)=>({...x,refs:[R3[i%3]]}));while(rep.gifts.items.length<3)rep.gifts.items.push({title:'合成天赋',body:zh(300),refs:[R3[rep.gifts.items.length]]});
 for(const k of rep.focus||[])rep.chapters[k].refs=['八字·日支','星盘·金星'];
 rep.audit.planets=Object.fromEntries(['太阳','月亮','水星','金星','火星','木星','土星','天王','海王','冥王'].map(n=>[n,{role:'合成角色',p1:zh(120),p2:zh(120),p3:zh(120)}]));
 return {prof,rep};
}
/* 10-13 报告加了字数下限：合成样本按下限写足（只为过格式检查，文字不代表真人） */
function zh(k){const u='合成测试正文只为检查格式不代表真人也不代表未来';let s='';while(s.length<k)s+=u;return s.slice(0,k)+'。';}
function fill(rep){
 const set=(o,k,len)=>{if(o&&typeof o[k]==='string')o[k]=zh(len);};
 for(const c of Object.values(rep.chapters))c.sections=c.sections.map(x=>({...x,body:zh(430)}));
 rep.gifts.items=rep.gifts.items.map(x=>({...x,body:zh(300)}));rep.gifts.intro=zh(120);
 rep.years.forces=rep.years.forces.map(x=>({...x,body:zh(300)}));set(rep.years.lesson,'body',380);rep.years.intro=zh(220);
 rep.years.calendar=rep.years.calendar.map(x=>({...x,body:zh(140),first_half:zh(80),second_half:zh(80),areas:x.areas.map(a=>({...a,text:zh(80)}))}));
 rep.years.windows=rep.years.windows.map(x=>({...x,body:zh(110)}));rep.years.decade=rep.years.decade.map(x=>({...x,body:zh(120)}));rep.years.life=rep.years.life.map(x=>({...x,body:zh(80)}));
 rep.audit.aspects=rep.audit.aspects.map(x=>({...x,body:zh(200)}));set(rep,'closing',200);set(rep.skeleton,'bazi',280);
}
test('denied and unconfirmed candidates cannot enter confirmed report hits',()=>{const {prof,rep}=fixtures();for(const feedback of ['不准',null,undefined]){const r=structuredClone(rep);r.hits=[{statement:'合成候选',feedback,basis:'合成依据'}];assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}for(const feedback of ['准','部分准']){const r=structuredClone(rep);r.hits=[{statement:'合成候选',feedback,basis:'合成依据'}];assert.deepEqual(check(r,prof),[]);}});
test('brand rules accept valid report and reject length, forbidden words and missing counts',()=>{const {prof,rep}=fixtures();assert.deepEqual(check(rep,prof),[]);for(const alter of [r=>r.cover.seen='字'.repeat(61),r=>r.cover.seen='准确率',r=>r.gifts.items=[]]){const r=structuredClone(rep);alter(r);assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}});
test('brand HTML omits raw birth and save while retaining offline CSP and safe JSON',()=>{const {prof,rep}=fixtures();rep.cover.evidence='</script><svg onload=alert(1)>';const html=build(prof,rep);for(const raw of ['1996-05-20','10:30','合成地点','claim_url','saveBox'])assert(!html.includes(raw));assert(html.includes("connect-src 'none'"));assert(!html.includes('</script><svg'));assert(html.includes('\\u003c/svg')||html.includes('\\u003c/script'));assert(!html.includes('d.innerHTML'));assert(html.includes('el.removeAttribute'));});
test('POSIX private JSON rejects permissive files without changing them and rejects symlinks',{skip:process.platform==='win32'},async()=>{const d=await mkdtemp(join(tmpdir(),'xj-private-'));const p=join(d,'input.json');await writeFile(p,'{}',{mode:0o644});await assert.rejects(readPrivateJSON(p),/PRIVATE_FILE_INVALID/);assert.equal((await stat(p)).mode&0o777,0o644);await symlink(p,join(d,'link.json'));await assert.rejects(readPrivateJSON(join(d,'link.json')),/PRIVATE_FILE_INVALID/);});
test('SVG esc encodes attacker text; script parses and numeric text is escaped',async()=>{const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');const fn=t.match(/function esc\(s\) \{[^\n]+\}/)[0];const escaped=vm.runInNewContext(fn+';esc',{})('<svg onload="evil">&');assert.equal(escaped,'&lt;svg onload=&quot;evil&quot;&gt;&amp;');new vm.Script(t.match(/<script>\n([\s\S]*)<\/script>/)[1]);for(const x of ['esc(c.ganZhi)','esc(c.startAge)','esc(c.endAge)','esc(c.age)','esc(t)','esc(c.title[0])'])assert(t.includes(x));});
test('brand inputs cannot embed credentials or raw error stacks',()=>{const {prof,rep}=fixtures();for(const k of ['api_key','password','stack']){const p=structuredClone(prof);p.method[k]='synthetic-secret-marker';assert.throws(()=>build(p,rep),/REPORT_INVALID/);}});
test('Node CLI brand output private, no overwrite, no save, checked inputs, fixed errors',async()=>{const {prof,rep}=fullFixtures(),d=await mkdtemp(join(tmpdir(),'xj-brand-'));const p=join(d,'profile.json'),r=join(d,'report.json'),o=join(d,'report.html');await createPrivateJSON(p,prof);await createPrivateJSON(r,rep);const script=fileURLToPath(new URL('../scripts/build_report.mjs',import.meta.url));
 const args=[script,'--profile',p,'--report',r,'--out',o];const first=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(first.status,0,first.stderr);for(const path of [p,r,o])await assertPrivateFile(path);assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,1);const save=spawnSync(process.execPath,[...args,'--save','unknown'],{encoding:'utf8'});assert.equal(save.status,1);assert.equal(save.stderr,'REPORT_CONFIG_INVALID\n');
});
test('persona feedback accepts exact server sentence and rejects wrong or unconfirmed mappings',()=>{
 const {prof,rep}=fixtures();prof.method.persona={base:{line:'合成原句，不代表真人。'},rebirth:[{scene:'合成重生一。'},{scene:'合成重生二。'}]};
 for(const [target,statement] of [['base',prof.method.persona.base.line],['rebirth0',prof.method.persona.rebirth[0].scene],['rebirth1',prof.method.persona.rebirth[1].scene]]){
   for(const feedback of ['不准','部分准']){const r=structuredClone(rep);r.persona_feedback=[{target,statement,feedback}];assert.deepEqual(check(r,prof),[]);assert(build(prof,r).includes(statement));}
 }
 for(const bad of [null,{},[{target:'base',statement:'其他句',feedback:'不准'}],[{target:'base',statement:prof.method.persona.base.line,feedback:'准'}],[{target:'base',statement:prof.method.persona.base.line,feedback:'未核对'}]]){const r=structuredClone(rep);r.persona_feedback=bad;assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}
 const r=structuredClone(rep);const entry={target:'base',statement:prof.method.persona.base.line,feedback:'不准'};r.persona_feedback=[entry,entry];assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);
});
// 10-11 Codex 实测：报告「接下来可以问」写了「出生时间有误会改变职业判断吗」，这是内部的问题，用户不会问
test('next_questions 不出内部的问题（出生时间、时柱、宫头、算法、依据）',()=>{
 const {prof,rep}=fixtures();
 for(const q of ['出生时间有误会改变职业判断吗？','时柱换了会怎样？','依据是什么？']){const r=structuredClone(rep);r.next_questions=[q,...rep.next_questions.slice(1)];const e=check(r,prof);assert(e.some(x=>x.startsWith('next_questions[1] 里不要用')&&x.includes('内部的事')),q);}
 const r=structuredClone(rep);r.next_questions=['我明年换工作合适吗？',...rep.next_questions.slice(1)];assert.deepEqual(check(r,prof),[]);
});
// 10-07 Kimi 实测两处：把 2026 写成「今年乙巳」；用户否认的 2022 年往事在正文里写成发生过
test('year gan-zhi must match the year (今年 counts as the build year); luck, month and range spans are not years',()=>{
 const {prof,rep}=fixtures(),y=new Date().getFullYear(),gz=(n)=>'甲乙丙丁戊己庚辛壬癸'[(n-4)%10]+'子丑寅卯辰巳午未申酉戌亥'[(n-4)%12],wrong=gz(y-1);
 for(const bad of [`今年${wrong}，风向偏紧`,`${y} 年${wrong}`,`${wrong}年（${y}）`]){const r=structuredClone(rep);r.cover.evidence=bad;assert.ok(check(r,prof).some(e=>e.includes('的干支照')),bad);assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}
 for(const ok of [`今年${gz(y)}`,`${y} 年（${gz(y)}）`,'丙辰（1997–2007）','2014 乙卯大运',`${y} 年庚寅月`,'2034 年乙卯十年']){const r=structuredClone(rep);r.cover.evidence=ok;assert.deepEqual(check(r,prof),[],ok);}
});
test('misses is required; denied years stay out of the report body but may be noted in progress and basis',()=>{
 const {prof,rep}=fixtures(),y=new Date().getFullYear()-4;
 const none=structuredClone(rep);delete none.misses;assert.ok(check(none,prof).some(e=>e.includes('misses')));
 const r=structuredClone(rep);r.misses=[{year:y,area:'感情'}];r.chapters.love.brief=`${y} 年感情有过一次断裂`;assert.ok(check(r,prof).some(e=>e.includes('没对上')));assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);
 r.chapters.love.brief='观察后再判断';r.progress[0].item=`${y} 年那条你说没对上`;r.basis={notes:`${y} 年不采信`};assert.deepEqual(check(r,prof),[]);
 r.years.life[0].span=`${y}–${y+10}`;assert.deepEqual(check(r,prof),[]);
 r.hits=[{statement:`${y} 年工作换了方向`,feedback:'准',basis:'合成依据'}];r.chapters.career.brief=`${y} 年换了方向`;assert.deepEqual(check(r,prof),[]);
 for(const bad of [{},[{year:String(y)}],[{year:y+4}],[{year:y,area:'感情',note:'x'}]]){const b=structuredClone(rep);b.misses=bad;assert.ok(check(b,prof).length,JSON.stringify(bad));}
});
// 10-10 封面映照要三套写全，顺序固定星盘 × 八字 × 人格
test('cover support must list 星盘, 八字 and 人格; template shows them in that fixed order',async()=>{
 const {prof,rep}=fixtures();
 for(const sup of [undefined,[],['星盘','八字'],['八字','人格']]){const r=structuredClone(rep);r.cover.support=sup;assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}
 const r=structuredClone(rep);r.cover.support=['人格','八字','星盘'];assert.deepEqual(check(r,prof),[]);
 const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');assert(t.includes("['星盘', '八字', '人格'].filter"));
});
test('cover: line 1 from the day-stem pool verbatim, line 2 gifts 14-28 and positive, line 3 the persona praise line (cover_line, else line) verbatim',()=>{const {prof,rep}=fixtures();const P=structuredClone(prof);P.method=P.method||{};P.method.bazi={...(P.method.bazi||{}),day_master:{gan:'庚',image:'矿石钢铁'}};P.method.persona={...(P.method.persona||{}),base:{...((P.method.persona||{}).base||{}),line:'合成判词：把最乱的局交给你。'}};
 const errs=(seen)=>{const r=structuredClone(rep);r.cover.seen=seen;return check(r,P).filter(e=>e.startsWith('cover.seen'));};
 const L2='敢挑头，压得住阵，做事有章法，说话有分量。';
 assert.deepEqual(errs(`宝剑锋从磨砺出。\n${L2}\n合成判词：把最乱的局交给你。`),[]);
 assert.match(errs(`一盏灯照得很远。\n${L2}\n合成判词：把最乱的局交给你。`).join(),/第一句要从 report_rules\.json 的 cover_seen_plain\.pool「庚」/);
 assert.match(errs(`宝剑锋从磨砺出。\n${L2}\n你是让人愿意跟上的人。`).join(),/第三句照抄出厂底色封神那句/);
 // 10-11：接口给了 cover_line（封神那句）就只认它，抽中的戳痛那句 line 不能上封面
 P.method.persona.base.cover_line='合成封神句：你一来，局就稳了。';
 assert.deepEqual(errs(`宝剑锋从磨砺出。\n${L2}\n合成封神句：你一来，局就稳了。`),[]);
 assert.match(errs(`宝剑锋从磨砺出。\n${L2}\n合成判词：把最乱的局交给你。`).join(),/封神那句.*合成封神句/);
 delete P.method.persona.base.cover_line;
 assert.match(errs(`宝剑锋从磨砺出。\n看人准。\n合成判词：把最乱的局交给你。`).join(),/第二句 \d+ 字，要 14～28 字/);
 assert.match(errs(`宝剑锋从磨砺出。\n你不是最响的那个，却是最能扛事的那个人。\n合成判词：把最乱的局交给你。`).join(),/第2句里有「你不是」/);
 assert.match(errs(`宝剑锋从磨砺出。\n${L2}`).join(),/要 3 句/);
 assert.match(errs(`宝剑锋从磨砺出。\n聚人、定调、开路，事到她手里就有了章法。\n合成判词：把最乱的局交给你。`).join(),/第2句里有「她」/);   // 封面对他说「你」，不写成第三人称
});
test('身强身弱校正（10-10）：报告只带结论（身X型、四格、件数），题和留痕明细不进报告',()=>{const {prof,rep}=fixtures();const p=structuredClone(prof);p.method.bazi=p.method.bazi||{};p.method.bazi.calib={ask:{traits:[{no:1,q:'平时做事的节奏更像？',options:[]}],events:{q:'过去这些年',domains:[]}},result:{status:'定案',side:'强',type:'身强型',cards:[{title:'能量核心',text:'底气足。'}],say:'提醒',used:{traits:8,events:1},detail:{tally:{强:8,弱:0},answers:[{year:2023,pick:'强'}],events:[{year:2016,event:'离婚合成'}]}}};const html=build(p,rep);for(const raw of ['平时做事的节奏更像','离婚合成','"tally"','"detail"'])assert(!html.includes(raw),raw);assert(html.includes('身强型'));});
test('星盘图和卷下点位卡：接口给的进阶点位、小行星都有字和说法，不能再被筛掉（10-11 她：莉莉丝这些之前都画的）',async()=>{const {readFile}=await import('node:fs/promises');const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');
 const charLine=t.match(/var CHAR = \{[^\n]+\}/)[0], mean=t.match(/var EXTRA_MEAN = \{[^\n]+\}/)[0];
 for(const n of ['北交点','南交点','莉莉丝','福点','宿命点','东方点','谷神','智神','婚神','灶神']){assert(charLine.includes(n+':'),n+' 星盘图上要有字');assert(mean.includes(n+':'),n+' 点位卡要有说法');}
 assert(t.includes("(W.points || []).concat(W.asteroids || []).filter(function (p) { return CHAR[p.n]; })"),'星盘图要把 points 和 asteroids 都画上');
 assert(!/W\.points[^\n]{0,80}p\.n === '北交点' \|\| p\.n === '福点'/.test(t),'不能再只挑北交点和福点');
});
test('依据里「几套体系说法不同」：宿主写成一句话或漏了 theme，也不出 undefined（10-11 Kimi 复验）',async()=>{const {readFile}=await import('node:fs/promises');const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');
 assert(t.includes("if (!d || typeof d !== 'object') return h('li', null, String(d || ''));"));assert(t.includes("d.theme ? h('b', null, d.theme + '：') : null"));
});

// —— 10-14 åå§äºº：报告不完整就不给。生成时整份画好写进 HTML（打开不靠脚本），逐项核对，核不过不出文件；有浏览器再打 PDF ——
test('整份画好：成品不带画报告的大脚本和数据，打开不靠脚本；完整样例逐项核对通过；手机、电脑两种图都留着按屏宽显示',()=>{
 const {prof,rep}=fullFixtures();assert.deepEqual(check(rep,prof),[]);
 const {html,app,data}=prerender(build(prof,rep));
 assert.deepEqual(verifyReport(app,data),[]);
 assert(!html.includes('xj-data')&&!html.includes("'use strict'")&&!html.includes('<noscript>'),'画报告的脚本和数据都不进成品');
 assert(html.includes('<main class="wrap" id="app"><section')||html.includes('<main class="wrap" id="app"><div'),'正文直接在文件里');
 assert(html.includes('class="xj-pdf" type="button" style="display:none"'),'存为 PDF 按钮默认藏着，有脚本时才露出来');
 assert(html.includes('.pr-w{display:none!important}')&&/class="[^"]*\bpr-w\b/.test(html)&&/class="[^"]*\bpr-n\b/.test(html),'按屏宽分的两种图都在');
 for(const id of ['a-west','a-bazi','a-persona','ch-career','ch-love','w-冥王'])assert(html.includes('id="'+id+'"'),id);
 assert(html.includes("connect-src 'none'"),'离线 CSP 照旧');
});
test('核对拦得住：缺图、缺章、冒出 undefined、解读的字没上页面，都报出来',()=>{
 const {prof,rep}=fullFixtures();const r=prerender(build(prof,rep));
 r.app.querySelectorAll('svg')[0].textContent='';r.app.querySelectorAll('*').find(n=>n.id==='ch-love').remove();r.app.querySelector('p').textContent='undefined';
 const errs=verifyReport(r.app,r.data).map(e=>e.split(' ')[0]);
 for(const k of ['FIGURE_EMPTY','CHAPTER_MISSING','BAD_TEXT','TEXT_MISSING'])assert(errs.includes(k),k);
 // 简化的假盘画出来本来就缺：核不过
 const {prof:p0,rep:r0}=fixtures();const s=prerender(build(p0,r0));assert.notDeepEqual(verifyReport(s.app,s.data),[]);
});
test('模板用了这里没实现的网页功能：直接报 REPORT_INCOMPLETE，不悄悄丢东西',()=>{
 const {prof,rep}=fullFixtures();const t=readFileSync(new URL('../template/single-brand.html',import.meta.url),'utf8');
 const bad=t.replace("function anchor(el, id) { el.id = id; return el; }","function anchor(el, id) { el.id = id; el.lang = 'zh'; return el; }");assert.notEqual(bad,t);
 assert.throws(()=>prerender(build(prof,rep,bad)),/REPORT_INCOMPLETE/);
 const sel=t.replace("querySelector('.cited')","querySelector('div.cited')");assert.notEqual(sel,t);
 assert.throws(()=>prerender(build(prof,rep,sel)),/REPORT_INCOMPLETE/);
});
test('PDF：只认有中文字体、页数够的 PDF；Windows 先找自带的 Edge',()=>{
 assert.equal(checkPDF(Buffer.from('not a pdf')),'FAILED');
 const pages=Array.from({length:6},()=>'<< /Type /Page >>').join('\n');
 assert.equal(checkPDF(Buffer.from('%PDF-1.4\n'+pages+'\n/BaseFont /AAAAAA+Helvetica\n'+'x'.repeat(30000))),'FONT');
 assert.equal(checkPDF(Buffer.from('%PDF-1.4\n'+pages+'\n/BaseFont /AAAAAA+STSongti-SC-Regular\n'+'x'.repeat(30000))),null);
 assert.equal(checkPDF(Buffer.from('%PDF-1.4\n<< /Type /Page >>\n/BaseFont /AAAAAA+PingFangSC-Regular\n'+'x'.repeat(30000))),'FAILED','页数不够');
 const win=browserCandidates({ProgramFiles:'C:\\Program Files','ProgramFiles(x86)':'C:\\Program Files (x86)'},'win32');
 assert(win[0].endsWith('msedge.exe'));
 assert(browserCandidates({HOME:'/Users/x'},'darwin').some(p=>p.includes('Google Chrome.app')));
 assert(browserCandidates({PATH:'/usr/bin'},'linux').includes('/usr/bin/chromium'));
});
test('命令行：核不过一个文件都不写（REPORT_INCOMPLETE）；带 --pdf 有浏览器就出 PDF（只给本人读），没有就说跳过；同名不覆盖',async()=>{
 const script=fileURLToPath(new URL('../scripts/build_report.mjs',import.meta.url));
 {const {prof,rep}=fixtures(),d=await mkdtemp(join(tmpdir(),'xj-brand-'));const p=join(d,'profile.json'),r=join(d,'report.json'),o=join(d,'report.html'),f=join(d,'report.pdf');await createPrivateJSON(p,prof);await createPrivateJSON(r,rep);
  const x=spawnSync(process.execPath,[script,'--profile',p,'--report',r,'--out',o,'--pdf',f],{encoding:'utf8'});assert.equal(x.status,1);assert.match(x.stderr,/REPORT_INCOMPLETE\n$/);assert(!existsSync(o)&&!existsSync(f),'核不过不出文件');}
 const {prof,rep}=fullFixtures(),d=await mkdtemp(join(tmpdir(),'xj-brand-'));const p=join(d,'profile.json'),r=join(d,'report.json'),o=join(d,'report.html'),f=join(d,'report.pdf');await createPrivateJSON(p,prof);await createPrivateJSON(r,rep);
 assert.equal(spawnSync(process.execPath,[script,'--profile',p,'--report',r,'--out',o,'--pdf',o],{encoding:'utf8'}).stderr,'REPORT_CONFIG_INVALID\n','PDF 不能跟 HTML 同名');
 const x=spawnSync(process.execPath,[script,'--profile',p,'--report',r,'--out',o,'--pdf',f],{encoding:'utf8',timeout:180000});assert.equal(x.status,0,x.stderr);
 await assertPrivateFile(o);
 // 有浏览器就该出 PDF；在 Codex 这类沙箱里跑测试，浏览器会被掐掉，报 PDF_SKIPPED_FAILED 也算对（10-14 在 Codex 沙箱里实测过）
 if(x.stdout==='REPORT_SAVED\nPDF_SAVED\n'){await assertPrivateFile(f);assert.equal(readFileSync(f).subarray(0,5).toString(),'%PDF-');}
 else assert.match(x.stdout,findBrowser()?/^REPORT_SAVED\nPDF_SKIPPED_FAILED\n$/:/^REPORT_SAVED\nPDF_SKIPPED_\w+\n$/);
 assert.equal(spawnSync(process.execPath,[script,'--profile',p,'--report',r,'--out',join(d,'r2.html'),'--pdf',f],{encoding:'utf8'}).stderr,'OUTPUT_EXISTS\n');
});
test('三镜映照每块交叠最多两条：同一块写第三条在规则这一步就拦，告诉宿主换哪块（10-14 台架 Claude 撞过成品核对）',()=>{
 const {prof,rep}=fullFixtures();rep.crosscheck=[1,2,3].map(()=>({theme:'做事有主见',systems:['八字','星盘'],note:zh(60)}));
 const errs=check(rep,prof);assert(errs.some(e=>e.startsWith('crosscheck 第3条：「八字×星盘」这块交叠')),errs.join('\n'));assert(!errs.some(e=>e.startsWith('crosscheck 第2条：「')));
 rep.crosscheck[2].systems=['星盘','人格'];assert.deepEqual(check(rep,prof),[]);
 const r=prerender(build(prof,rep));assert.deepEqual(verifyReport(r.app,r.data),[]);
});
test('成品核对不拦模板本来就不显示的：重点章的 brief（10-14 台架 Codex 撞过）；依据里把握写错字段在规则这一步就拦',()=>{
 const {prof,rep}=fullFixtures();for(const k of rep.focus)rep.chapters[k].brief='重点章也写了一句话简介，模板不显示';
 const r=prerender(build(prof,rep));assert.deepEqual(verifyReport(r.app,r.data),[]);
 const r2=structuredClone(rep);r2.basis={...(r2.basis||{}),confidence:[{level:'高',area:'事业',why:'合成'}],counter:[{x:1}]};
 const errs=check(r2,prof);assert(errs.some(e=>e.startsWith('basis.confidence 第1条要写成 { level, item, why }')),errs.join('\n'));assert(errs.some(e=>e.startsWith('basis.counter 第1条要写成一句话')));
});
test('单独补出 PDF（沙箱里出不了时，请用户批准在沙箱外跑）：只认画好的成品，不覆盖',async()=>{
 const {prof,rep}=fullFixtures(),d=await mkdtemp(join(tmpdir(),'xj-pdf-'));const {writePrivateText}=await import('../scripts/private_files.mjs');
 const ok=join(d,'report.html'),raw=join(d,'raw.html');await writePrivateText(ok,prerender(build(prof,rep)).html);await writePrivateText(raw,build(prof,rep));
 const script=fileURLToPath(new URL('../scripts/make_pdf.mjs',import.meta.url));
 const bad=spawnSync(process.execPath,[script,'--html',raw,'--out',join(d,'a.pdf')],{encoding:'utf8'});assert.equal(bad.stderr,'PDF_CONFIG_INVALID\n','没画好的不认');
 const x=spawnSync(process.execPath,[script,'--html',ok,'--out',join(d,'b.pdf')],{encoding:'utf8',timeout:180000});
 if(x.stdout==='PDF_SAVED\n'){await assertPrivateFile(join(d,'b.pdf'));assert.equal(spawnSync(process.execPath,[script,'--html',ok,'--out',join(d,'b.pdf')],{encoding:'utf8'}).stderr,'OUTPUT_EXISTS\n');}
 else assert.match(x.stdout,findBrowser()?/^PDF_SKIPPED_FAILED\n$/:/^PDF_SKIPPED_\w+\n$/);   // 沙箱里浏览器被掐掉也算对
});
test('小节里只写 title、body：依据写进小节在规则这一步就拦，说写到整章上（10-14 Kimi 桌面端实测撞过成品核对）',()=>{
 const {prof,rep}=fullFixtures();rep.chapters.career.sections[0]={...rep.chapters.career.sections[0],refs:['八字·日支']};
 const errs=check(rep,prof);assert(errs.some(e=>e.startsWith('chapters.career.sections 第1节多了 refs')&&e.includes('chapters.career.refs')),errs.join('\n'));
});
