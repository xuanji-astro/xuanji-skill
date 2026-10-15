// 报告生成时就画好（10-14 åå§äºº：「不完整就不要给，宁愿不给都不要给不完整的」）。
// 模板里的脚本在本机用一个最小的网页环境跑一遍，把画出来的整份报告写成静态 HTML：字和图都在文件里，打开不靠脚本，
// 在不跑脚本的预览（Kimi 聊天、手机文件查看器、微信）里也是完整的。画完逐项核对，核不过就不出文件。
// 不装任何第三方依赖；只认模板自己用到的那几样网页功能，模板用了没实现的就直接报错（宁可不出，也不出缺东西的）。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import vm from 'node:vm';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class Node {
  constructor() { this.parentNode = null; this.childNodes = []; }
  get firstChild() { return this.childNodes[0] || null; }
  appendChild(c) {
    if (!(c instanceof Node)) throw Error('PRERENDER_UNSUPPORTED appendChild');
    if (c.parentNode) c.parentNode._drop(c);
    c.parentNode = this; this.childNodes.push(c); return c;
  }
  _drop(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; }
  remove() { if (this.parentNode) this.parentNode._drop(this); }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; if (v != null && v !== '') this.appendChild(new Text(String(v))); }
}
class Text extends Node {
  constructor(d) { super(); this.data = String(d); Object.preventExtensions(this); }
  get nodeType() { return 3; }
  get textContent() { return this.data; }
  set textContent(v) { this.data = String(v); }
  cloneNode() { return new Text(this.data); }
}
const styleOf = (el) => new Proxy({}, {
  set(o, k, v) { if (typeof k !== 'string') return false; const name = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()); if (v === '' || v == null) delete o[name]; else o[name] = String(v); el._style = o; return true; },
  get(o, k) { return typeof k === 'string' ? o[k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] || '' : undefined; },
});
class Element extends Node {
  constructor(tag, svg = false) {
    super(); this.localName = svg ? tag : tag.toLowerCase(); this.svg = svg; this.attrs = new Map(); this._style = null; this.style = styleOf(this);
    Object.preventExtensions(this);   // 模板给元素设了这里没认的属性：严格模式下直接报错，不悄悄丢
  }
  get nodeType() { return 1; }
  get tagName() { return this.localName.toUpperCase(); }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  setAttribute(n, v) { this.attrs.set(String(n), String(v)); }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  hasAttribute(n) { return this.attrs.has(n); }
  removeAttribute(n) { this.attrs.delete(n); }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { if (v) this.setAttribute('class', v); else this.removeAttribute('class'); }
  get id() { return this.getAttribute('id') || ''; }
  set id(v) { this.setAttribute('id', v); }
  get href() { return this.getAttribute('href') || ''; }
  set href(v) { this.setAttribute('href', v); }
  get src() { return this.getAttribute('src') || ''; }
  set src(v) { this.setAttribute('src', v); }
  get alt() { return this.getAttribute('alt') || ''; }
  set alt(v) { this.setAttribute('alt', v); }
  get type() { return this.getAttribute('type') || ''; }
  set type(v) { this.setAttribute('type', v); }
  get title() { return this.getAttribute('title') || ''; }
  set title(v) { this.setAttribute('title', v); }
  get hidden() { return this.attrs.has('hidden'); }
  set hidden(v) { if (v) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
  get open() { return this.attrs.has('open'); }
  set open(v) { if (v) this.setAttribute('open', ''); else this.removeAttribute('open'); }
  set onclick(f) {}   // 点击行为由成品页里那段小脚本接上（存为 PDF）
  get onclick() { return null; }
  addEventListener() {}
  focus() {}
  cloneNode(deep) {
    const e = new Element(this.localName, this.svg);
    for (const [k, v] of this.attrs) e.attrs.set(k, v);
    if (this._style) for (const [k, v] of Object.entries(this._style)) e.style[k] = v;
    if (deep) for (const c of this.childNodes) e.appendChild(c.cloneNode(true));
    return e;
  }
  querySelectorAll(sel) { const m = matcher(sel), out = []; walk(this, (n) => { if (n !== this && m(n)) out.push(n); }); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  get outerHTML() { return serialize(this); }
}
function walk(n, f) { f(n); for (const c of n.childNodes) if (c.nodeType === 1) walk(c, f); }
// 只认模板用到的选择器：标签名、*、.类名
function matcher(sel) {
  const s = String(sel).trim();
  if (s === '*') return (n) => n.nodeType === 1;
  if (/^[a-zA-Z][\w-]*$/.test(s)) return (n) => n.nodeType === 1 && n.localName.toLowerCase() === s.toLowerCase();
  if (/^\.[\w-]+$/.test(s)) { const c = s.slice(1); return (n) => n.nodeType === 1 && n.className.split(/\s+/).includes(c); }
  throw Error('PRERENDER_UNSUPPORTED selector ' + s);
}
// 模板的 svg() 交给 DOMParser 的是自己拼的图表字符串：这里只解析规整的 XML，解析不了就照浏览器那样给 parsererror
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);|&/g, (m, e) => {
    if (!e) throw Error('amp');
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    if (!(e in ENT)) throw Error('entity'); return ENT[e];
  });
}
function parseXML(s) {
  const top = new Element('#root', true), stack = [top]; let i = 0;
  const ATTR = /\s+([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
  while (i < s.length) {
    if (s.startsWith('<!--', i)) { const j = s.indexOf('-->', i); if (j < 0) throw Error('comment'); i = j + 3; continue; }
    if (s[i] === '<') {
      if (s[i + 1] === '/') {
        const j = s.indexOf('>', i); if (j < 0) throw Error('close');
        const name = s.slice(i + 2, j).trim(), el = stack.pop();
        if (!el || el === top || el.localName !== name) throw Error('mismatch'); i = j + 1; continue;
      }
      const m = /^<([A-Za-z][\w:.-]*)/.exec(s.slice(i, i + 64)); if (!m) throw Error('tag');
      const el = new Element(m[1], true); i += m[0].length;
      for (;;) { ATTR.lastIndex = i; const a = ATTR.exec(s); if (!a) break; el.attrs.set(a[1], decode(a[2] != null ? a[2] : a[3])); i = ATTR.lastIndex; }
      while (/\s/.test(s[i] || '')) i++;
      stack[stack.length - 1].appendChild(el);
      if (s.startsWith('/>', i)) { i += 2; continue; }
      if (s[i] !== '>') throw Error('tag end'); i++; stack.push(el); continue;
    }
    const j = s.indexOf('<', i), end = j < 0 ? s.length : j, t = s.slice(i, end);
    if (t) stack[stack.length - 1].appendChild(new Text(decode(t)));
    i = end;
  }
  if (stack.length !== 1 || top.children.length !== 1) throw Error('unbalanced');
  return top.children[0];
}
class DOMParser {
  parseFromString(str, type) {
    if (type !== 'image/svg+xml') throw Error('PRERENDER_UNSUPPORTED DOMParser ' + type);
    let root; try { root = parseXML(String(str)); } catch { root = new Element('parsererror', true); }
    root.remove();
    return { documentElement: root };
  }
}
export function serialize(n) {
  if (n.nodeType === 3) return escText(n.data);
  const attrs = [...n.attrs].map(([k, v]) => ' ' + k + (v === '' && (k === 'open' || k === 'hidden') ? '' : '="' + escAttr(v) + '"')).join('')
    + (n._style && Object.keys(n._style).length ? ' style="' + escAttr(Object.entries(n._style).map(([k, v]) => k + ':' + v).join(';')) + '"' : '');
  if (!n.svg && VOID.has(n.localName)) return '<' + n.localName + attrs + '>';
  return '<' + n.localName + attrs + '>' + n.childNodes.map(serialize).join('') + '</' + n.localName + '>';
}

// 在一份最小的网页环境里跑模板脚本，返回 #app。width＝屏幕宽（模板按 560 分手机和电脑两种画法）
export function renderApp(script, dataText, width) {
  const body = new Element('body'), app = new Element('main'), data = new Element('script');
  app.id = 'app'; app.className = 'wrap'; data.id = 'xj-data'; data.appendChild(new Text(dataText));
  body.appendChild(app); body.appendChild(data);
  const document = {
    createElement: (t) => new Element(String(t)),
    createTextNode: (t) => new Text(t),
    importNode: (n, deep) => n.cloneNode(!!deep),
    getElementById: (id) => { let hit = null; walk(body, (n) => { if (!hit && n.id === id) hit = n; }); return hit; },
    querySelectorAll: (sel) => body.querySelectorAll(sel),
    querySelector: (sel) => body.querySelector(sel),
  };
  const window = { innerWidth: width, addEventListener() {}, print() {} };
  vm.runInNewContext(script, { document, window, DOMParser, setTimeout() {} }, { timeout: 20000 });
  return app;
}
// 手机、电脑两次画出来的只许图不同：图两份都留，按屏宽显示一份；别的地方不同就是模板里还有按屏宽改的东西，没认到，不出
function merge(a, b) {
  if (serialize(a) === serialize(b)) return a;
  if (a.nodeType === 1 && b.nodeType === 1 && a.localName === 'svg' && b.localName === 'svg') return [mark(a, 'pr-w'), mark(b, 'pr-n')];
  if (a.nodeType !== 1 || b.nodeType !== 1 || a.localName !== b.localName || a.childNodes.length !== b.childNodes.length) throw Error('REPORT_INCOMPLETE width');
  const e = a.cloneNode(false); a.childNodes.forEach((c, i) => { const m = merge(c, b.childNodes[i]); for (const x of [].concat(m)) e.appendChild(x === c ? c.cloneNode(true) : x); });
  return e;
}
function mark(svg, cls) { const e = svg.cloneNode(true); e.setAttribute('class', ((e.getAttribute('class') || '') + ' ' + cls).trim()); return e; }

const APP_SLOT = '<main class="wrap" id="app"><noscript>这份报告需要打开 JavaScript 才能显示。</noscript></main>';
const DATA_RE = /<script id="xj-data" type="application\/json">([\s\S]*?)<\/script>\n/;
const MAIN_RE = /<script>\n(\(function \(\) \{\n'use strict';[\s\S]*?)<\/script>\n/;
// 成品页只留这一小段：存为 PDF 按钮（打印前把折叠全展开、印完收回）。不跑脚本的地方看不到这个按钮，内容照样完整
const ENHANCE = '<script>(function(){var shut=null;function openAll(){if(shut)return;shut=[].filter.call(document.querySelectorAll(\'details\'),function(d){return !d.open;});shut.forEach(function(d){d.open=true;});}function restore(){if(shut)shut.forEach(function(d){d.open=false;});shut=null;}window.addEventListener(\'beforeprint\',openAll);window.addEventListener(\'afterprint\',restore);var b=document.querySelector(\'.xj-pdf\');if(b){b.style.display=\'\';b.onclick=function(){openAll();setTimeout(function(){window.print();},60);};}})();</script>\n';
const WIDTH_CSS = '<style>@media (max-width:559px){.pr-w{display:none!important}}@media (min-width:560px){.pr-n{display:none!important}}</style>\n</head>';

// source＝build() 出来的那份（模板＋数据）。返回 { html, app }：html 是静态成品，app 是画好的那棵树（给核对用）
export function prerender(source) {
  if (source.split(APP_SLOT).length !== 2 || source.split('</head>').length !== 2) throw Error('TEMPLATE_INVALID');
  const dm = source.match(DATA_RE), sm = source.match(MAIN_RE);
  if (!dm || !sm) throw Error('TEMPLATE_INVALID');
  let wide, narrow;
  try { wide = renderApp(sm[1], dm[1], 800); narrow = renderApp(sm[1], dm[1], 390); } catch (e) { throw Error(String(e.message).startsWith('PRERENDER_UNSUPPORTED') ? 'REPORT_INCOMPLETE ' + e.message : 'REPORT_INCOMPLETE render'); }
  const app = merge(wide, narrow);
  const btn = app.querySelector('.xj-pdf'); if (btn) btn.style.display = 'none';
  const inner = app.childNodes.map(serialize).join('');
  const html = source.replace(APP_SLOT, () => '<main class="wrap" id="app">' + inner + '</main>').replace(DATA_RE, '').replace(MAIN_RE, () => ENHANCE).replace('</head>', WIDTH_CSS);
  return { html, app, data: JSON.parse(dm[1]) };
}

// 画完逐项核对：只报类别和字段路径，不报任何正文（路径里没有用户内容）。返回空数组才算完整
// 模板本来就不上页面的字段：版本号、重点章的键名、映照的 note（只画主题）、没对上的年份、人格反馈（页面换成固定的一句）、体感核对（页面换成结论）
const NOT_SHOWN = [/^schema$/, /^focus\[\d+\]$/, /^crosscheck\[\d+\]\.note$/, /^misses(\[|$)/, /^persona_feedback(\[|$)/, /^strength_check(\.|$)/];
export function verifyReport(app, data) {
  const errs = [], P = data.profile || {}, R = data.report || {};
  const norm = (s) => String(s).replace(/\*\*/g, '').replace(/\s+/g, '');
  const page = norm(app.textContent);
  for (const bad of ['undefined', 'NaN', '[object Object]', '图表数据格式无效']) if (page.includes(bad)) errs.push('BAD_TEXT ' + bad);
  // 解读里写的每一段字都要在页面上
  // 重点章整章展开、不出「一句话」（brief 只在「另外几面」里用）；模板跟它一样：focus 里没有认得的章就全部当重点章
  const chs = Object.keys(R.chapters || {}), fk = (R.focus || []).filter((k) => chs.includes(k)), focus = new Set(fk.length ? fk : chs);
  (function go(v, p) {
    if (NOT_SHOWN.some((re) => re.test(p))) return;
    const fb = /^chapters\.(\w+)\.brief$/.exec(p); if (fb && focus.has(fb[1])) return;
    if (typeof v === 'string') { for (const line of v.split(/\n+/)) { const n = norm(line); if (n && !page.includes(n)) { errs.push('TEXT_MISSING ' + p); break; } } }
    else if (Array.isArray(v)) v.forEach((x, i) => go(x, p + '[' + i + ']'));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) go(x, p ? p + '.' + k : k);
  })(R, '');
  const ids = new Set(); walk(app, (n) => { if (n.nodeType === 1 && n.id) ids.add(n.id); });
  for (const k of Object.keys(R.chapters || {})) if (!ids.has('ch-' + k)) errs.push('CHAPTER_MISSING ' + k);
  const W = P.western && P.western.data, X = P.method || {};
  if (W) { if (!ids.has('a-west')) errs.push('PART_MISSING west'); for (const n of ['太阳', '月亮', '水星', '金星', '火星', '木星', '土星', '天王', '海王', '冥王']) if ((W.planets || []).some((p) => p.n === n) && !ids.has('w-' + n)) errs.push('PLANET_MISSING ' + n); }
  if (P.bazi && P.bazi.status === 'ok' && P.bazi.bazi && P.bazi.bazi.pillars) {
    if (!ids.has('a-bazi')) errs.push('PART_MISSING bazi');
    for (const k of ['year', 'month', 'day', 'hour']) { const pl = P.bazi.bazi.pillars[k]; if (pl && pl.gan && pl.zhi && !page.includes(pl.gan) ) errs.push('PILLAR_MISSING ' + k); }
  }
  if (X.persona && !ids.has('a-persona')) errs.push('PART_MISSING persona');
  const svgs = app.querySelectorAll('svg');
  if ((W || (P.bazi && P.bazi.status === 'ok' && X.bazi)) && !svgs.length) errs.push('FIGURE_MISSING');
  for (const s of svgs) if (!s.children.length) errs.push('FIGURE_EMPTY');
  if (typeof data.founder_qr === 'string' && !app.querySelectorAll('img').some((i) => i.className.split(/\s+/).includes('qr') && i.src.startsWith('data:image/png;base64,'))) errs.push('CONNECT_MISSING');
  return [...new Set(errs)];
}
