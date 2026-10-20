// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 一事一卜、年度、分术三份报告：在本地把整页画成静态 HTML（打开不靠脚本），样子照 10-18 定版的三个页面。
// 只排版、不下判断：判断都在 report.json 里，盘面事实来自 yishi_cast.json／year.json／profile.json／xuanji 回包。
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=dirname(fileURLToPath(import.meta.url));
export const CSS=()=>readFileSync(join(HERE,'..','template','doc.css'),'utf8');

export const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 正文里允许 **加粗**，别的标记一律当字
export const tx=(s)=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
const arr=(v)=>Array.isArray(v)?v:[];
const CHAT='<svg width="18" height="18" viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="10.5" r="1" fill="currentColor"/><circle cx="12" cy="10.5" r="1" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1" fill="currentColor"/></svg>';
const CHAT_O=CHAT.replace(/currentColor/g,'#c9783a');
export const SEAL={六爻:['a','爻'],梅花:['b','梅'],玄玑:['c','玄']};
export const SY={八字:['b','八'],星盘:['x','星'],印占:['y','印'],出厂底色:['d','底'],底色:['d','底']};
const seal3=(name)=>{const s=SEAL[name];return s?`<span class="seal3 ${s[0]}">${s[1]}</span>`:'';};
const sy=(name,extra='')=>{const s=SY[name];return s?`<span class="sy ${s[0]}${extra}">${s[1]}</span>`:'';};
const src=(name)=>{const s=SEAL[name];return s?`<span class="src ${s[0]}"><i>${s[1]}</i>${esc(name)}给的</span>`:'';};
const part=(id,k,t1,t2)=>`<div class="part" id="${id}"><div class="k">PART · ${k}</div><div class="t">${esc(t1)}<span>${esc(t2)}</span></div><div class="dia"><i></i><b></b><i></i></div></div>`;
const toc=(items)=>`<div class="toc"><div class="hd">这份报告分四卷<em>点一下就跳过去</em></div><div class="grid">${items.map(([id,no,b,s])=>`<a href="#${id}"><span class="no">${no}</span><div><b>${esc(b)}</b><span>${esc(s)}</span></div><i>↓</i></a>`).join('')}</div></div>`;
const remember=(s)=>s?`<div class="remember"><small>★ 一句话记住</small>${tx(s).replace(/\n/g,'<br>')}</div>`:'';
const doorCard=(title,items)=>`<div class="door"><div class="dtop">${CHAT}${esc(title)}</div>${items.map((d,i)=>`<div class="item${items.length>1?' num':''}">${items.length>1?`<span class="n">${i+1}</span>`:''}<div>${d.when?`<span class="when">${esc(d.when)}</span><div style="clear:both"></div>`:''}<div class="msg">${esc(d.msg)}</div>${items.length>1?'<div class="copy">点住这句就能复制</div>':''}<div class="to">会接到 <i>→</i> <b>${esc(d.to)}</b>${d.what?`<span class="what">${esc(d.what)}</span>`:''}</div></div></div>`).join('')}</div>`;
const asks=(qs)=>`<div class="asks"><div class="dtop">${CHAT_O}接下来可以问我</div>${arr(qs).map(q=>`<div class="msg">${esc(q)}</div>`).join('')}<div class="hint">挑一句，回到对话里发给玄玑</div></div>`;
const founder=(qr,bullets,note)=>qr?`<div class="founder"><img src="${qr}" alt="创始人微信"><div><div class="t">想看得更细</div><ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul><span class="wx">微信 liin1223<em>· 备注「${esc(note)}」</em></span></div></div>`:'';
const FOOT='<div class="foot">解读仅供参考，不承诺特定结果，不替代法律、投资、医疗等专业意见。</div>';
export function page(title,brand,body){
  // 页脚跟最后一块（创始人卡，没有就是「接下来可以问我」）包在一起，打印时不让页脚一个人落到新的一页
  const cut=Math.max(body.lastIndexOf('<div class="founder">'),body.lastIndexOf('<div class="asks">'));
  if(cut>=0){body=`${body.slice(0,cut)}<div class="endkeep">${body.slice(cut)}\n${FOOT}</div>`;}
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${esc(title)}</title>\n<style>\n${CSS()}\n</style></head><body><div class="wrap">\n<div class="top"><div class="brand"><i></i>${esc(brand)}<i></i></div><button class="pdf" onclick="window.print()">存为 PDF</button></div>\n${body}\n${body.includes('class="endkeep"')?'':FOOT}\n</div></body></html>\n`;
}
const steps2=(steps)=>`<ol class="steps2">${arr(steps).map((s,i)=>`<li class="${s.key?'key':''}"><div class="no">${i+1}</div><div>${s.key?'<span class="keytag">关键一步</span>':''}<div class="h">${esc(s.title)}${s.tag?`<span class="ef ${{帮你:'plus',要防:'warn',时间:'time',定位:'dir',方向:'dir'}[s.tag]||'dir'}">${esc(s.tag)}</span>`:''}</div>${s.what?`<div class="w">${tx(s.what)}</div>`:''}${s.why?`<div class="why">${tx(s.why)}</div>`:''}</div></li>`).join('')}</ol>`;

// ── 六爻、梅花的小图（照引擎回的爻） ──
function yaoDiagram(L,marks){
  const use=L.yongshen&&L.yongshen.primary&&L.yongshen.primary.position;
  const rows=[...L.yaos].sort((a,b)=>b.position-a.position).map(y=>{
    const b=[];if(y.isChanging)b.push('<span class="badge">动</span>');if(y.position===use)b.push(`<span class="badge">${esc(marks.use||'用神')}</span>`);if(y.isWorld)b.push(`<span class="badge lav">${esc(marks.world||'你')}</span>`);if(y.isResponse)b.push(`<span class="badge lav">${esc(marks.response||'对方')}</span>`);
    return `<div class="yrow"><div class="ylab${y.position===use?' use':''}">${esc(y.liuQin)} ${esc(y.najiaZhi)}</div><div class="yl ${y.line===1?'y':'n'}${y.position===use?' use':''}"></div><div class="ymark">${b.join('')}</div></div>`;}).join('');
  return `<div><div class="yao">${rows}</div><div class="gname">${esc(L.original.name)}<small>本 卦</small></div></div>`;
}
const mini=(lines,name,cap,moving)=>`<div><div class="mini">${[...lines].map((l,i)=>({l,p:i+1})).reverse().map(({l,p})=>`<div class="yrow"><div class="yl ${l===1?'y':'n'}${moving&&moving.includes(p)?' mv':''}"></div></div>`).join('')}</div><div class="gname">${esc(name)}<small>${esc(cap)}</small></div></div>`;

// ── 三圈交叠图 ──
function venn(z,center,names=['六 爻','梅 花','玄 玑']){
  const T=(x,y,lines)=>arr(lines).slice(0,2).map((s,i)=>`<text x="${x}" y="${y+i*15}" font-size="11.5" fill="#6b5546" text-anchor="middle">${esc(s)}</text>`).join('');
  return `<svg class="venn" viewBox="0 0 330 300" font-family="PingFang SC, sans-serif"><defs><radialGradient id="g1" cx="35%" cy="35%"><stop offset="0" stop-color="#fbe5df" stop-opacity=".95"/><stop offset="1" stop-color="#fbe5df" stop-opacity=".3"/></radialGradient><radialGradient id="g2" cx="65%" cy="35%"><stop offset="0" stop-color="#e4f2ea" stop-opacity=".9"/><stop offset="1" stop-color="#e4f2ea" stop-opacity=".25"/></radialGradient><radialGradient id="g3" cx="50%" cy="65%"><stop offset="0" stop-color="#eceafb" stop-opacity=".95"/><stop offset="1" stop-color="#eceafb" stop-opacity=".3"/></radialGradient></defs>
<circle cx="118" cy="112" r="82" fill="url(#g1)" stroke="#c8503a" stroke-width="1.3"/><circle cx="212" cy="112" r="82" fill="url(#g2)" stroke="#3f9479" stroke-width="1.3"/><circle cx="165" cy="192" r="82" fill="url(#g3)" stroke="#6a6fc4" stroke-width="1.3"/>
<text x="70" y="22" font-family="Songti SC, serif" font-size="15" fill="#c8503a" font-weight="700">${names[0]}</text><text x="226" y="22" font-family="Songti SC, serif" font-size="15" fill="#3f9479" font-weight="700">${names[1]}</text><text x="146" y="292" font-family="Songti SC, serif" font-size="15" fill="#6a6fc4" font-weight="700">${names[2]}</text>
${T(78,96,z.liuyao)}${T(252,96,z.meihua)}${T(165,236,z.xuanji)}${T(165,80,z.liuyao_meihua)}${T(116,172,z.liuyao_xuanji)}${T(214,172,z.meihua_xuanji)}
<rect x="137" y="124" width="56" height="26" rx="13" fill="#c9783a"/><text x="165" y="142" font-family="Songti SC, serif" font-size="14" fill="#fff" text-anchor="middle" font-weight="700">${esc(center)}</text></svg>`;
}

// ── 路线图：一条主路（步骤和判断），判断那里可以分出一条岔路，最后一个落点；岔路可以有自己的落点 ──
function routeMap(r){
  const W=340,cx=120,boxW=180,rows=[];let y=10;const out=[];
  const arrow=(y1,y2,label)=>`<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}" stroke="#c9783a" stroke-width="1.6" marker-end="url(#ao)"/>${label?`<text x="${cx+8}" y="${y2-5}" font-size="11" fill="#c9783a">${esc(label)}</text>`:''}`;
  out.push(`<rect x="40" y="${y}" width="160" height="36" rx="18" fill="#fde6cf" stroke="#e0a36f"/><text x="${cx}" y="${y+23}" font-size="13" fill="#3b2e26" text-anchor="middle" font-weight="600">${esc(r.start)}</text>`);
  y+=36;
  for(const s of arr(r.main)){
    out.push(arrow(y,y+22,s.yes&&rows.length?null:null));y+=24;
    if(s.type==='check'){
      out.push(`<polygon points="${cx},${y} ${cx+70},${y+30} ${cx},${y+60} ${cx-70},${y+30}" fill="#fdf0e2" stroke="#e0a36f"/><text x="${cx}" y="${y+35}" font-size="12.5" fill="#3b2e26" text-anchor="middle">${esc(s.text)}</text>`);
      if(s.branch){
        const by=y+30;out.push(`<line x1="${cx+70}" y1="${by}" x2="218" y2="${by}" stroke="#b3a294" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#al)"/><text x="${cx+62}" y="${by-10}" font-size="11" fill="#9b8676">${esc(s.branch.label)}</text>`);
        let yy=by-24;
        for(const [i,st] of arr(s.branch.steps).entries()){const ls=String(st).split('/');out.push(`<rect x="220" y="${yy}" width="112" height="48" rx="12" fill="#f7f2ec" stroke="#d8cbbd"/>${ls.slice(0,2).map((l,j)=>`<text x="276" y="${yy+(ls.length>1?20+j*17:28)}" font-size="11.5" fill="#3b2e26" text-anchor="middle">${esc(l.trim())}</text>`).join('')}`);if(i<arr(s.branch.steps).length-1){out.push(`<line x1="276" y1="${yy+48}" x2="276" y2="${yy+68}" stroke="#b3a294" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#al)"/>`);}yy+=70;}
        s.branch._bottom=yy-22;rows.push(s.branch);
      }
      y+=60;out.push(`<text x="${cx+8}" y="${y+15}" font-size="11" fill="#c9783a">${esc(s.yes||'')}</text>`);
    }else{
      const ls=[s.text,s.sub].filter(Boolean);out.push(`<rect x="30" y="${y}" width="${boxW}" height="${ls.length>1?52:40}" rx="12" fill="#fffdfa" stroke="rgba(212,160,100,.7)"/><text x="${cx}" y="${y+(ls.length>1?22:25)}" font-size="13" fill="#3b2e26" text-anchor="middle" font-weight="600">${esc(s.text)}</text>${s.sub?`<text x="${cx}" y="${y+41}" font-size="10.5" fill="#8b7565" text-anchor="middle">${esc(s.sub)}</text>`:''}`);
      y+=ls.length>1?52:40;
    }
  }
  out.push(arrow(y,y+22));y+=24;
  out.push(`<rect x="30" y="${y}" width="${boxW}" height="50" rx="25" fill="#c9783a"/><text x="${cx}" y="${y+21}" font-family="Songti SC, serif" font-size="14" fill="#fff" text-anchor="middle" font-weight="700">${esc(r.end.text)}</text>${r.end.sub?`<text x="${cx}" y="${y+39}" font-size="11.5" fill="#fff3e6" text-anchor="middle">${esc(r.end.sub)}</text>`:''}`);
  if(r.alt_end){out.push(`<rect x="220" y="${y}" width="112" height="50" rx="25" fill="#e0f1ea" stroke="#3f9479"/><text x="276" y="${y+21}" font-family="Songti SC, serif" font-size="13.5" fill="#3f9479" text-anchor="middle" font-weight="700">${esc(r.alt_end.text)}</text>${r.alt_end.sub?`<text x="276" y="${y+39}" font-size="11.5" fill="#3f9479" text-anchor="middle">${esc(r.alt_end.sub)}</text>`:''}`);
    const last=rows[rows.length-1];if(last)out.push(`<line x1="276" y1="${last._bottom}" x2="276" y2="${y-2}" stroke="#b3a294" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#al)"/>`);}
  y+=50;
  const leg=[r.end.source,r.alt_end&&r.alt_end.source].filter(Boolean);
  if(leg.length){y+=18;out.push(leg.map((n,i)=>{const s=SEAL[n]||['c','玄'];const x=i?242:86,col={a:'#c8503a',b:'#3f9479',c:'#6a6fc4'}[s[0]];return `<circle cx="${x}" cy="${y}" r="7" fill="${col}"/><text x="${x}" y="${y+3.5}" font-family="Songti SC, serif" font-size="8.5" fill="#fff" text-anchor="middle">${s[1]}</text><text x="${x+11}" y="${y+4}" font-size="10.5" fill="${col}">${esc(n)}给的日子</text>`;}).join(''));}
  return `<svg class="route" viewBox="0 0 ${W} ${y+14}" font-family="PingFang SC, sans-serif"><defs><marker id="ao" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c9783a"/></marker><marker id="al" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b3a294"/></marker></defs>${out.join('')}</svg>`;
}

