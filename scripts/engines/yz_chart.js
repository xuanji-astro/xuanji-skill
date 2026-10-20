/* 印占盘组件（北印度菱形盘／南印度方盘），跟执天玄玑网站印占排盘页同一份排版代码。
   YZChart.render(el, {asc, items:[{key, sign, deg, retro, dignity}], marks, theme:'A'|'B', small, gold, style, nums, title, ascLabel, pro, karakas, px})
   盘线、宫号、座名、星都画在 1254 见方的坐标里；每个字按墨迹框摆，到盘线、别的字和边框都留够空，放不下先换行、再缩字。
   Skill 里由 scripts/vedic_chart.mjs 在 Node 里跑一遍拿 SVG，框用 SVG 自己画，不带图片。
   Copyright 2026 杭州强势播传文化影视传媒有限公司
   SPDX-License-Identifier: Apache-2.0 */
(function () {
  var CN = {sun:'日', moon:'月', mars:'火', mercury:'水', jupiter:'木', venus:'金', saturn:'土', rahu:'罗', ketu:'计'};
  var ORDER = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'];
  // 12 个宫格的字中心、星座号位置（400 见方）——现在只当「最想放的位置」，实际位置由量尺排版找离它最近、又留够空的地方
  var CELL = {1:[200,104],2:[100,42],3:[42,100],4:[105,200],5:[42,300],6:[100,358],7:[200,295],8:[300,358],9:[358,300],10:[295,200],11:[358,100],12:[300,42]};
  var SIGNPOS = {1:[200,178],2:[100,82],3:[82,100],4:[178,200],5:[82,300],6:[100,318],7:[200,222],8:[300,318],9:[318,300],10:[222,200],11:[318,100],12:[300,82]};
  var SMALLSIGN = {1:[200,150],2:[100,80],3:[80,100],4:[150,200],5:[80,300],6:[100,320],7:[200,250],8:[300,320],9:[320,300],10:[250,200],11:[320,100],12:[300,80]};
  var NPOLY = {1:[[200,0],[300,100],[200,200],[100,100]], 4:[[100,100],[200,200],[100,300],[0,200]], 7:[[200,200],[300,300],[200,400],[100,300]], 10:[[300,100],[400,200],[300,300],[200,200]],
    2:[[0,0],[200,0],[100,100]], 3:[[0,0],[100,100],[0,200]], 5:[[0,200],[100,300],[0,400]], 6:[[0,400],[100,300],[200,400]],
    8:[[200,400],[300,300],[400,400]], 9:[[400,400],[300,300],[400,200]], 11:[[400,200],[300,100],[400,0]], 12:[[400,0],[300,100],[200,0]]};
  var IMG = 1254, L = 149, T = 157, R = 1104, B = 1090;
  var mx = function (x) { return L + x / 400 * (R - L); }, my = function (y) { return T + y / 400 * (B - T); };
  var DCLS = {exalted:'ex', own:'own', debilitated:'deb'};
  var AB = {sun:'Su', moon:'Mo', mars:'Ma', mercury:'Me', jupiter:'Ju', venus:'Ve', saturn:'Sa', rahu:'Ra', ketu:'Ke'};
  var SAB_PRO = ['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi'];
  var SOUTH = {11:[0,0],0:[0,1],1:[0,2],2:[0,3],3:[1,3],4:[2,3],5:[3,3],6:[3,2],7:[3,1],8:[3,0],9:[2,0],10:[1,0]};   // 星座 → [行, 列]
  var SABBR = ['羊','牛','双','蟹','狮','女','秤','蝎','射','摩','瓶','鱼'];
  function dmc(deg) { var d = Math.floor(deg), m = Math.floor((deg - d) * 60 + 1e-6); return (d < 10 ? '0' : '') + d + ':' + (m < 10 ? '0' : '') + m; }
  function numCls(n) { return n >= 28 ? ' hi' : (n < 25 ? ' lo' : ''); }   // 八分力：28 分以上偏强、25 分以下偏弱（通行口径）

  // ---------- 量尺排版 ----------
  // 边框、宝石、盘面金边：素材 alpha>40（金边按颜色）量出来，按 2 单位一格存成游程（149..1104 × 157..1090）
  var MASK = {"nx":478,"ny":467,"S":2,"A":"0.4h3.b.j.1u.2.6.a.15.16.e.d.2j.2.f.3.j.7.6.2m.4t.14.4t.2j.4v.13.4u.2g.4y.11.4x.2d.4z.10.4z.2b.51.y.52.27.53.y.53.25.55.w.56.22.56.w.57.1z.58.w.59.1v.5b.v.5a.1r.5e.v.5d.1m.5g.v.5f.1k.5g.v.5g.1j.5g.u.5h.1j.5g.u.5g.1l.5f.u.5g.1l.5f.u.5f.1m.5g.t.5f.1n.5g.q.5h.1n.5i.m.5i.1o.5j.k.5k.1m.5l.i.5l.1m.5m.g.5m.1m.5m.f.5o.1k.5o.e.5p.1h.5s.b.5s.18.3.3.5t.a.5t.3.3.12.2.4.5t.a.5t.3.5.z.3.4.5u.9.5t.3.5.z.3.4.5u.9.5t.4.5.x.4.5.5s.a.5t.4.6.w.3.6.5s.a.5s.6.5.v.4.7.5q.c.5q.8.4.u.4.8.5q.d.5p.8.4.u.5.7.5p.f.5o.8.4.u.5.6.5p.h.5o.6.6.t.6.5.5p.h.5o.5.7.s.8.3.5q.g.5q.4.7.s.8.2.5s.e.5s.2.8.s.9.1.5t.c.5t.1.a.q.65.a.65.q.65.a.65.q.66.8.67.p.66.8.67.p.67.6.68.o.68.6.69.m.69.6.69.m.6a.4.6a.l.6b.4.6b.k.6b.4.6b.k.6b.4.6c.i.6c.4.6c.i.6c.4.6d.g.6d.4.6d.g.6e.3.6e.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.e.cw.f.cv.f.cv.f.cv.f.cv.f.cv.e.cw.e.cw.e.cw.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cu.g.cu.h.cs.i.cs.j.cq.k.cq.l.co.m.co.m.co.n.cn.n.cn.n.cm.o.cm.p.cl.p.cl.p.cl.o.cm.o.cm.o.cm.o.cm.o.cn.m.co.m.co.m.cp.k.cq.k.cr.i.ct.h.ct.g.cu.g.cv.f.cu.g.cu.g.cu.h.ct.h.cs.i.cs.j.cr.j.cq.k.cq.l.cp.m.cn.n.cm.p.cl.q.cj.s.ch.u.cf.w.cd.z.c9.14.bz.3.1.1b.bu.1h.bs.1j.bq.1l.bo.1m.bo.1n.bm.1o.b7.1.e.1q.b.3.ap.4.b.1u.8.6.am.6.9.1x.5.8.aj.a.5.2e.ag.2w.ac.31.a6.3b.9r.3s.9a.40.9a.3r.9s.3b.a6.31.ac.2w.ah.2d.6.8.ak.8.5.1x.9.6.an.5.9.1t.b.3.aq.3.b.1r.bk.1p.bm.1n.bo.1l.bq.1k.br.1i.bs.1i.bt.1g.bu.19.c8.10.cd.v.cg.t.ci.r.ck.q.ck.p.cm.n.co.m.cp.k.cq.k.cr.i.cs.i.ct.g.cu.g.cu.g.cu.g.cu.g.cu.g.cu.g.cu.g.cu.h.cs.i.cs.j.cq.k.cq.l.co.m.co.n.cn.n.cm.o.cm.o.cm.o.cm.p.cl.p.cl.o.cm.o.cm.o.cm.o.cm.o.cn.n.cn.m.co.m.cp.l.cp.k.cq.k.cr.i.ct.h.ct.g.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.e.cw.e.cw.e.cw.e.cw.e.cw.e.cw.e.cw.e.cw.e.cw.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.cv.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.2.6f.f.6e.3.6e.f.6e.3.6e.f.6d.4.6d.h.6c.4.6d.h.6c.4.6c.i.6c.4.6c.j.6b.4.6b.k.6b.5.6a.l.69.6.69.m.69.6.69.m.69.6.69.m.69.7.68.n.67.8.67.o.67.8.67.o.66.a.66.o.66.b.64.q.64.c.64.q.63.e.63.q.62.g.61.s.61.h.60.s.61.g.61.s.62.e.62.s.63.d.61.u.63.b.62.u.63.a.63.u.63.a.62.v.64.9.62.w.63.9.61.y.62.9.60.10.60.a.60.11.3.2.5t.c.5t.2.3.12.3.2.5r.g.5r.3.2.13.2.3.5q.g.5q.4.1.19.5q.h.5p.1f.5o.j.5n.1h.5m.l.5l.1k.5i.o.5j.1l.5h.q.5h.1n.5f.s.5g.1n.5e.u.5f.1n.5e.v.5e.1n.5d.w.5e.1n.5d.w.5e.1n.5e.v.5e.1n.5e.u.5f.1o.5d.u.5d.1s.5b.u.58.21.57.v.56.23.55.w.55.24.55.w.54.28.51.y.52.2a.50.y.51.2c.4y.10.4y.2e.4x.12.4v.2j.4t.14.4t.2l.4r.16.4d.3.b.2o.5.a.3h.6.l.19.l.7.3h.a.5.38.39.g.f.1c.g.f.3a.3r.35.k.b.1g.c.j.37.4a.o.2.6.m.3.7.3.2.4.c.1.2.5.o.7.1k.8.n.g.3.26.2.c.305","B":"0.4go.1.d.c.j.1u.2.6.a.s.2a.2j.2.f.3.z.29.4p.1y.4p.1t.4u.1y.4s.1n.4w.20.4t.1k.4x.20.4w.1g.4y.20.4w.1g.4y.20.4x.1e.50.1z.4x.1e.50.1y.4z.1c.51.1y.4z.1b.53.1w.51.19.54.1v.54.16.56.1s.58.13.58.1q.5a.11.5a.1o.5c.z.5c.1m.5d.x.5f.1k.5f.v.5h.1j.5g.t.5j.1h.5i.s.5k.1f.5k.q.5m.1e.5l.n.5o.1d.5n.l.5q.1b.5q.i.5s.19.5r.i.5t.17.5t.g.5v.15.5v.e.5x.13.5w.d.5z.11.5y.c.61.y.5z.b.63.w.61.a.64.u.63.9.65.t.63.9.65.s.64.8.67.p.66.8.68.n.67.8.69.l.68.8.6a.j.69.8.6a.j.69.8.6b.h.6a.8.6b.h.6a.8.6c.f.6c.6.6e.e.6c.6.6e.d.6d.6.6f.c.6d.6.6g.a.6e.6.6g.a.6e.6.6h.8.6f.6.6h.8.6f.6.6i.6.6g.6.6i.6.6g.6.6i.5.6h.6.6i.4.6i.6.6j.3.6i.6.6k.1.6j.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d2.9.d1.9.d1.9.d1.9.d1.9.d0.a.d0.b.cz.b.cz.b.cy.c.cy.c.cy.d.cw.e.cw.e.cv.g.cu.h.cs.i.cr.k.cq.l.co.m.cn.o.cl.q.cj.r.ci.t.cf.w.cd.z.c9.12.c6.15.c4.18.c2.1a.bz.1c.by.1d.bx.1d.bw.1e.bw.1f.bu.1g.bu.1h.bs.1i.br.1k.bq.1l.bo.1m.bm.1p.bk.1r.bi.1t.bg.1v.bd.1z.b9.22.b4.28.b0.2c.au.2i.ao.2p.ae.30.a5.3b.9z.3j.9r.3l.9u.3h.a0.39.a5.32.ac.2r.an.2h.aw.29.b2.25.b6.22.b9.20.ba.1z.bb.1z.bb.1z.bb.1z.bb.20.ba.20.ba.20.bb.1z.bb.1z.bc.1y.bc.1x.be.1w.be.1v.bg.1t.bh.1t.bi.1r.bj.1q.bl.1o.bm.1o.bn.1m.bp.1k.bq.1j.bs.1h.bv.1e.bx.1c.bz.1a.c2.17.c4.16.c4.14.c7.12.c9.10.cc.x.ce.v.cf.u.ch.s.cj.q.cl.o.cm.n.co.l.cq.k.cr.i.cs.h.cu.f.cw.d.cx.d.cy.b.d0.a.d0.9.d1.8.d2.7.d3.7.d3.7.d3.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.6.d4.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.7.d3.6.d4.6.d4.6.d4.6.6l.1.6i.6.6k.3.6h.6.6j.4.6h.6.6j.4.6h.6.6j.4.6h.6.6j.4.6h.6.6j.5.6g.6.6j.5.6g.6.6i.6.6g.6.6i.6.6g.6.6i.6.6g.6.6i.6.6g.6.6i.6.6g.6.6i.7.6f.6.6i.7.6f.6.6h.8.6f.6.6h.8.6f.6.6h.8.6f.6.6h.8.6f.6.6h.9.6e.6.6h.9.6e.6.6g.a.6e.6.6g.a.6e.6.6g.b.6d.7.6e.c.6d.7.6e.d.6c.7.6e.d.6c.7.6e.d.6b.8.6d.f.6a.8.6d.f.6a.9.6b.h.68.a.6a.i.68.a.6a.j.67.b.68.k.67.b.67.m.65.d.65.o.64.d.65.p.62.e.64.r.61.f.61.u.5z.g.60.w.5y.h.5y.y.5w.j.5v.12.5t.k.5t.16.5r.l.5q.1a.5o.m.5q.1b.5m.o.5o.1c.5l.q.5n.1c.5l.r.5m.1c.5k.t.5k.1e.5i.v.5j.1e.5h.x.5i.1e.5g.z.5g.1g.5e.12.5d.1i.5b.15.5c.1i.5a.19.58.1k.57.1c.56.1m.55.1f.53.1o.52.1j.50.1q.4x.1p.4x.1s.4u.1y.4p.1u.4o.3g.o.2.6.m.3.7.3.2.4.c.1.2.v.1w.2.m.g.3.26.2.10.2zh"};
  var NOMW = {A: 362, B: 290, s: 150};          // 手机上 1 倍图的盘宽（px）
  var GAP_PX = 3.0;                              // 字到线、宫号、边框、宝石的留白（1 倍图 px；格子量化另多留 2.8 单位）
  var PGAP_PX = 2.0;                             // 同一格里星和星之间（约一个空格宽；验收线 1.5px）
  var FPX = {big: [9, 12.5], small: [7, 8.5]};   // 星字号下限、上限（1 倍图 px）
  var FPX_TIGHT = {big: 8, small: 6};             // 一格挤了四五颗、到下限还放不下时才用的最后一档
  var RELAX_PX = [2.5, 2, 1.5, 1];                // 再放不下，这一格的留白按这几档退
  var FAM = '-apple-system,system-ui,"PingFang SC","Helvetica Neue",sans-serif';
  var _cv = null, _tm = {}, _mk = {};
  function tm(s, wt) {                           // 100px 时的字宽和墨迹上下沿
    var key = wt + '|' + s; if (_tm[key]) return _tm[key];
    if (!_cv) _cv = document.createElement('canvas').getContext('2d');
    _cv.font = wt + ' 100px ' + FAM; var m = _cv.measureText(s);
    return (_tm[key] = {w: m.width, a: m.actualBoundingBoxAscent || 0, d: m.actualBoundingBoxDescent || 0});
  }
  // 一个字块＝几段（星名、角色小标、度数），每段自己的字号比例、上移、前空
  function measure(lab, f) {
    var x = 0, a = 0, d = 0;
    lab.parts.forEach(function (p) {
      var q = tm(p.s, p.wt), k = f * (p.k || 1) / 100, dy = (p.dy || 0) * f;
      x += (p.dx || 0) * f;
      a = Math.max(a, q.a * k - dy); d = Math.max(d, q.d * k + dy); x += q.w * k;
    });
    return {w: x, a: a, d: d};
  }
  function textOf(lab, f, x0, yb) {
    var s = '<text class="fx ' + lab.cls + '" x="' + x0.toFixed(1) + '" y="' + yb.toFixed(1) + '" style="font-size:' + f.toFixed(1) + 'px">', dy0 = 0;
    lab.parts.forEach(function (p) {
      var dy = (p.dy || 0) * f, attr = '';
      if (p.dx) attr += ' dx="' + (p.dx * f).toFixed(1) + '"';
      if (dy !== dy0) attr += ' dy="' + (dy - dy0).toFixed(1) + '"';
      dy0 = dy;
      s += '<tspan' + (p.c ? ' class="' + p.c + '"' : '') + attr + ' style="font-size:' + (f * (p.k || 1)).toFixed(1) + 'px;font-weight:' + p.wt + '">' + p.s + '</tspan>';
    });
    return s + '</text>';
  }
  function baseMask(th) {
    if (_mk[th]) return _mk[th];
    var g = new Uint8Array(MASK.nx * MASK.ny), runs = MASK[th].split('.'), p = 0, v = 0;
    for (var i = 0; i < runs.length; i++) { var n = parseInt(runs[i], 36); if (v) g.fill(1, p, p + n); p += n; v ^= 1; }
    return (_mk[th] = g);
  }
  var _room = {}, _anc = {};
  function Room(o, key, segs) {                   // 底：素材＋盘线，同一种盘只量一次
    var th = o.theme === 'A' ? 'A' : 'B', upx = upxOf(o), k = key + '|' + th + '|' + upx.toFixed(3);
    if (_room[k]) return _room[k];
    var G = {nx: MASK.nx, ny: MASK.ny, S: MASK.S, b: baseMask(th).slice(), upx: upx, m: GAP_PX * upx, pg: PGAP_PX * upx};
    segs.forEach(function (q) { addSeg(G, q[0], q[1], q[2], q[3], q[4] + 0.3 * upx); });   // 线边上抗锯齿再让 0.3px
    prep(G); G.b = null;
    return (_room[k] = G);
  }
  function addSeg(G, x1, y1, x2, y2, hw) {
    var S = G.S, r = hw + S * 0.71, dx = x2 - x1, dy = y2 - y1, ll = dx * dx + dy * dy || 1;
    var i0 = Math.max(0, Math.floor((Math.min(x1, x2) - r - L) / S)), i1 = Math.min(G.nx - 1, Math.floor((Math.max(x1, x2) + r - L) / S));
    var j0 = Math.max(0, Math.floor((Math.min(y1, y2) - r - T) / S)), j1 = Math.min(G.ny - 1, Math.floor((Math.max(y1, y2) + r - T) / S));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var cx = L + (i + 0.5) * S, cy = T + (j + 0.5) * S, t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / ll));
      var ex = cx - x1 - t * dx, ey = cy - y1 - t * dy;
      if (ex * ex + ey * ey <= r * r) G.b[j * G.nx + i] = 1;
    }
  }
  // 精确欧氏距离变换（Felzenszwalb），再按「离障碍够不够 m」做成积分图，任一框 O(1) 判
  function prep(G) {
    var nx = G.nx, ny = G.ny, n = Math.max(nx, ny), INF = 1e20;
    var g = new Float64Array(nx * ny), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    for (var i = 0; i < nx * ny; i++) g[i] = G.b[i] ? 0 : INF;
    function dt(len) {
      var k = 0, q, s; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (q = 1; q < len; q++) {
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      for (k = 0, q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
    }
    var x, y;
    for (x = 0; x < nx; x++) { for (y = 0; y < ny; y++) f[y] = g[y * nx + x]; dt(ny); for (y = 0; y < ny; y++) g[y * nx + x] = d[y]; }
    for (y = 0; y < ny; y++) { for (x = 0; x < nx; x++) f[x] = g[y * nx + x]; dt(nx); for (x = 0; x < nx; x++) g[y * nx + x] = d[x]; }
    G.D = g; G.I = integral(G, G.m);
  }
  function integral(G, m) {                       // 离障碍不到 m 的格子记 1，做积分图
    var nx = G.nx, ny = G.ny, g = G.D, thr = (m + G.S * 1.42) / G.S, t2 = thr * thr, I = new Int32Array((nx + 1) * (ny + 1));
    for (var y = 0; y < ny; y++) { var run = 0; for (var x = 0; x < nx; x++) { run += g[y * nx + x] < t2 ? 1 : 0; I[(y + 1) * (nx + 1) + x + 1] = I[y * (nx + 1) + x + 1] + run; } }
    return I;
  }
  function view(G, mpx, pgpx) {                   // 同一张底，换一档留白
    var k = mpx + '|' + pgpx; G.views = G.views || {};
    if (!G.views[k]) G.views[k] = {nx: G.nx, ny: G.ny, S: G.S, D: G.D, upx: G.upx, m: mpx * G.upx, pg: pgpx * G.upx, I: integral(G, mpx * G.upx)};
    return G.views[k];
  }
  function boxOK(G, bx) {
    var S = G.S, i0 = Math.floor((bx[0] - L) / S), i1 = Math.floor((bx[2] - L) / S), j0 = Math.floor((bx[1] - T) / S), j1 = Math.floor((bx[3] - T) / S);
    if (i0 < 0 || j0 < 0 || i1 >= G.nx || j1 >= G.ny) return false;
    var W = G.nx + 1, I = G.I;
    return I[(j1 + 1) * W + i1 + 1] - I[j0 * W + i1 + 1] - I[(j1 + 1) * W + i0] + I[j0 * W + i0] === 0;
  }
  function boxClear(G, bx) {                      // 框到素材和盘线的最小距离（单位，抽 5×4 个点，只给放不下时挑位置用）
    var S = G.S, best = 1e9;
    for (var a = 0; a <= 4; a++) for (var b = 0; b <= 3; b++) {
      var x = bx[0] + (bx[2] - bx[0]) * a / 4, y = bx[1] + (bx[3] - bx[1]) * b / 3, i = Math.floor((x - L) / S), j = Math.floor((y - T) / S);
      if (i < 0 || j < 0 || i >= G.nx || j >= G.ny) return -1e9;
      best = Math.min(best, G.D[j * G.nx + i]);
    }
    return Math.sqrt(best) * S - S * 1.42;
  }
  function rr(a, b) { var dx = Math.max(b[0] - a[2], a[0] - b[2], 0), dy = Math.max(b[1] - a[3], a[1] - b[3], 0); return Math.sqrt(dx * dx + dy * dy); }
  function ps(px, py, q) { var dx = q[2] - q[0], dy = q[3] - q[1], t = Math.max(0, Math.min(1, ((px - q[0]) * dx + (py - q[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - q[0] - t * dx, py - q[1] - t * dy); }
  function rs(b, q) {                             // 框到线段
    var c = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]], d = 1e9, i;
    for (i = 0; i < 4; i++) d = Math.min(d, ps(c[i][0], c[i][1], q));
    for (i = 0; i < 2; i++) { var px = q[i * 2], py = q[i * 2 + 1]; if (px >= b[0] && px <= b[2] && py >= b[1] && py <= b[3]) return 0; d = Math.min(d, rr(b, [px, py, px, py])); }
    return d;
  }
  function inPoly(P, x, y) {
    var c = false;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    }
    return c;
  }
  function anchors(P, ideal, st, win) {
    var key = P.map(function (p) { return p[0].toFixed(0) + ',' + p[1].toFixed(0); }).join(';') + '|' + ideal[0].toFixed(0) + ',' + ideal[1].toFixed(0) + '|' + st + '|' + (win || 0);
    if (_anc[key]) return _anc[key];
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, A = [];
    P.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    for (var y = y0; y <= y1; y += st) for (var x = x0; x <= x1; x += st) {
      var dd = (x - ideal[0]) * (x - ideal[0]) + (y - ideal[1]) * (y - ideal[1]);
      if ((!win || dd <= win * win) && inPoly(P, x, y)) A.push([x, y, dd]);
    }
    A.sort(function (a, b) { return a[2] - b[2]; });
    return (_anc[key] = A);
  }
  // 在一个格子（多边形，1254 坐标）里给一组字块找位置：字号从大到小，每个字号试 1～n 行，取离「最想放的点」最近的。
  // opt：rows 一块一行｜align 'l'/'r' 靠宽边｜rev 长的行放下面｜res 已占的框｜segs 别的线段 [x1,y1,x2,y2,半宽]｜pgap 同格字间距
  function fit(G, labs, P, ideal, fr, opt) {
    opt = opt || {};
    var A = anchors(P, ideal, opt.step || Math.max(G.S * 2, Math.round(G.upx * 0.8)), opt.win), n = labs.length, fs = [], f, res = opt.res || [], segs = opt.segs || [];
    for (f = fr[1]; f > fr[0] * 1.001; f *= 0.93) fs.push(f);
    fs.push(fr[0]);
    function layout(f, r) {                       // 每个字块相对块中心的墨迹框和基线
      var pg = opt.pgap != null ? opt.pgap : G.m, M = labs.map(function (l) { return measure(l, l.abs || f * (l.rel || 1)); });
      var hg = Math.max(pg, 0.3 * f), vg = Math.max(pg, 0.25 * f), sgap = G.m + 0.25 * G.upx;   // 星和宫号挨着时留 3px
      var gapH = function (a, b) { return labs[a].sign || labs[b].sign ? Math.max(sgap, hg) : hg; };
      var rows = [], i = 0, nn = opt.signRow ? n - opt.signRow : n, per = Math.ceil(nn / r);
      for (var k = 0; k < r && i < nn; k++) { var c = opt.rows ? 1 : Math.min(per, nn - i); rows.push([i, i + c]); i += c; per = Math.ceil((nn - i) / Math.max(1, r - k - 1)); }
      if (opt.signRow) rows.push([nn, n]);          // 宫号自己一行，排在最后
      var H = 0, Wm = 0, rw = rows.map(function (q) {
        var w = 0, a = 0, d = 0, sg = false;
        for (var t = q[0]; t < q[1]; t++) { w += M[t].w + (t > q[0] ? gapH(t - 1, t) : 0); a = Math.max(a, M[t].a); d = Math.max(d, M[t].d); sg = sg || !!labs[t].sign; }
        Wm = Math.max(Wm, w); return {s: q[0], e: q[1], w: w, a: a, d: d, sg: sg};
      });
      if (opt.rev) rw.reverse();
      var gapV = function (p, q) { return p.sg || q.sg ? Math.max(sgap, vg) : vg; };
      rw.forEach(function (q, k) { H += q.a + q.d + (k ? gapV(rw[k - 1], q) : 0); });
      var out = [], yy = -H / 2;
      rw.forEach(function (q, k) {
        if (k) yy += gapV(rw[k - 1], q);
        var xx = opt.align === 'l' ? -Wm / 2 : (opt.align === 'r' ? Wm / 2 - q.w : -q.w / 2), yb = yy + q.a;
        for (var t = q.s; t < q.e; t++) {
          if (t > q.s) xx += gapH(t - 1, t);
          out.push({i: t, f: labs[t].abs || f * (labs[t].rel || 1), x: xx, yb: yb, bx: [xx, yb - M[t].a, xx + M[t].w, yb + M[t].d]}); xx += M[t].w;
        }
        yy += q.a + q.d;
      });
      return out;
    }
    function okBox(bx) {
      if (!inPoly(P, (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2) || !boxOK(G, bx)) return false;
      for (var i = 0; i < res.length; i++) if (rr(bx, res[i]) < G.m + 0.25 * G.upx) return false;
      for (i = 0; i < segs.length; i++) if (rs(bx, segs[i]) < G.m + segs[i][4] + 0.3 * G.upx) return false;
      return true;
    }
    function tryAt(lay, a) {
      for (var q = 0; q < lay.length; q++) { var b = lay[q].bx; if (!okBox([a[0] + b[0], a[1] + b[1], a[0] + b[2], a[1] + b[3]])) return false; }
      return true;
    }
    for (var fi = 0; fi < fs.length; fi++) {
      var best = null;
      for (var r = opt.rows ? n : 1; r <= (opt.signRow ? n - opt.signRow : n); r++) {
        var lay = layout(fs[fi], r), bw = 0, bh = 0;
        lay.forEach(function (l) { bw = Math.max(bw, Math.abs(l.bx[0]), Math.abs(l.bx[2])); bh = Math.max(bh, Math.abs(l.bx[1]), Math.abs(l.bx[3])); });
        if (2 * bw > P.W || 2 * bh > P.H) continue;
        for (var k = 0; k < A.length && (!best || k < best.k); k++) if (tryAt(lay, A[k])) { best = {k: k, lay: lay, a: A[k]}; break; }
      }
      if (best) return place(best.lay, best.a, true);
    }
    if (opt.quick) return {ok: false, items: []};
    // 下限也放不下：挑最不挤的（验收会量出来）
    var worst = null;
    for (var r2 = opt.rows ? n : 1; r2 <= (opt.signRow ? n - opt.signRow : n); r2++) {
      var lay0 = layout(fr[0], r2);
      for (var k2 = 0; k2 < A.length; k2 += 4) {
        var c = 1e9, a2 = A[k2];
        lay0.forEach(function (l) {
          var b = l.bx, bx = [a2[0] + b[0], a2[1] + b[1], a2[0] + b[2], a2[1] + b[3]];
          if (!inPoly(P, (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2)) { c = -1e9; return; }
          c = Math.min(c, boxClear(G, bx));
          res.forEach(function (q) { c = Math.min(c, rr(bx, q)); });
          segs.forEach(function (q) { c = Math.min(c, rs(bx, q) - q[4]); });
        });
        if (!worst || c > worst.c) worst = {c: c, a: a2, lay: lay0};
      }
    }
    return place(worst.lay, worst.a, false);
    function place(lay, a, ok) {
      return {ok: ok, items: lay.map(function (l) { return {lab: labs[l.i], f: l.f, x0: a[0] + l.x, yb: a[1] + l.yb, bx: [a[0] + l.bx[0], a[1] + l.bx[1], a[0] + l.bx[2], a[1] + l.bx[3]]}; })};
    }
  }
  function emit(out, res) { res.items.forEach(function (it) { out.push(textOf(it.lab, it.f, it.x0, it.yb)); }); }
  function boxes(r) { return r ? r.items.map(function (it) { return it.bx; }) : []; }
  function labTxt(labs) { return labs.map(function (l) { return l.parts.map(function (p) { return p.s; }).join(''); }).join(' '); }
  // houses：[{P, sign:[字块], signIdeal, signFr, win, pl:[字块], ideal, fr, frT, align, rev, segs}]
  // 每格依次试：宫号先摆再摆星 → 先摆星再给宫号找地方 → 宫号和星排进同一块；正常字号不行再用 FPX_TIGHT；
  // 3px 怎么都放不下（小盘一格四五颗）才把这一格的留白退到 RELAX_PX（星距 1.2px），验收单独列出
  function tryHouse(G, h, fr, sk) {
    var po = {pgap: G.pg, align: h.align, rev: h.rev, segs: h.segs, quick: 1};
    if (!h.sign) { var p0 = fit(G, h.pl, h.P, h.ideal, fr, po); return p0.ok ? {p: p0} : null; }
    var sfr = [h.signFr[sk], h.signFr[1]];
    var s1 = fit(G, h.sign, h.P, h.signIdeal, sfr, {rows: true, win: h.win, segs: h.segs, quick: 1});
    if (s1.ok) { var p1 = fit(G, h.pl, h.P, h.ideal, fr, Object.assign({res: boxes(s1)}, po)); if (p1.ok) return {s: s1, p: p1}; }
    var p2 = fit(G, h.pl, h.P, h.ideal, fr, po);
    if (p2.ok) { var s2 = fit(G, h.sign, h.P, h.signIdeal, sfr, {rows: true, segs: h.segs, res: boxes(p2), quick: 1}); if (s2.ok) return {s: s2, p: p2}; }
    var sg = h.sign.map(function (l) { return {cls: l.cls, parts: l.parts, abs: h.signFr[sk] * (l.rel || 1), sign: 1}; });
    var j = fit(G, h.pl.concat(sg), h.P, h.ideal, fr, Object.assign({signRow: sg.length}, po));   // 宫号自己一行，跟星排成一块
    if (!j.ok) j = fit(G, h.pl.concat(sg), h.P, h.ideal, fr, po);                                  // 还不行才让宫号跟星同一行
    if (j.ok) return {s: {ok: true, items: j.items.filter(function (it) { return it.lab.sign; })}, p: {ok: true, items: j.items.filter(function (it) { return !it.lab.sign; })}};
    return null;
  }
  function layoutChart(G, H, out) {
    H.forEach(function (h) {
      var got = null, tag = '';
      if (!h.pl || !h.pl.length) {
        var s0 = fit(G, h.sign, h.P, h.signIdeal, h.signFr, {rows: true, win: h.win, segs: h.segs});
        emit(out, s0); if (!s0.ok && window.console) console.warn('yz-chart: 放不下 ' + labTxt(h.sign));
        return;
      }
      got = tryHouse(G, h, h.fr, 1) || tryHouse(G, h, [h.frT, h.fr[0]], 1) || tryHouse(G, h, [h.frT, h.fr[0]], 0);
      for (var mi = 0; !got && mi < RELAX_PX.length; mi++) {
        var V = view(G, RELAX_PX[mi], 1.2);
        got = tryHouse(V, h, [h.frT, h.fr[0]], 1) || tryHouse(V, h, [h.frT, h.fr[0]], 0);
        if (got) tag = RELAX_PX[mi];
      }
      if (got) {
        if (got.s) emit(out, got.s); emit(out, got.p);
        var fmin = Math.min.apply(null, got.p.items.map(function (it) { return it.f; }));
        if (window.console && (tag || fmin < h.fr[0] - 0.01)) console.info('yz-chart: 挤 ' + labTxt(h.pl) + (tag ? ' 留白 ' + tag + 'px' : '') + ' 字 ' + (fmin / G.upx).toFixed(1) + 'px');
        return;
      }
      var s9 = h.sign ? fit(G, h.sign, h.P, h.signIdeal, h.signFr, {rows: true, win: h.win, segs: h.segs}) : null;
      var p9 = fit(G, h.pl, h.P, h.ideal, [h.frT, h.fr[0]], {pgap: G.pg, align: h.align, rev: h.rev, segs: h.segs, res: boxes(s9)});
      if (s9) emit(out, s9); emit(out, p9);
      if (window.console) console.warn('yz-chart: 放不下 ' + labTxt(h.pl));
    });
  }

  // 一颗星在盘里写什么：白话＝「火17°」；术语＝「Ma 17:36」＋角色小标
  function planetLab(k, p, o, small) {
    var R = !small && p.retro && k !== 'rahu' && k !== 'ketu', cls = 'yz-pl ' + (DCLS[p.dignity] || ''), deg = !small && p.deg != null;
    if (!o.pro) return {cls: cls, parts: [{s: CN[k] + (deg ? Math.floor(p.deg) + '°' : '') + (R ? 'ᴿ' : ''), wt: 500}]};
    var kk = o.karakas && o.karakas[k], parts = [{s: AB[k] + (R ? 'ᴿ' : ''), wt: 500}];
    if (kk && !small) parts.push({s: kk, wt: 700, k: 0.55, dy: -0.45, c: 'yz-kk', dx: 0.04});
    if (deg) parts.push({s: dmc(p.deg), wt: 500, dx: 0.28});
    return {cls: cls, parts: parts};
  }
  function markLab(m) { return {cls: 'yz-pl yz-mk ' + (m.cls || ''), parts: [{s: m.s, wt: 600}]}; }
  function upxOf(o) { return IMG / (o.px > 60 ? Math.min(o.px, o.small ? 200 : 400) : (o.small ? NOMW.s : NOMW[o.theme === 'A' ? 'A' : 'B'])); }   // o.px：页面量到的盘宽；量不到（收起来的）按手机最窄算
  function frange(o) { var r = FPX[o.small ? 'small' : 'big'], u = upxOf(o); return [r[0] * u, r[1] * u]; }
  function ftight(o) { return FPX_TIGHT[o.small ? 'small' : 'big'] * upxOf(o); }
  function poly4(P) { var Q = P.map(function (p) { return [mx(p[0]), my(p[1])]; }), xs = Q.map(function (p) { return p[0]; }), ys = Q.map(function (p) { return p[1]; }); Q.W = Math.max.apply(null, xs) - Math.min.apply(null, xs); Q.H = Math.max.apply(null, ys) - Math.min.apply(null, ys); return Q; }

  // ---------- 北印度菱形盘 ----------
  function svg(o) {
    if (o.style === 'south') return svgSouth(o);
    var small = !!o.small, cx = (L + R) / 2, cy = (T + B) / 2, out = [], lw = small ? 5 : 3.2;
    out.push('<g class="yz-ln"><path d="M' + L + ' ' + T + 'L' + R + ' ' + B + 'M' + R + ' ' + T + 'L' + L + ' ' + B +
      'M' + cx + ' ' + T + 'L' + R + ' ' + cy + 'L' + cx + ' ' + B + 'L' + L + ' ' + cy + 'Z"/></g>');
    var G = Room(o, 'n', [[L, T, R, B], [R, T, L, B], [cx, T, R, cy], [R, cy, cx, B], [cx, B, L, cy], [L, cy, cx, T]].map(function (q) { return q.concat(lw / 2 + 0.6); }));
    var cells = {};
    ORDER.forEach(function (k) {
      var p = (o.items || []).find(function (it) { return it.key === k; }); if (!p) return;
      var hh = ((p.sign - o.asc) % 12 + 12) % 12 + 1;
      (cells[hh] = cells[hh] || []).push(planetLab(k, p, o, small));
    });
    (o.marks || []).forEach(function (m) { var hh = ((m.sign - o.asc) % 12 + 12) % 12 + 1; (cells[hh] = cells[hh] || []).push(markLab(m)); });
    var H = [];
    for (var h = 1; h <= 12; h++) {
      var s = (o.asc + h - 1) % 12, sp = small ? SMALLSIGN[h] : SIGNPOS[h], P = poly4(NPOLY[h]), sign = [];
      if (h === 1 && !small) sign.push({cls: 'yz-asc', parts: [{s: o.ascLabel || '上升', wt: 400}], rel: 30 / 34});
      sign.push({cls: 'yz-sn' + (h === 1 ? ' a1' : ''), parts: [{s: String(s + 1), wt: h === 1 ? 600 : 400}], rel: 1});
      var sfr = small ? (h === 1 ? [56, 64] : [50, 56]) : [30, 34];
      var wide = {2: 't', 12: 't', 6: 'b', 8: 'b', 3: 'l', 5: 'l', 9: 'r', 11: 'r'}[h];
      var item = {P: P, sign: sign, signIdeal: h === 1 && !small ? [mx(200), my(166)] : [mx(sp[0]), my(sp[1])], signFr: sfr, win: 320, align: wide === 'l' ? 'l' : (wide === 'r' ? 'r' : null), rev: wide === 'b'};
      if (o.nums) { item.pl = [{cls: 'yz-num' + numCls(o.nums[s]), parts: [{s: String(o.nums[s]), wt: 600}], rel: 1}]; item.ideal = [mx(CELL[h][0]), my(h === 1 ? 110 : CELL[h][1])]; item.fr = [44, 62]; item.frT = 40; }
      else if (cells[h]) { item.pl = cells[h]; item.ideal = [mx(CELL[h][0]), my(CELL[h][1])]; item.fr = frange(o); item.frT = ftight(o); }
      H.push(item);
    }
    layoutChart(G, H, out);
    return '<svg viewBox="0 0 ' + IMG + ' ' + IMG + '"' + (small ? ' class="sm"' : '') + '>' + out.join('') + '</svg>';
  }

  // ---------- 南印度方盘 ----------
  function svgSouth(o) {
    var small = !!o.small, out = [], lw = small ? 5 : 3.2, X = mx, Y = my;
    var segs = [[0, 100, 400, 100], [0, 300, 400, 300], [100, 0, 100, 400], [300, 0, 300, 400], [0, 200, 100, 200], [300, 200, 400, 200], [200, 0, 200, 100], [200, 300, 200, 400]];
    out.push('<g class="yz-ln"><path d="' + segs.map(function (s) { return 'M' + X(s[0]).toFixed(0) + ' ' + Y(s[1]).toFixed(0) + (s[0] === s[2] ? 'V' + Y(s[3]).toFixed(0) : 'H' + X(s[2]).toFixed(0)); }).join('') + '"/></g>');
    var G = Room(o, 's', segs.map(function (q) { return [X(q[0]), Y(q[1]), X(q[2]), Y(q[3]), lw / 2 + 0.6]; })), alSeg = null;
    var cells = {};
    ORDER.forEach(function (k) {
      var p = (o.items || []).find(function (it) { return it.key === k; }); if (!p) return;
      (cells[p.sign] = cells[p.sign] || []).push(planetLab(k, p, o, small));
    });
    (o.marks || []).forEach(function (m) { (cells[m.sign] = cells[m.sign] || []).push(markLab(m)); });
    var H = [];
    for (var s = 0; s < 12; s++) {
      var rc = SOUTH[s], x0 = rc[1] * 100, y0 = rc[0] * 100, isAsc = s === o.asc;
      // 座名写在靠盘心的那个角：边框宝石都在外沿和四角，碰不到（10-14 第一版写在左上角，被中间那几颗宝石压住）
      var right = x0 + 50 < 200, bottom = y0 + 50 < 200;
      if (rc[1] === 0 || rc[1] === 3) right = rc[1] === 0; if (rc[0] === 0 || rc[0] === 3) bottom = rc[0] === 0;
      if (isAsc && small) {                                // 小盘字小，上升那格在靠盘心的角上再画一道金斜线
        var ccx = right ? x0 + 100 : x0, ccy = bottom ? y0 + 100 : y0, dx = right ? -34 : 34, dy = bottom ? -34 : 34;
        out.push('<path class="yz-al" d="M' + X(ccx + dx).toFixed(0) + ' ' + Y(ccy).toFixed(0) + 'L' + X(ccx).toFixed(0) + ' ' + Y(ccy + dy).toFixed(0) + '"/>');
        alSeg = [X(ccx + dx), Y(ccy), X(ccx), Y(ccy + dy), 3.5 + 0.6];
      }
      var P = poly4([[x0, y0], [x0 + 100, y0], [x0 + 100, y0 + 100], [x0, y0 + 100]]);
      var item = {P: P, sign: [{cls: 'yz-sa' + (isAsc ? ' a1' : ''), parts: [{s: (o.pro ? SAB_PRO : SABBR)[s] + (isAsc && !small ? ' ' + (o.ascLabel || '上升') : ''), wt: isAsc ? 700 : 400}], rel: 1}],
        signIdeal: [X(right ? x0 + 100 : x0), Y(bottom ? y0 + 100 : y0)], signFr: small ? [40, 44] : [27, 30], segs: isAsc && alSeg ? [alSeg] : []};
      var ideal = [X(x0 + 50), Y(y0 + (bottom ? 44 : 58))];
      if (o.nums) { item.pl = [{cls: 'yz-num' + numCls(o.nums[s]), parts: [{s: String(o.nums[s]), wt: 600}], rel: 1}]; item.ideal = ideal; item.fr = [44, 62]; item.frT = 40; }
      else if (cells[s]) { item.pl = cells[s]; item.ideal = ideal; item.fr = frange(o); item.frT = ftight(o); }
      H.push(item);
    }
    layoutChart(G, H, out);
    if (o.title && !small) out.push('<text class="yz-ct" x="' + X(200).toFixed(0) + '" y="' + Y(200).toFixed(0) + '">' + o.title + '</text>');
    return '<svg viewBox="0 0 ' + IMG + ' ' + IMG + '"' + (small ? ' class="sm"' : '') + '>' + out.join('') + '</svg>';
  }

  function render(el, o) {
    var b = o.base || '', s = o.small ? '-s' : '';
    var layers = o.theme === 'A'
      ? '<img class="yz-sh" alt="" src="' + b + 'img/yz-shadow.webp"><img alt="" src="' + b + 'img/yz-plate.webp">' + svg(o) + '<img alt="" src="' + b + 'img/yz-frame-a.webp">'
      : '<img class="yz-sh b" alt="" src="' + b + 'img/yz-shadow.webp"><img alt="" src="' + b + 'img/yz-plate' + s + '.webp">' + svg(o) + '<img alt="" src="' + b + 'img/yz-gems-b' + (o.gold ? '-gold' : '') + s + '.webp">';
    el.classList.add('yz-chart'); el.classList.toggle('yz-small', !!o.small);
    el.innerHTML = layers;
  }

  var CSS = '.yz-chart{position:relative;aspect-ratio:1/1}' +
    '.yz-chart img,.yz-chart svg{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.yz-chart img.yz-sh{transform:translateY(2%);opacity:.45}.yz-chart img.yz-sh.b{opacity:.22}' +
    '.yz-ln path{fill:none;stroke:#8a7442;stroke-width:3.2;opacity:.85}.yz-chart svg.sm .yz-ln path{stroke-width:5}' +
    '.yz-chart text.fx{dominant-baseline:alphabetic;text-anchor:start;font-family:' + FAM + '}' +
    '.yz-sn{fill:#8b90a8}.yz-sn.a1{fill:#a8843f}' +
    '.yz-pl{fill:#1f2a4a}' +
    '.yz-pl.ex{fill:#b07a12}.yz-pl.own{fill:#1f7a6a}.yz-pl.deb{fill:#b23a3a}' +
    '.yz-asc{fill:#a8843f}' +
    '.yz-sa{fill:#9aa0b8}.yz-sa.a1{fill:#a8843f}' +
    '.yz-al{fill:none;stroke:#a8843f;stroke-width:4}.yz-chart svg.sm .yz-al{stroke-width:7}' +
    '.yz-num{fill:#1f2a4a}.yz-num.hi{fill:#1f7a6a}.yz-num.lo{fill:#b23a3a}' +
    '.yz-kk{fill:#9a7636}' +
    '.yz-mk.up{fill:#6a4fa3}.yz-mk.ar{fill:#2f5fa8}' +
    '.yz-ct{font-size:44px;fill:#a8843f;text-anchor:middle;dominant-baseline:middle;font-family:"XbwSerif","XbwSerifX1","Songti SC",serif;font-weight:700;letter-spacing:6px}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  window.YZChart = {render: render, CN: CN, ORDER: ORDER};
})();
