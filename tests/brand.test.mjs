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
import {readPrivateJSON,assertPrivateFile} from '../scripts/private_files.mjs';
function fixtures(){
 const year=new Date().getFullYear();const section={title:'结构观察',body:'合成测试文字，不代表真人或未来承诺。'};
 const calendar=Array.from({length:3},(_,i)=>({span:String(year+i),title:'合成观察',body:'保留自主判断。',first_half:'观察',second_half:'复核',do:'记录',avoid:'冲动',basis:'合成接口依据',areas:[{area:'事业',text:'合成'},{area:'学业',text:'合成'}]}));
 const chapters=Object.fromEntries(['career','wealth','study','love','family','social','health','growth'].map(k=>[k,{brief:k==='growth'?'人生课题需要慢慢观察':'观察后再判断',sections:[section,section]}]));
 chapters.career.question='你是否想了解这个结构？';chapters.career.gold='结构不替代选择。';
 const rep={schema:'xuanji.report/0.5',cover:{seen:'合成样本，不是真人。',support:['八字']},progress:Array.from({length:3},()=>({state:'待确认',item:'合成样本待确认'})),hits:[],crosscheck:[],skeleton:{question:'你想从哪里开始？',oneline:'用结构帮助观察。',bazi:'合成说明。'},gifts:{oneline:'善用已有优势。',items:Array.from({length:3},()=>section)},focus:['career','love'],chapters,years:{theme:'合成节奏',lesson:{question:'你想观察什么？',body:'保留自己的判断。'},forces:[section],windows:Array.from({length:4},()=>({when:'合成月份',area:'事业',title:'观察窗口',body:'仅为格式测试。'})),calendar,decade:Array.from({length:7},(_,i)=>({span:String(year+3+i),title:'合成',body:'合成观察',basis:'合成依据'})),life:Array.from({length:6},()=>({span:'合成年龄',title:'节奏观察',body:'合成文字'}))},closing:'合成测试结束。',audit:{aspects:Array.from({length:3},()=>({aspect:'合成相位',body:'合成'}))},next_questions:['如何看待当前结构？','怎样观察行动？','如何记录经验？','如何理解变化？'],basis:{}};
 const prof={schema:'xuanji.handoff/0.1',birth:{date:'1996-05-20',time:'10:30',city:'合成地点',sex:'female'},bazi:{status:'ok',input:{trueSolarTime:'1996-05-20T10:30:00',longitude:120},version:{config:'implementation-label'}},method:{}};
 return {prof,rep};
}
test('denied and unconfirmed candidates cannot enter confirmed report hits',()=>{const {prof,rep}=fixtures();for(const feedback of ['不准',null,undefined]){const r=structuredClone(rep);r.hits=[{statement:'合成候选',feedback,basis:'合成依据'}];assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}for(const feedback of ['准','部分准']){const r=structuredClone(rep);r.hits=[{statement:'合成候选',feedback,basis:'合成依据'}];assert.deepEqual(check(r,prof),[]);}});
test('brand rules accept valid report and reject length, forbidden words and missing counts',()=>{const {prof,rep}=fixtures();assert.deepEqual(check(rep,prof),[]);for(const alter of [r=>r.cover.seen='字'.repeat(61),r=>r.cover.seen='准确率',r=>r.gifts.items=[]]){const r=structuredClone(rep);alter(r);assert.throws(()=>build(prof,r),/REPORT_RULES_FAILED/);}});
test('brand HTML omits raw birth and save while retaining offline CSP and safe JSON',()=>{const {prof,rep}=fixtures();rep.cover.evidence='</script><svg onload=alert(1)>';const html=build(prof,rep);for(const raw of ['1996-05-20','10:30','合成地点','claim_url','saveBox'])assert(!html.includes(raw));assert(html.includes("connect-src 'none'"));assert(!html.includes('</script><svg'));assert(html.includes('\\u003c/svg')||html.includes('\\u003c/script'));assert(!html.includes('d.innerHTML'));assert(html.includes('el.removeAttribute'));});
test('POSIX private JSON rejects permissive files without changing them and rejects symlinks',{skip:process.platform==='win32'},async()=>{const d=await mkdtemp(join(tmpdir(),'xj-private-'));const p=join(d,'input.json');await writeFile(p,'{}',{mode:0o644});await assert.rejects(readPrivateJSON(p),/PRIVATE_FILE_INVALID/);assert.equal((await stat(p)).mode&0o777,0o644);await symlink(p,join(d,'link.json'));await assert.rejects(readPrivateJSON(join(d,'link.json')),/PRIVATE_FILE_INVALID/);});
test('SVG esc encodes attacker text; script parses and numeric text is escaped',async()=>{const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');const fn=t.match(/function esc\(s\) \{[^\n]+\}/)[0];const escaped=vm.runInNewContext(fn+';esc',{})('<svg onload="evil">&');assert.equal(escaped,'&lt;svg onload=&quot;evil&quot;&gt;&amp;');new vm.Script(t.match(/<script>\n([\s\S]*)<\/script>/)[1]);for(const x of ['esc(c.ganZhi)','esc(c.startAge)','esc(c.endAge)','esc(c.age)','esc(t)','esc(c.title[0])'])assert(t.includes(x));});
test('brand inputs cannot embed credentials or raw error stacks',()=>{const {prof,rep}=fixtures();for(const k of ['api_key','password','stack']){const p=structuredClone(prof);p.method[k]='synthetic-secret-marker';assert.throws(()=>build(p,rep),/REPORT_INVALID/);}});
test('Node CLI brand output private, no overwrite, no save, checked inputs, fixed errors',async()=>{const {prof,rep}=fixtures(),d=await mkdtemp(join(tmpdir(),'xj-brand-'));const p=join(d,'profile.json'),r=join(d,'report.json'),o=join(d,'report.html');await createPrivateJSON(p,prof);await createPrivateJSON(r,rep);const script=fileURLToPath(new URL('../scripts/build_report.mjs',import.meta.url));
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