// ── 三级台阶（回到你的问题） ──
function stairs(st,flag,you='你在这里'){
  const s=arr(st).slice(0,3);while(s.length<3)s.push({when:'',title:''});
  const box=(i,x,y,h)=>{const d=s[i],ls=String(d.title).split('/').map(v=>v.trim()).filter(Boolean);const key=d.key;return `<rect x="${x}" y="${y}" width="104" height="${h}" rx="10" fill="${key?'#fde6cf':'#fdf0e2'}" stroke="${key?'#c9783a':'#e0a36f'}"${key?' stroke-width="1.6"':''}/><text x="${x+52}" y="${y+21}" font-size="10.5" fill="${key?'#a5531c':'#8b7565'}" text-anchor="middle">${esc(d.when)}</text>${ls.slice(0,2).map((l,j)=>`<text x="${x+52}" y="${y+40+j*17}" font-size="12.5" fill="#3b2e26" text-anchor="middle" font-weight="700">${esc(l)}</text>`).join('')}${d.alt?String(d.alt).split('/').slice(0,2).map((l,j)=>`<text x="${x+52}" y="${y+79+j*15}" font-size="10.5" fill="#3f9479" text-anchor="middle">${esc(l.trim())}</text>`).join(''):''}${key?`<rect x="${x+19}" y="${y+h-44}" width="66" height="20" rx="10" fill="#D97757"/><text x="${x+52}" y="${y+h-30}" font-size="11" fill="#fff" text-anchor="middle">★ 最关键</text>`:''}`;};
  return `<svg class="stairs" viewBox="0 0 340 250" font-family="PingFang SC, sans-serif">${box(0,10,176,58)}${box(1,118,120,114)}${box(2,226,64,170)}<line x1="300" y1="12" x2="300" y2="62" stroke="#c9783a" stroke-width="2"/><path d="M300,12 L330,20 L300,28 z" fill="#c9783a"/><text x="252" y="26" font-family="Songti SC, serif" font-size="13" fill="#c9783a" font-weight="700" text-anchor="middle">${esc(flag)}</text><circle cx="36" cy="150" r="13" fill="#D97757"/><text x="36" y="154.5" font-size="11" fill="#fff" text-anchor="middle">你</text><path d="M36,163 L36,174" stroke="#D97757" stroke-width="2"/><text x="54" y="154" font-size="11.5" fill="#C6613F" font-weight="600">${esc(you)}</text></svg>`;
}

