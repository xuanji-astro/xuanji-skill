// 印占盘图：在 Node 里跑网站同一份排版代码（engines/yz_chart.js），拿到盘线和字的 SVG；
// 盘面和边框用 SVG 自己画（白盘面、金边、四芒星），报告里不放图片。字宽没有浏览器可量，用一张近似字宽表。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('./engines/yz_chart.js', import.meta.url), 'utf8');

// 100px 时的近似字宽和墨迹上下沿（苹方／微软雅黑一类无衬线字体的量级）
function measureText(font, s) {
  const bold = /^(6|7|8|9)00/.test(font) ? 1.04 : 1;
  let w = 0, a = 0, d = 1;
  for (const c of String(s)) {
    if (/[⺀-鿿豈-﫿＀-￯　-〿]/.test(c)) { w += 100; a = Math.max(a, 86); d = Math.max(d, 12); }
    else if (/[A-Z]/.test(c)) { w += 66; a = Math.max(a, 72); }
    else if (/[0-9]/.test(c)) { w += 58; a = Math.max(a, 72); }
    else if (/[bdfhklt]/.test(c)) { w += 55; a = Math.max(a, 74); }
    else if (/[gjpqy]/.test(c)) { w += 55; a = Math.max(a, 54); d = Math.max(d, 21); }
    else if (/[a-z]/.test(c)) { w += 54; a = Math.max(a, 54); }
    else if (c === ':' || c === '.' || c === ',') { w += 28; a = Math.max(a, 52); }
    else if (c === ' ') w += 28;
    else if (c === '°') { w += 40; a = Math.max(a, 74); }
    else if (c === 'ᴿ') { w += 44; a = Math.max(a, 70); }
    else { w += 56; a = Math.max(a, 72); }
  }
  return { width: w * bold, actualBoundingBoxAscent: a, actualBoundingBoxDescent: d };
}

let YZ = null, CSS = '';
function load() {
  if (YZ) return YZ;
  const ctx2d = { font: '', measureText(s) { return measureText(this.font, s); } };
  const document = {
    createElement: (t) => (t === 'canvas' ? { getContext: () => ctx2d } : { set textContent(v) { CSS = v; }, get textContent() { return CSS; } }),
    head: { appendChild() {} },
  };
  const window = {};
  vm.runInNewContext(SRC, { window, document, console: { warn() {}, info() {} } }, { filename: 'yz_chart.js' });
  YZ = window.YZChart;
  return YZ;
}

// 盘面：白底、细金边、八颗四芒星（四角＋四边中点），位置跟网站轻版的宝石一样，排版代码按这几处留空
const L = 149, T = 157, R = 1104, B = 1090;
function star(x, y, r, fill) {
  const k = r * 0.22;
  return `<path d="M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z" fill="${fill}"/>`;
}
function plate(id, small, gold) {
  const g = gold ? '#c39a4a' : '#b08d4f', s = small ? 1.35 : 1, cx = (L + R) / 2, cy = (T + B) / 2;
  const pts = [[L, T], [cx, T], [R, T], [L, cy], [R, cy], [L, B], [cx, B], [R, B]];
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#f6f1e6"/></linearGradient></defs>` +
    `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" rx="${18 * s}" fill="url(#${id})" stroke="${g}" stroke-width="${5 * s}"/>` +
    `<rect x="${L + 16 * s}" y="${T + 16 * s}" width="${R - L - 32 * s}" height="${B - T - 32 * s}" rx="${10 * s}" fill="none" stroke="${g}" stroke-opacity=".45" stroke-width="${2 * s}"/>` +
    pts.map(([x, y], i) => star(x, y, (i % 2 === 0 && i !== 3 && i !== 4 ? 54 : 42) * s, g)).join('');
}

let seq = 0;
// o 跟网站 YZChart.render 的参数一样；small 是小盘（分盘格子），gold 是宫位未定的盘
export function chartSVG(o) {
  const yz = load(), el = { innerHTML: '', classList: { add() {}, toggle() {} } };
  yz.render(el, { ...o, theme: 'B', px: o.small ? 150 : (o.big ? 362 : 290) });
  const m = el.innerHTML.match(/<svg viewBox="0 0 1254 1254"( class="sm")?>([\s\S]*)<\/svg>/);
  if (!m) throw Error('CHART_FAILED');
  const id = 'yzp' + (++seq);
  return `<svg class="yzs${o.small ? ' sm' : ''}" viewBox="40 48 1174 1158" xmlns="http://www.w3.org/2000/svg" role="img">${plate(id, o.small, o.gold)}<g${m[1] ? ' class="sm"' : ''}>${m[2]}</g></svg>`;
}
export function chartCSS() { load(); return CSS.replace(/\.yz-chart svg\.sm /g, '.yzs.sm ').replace(/\.yz-chart\{[^}]*\}/g, '').replace(/\.yz-chart (svg|img)[^}]*\}/g, '').replace(/\.yz-chart /g, '.yzs '); }
export const ORDER = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