// ════════ 一事一卜 ════════
export function renderYishi({cast,view,report:R,qr}){
  const L=cast.liuyao,M=cast.meihua,G=L.ganzhi;
  const three=R.three||{};
  const xjVerdict=view?(view.verdict+(view.effort?' · '+view.effort.replace('要费点力','要费力'):'')):'这次没看';
  const cover=`<div class="card cover"><div class="stamp"><b>${esc(R.verdict)}</b><small>${esc(R.verdict_note||'')}</small></div>
<div class="cv-top"><div class="lab" style="margin:0">玄玑看见的这件事</div></div>
<div class="big" style="margin-top:12px">${arr(R.headline).map(esc).join('<br>')}</div>
<div class="cv-q"><div class="l">你问的 · ${esc(cast.asked.local.replace(/-/g,'.'))}${R.place?' · '+esc(R.place):''}</div><div class="q">${esc(cast.question)}</div></div>
<div class="cv-three"><div class="l">三家同看</div><div class="row">
<div class="it a"><span class="seal3 a">爻</span><b>六爻</b>${esc(L.original.name)} → ${esc(L.changed?L.changed.name:'静卦')}<em>${esc(three.liuyao&&three.liuyao.verdict||'')}</em></div>
<div class="it b"><span class="seal3 b">梅</span><b>梅花</b>${esc(M.original.name)}<em>${esc(three.meihua&&three.meihua.verdict||'')}</em></div>
<div class="it c"><span class="seal3 c">玄</span><b>玄玑</b>${esc(three.xuanji&&three.xuanji.note||'')}<em>${esc(xjVerdict)}</em></div></div></div>
${toc([['p1','壹','一眼看懂','答案和日子'],['p2','贰','三家交叉','三家各怎么说'],['p3','叁','路怎么走','先做哪一步'],['p4','肆','分开细看','结论凭什么']])}</div>`;
  const g=R.glance||{};
  const p1=`${part('p1','壹','一眼','看懂')}<div class="card"><div class="glance"><div class="seal"><b>${esc(R.verdict)}</b><small>${esc(R.verdict_note||'')}</small></div><div class="keyday"><div class="l">最要紧的日子${src(g.key_date&&g.key_date.source)}</div><div class="d">${arr(String(g.key_date&&g.key_date.label||'').split('/')).map(s=>esc(s.trim())).join('<br>')}</div>${g.next_date?`<div class="s" style="color:var(--sub)">${esc(g.next_date.label)}${src(g.next_date.source)}</div>`:''}</div></div>
<div class="pts">${arr(g.points).map((p,i)=>`<div><i>${'一二三'[i]}</i><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div>`).join('')}</div></div>
<div class="card"><div class="lab">接下来的几步</div><div class="axis">${arr(R.axis).map(a=>`<div class="ax ${a.kind&&a.kind!=='normal'?a.kind:''}"><div class="w">${esc(a.when)}${src(a.source)}</div><div class="e">${esc(a.event)}</div>${a.note?`<div class="n">${esc(a.note)}</div>`:''}</div>`).join('')}</div></div>`;
  const C=R.cross||{},rows=C.rows||{};
  const tags=(v,cl)=>arr(Array.isArray(v)?v:[v]).map(s=>`<span class="tg${cl?' '+cl:''}">${esc(s)}</span>`).join('');
  const p2=`${part('p2','贰','三家','交叉')}<div class="card"><div class="lab">三家映照</div>${venn(C.zones||{},C.center||R.verdict)}<div class="cap">每个圈里是那一家自己看到的；交叠处是两家都这么说；正中间三家都说${esc(C.center||'')}。</div>
<div class="cmp"><div></div><div class="hd a"><span class="seal3 a">爻</span>六爻</div><div class="hd b"><span class="seal3 b">梅</span>梅花</div><div class="hd c"><span class="seal3 c">玄</span>玄玑</div>
<div class="rl">结论</div><div class="cl a"><span class="tg strong a">${esc(three.liuyao&&three.liuyao.verdict||'')}</span></div><div class="cl b"><span class="tg strong b">${esc(three.meihua&&three.meihua.verdict||'')}</span></div><div class="cl c"><span class="tg strong c">${esc(xjVerdict)}</span></div>
<div class="rl">日子</div>${['liuyao','meihua','xuanji'].map((k,i)=>`<div class="cl ${'abc'[i]}">${tags(rows.日子&&rows.日子[k]||'',(rows.日子&&rows.日子[k]||'').includes('没')?'mute':'abc'[i])}</div>`).join('')}
<div class="rl">重点</div>${['liuyao','meihua','xuanji'].map((k,i)=>`<div class="cl ${'abc'[i]}">${tags(rows.重点&&rows.重点[k]||[])}</div>`).join('')}</div>
${C.para?`<p class="para" style="margin-top:12px">${tx(C.para)}</p>`:''}</div>`;
  const S=R.situation||{};
  const p3=`${part('p3','叁','路','怎么走')}<div class="card"><div class="lab">局势图</div><div class="map"><div class="side them"><div class="who">对方</div><div class="tag">缺什么</div><div class="v">${esc(S.them_lack)}</div></div><div class="mid">⇄</div><div class="side you"><div class="who">你</div><div class="tag">握着什么</div><div class="v">${esc(S.you_hold)}</div></div></div><div class="guard"><b>中间要防</b>${esc(S.guard)}</div></div>
<div class="card"><div class="lab">路线图 · 盘一盘</div>${routeMap(R.route)}<div class="cap">顺着箭头走一遍，看看你现在在哪一格。实线是主路，虚线是岔路。</div></div>
<div class="card"><div class="lab">军师谏言</div>${arr(R.advisors).map(a=>`<div class="jun"><div class="av">${esc([...String(a.name).replace(/^.*·/,'')][0]||'')}</div><div>${a.case?`<span class="case">${esc(a.case)}</span>`:''}<div class="who"><b>${esc(a.name)}</b> · ${esc(a.title)}</div><p class="para" style="font-size:14px;margin-top:2px">${tx(a.advice)}</p></div></div>`).join('')}</div>`;
  const D=R.detail||{},DL=D.liuyao||{},DM=D.meihua||{},DX=D.xuanji||{};
  const pw=(p)=>`<div class="pw${p.level===1?' lv':p.level===2?' gn':''}"><span>${esc(p.label)}</span><div class="bar">${[1,2,3].map(i=>`<i${i<=p.level?' class="on"':''}></i>`).join('')}</div><b>${['','弱','中','强'][p.level]||''}</b></div>`;
  const c=M.calculation,tri=(n)=>({1:'乾 · 金',2:'兑 · 金',3:'离 · 火',4:'震 · 木',5:'巽 · 木',6:'坎 · 水',7:'艮 · 土',8:'坤 · 土'}[n]||'');
  const mv=(L.yaos||[]).filter(y=>y.isChanging).map(y=>y.position);
  const p4=`${part('p4','肆','分开','细看')}<p class="para small" style="margin:4px 2px 0">三家各自怎么看、凭什么。想知道前面的结论是怎么来的，看这一卷。</p>
<div class="nav3"><a href="#m1"><span class="seal3 a">爻</span>六爻</a><em>→</em><a href="#m2"><span class="seal3 b">梅</span>梅花</a><em>→</em><a href="#m3"><span class="seal3 c">玄</span>玄玑</a></div>
<div class="legend"><span><span class="ef plus" style="margin:0">帮你</span>推着事成</span><span><span class="ef warn" style="margin:0">要防</span>要留神</span><span><span class="ef time" style="margin:0">时间</span>日子从这来</span><span><span class="keytag" style="font-size:10px;line-height:17px">关键一步</span>决定结论</span></div>
<div class="card mcard" id="m1"><div class="mhead"><span class="seal3 a">爻</span><span class="nm">六爻</span><span class="vd">${esc(three.liuyao&&three.liuyao.verdict||'')}</span></div><div class="msum">${tx(DL.summary)}</div>
<div class="sub2">起卦</div><div class="info"><span>按提问时刻起卦</span><span>${esc([G.year+'年',G.month+'月',G.day+'日',G.hour+'时'].join(' '))}</span><span>旬空：${esc(arr(L.voidBranches).join('、'))}</span></div>
<div class="gua">${yaoDiagram(L,DL.marks||{})}${L.changed?`<div class="arrow">→</div>${mini(L.changed.lines,L.changed.name,'变 卦',mv)}`:''}</div>
${arr(DL.power).length?`<div class="power">${arr(DL.power).map(pw).join('')}</div>`:''}<div class="sub2">一步一步看</div>${steps2(DL.steps)}</div>
<div class="card mcard b" id="m2"><div class="mhead"><span class="seal3 b">梅</span><span class="nm">梅花</span><span class="vd">${esc(three.meihua&&three.meihua.verdict||'')}</span></div><div class="msum">${tx(DM.summary)}</div>
${cast.waiying&&cast.waiying.status==='given'?`<div class="sub2">先看外应 · 起卦那一刻</div><div class="wai"><div class="quote" style="background:#fff;margin:0 0 8px">${esc(cast.waiying.text)}</div><div class="read">${arr(DM.waiying).map(w=>`<em>${esc(w.tag)}</em><span>${tx(w.text)}</span>`).join('')}</div></div>`:''}
<div class="sub2">起卦</div><div class="info"><span>${cast.meihua_by==='numbers'?'报的数：'+esc(M.input.numbers.join('、')):'按时间起卦'}</span><span>${esc(cast.asked.local)}</span></div>
<div class="calc"><div>上卦<b>${c.upperNum} → ${esc(tri(c.upperNum))}</b></div><div>下卦<b>${c.lowerNum} → ${esc(tri(c.lowerNum))}</b></div><div>动爻<b>${esc(String(c.movingFormula||c.moving).replace(/^.*，/,''))}</b></div></div>
<div class="gua">${mini(M.original.lines,M.original.name,'现 在',[M.movingYao])}<div class="arrow">→</div>${mini(M.mutual.lines,M.mutual.name,'过 程')}<div class="arrow">→</div>${mini(M.changed.lines,M.changed.name,'结 果')}</div>
<div class="tiyong"><span class="gb">这件事 · ${esc(M.tiYong.yong.wuxing)}</span>${esc(M.tiYong.relation.includes('生体')?'生 →':M.tiYong.relation.includes('克体')?'克 →':M.tiYong.relation)}<span>你 · ${esc(M.tiYong.ti.wuxing)}（${esc(M.tiYong.ti.seasonState)}）</span></div>
<div class="sub2">一步一步看</div>${steps2(DM.steps)}</div>
<div class="card mcard c" id="m3" style="background:var(--card)"><div class="mhead"><span class="seal3 c">玄</span><span class="nm">玄玑</span><span class="vd">${esc(xjVerdict)}</span></div><div class="msum">${tx(DX.summary||(view?'':'这次没请玄玑看。'))}</div>${arr(DX.steps).length?`<div class="sub2">一步一步看</div>${steps2(DX.steps)}`:''}
${doorCard('回到对话里，发这一句',arr(R.doors))}</div>`;
  const lp=R.loop||{};
  const loop=`<div class="card loop"><div class="lab">回到你的问题 · 你现在要做的</div>${stairs(lp.stairs,lp.flag)}${remember(lp.remember)}${lp.back_msg?doorCard('到时候，回来发这一句',[{msg:lp.back_msg,to:'回来对一对'}]):''}</div>`;
  return page('玄玑 · 一事一卜','玄玑 · 一事一卜',[cover,p1,p2,p3,p4,loop,asks(R.next_questions),founder(qr,['创始人亲自看你这件事','哪几天见分晓，细到日子','这个局里怎么谈，当面帮你盘'],'一事一卜')].join('\n'));
}

// 交节那一天算新的一个月：d 落在 [这个月起点, 下个月起点) 里
export const monthIdx=(months,d)=>{if(!d)return -1;for(let i=0;i<months.length;i++){if(d>=months[i].from&&(i===months.length-1?d<=months[i].to:d<months[i+1].from))return i;}return -1;};

// ════════ 年度 ════════
const LANE={l1:'#D97757',l2:'#2a9d8f',l3:'#4a63c4',l4:'#b0679e'},LANE_TX={l1:'#C6613F',l2:'#1f7b70',l3:'#4a63c4',l4:'#94508a'},LANE_TINT={l1:'#fdeee6',l2:'#dff2ef',l3:'#e6e9f8',l4:'#f5e6f1'};
const cn=(n)=>'一二三四五六'[n]||String(n+1);
function shareCover(seen,evidence,stamp,label,small){
  return `<div class="card cover seen"><div class="cvrow"><div class="lab" style="margin:0">${esc(label)}</div>${stamp?`<div class="stamp two"><b>${esc(stamp)}</b><small>${esc(small||'')}</small></div>`:''}</div>
<div class="seenp">${esc(String(seen).replace(/\n/g,''))}</div>${evidence?`<div class="seenev">${esc(evidence)}</div>`:''}<div class="seenft"><span class="mirror">星盘 × 八字 × 人格 映照</span><b class="sig">Xuanji 玄玑</b></div></div>`;
}
const fourRows=(four)=>`<div class="cv-three"><div class="l">四套同看</div><div class="row">${['八字','星盘','印占','出厂底色'].filter(k=>four&&four[k]).map(k=>`<div class="it ${SY[k][0]}">${sy(k)}<b>${k}</b>${esc(four[k].text)}<em>${esc(four[k].em||'')}</em></div>`).join('')}</div></div>`;
const evRows=(rows)=>arr(rows).map(e=>`<div class="ev">${sy(e.sys)}<div>${tx(e.text)}</div></div>`).join('');

// 全年气候曲线：流月喜忌打底，玄玑怎么看挑的要紧月抬高、收着月压低
function climateSvg(months,view,marks,seasons){
  const idx=(m)=>monthIdx(months,m);
  const key=view&&view.key?[idx(view.key.from)]:[],also=view?arr(view.also).map(a=>idx(a.from)):[],care=view?arr(view.careful).map(a=>idx(a.from)):[];
  const v=months.map((m,i)=>Math.max(1,Math.min(9.5,5+m.tone*1.1+(key.includes(i)?4:0)+(also.includes(i)?2.5:0)-(care.includes(i)?2.6:0))));
  const xs=months.map((_,i)=>30+i*290/11),ys=v.map(x=>160-x*12),P=xs.map((x,i)=>[x,ys[i]]);
  let d=`M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||P[i+1];d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;}
  const S=arr(seasons).slice(0,3),edges=[17];let acc=0;for(const s of S){acc+=s.months;edges.push(acc>=12?333:17+(acc*290/11)-(290/22)+ (acc*0));}
  const segX=(a,b)=>[30+a*290/11-13,30+(b-1)*290/11+13];
  let start=0;const bands=S.map((s,i)=>{const [x0,x1]=segX(start,start+s.months);start+=s.months;const col=['#fdeee0','#f1efea','#f2eefb'][i]||'#f6f1ea',tc=['#C6613F','#5b6b80','#6a6fc4'][i]||'#8b7565';return `<rect x="${Math.max(17,x0).toFixed(1)}" y="16" width="${(Math.min(333,x1)-Math.max(17,x0)).toFixed(1)}" height="146" rx="10" fill="${col}"/><text x="${((Math.max(17,x0)+Math.min(333,x1))/2).toFixed(1)}" y="32" font-family="Songti SC, serif" font-size="12.5" font-weight="700" fill="${tc}" text-anchor="middle">${esc(s.title)}</text>`;}).join('');
  const markOf=(i)=>arr(marks).find(m=>m.index===i);
  const dots=months.map((m,i)=>{const hot=key.includes(i)||also.includes(i),cal=care.includes(i),mk=markOf(i);if(!hot&&!cal&&!mk)return '';const col=cal?'#5b6b80':'#D97757',x=xs[i],y=ys[i];const big=key.includes(i);
    const lab=mk?mk.label:big?'最要紧':cal?'留神':'要紧';const below=cal;const tx_=big?`<text x="${(x-9).toFixed(1)}" y="${(y+4).toFixed(1)}" font-size="11" font-weight="700" fill="#C6613F" text-anchor="end" paint-order="stroke" stroke="#fdeee0" stroke-width="3">${esc(lab)}</text>`:`<text x="${Math.min(330,x).toFixed(1)}" y="${(below?y+19:y-10).toFixed(1)}" font-size="10.5" fill="${cal?'#5b6b80':'#C6613F'}" text-anchor="${x>318?'end':'middle'}">${esc(lab)}</text>`;
    return (big?`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="#D97757" opacity=".18"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#D97757"/>`:`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#fff" stroke="${col}" stroke-width="2"/>`)+tx_;}).join('');
  const labels=months.map((m,i)=>{const mo=+m.from.slice(5,7)+(+m.from.slice(8,10)>20?1:0),M=((mo-1)%12)+1,hot=key.includes(i)||also.includes(i),cal=care.includes(i);return `<text x="${xs[i].toFixed(1)}" y="176"${hot?' fill="#C6613F" font-weight="700"':cal?' fill="#5b6b80" font-weight="700"':''}>${M}月</text>`;}).join('');
  return `<svg class="climate" viewBox="0 0 340 196" font-family="PingFang SC, sans-serif"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D97757" stop-opacity=".28"/><stop offset="1" stop-color="#D97757" stop-opacity="0"/></linearGradient></defs>${bands}<line x1="22" y1="160" x2="328" y2="160" stroke="#e3d3c2"/><path d="${d} L320,160 L30,160 Z" fill="url(#cg)"/><path d="${d}" fill="none" stroke="#D97757" stroke-width="2.2"/>${dots}<g font-size="10" fill="#8b7565" text-anchor="middle">${labels}</g></svg>`;
}

// 人生节奏三条轴：八字大运、印占大运、星盘大周期；竖带标几套一起换挡的那几年
function lifeSvg(prof,year,shift){
  const y0=year-9,y1=year+14,X=(y)=>20+(y-y0)*310/(y1-y0),bar=[];
  const luck=arr(prof.method&&prof.method.bazi&&prof.method.bazi.luck).filter(l=>l.end_year>=y0&&l.start_year<=y1);
  luck.forEach((l,i)=>{const a=Math.max(y0,l.start_year),b=Math.min(y1,l.end_year+1),cur=l.start_year<=year&&l.end_year>=year,good=/上/.test(l.tier_name||'');const w=X(b)-X(a);
    bar.push(`<rect x="${X(a).toFixed(1)}" y="54" width="${w.toFixed(1)}" height="26" rx="5" fill="${good&&!cur?'#c8503a':cur?'#fbe5df':'#f3ece4'}"${cur?' stroke="#c8503a"':''}/>${w>60?`<text x="${((X(a)+X(b))/2).toFixed(1)}" y="71" font-size="11" fill="${good&&!cur?'#fff':'#9e3d2a'}" text-anchor="middle"${good&&!cur?' font-weight="700"':''}>${esc(l.gan_zhi+(l.title&&l.title[0]?' · '+l.title[0]:''))}</text>`:''}`);});
  const V=prof.vedic&&prof.vedic.status==='ok'?prof.vedic:null;
  if(V){for(const m of arr(V.dasha)){const a=Math.max(y0,+m.start.slice(0,4)+(+m.start.slice(5,7)-1)/12),b=Math.min(y1,+m.end.slice(0,4)+(+m.end.slice(5,7)-1)/12);if(b<=a)continue;const w=X(b)-X(a);const cur=m.antar&&m.start.slice(0,4)<=String(year)&&m.end.slice(0,4)>=String(year);
    bar.push(`<rect x="${X(a).toFixed(1)}" y="114" width="${w.toFixed(1)}" height="26" rx="5" fill="${cur?'#e0f1ea':'#3f9479'}"${cur?' stroke="#3f9479"':''}/>${w>50?`<text x="${(X(a)+Math.min(w/2,60)).toFixed(1)}" y="131" font-size="11" fill="${cur?'#2f7d63':'#fff'}" text-anchor="middle">${esc(m.lord+'大运')}</text>`:''}`);
    if(cur)for(const s of arr(m.antar)){const aa=Math.max(y0,+s.start.slice(0,4)+(+s.start.slice(5,7)-1)/12),bb=Math.min(y1,+s.end.slice(0,4)+(+s.end.slice(5,7)-1)/12);if(bb<=aa||!(s.start.slice(0,4)<=String(year)&&s.end.slice(0,4)>=String(year)))continue;bar.push(`<rect x="${X(aa).toFixed(1)}" y="114" width="${(X(bb)-X(aa)).toFixed(1)}" height="26" fill="#3f9479"/>${X(bb)-X(aa)>=28?`<text x="${((X(aa)+X(bb))/2).toFixed(1)}" y="131" font-size="10.5" fill="#fff" text-anchor="middle">${esc(s.lord)}</text>`:''}`);}}}
  const LC=arr(prof.method&&prof.method.timing&&prof.method.timing.life_cycles).filter(c=>c.year>=y0&&c.year<=y1&&/回归|对冲/.test(c.name)).slice(0,4);
  const lc=LC.map((c,i)=>{const x=X(c.year+0.5),an=x<70?'start':x>280?'end':'middle',tx_=an==='start'?Math.max(12,x-8):an==='end'?Math.min(330,x+8):x;return `<circle cx="${x.toFixed(1)}" cy="184" r="6" fill="#2f6fb8"/><text x="${tx_.toFixed(1)}" y="${i%2?216:204}" font-size="10.5" fill="#2f6fb8" text-anchor="${an}">${c.year} ${esc(c.name)}</text>`;}).join('');
  const sh=arr(shift).length?`<rect x="${X(shift[0]).toFixed(1)}" y="26" width="${(X(shift[shift.length-1]+1)-X(shift[0])).toFixed(1)}" height="196" rx="4" fill="#D97757" opacity=".14"/><text x="${((X(shift[0])+X(shift[shift.length-1]+1))/2).toFixed(1)}" y="18" font-family="Songti SC, serif" font-size="11.5" font-weight="700" fill="#C6613F" text-anchor="middle">三套一起换挡</text>`:'';
  const ticks=[0,5,10,15,20].map(k=>y0+k).filter(y=>y<=y1).map(y=>`<text x="${X(y).toFixed(1)}" y="254">${y}</text>`).join('');
  const lab=(y,s,n)=>`<circle cx="27" cy="${y}" r="7" fill="${{八:'#c8503a',印:'#3f9479',星:'#2f6fb8'}[s]}"/><text x="27" y="${y+3.5}" font-family="Songti SC, serif" font-size="8.5" fill="#fff" text-anchor="middle">${s}</text><text x="38" y="${y+4}" font-size="11" fill="#8b7565">${n}</text>`;
  return `<svg class="life" viewBox="0 0 340 260" font-family="PingFang SC, sans-serif">${sh}<line x1="${X(year+0.5).toFixed(1)}" y1="50" x2="${X(year+0.5).toFixed(1)}" y2="214" stroke="#D97757" stroke-width="1.4" stroke-dasharray="4 3"/>${lab(42,'八','八字 · 大运')}${V?lab(102,'印','印占 · 大运'):''}${lab(162,'星','星盘 · 大周期')}${bar.join('')}<line x1="20" y1="184" x2="330" y2="184" stroke="#2f6fb8" stroke-opacity=".35" stroke-width="2"/>${lc}<rect x="${(X(year+0.5)-34).toFixed(1)}" y="222" width="68" height="20" rx="10" fill="#D97757"/><text x="${X(year+0.5).toFixed(1)}" y="236" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">你在 ${year}</text><g font-size="10" fill="#b09c8c" text-anchor="middle">${ticks}</g></svg>`;
}

// 因果图（年度）：左边一条主链，右边一条副链，同一行的两个落到底下一个合点，再托一条底座
function causalSvg(g){
  const L=arr(g.left),R=g.right,rows=L.length,H=92;const out=[];
  const node=(x,y,n,fill,stroke,dark)=>`<rect x="${x}" y="${y}" width="130" height="52" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/><text x="${x+65}" y="${y+23}" font-family="Songti SC, serif" font-size="14.5" font-weight="700" fill="${dark?'#fff':'#3b2e26'}" text-anchor="middle">${esc(n.title)}</text><text x="${x+65}" y="${y+41}" font-size="10.5" fill="${dark?'#fff1e8':LANE_TX[n.color]||'#8b7565'}" text-anchor="middle">${esc(n.sub||'')}</text>`;
  const badge=(x,y,s)=>s?`<circle cx="${x}" cy="${y}" r="10" fill="#6a6fc4" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y+4}" font-family="Songti SC, serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${esc(s)}</text>`:'';
  L.forEach((n,i)=>{const y=22+i*H,last=i===rows-1&&n.key;out.push(node(20,y,n,last?'#D97757':LANE_TINT[n.color]||'#fdeee6',last?'#D97757':LANE[n.color]||'#D97757',last));out.push(badge(22,y+2,n.step));if(i<rows-1){out.push(`<line x1="85" y1="${y+52}" x2="85" y2="${y+H-2}" stroke="#b3a294" stroke-width="1.6" marker-end="url(#ca)"/><text x="93" y="${y+75}" font-size="10.5" fill="#8b7565">${esc(arr(g.left_links)[i]||'')}</text>`);}});
  if(R){out.push(node(190,22,R.top,LANE_TINT[R.top.color]||'#dff2ef',LANE[R.top.color]||'#2a9d8f'));out.push(badge(192,24,R.top.step));
    const by=22+(rows-1)*H;out.push(node(190,by,R.bottom,LANE_TINT[R.bottom.color]||'#dff2ef',LANE[R.bottom.color]||'#2a9d8f'));out.push(badge(192,by+2,R.bottom.step));
    out.push(`<line x1="255" y1="74" x2="255" y2="${by-2}" stroke="#b3a294" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#ca)"/>`);
    if(R.link){const my=(74+by)/2;out.push(`<rect x="221" y="${my-20}" width="68" height="40" rx="8" fill="#fffdfa"/><text x="255" y="${my-4}" font-size="10.5" fill="#1f7b70" text-anchor="middle">${esc(R.link.label)}</text>${R.link.sub?`<text x="255" y="${my+12}" font-size="9.5" fill="#8b7565" text-anchor="middle">${esc(R.link.sub)}</text>`:''}`);}
    if(g.top_link)out.push(`<line x1="150" y1="48" x2="188" y2="48" stroke="#b3a294" stroke-width="1.6" marker-end="url(#ca)"/><text x="169" y="40" font-size="10.5" fill="#8b7565" text-anchor="middle">${esc(g.top_link)}</text>`);
    if(g.same_row)out.push(`<text x="170" y="${by+30}" font-size="10" fill="#b09c8c" text-anchor="middle">${esc(g.same_row)}</text>`);}
  let y=22+(rows-1)*H+52;
  if(g.merge){const my=y+34;out.push(`<path d="M85,${y} Q85,${y+18} 128,${my-2}" fill="none" stroke="#b3a294" stroke-width="1.6" marker-end="url(#ca)"/>${R?`<path d="M255,${y} Q255,${y+18} 212,${my-2}" fill="none" stroke="#b3a294" stroke-width="1.6" marker-end="url(#ca)"/>`:''}<text x="58" y="${y+28}" font-size="10.5" fill="#8b7565" text-anchor="middle">${esc(g.merge_label||'')}</text>${R?`<text x="282" y="${y+28}" font-size="10.5" fill="#8b7565" text-anchor="middle">${esc(g.merge_label||'')}</text>`:''}<rect x="100" y="${my}" width="140" height="48" rx="24" fill="#4a63c4"/><text x="170" y="${my+21}" font-family="Songti SC, serif" font-size="14.5" font-weight="700" fill="#fff" text-anchor="middle">${esc(g.merge.title)}</text><text x="170" y="${my+38}" font-size="10.5" fill="#e8ecff" text-anchor="middle">${esc(g.merge.sub||'')}</text>${badge(102,my+2,g.merge.step)}`);y=my+48;}
  if(g.base){y+=14;out.push(`<rect x="10" y="${y}" width="320" height="34" rx="17" fill="#f5e6f1" stroke="#b0679e"/><text x="170" y="${y+21.5}" font-size="11.5" fill="#94508a" text-anchor="middle">${esc(g.base.text)}</text>${badge(16,y+2,g.base.step)}`);y+=34;}
  return `<svg class="causal" viewBox="0 0 340 ${y+8}" font-family="PingFang SC, sans-serif"><defs><marker id="ca" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b3a294"/></marker></defs>${out.join('')}</svg>`;
}
const planSteps=(steps)=>`<ol class="steps2 plan-steps">${arr(steps).map((s,i)=>`<li class="${s.key?'key':''}"><div class="no">${i+1}</div><div>${s.key?'<span class="keytag">关键一步</span>':''}<div class="h">${esc(s.when)} · ${esc(s.title)}</div>${s.what?`<div class="w">${tx(s.what)}</div>`:''}${s.why?`<div class="why">为什么：${tx(s.why)}</div>`:''}</div></li>`).join('')}</ol>`;

// 四条线：竖着是十二个月，每条线一列
function subwaySvg(months,lanes){
  const n=arr(lanes).slice(0,4),cols=n.map((_,i)=>n.length===4?82+i*64:n.length===3?95+i*85:110+i*120);
  const rowY=(i)=>62+i*40,mi=(m)=>monthIdx(months,m);
  const out=[];
  n.forEach((l,i)=>{const c=LANE[l.color]||Object.values(LANE)[i],ys=arr(l.nodes).map(x=>mi(x.month)).filter(x=>x>=0);if(!ys.length)return;
    if(l.start_note)out.push(`<line x1="${cols[i]}" y1="46" x2="${cols[i]}" y2="${rowY(Math.min(...ys))}" stroke="${c}" stroke-width="3" stroke-dasharray="3 3" opacity=".6"/>`);
    out.push(`<line x1="${cols[i]}" y1="${rowY(Math.min(...ys))}" x2="${cols[i]}" y2="${rowY(Math.max(...ys))}" stroke="${c}" stroke-width="4" opacity=".55"/>`);});
  const cross=months.map((_,k)=>n.filter(l=>arr(l.nodes).some(x=>mi(x.month)===k)).length);
  const bands=months.map((_,k)=>cross[k]>=3?`<rect x="2" y="${rowY(k)-14}" width="336" height="40" rx="8" fill="#D97757" opacity=".1"/>`:'').join('');
  const mlab=months.map((m,k)=>{const mo=+m.from.slice(5,7)+(+m.from.slice(8,10)>20?1:0),M=((mo-1)%12)+1;const hot=cross[k]>=3;return `<text x="22" y="${rowY(k)+4}"${hot?' fill="#C6613F" font-weight="700"':''}>${M}月</text>${hot?`<text x="22" y="${rowY(k)+18}" font-size="9" fill="#C6613F">交汇</text>`:''}`;}).join('');
  const head=n.map((l,i)=>`<circle cx="${cols[i]}" cy="13" r="9" fill="${LANE[l.color]}"/><text x="${cols[i]}" y="17" font-size="11" fill="#fff">${cn(i)}</text><text x="${cols[i]}" y="38" font-size="11.5" fill="${LANE_TX[l.color]}">${esc(l.name)}</text>`).join('');
  const nodes=n.map((l,i)=>{const c=LANE[l.color];return (l.start_note?`<text x="${cols[i]}" y="58" font-size="9.5" fill="${LANE_TX[l.color]}">${esc(l.start_note)}</text>`:'')+arr(l.nodes).map(x=>{const k=mi(x.month);if(k<0)return '';const y=rowY(k);return (x.key?`<circle cx="${cols[i]}" cy="${y}" r="7" fill="${c}"/>`:`<circle cx="${cols[i]}" cy="${y}" r="6" fill="#fff" stroke="${c}" stroke-width="2.5"/>`)+`<text x="${cols[i]}" y="${y+19}"${x.key?` font-weight="700" fill="${LANE_TX[l.color]}"`:''}>${esc(x.label)}</text>`;}).join('');}).join('');
  const h=rowY(months.length-1)+40;
  return `<svg class="subway" viewBox="0 0 340 ${h+16}" font-family="PingFang SC, sans-serif">${bands}<g font-family="Songti SC, serif" font-weight="700" text-anchor="middle">${head}</g>${out.join('')}<g font-size="11.5" text-anchor="middle" fill="#8b7565">${mlab}</g><g font-size="10.5" text-anchor="middle" fill="#4f4036" paint-order="stroke" stroke="#fffdfa" stroke-width="4" stroke-linejoin="round">${nodes}</g><text x="170" y="${h+10}" font-size="10.5" fill="#8b7565" text-anchor="middle">实心点＝这条线上最要紧的一站</text></svg>`;
}

export function renderYear({prof,year:Y,view,report:R,qr}){
  const months=Y.bazi.months,ix=(d)=>monthIdx(months,d);
  const keyI=view&&view.key?ix(view.key.from):-1,alsoI=view?arr(view.also).map(a=>ix(a.from)):[],careI=view?arr(view.careful).map(a=>ix(a.from)):[];
  const cover=shareCover(R.cover.seen,R.cover.evidence,R.cover.stamp,`玄玑看见的你的 ${Y.year}`,String(Y.year));
  const ov=`<div class="card yov"><div class="kw"><span>年度关键词</span><b>${esc(R.keyword)}</b></div><div class="cv-q"><div class="l">一句话说 ${Y.year} · ${esc(Y.bazi.year_gz)}年</div><div class="q">${esc(R.oneline)}</div></div>${fourRows(R.four)}${toc([['p1','壹','一眼看懂','答案和步骤'],['p2','贰','来路去路','去年和人生这段'],['p3','叁','五个方面','五块各自的气候'],['p4','肆','串起日子','四条线和每个月']])}</div>`;
  const G=R.glance||{},P=R.plan||{};
  const p1=`${part('p1','壹','一眼','看懂')}<div class="card"><div class="glance"><div class="seal"><b style="font-size:30px">${esc(R.keyword)}</b><small>${Y.year}</small></div><div class="keyday"><div class="l">全年最要紧</div><div class="d">${esc(G.key_month_label||'')}</div><div class="s" style="color:var(--body)">${esc(G.key_line||'')}</div><div style="margin-top:4px">${arr(G.chips).map(c=>`<span class="chip">${sy(c.sys)}${esc(c.text)}</span>`).join('')}</div></div></div><div class="pts">${arr(G.points).map((p,i)=>`<div><i>${'一二三'[i]}</i><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div>`).join('')}</div></div>
<div class="card plan" id="plan"><div class="mhead"><span class="seal3 c">玄</span><span class="nm">玄玑建议的步骤</span></div>${P.lead?`<p class="para"><strong>${esc(P.lead)}</strong></p>`:''}${P.graph?causalSvg(P.graph):''}<div class="cap">箭头是谁带出谁；紫色圆圈里的数字，是下面的第几步。</div>${planSteps(P.steps)}${remember(P.remember)}</div>
<div class="card"><div class="lab">全年气候</div>${climateSvg(months,view,R.climate&&R.climate.marks,R.climate&&R.climate.seasons)}<div class="legend2"><span><i style="background:#D97757"></i>要紧，往外走</span><span><i style="background:#5b6b80"></i>留神，收着点</span></div><div class="cap">曲线越高，越适合站出去做事；越低，越适合收着、整理、休息。</div><div class="season">${arr(R.climate&&R.climate.seasons).map((s,i)=>`<div class="s${i+1}"><span class="w">${esc(s.span)}</span><b>${esc(s.title)}</b><span>${esc(s.sub)}</span></div>`).join('')}</div></div>`;
  const PA=R.past||{},LI=R.life||{};
  const p2=`${part('p2','贰','来路','去路')}<div class="card past"><div class="lab">先看 ${Y.year-1} · 你去年的事</div><div class="st">${esc(PA.statement)}</div>${arr(PA.when).length?`<div class="when">${arr(PA.when).map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}${evRows(PA.evidence)}${PA.sure?`<div class="concl"><b>说得肯定</b>${esc(PA.sure)}</div>`:''}<div class="tellus">准不准，回到对话里跟玄玑说一声</div></div>
<div class="card"><div class="lab">你走到人生哪一段</div><p class="para"><strong>${esc(LI.lead)}</strong></p>${lifeSvg(prof,Y.year,LI.shift_years)}<div class="cap">每一条是一套盘的人生节奏；竖着的橙色带，是几套盘一起换挡的地方。</div>${arr(LI.sections).map((s,i)=>`<div class="sys"${i?'':' style="margin-top:10px"'}>${sy(s.sys)}<div><div class="t">${esc(s.title)}<small>${esc(s.sub||'')}</small></div>${arr(s.paras).map(p=>`<p>${tx(p)}</p>`).join('')}</div></div>`).join('')}${LI.together?`<div class="concl"><b>三套放一起</b>${esc(LI.together)}</div>`:''}</div>`;
  const F=arr(R.five);
  const p3=`${part('p3','叁','五个','方面')}<div class="fivehd">点一下，跳到那一块</div><div class="five">${F.map((d,i)=>`<a href="#d${i+1}"${d.hot?' class="hot"':''}><b>${esc(d.short_title||d.title)}</b><span>${arr(String(d.short||'').split('/')).map(s=>esc(s.trim())).join('<br>')}</span><i>↓</i></a>`).join('')}</div>
${F.map((d,i)=>`<div class="card dom${d.hot?'':' calm'}" id="d${i+1}"><div class="dhead"><span class="nm">${esc(d.title)}</span>${d.tag?`<span class="keytag">${esc(d.tag)}</span>`:''}</div><div class="clim">${tx(d.climate)}</div><div class="sub2">凭什么</div>${evRows(d.why)}<div class="grip"><div class="g"><span class="lb">要抓</span><br>${tx(d.grab)}</div><div class="f"><span class="lb">要防</span><br>${tx(d.guard)}</div></div>${arr(d.advisors).map(a=>`<div class="jun"><div class="av">${esc([...String(a.name).replace(/^.*·/,'')][0]||'')}</div><div>${a.case?`<span class="case">${esc(a.case)}</span>`:''}<div class="who"><b>${esc(a.name)}</b> · ${esc(a.title)}</div><p class="para" style="font-size:14px;margin-top:2px">${tx(a.advice)}</p></div></div>`).join('')}<a class="back" href="#p3">↑ 回到五个方面</a></div>`).join('')}`;
  const T=R.threads||{},lanes=arr(T.lanes);
  const thr=lanes.map((l,i)=>`<div class="card thr${i?' t'+(i+1):''}"><div class="thead"><span class="ln">${cn(i)}</span><span class="nm">${esc(l.title||l.name)}</span></div>${l.intro?`<div class="intro">${esc(l.intro)}</div>`:''}<ol class="tl">${arr(l.items).map(it=>`<li${it.key?' class="k"':''}><span class="d">${esc(it.when)}</span><span>${tx(it.text)}</span></li>`).join('')}</ol>${l.says?`<div class="says">${tx(l.says)}</div>`:''}</div>`).join('');
  const cr=arr(T.crossings).length?`<div class="card cross"><div class="lab">几条线交在哪里</div>${arr(T.crossings).map(c=>`<div class="row${c.calm?' calm':''}"><div class="m">${esc(c.month_label)}<small>${esc(c.note||'')}</small><div class="dots">${arr(c.lanes).map(k=>`<i class="${'abce'[k-1]}">${cn(k-1)}</i>`).join('')}</div></div><div class="tx">${tx(c.text)}</div></div>`).join('')}</div>`:'';
  const MC=arr(R.months),mcard=(m)=>{const k=m.index,mm=months[k];if(!mm)return '';const hot=k===keyI||alsoI.includes(k),cal=careI.includes(k);const mo=+mm.from.slice(5,7)+(+mm.from.slice(8,10)>20?1:0),M=((mo-1)%12)+1;const tag=k===keyI?'<span class="keytag">全年最要紧</span>':alsoI.includes(k)?'<span class="keytag">要紧</span>':cal?`<span class="calmtag">留神${m.calm_note?' · '+esc(m.calm_note):''}</span>`:'';
    return `<div class="card mon${hot?' hot':cal?' calm':''}" id="m${String(k+1).padStart(2,'0')}"><div class="mhd"><span class="mm">${M} 月</span><span class="rg">${esc(mm.from.slice(5).replace('-','/'))} ～ ${esc(mm.to.slice(5).replace('-','/'))}</span>${tag}</div><div class="lead">${esc(m.lead)}</div>${arr(m.why).length?`${hot?'<div class="sub2">凭什么</div>':''}${evRows(m.why)}`:''}${arr(m.todo).length?`<div class="sub2">适合做的</div><ol class="do">${arr(m.todo).map(t=>`<li>${tx(t)}</li>`).join('')}</ol>`:''}${m.ok?`<p class="p"${arr(m.why).length?' style="margin-top:6px"':''}><em class="ok">适合</em>${tx(m.ok)}</p>`:''}${m.no?`<p class="p"><em class="no">留神</em>${tx(m.no)}</p>`:''}${m.watch?`<div class="watch"><b>留神</b>${tx(m.watch)}</div>`:''}${arr(m.days).length?`<div class="days">${arr(m.days).map(d=>`<span><b>${esc(d.d)}</b>${esc(d.text)}</span>`).join('')}</div>`:''}</div>`;};
  const strip=`<div class="card"><div class="lab">十二个月 · 点一下看那个月</div><div class="strip">${months.map((mm,k)=>{const m=MC.find(x=>x.index===k)||{};const mo=+mm.from.slice(5,7)+(+mm.from.slice(8,10)>20?1:0),M=((mo-1)%12)+1;const cls=k===keyI||alsoI.includes(k)?' class="hot"':careI.includes(k)?' class="calm"':'';return `<a href="#m${String(k+1).padStart(2,'0')}"${cls}>${M}月<small>${esc(m.short||(k===keyI?'最要紧':alsoI.includes(k)?'要紧':careI.includes(k)?'留神':''))}</small></a>`;}).join('')}</div><div class="cap" style="margin-top:8px">按节气分月，日子都按你所在地的时间。</div></div>`;
  const p4=`${part('p4','肆','串起','日子')}<p class="para small" style="margin:4px 2px 0">今年的日子不是一个个孤立的点，它们连成几条线。顺着线看，就知道哪件事是哪件事的前因后果。</p><div class="card"><div class="lab">几条线 · 一张图</div>${subwaySvg(months,lanes)}<div class="cap">竖着读是一条线的前因后果；横着读，三条以上的线挤在同一个月，就是「交汇」。</div></div>${thr}${cr}<a class="toplan" href="#plan">这几条线怎么连成一条路、先做哪一步：看卷壹「玄玑建议的步骤」 ↑</a>${strip}${MC.map(mcard).join('')}${arr(R.sky).length?`<div class="card"><div class="lab">天上的大日子</div><ul class="sig sky">${arr(R.sky).map(s=>`<li>${tx(s)}</li>`).join('')}</ul></div>`:''}`;
  const X=R.xuanji||{},LP=R.loop||{};
  const end=`<div class="card xjc"><div class="mhead"><span class="seal3 c">玄</span><span class="nm">玄玑怎么看</span></div><div class="big2">${tx(X.big)}</div>${X.para?`<p class="para">${tx(X.para)}</p>`:''}${doorCard('回到对话里，发这一句',arr(R.doors))}</div>
<div class="card loop"><div class="lab">回到这一年 · 记住三处</div>${stairs(LP.stairs,LP.flag,'从这里起步')}${arr(LP.nots).length?`<div class="no2">${arr(LP.nots).map(s=>`<div><i>✕</i>${esc(s)}</div>`).join('')}</div>`:''}${remember(LP.remember)}${LP.back_msg?doorCard('到时候，回来发这一句',[{msg:LP.back_msg,to:'回来对一对'}]):''}</div>`;
  return page('玄玑 · 年度报告','玄玑 · 年度报告',[cover,ov,p1,p2,p3,p4,end,asks(R.next_questions),founder(qr,['创始人亲自看你的这一年','要紧的几个月，细到哪几天','这一年最要紧的那件事，当面帮你盘'],'年度报告')].join('\n'));
}

// ════════ 分术 ════════
const SYS4=['八字','星盘','印占','出厂底色'];
// 梯子图：一条从上往下的链，旁边可以挂一个侧框
function ladderSvg(steps,links,side){
  const N=arr(steps),H=82,out=[];const fill={l1:['#fdeee6','#D97757','#C6613F'],l2:['#dff2ef','#2a9d8f','#1f7b70'],l3:['#e6e9f8','#4a63c4','#4a63c4'],green:['#e0f1ea','#3f9479','#2f7d63']};
  N.forEach((n,i)=>{const y=14+i*H,key=n.key,f=fill[n.color]||fill.l1;
    out.push(key?`<rect x="40" y="${y}" width="200" height="52" rx="12" fill="#D97757"/>`:`<rect x="40" y="${y}" width="200" height="52" rx="12" fill="${f[0]}" stroke="${f[1]}"${i===0?' stroke-width="1.6"':''}/>`);
    out.push(`<text x="140" y="${y+23}" font-family="Songti SC, serif" font-size="14.5" font-weight="700" fill="${key?'#fff':'#3b2e26'}" text-anchor="middle">${esc(n.title)}</text><text x="140" y="${y+41}" font-size="10.5" fill="${key?'#fff1e8':f[2]}" text-anchor="middle">${esc(n.sub||'')}</text>`);
    if(i<N.length-1)out.push(`<line x1="140" y1="${y+52}" x2="140" y2="${y+H-2}" stroke="#b3a294" stroke-width="1.6" marker-end="url(#la)"/><text x="${side&&side.after===i?132:148}" y="${y+70}" font-size="10.5" fill="#8b7565"${side&&side.after===i?' text-anchor="end"':''}>${esc(arr(links)[i]||'')}</text>`);
    if(n.step)out.push(`<circle cx="42" cy="${y+2}" r="10" fill="#6a6fc4" stroke="#fff" stroke-width="1.5"/><text x="42" y="${y+6}" font-family="Songti SC, serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${esc(n.step)}</text>`);});
  if(side&&side.after>=0&&side.after<N.length-1){const y=14+side.after*H+52-14;out.push(`<rect x="256" y="${y}" width="80" height="56" rx="10" fill="#f3f1ee" stroke="#c9bcae" stroke-dasharray="4 3"/><text x="296" y="${y+18}" font-size="11" font-weight="700" fill="#5b6b80" text-anchor="middle">${esc(side.when)}</text><text x="296" y="${y+33}" font-size="10.5" fill="#5b6b80" text-anchor="middle">${esc(side.title)}</text><text x="296" y="${y+47}" font-size="9.5" fill="#8b7565" text-anchor="middle">${esc(side.sub||'')}</text><path d="M256,${y+28} L150,${y+28}" fill="none" stroke="#c9bcae" stroke-width="1.4" stroke-dasharray="4 3"/>${side.step?`<circle cx="258" cy="${y+2}" r="10" fill="#6a6fc4" stroke="#fff" stroke-width="1.5"/><text x="258" y="${y+6}" font-family="Songti SC, serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${esc(side.step)}</text>`:''}`);}
  const h=14+N.length*H;
  return `<svg class="ladder" viewBox="0 0 340 ${h}" font-family="PingFang SC, sans-serif"><defs><marker id="la" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b3a294"/></marker></defs>${out.join('')}</svg>`;
}
const CHAT16='<svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const cellTx=(s)=>String(s??'').split('/').map(v=>tx(v.trim())).join('<br>');

export function renderFenshu({report:R,hits,qr}){
  const hitOf=(id)=>arr(hits&&hits.items).find(h=>h.id===id);
  const cover=shareCover(R.cover.seen,R.cover.evidence,R.cover.stamp,'玄玑看见的你 · 这件事','分术');
  const ov=`<div class="card yov"><div class="cv-q" style="margin-top:0"><div class="l">你问的</div><div class="q">${esc(R.question)}</div></div><div class="kw" style="margin-top:14px"><span>一句话</span></div><p class="para" style="margin-top:2px"><strong>${esc(R.oneline)}</strong></p>${fourRows(R.four).replace('四套同看','四套各一句')}${toc([['p1','壹','一眼看懂','答案和步骤'],['p2','贰','分开细看','四套各说各的'],['p3','叁','对照一页','只列不判'],['p4','肆','玄玑怎么看','偏哪一边']])}</div>`;
  const MX=R.matrix||{},rows=arr(MX.rows);
  const mx=`<div class="card"><div class="lab">${esc(MX.title||'三件事，四套怎么说')}</div><div class="mx"><div></div>${SYS4.map(k=>`<div class="hd ${SY[k][0]}">${sy(k)}${k==='出厂底色'?'底色':k}</div>`).join('')}${rows.map((r,ri)=>`<div class="rl">${esc(r)}</div>${SYS4.map(k=>{const v=arr(MX.cells&&MX.cells[k])[ri]||'';return `<div class="cl ${SY[k][0]}${/^不看/.test(v)?' mute':''}"><span>${cellTx(v)}</span></div>`;}).join('')}`).join('')}</div><div class="cap" style="margin-top:8px">横着读是一件事四套怎么说；竖着读是一套盘的看法。</div></div>`;
  const P=R.plan||{};
  const plan=`<div class="card plan" id="plan"><div class="mhead"><span class="seal3 c">玄</span><span class="nm">玄玑建议的步骤</span></div>${P.lead?`<p class="para"><strong>${esc(P.lead)}</strong></p>`:''}${ladderSvg(P.ladder,P.links,P.side)}<div class="cap">箭头是谁带出谁；紫色圆圈里的数字，是下面的第几步。</div>${planSteps(P.steps)}${remember(P.remember)}</div>`;
  const S=R.systems||{};
  const sysCard=(k,i)=>{const s=S[k]||{},c=SY[k][0];return `<div class="card sysc ${c}" id="s${i+1}"><div class="shead">${sy(k)}<span class="nm">${esc(k)}</span>${s.verdict?`<span class="vd">${esc(s.verdict)}</span>`:''}</div><div class="concl2">${tx(s.conclusion)}</div><div class="sub2">这套盘怎么看你</div><p class="see">${tx(s.see)}</p><div class="sub2">凭什么</div>${arr(s.points).map(p=>`<div class="pt"><div><b>${esc(p.b)}</b>：${tx(p.text)}</div></div>`).join('')}${s.summary?`<p class="see" style="margin-top:6px">${tx(s.summary)}</p>`:''}<div class="sub2">它给的时间</div>${arr(s.times).length?`<ol class="tl">${arr(s.times).map(t=>`<li${t.key?' class="k"':''}><span class="d">${esc(t.when)}</span><span>${tx(t.text)}</span></li>`).join('')}</ol>`:`<p class="see" style="color:var(--faint)">${esc(s.no_time||'这套盘不看时间。')}</p>`}<div class="sub2">它提醒你的</div><div class="grip"><div class="g"><span class="lb">要抓</span><br>${tx(s.grab)}</div><div class="f"><span class="lb">要防</span><br>${tx(s.guard)}</div></div><div class="good"><b>★ 擅长</b><span>${tx(s.good)}</span></div><a class="back" href="#p2">↑ 回到四套</a></div>`;};
  const p2=`${part('p2','贰','分开','细看')}<p class="para small" style="margin:4px 2px 0">四套盘各一篇，小标题一样，方便横着比。</p><div class="nav4">${SYS4.map((k,i)=>`<a href="#s${i+1}">${sy(k)}${k==='出厂底色'?'底色':k}<i>↓</i></a>`).join('')}</div>${SYS4.map(sysCard).join('')}`;
  const agree=`<div class="card agree"><div class="lab">几套都这么说的</div>${arr(R.agree).map(a=>`<div class="row"><div class="tx"><b>${esc(a.title)}</b>${tx(a.text)}</div><div class="sg">${SYS4.map(k=>sy(k,arr(a.sys).includes(k)?'':' off')).join('')}</div></div>`).join('')}</div>`;
  const differ=`<div class="card"><div class="lab">各说各的</div><div class="diff">${arr(R.differ).map(d=>`<div class="q">${esc(d.q)}</div><div class="four">${SYS4.map(k=>{const v=d.items&&d.items[k]||'';return `<div class="${SY[k][0]}${/^不看/.test(v)?' mute':''}">${sy(k)}<span>${tx(v)}</span></div>`;}).join('')}</div>`).join('')}</div></div>`;
  const check=`<div class="card check2"><div class="lab">你自己来对一对 · 回到对话里打勾</div><p class="para small" style="margin-bottom:4px">每一条都可以回到对话里，跟玄玑一条条对。对上的，会记成「玄玑说中的事」，下一份报告里自动打上勾。</p>${arr(R.check).map(c=>{const h=c.hit_id&&hitOf(c.hit_id);return h?`<div class="it2 done"><span class="ic">✓</span><div><span class="w">${esc(c.when)}</span><div class="tx">${tx(c.text)}</div><div class="got"><b>已对上</b>你在对话里说：${esc(h.said)}</div></div></div>`:`<div class="it2"><span class="ic">${CHAT16}</span><div><span class="w">${esc(c.when)}</span><div class="tx">${tx(c.text)}</div><div class="say"><small>${esc(c.label||'回到对话里发')}</small>${esc(c.msg)}</div></div></div>`;}).join('')}</div>`;
  const X=R.xuanji||{};
  const p4=`${part('p4','肆','玄玑','怎么看')}<div class="card xjc"><div class="mhead"><span class="seal3 c">玄</span><span class="nm">玄玑怎么看</span></div><div class="big2">${tx(X.big)}</div>${X.para?`<p class="para">${tx(X.para)}</p>`:''}${doorCard('回到对话里，发这一句',arr(R.doors))}</div>`;
  return page('玄玑 · 分术报告','玄玑 · 分术报告',[cover,ov,part('p1','壹','一眼','看懂'),mx,plan,p2,part('p3','叁','对照','一页'),'<p class="para small" style="margin:4px 2px 0">只列，不判。哪里一样、哪里不一样，你自己看。</p>',agree,differ,check,p4,asks(R.next_questions),founder(qr,['创始人亲自把四套合起来看','这件事的路，细到哪几年','要立的规矩，当面帮你盘'],'分术报告')].join('\n'));
}
