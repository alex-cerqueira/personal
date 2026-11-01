/* Minimal stand-in for the editor runtime: the page logic keeps its original shape. */
class DCLogic {
  constructor() { this.props = {}; }
  setState(p) { this.state = Object.assign({}, this.state, p); if (this.sync) this.sync(); }
  forceUpdate() { if (this.sync) this.sync(); }
}

/* The Research Network — one set of evidence points that changes shape with the content:
   F1 network (hero) → F2 timeline (work) → F3 service blueprint (approach) → F4 lenses (expertise)
   → F5 resting seed (writing, books, about) → F6 organized system (contact). */
var EV = [
  { k: 'COMPORTAMENTO', x: .20, y: .22 }, { k: 'NECESSIDADES', x: .56, y: .08 }, { k: 'CONTEXTO', x: .88, y: .26 },
  { k: 'NEGÓCIO', x: .22, y: .62 }, { k: 'TECNOLOGIA', x: .84, y: .68 }, { k: 'FRICÇÃO', x: .50, y: .92 },
  { k: 'OPORTUNIDADE', x: .54, y: .48 }
];
var HUBE = [[0,1],[1,2],[0,3],[2,4],[3,5],[4,5],[0,6],[2,6],[3,6],[4,6],[5,6,1],[1,6,1]];
var LANES = ['PESSOAS', 'NEGÓCIO', 'TECNOLOGIA', 'SISTEMAS'];
var STAGES = ['Entender', 'Explorar', 'Conectar', 'Projetar', 'Validar'];
var LENSES = ['SERVICE DESIGN', 'UX RESEARCH', 'STRATEGY & DISCOVERY', 'AI & EMERGING'];
var COLS = [[0,1],[0,2,3],[0,1,2,3],[0,1,2],[0,1,3]];
var BP = [ // [col, lane, col, lane, accent]
  [0,0,1,0,1],[1,0,2,0,1],[2,0,3,0,1],[3,0,4,0,1],
  [0,1,2,1],[2,1,3,1],[3,1,4,1],[1,2,2,2],[2,2,3,2],[1,3,2,3],[2,3,4,3],
  [0,0,1,2],[0,1,1,3],[1,2,2,1],[1,3,2,2],[2,0,2,3],[2,3,3,1],[2,2,3,0],[3,2,4,3],[3,1,4,0]
];
/* headline word -> cube corners: pessoas (comportamento, necessidades), produto (contexto, tecnologia, fricção), negócios (negócio, oportunidade) */
var HERO_GROUPS = [[0, 1], [2, 4, 5], [3, 6]];
/* yaw that turns each group to face the viewer (from the corner geometry built in F1) */
var HERO_YAW = [1.5708, -1.3694, 0.8861];
var HERO_STEP = 3400;
var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
var TH = { ink: '23,23,23', mute: '102,102,102', acc: '49,85,231', bg: '#F8F8F6' };
var THEMES = { light: { ink: '23,23,23', mute: '102,102,102', acc: '49,85,231', bg: '#F8F8F6' }, dark: { ink: '237,237,234', mute: '163,163,158', acc: '125,149,255', bg: '#121212' } };
var FILTERS = [['all', 'Todos'], ['P', 'Perfil pessoal'], ['E', 'Editora UX'], ['B', 'Bootcamp'], ['U', 'UX Planet'], ['O', 'UX Collective & outras']];
var PREVIEW = 8;

function rng(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function c01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
function ease(t) { t = c01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function eo(t) { t = c01(t); return 1 - Math.pow(1 - t, 3); }
/* rotate the cube (yaw, pitch), project it with perspective, and give nearer parts more weight */
function projectCube(Fx, ya, pa) {
  var C = Fx.cube, cyw = Math.cos(ya), syw = Math.sin(ya), cpt = Math.cos(pa), spt = Math.sin(pa);
  C.corners.forEach(function (c) {
    var x = c.x * cyw + c.z * syw, z = -c.x * syw + c.z * cyw, y = c.y;
    var y2 = y * cpt - z * spt, z2 = y * spt + z * cpt;
    var f = C.D / (C.D - z2), px = C.cx + x * f * C.sc, py = C.cy + y2 * f * C.sc;
    var depth = .28 + .72 * c01((z2 + 1.8) / 3.6), r = C.rS * f;
    Fx.x[c.p] = px; Fx.y[c.p] = py; Fx.s[c.p] = 4.5 * Math.pow(f, .8); Fx.a[c.p] = depth; Fx.dz[c.p] = depth;
    c.sats.forEach(function (sid, j) {
      var an = -Math.PI / 2 + j / c.sats.length * 6.283;
      Fx.x[sid] = px + Math.cos(an) * r; Fx.y[sid] = py + Math.sin(an) * r;
      Fx.s[sid] = 1.8 * Math.pow(f, .6); Fx.a[sid] = .8 * depth; Fx.dz[sid] = depth;
    });
    if (c.lab) {
      var dx = px - C.cx, dy = py - C.cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d < C.sc * .5) { c.lab.ux = 1; c.lab.uy = 0; } else { c.lab.ux = dx / d; c.lab.uy = dy / d; }
      c.lab.off = r + 14;
    }
  });
}

function build(W, H, m, S, K, R, inl) {
  var N = 7 + 7 * S + K, F = [], f, i, h, j, k;
  for (f = 0; f < 7; f++) F.push({ x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N), s: new Float32Array(N), g: new Uint8Array(N), c: new Uint8Array(N), col: new Int8Array(N).fill(-1), ring: new Int8Array(N).fill(-1), e: [], l: [] });
  function sat(h, j) { return 7 + h * S + j; }
  function str(k) { return 7 + 7 * S + k; }
  function box(b) { return { x0: b[0] * W, y0: b[1] * H, w: (b[2] - b[0]) * W, h: (b[3] - b[1]) * H }; }
  function set(F, i, x, y, a, s, g) { F.x[i] = x; F.y[i] = y; F.a[i] = a; F.s[i] = s; F.g[i] = g; }

  /* F0 — scattered evidence */
  for (i = 0; i < N; i++) set(F[0], i, R[0][i] * W, R[1][i] * H, i < 7 ? 1 : i < 7 + 7 * S ? .75 : .3, i < 7 ? 4.5 : i < 7 + 7 * S ? 1.8 : 1.2, i < 7 ? 1 : 0);

  /* F1 — hero: a cube in perspective. OPPORTUNITY is the nearest corner; every corner carries the same hexagon */
  var b1 = box(inl ? [.04, .06, .96, .94] : m ? [.06, .1, .94, .46] : [.52, .14, .95, .86]);
  var RH = Math.min(b1.w, b1.h) * (inl ? .25 : m ? .33 : .34), R3 = Math.sqrt(3), RR = Math.sqrt(8 / 3), ZF = 1 / R3;
  var v8 = str(0), corners = [];
  function corner(pid, angDeg, rr, z, sats) {
    var a = angDeg * Math.PI / 180;
    var c = { p: pid, x: Math.cos(a) * rr, y: Math.sin(a) * rr, z: z, sats: sats, lab: null };
    if (pid < 7) { c.lab = { i: pid, t: EV[pid].k, hub: 1, ux: 1, uy: 0, off: 20 }; F[1].l.push(c.lab); }
    corners.push(c);
  }
  function hubSats(h) { var r = []; for (var q = 0; q < S; q++) r.push(sat(h, q)); return r; }
  var backSats = []; for (j = 0; j < S; j++) backSats.push(str(1 + j));
  corner(6, 0, 0, R3, hubSats(6));
  corner(v8, 0, 0, -R3, backSats);
  [[0, 210], [2, -30], [5, 90]].forEach(function (c) { corner(c[0], c[1], RR, ZF, hubSats(c[0])); });
  [[1, -90], [4, 30], [3, 150]].forEach(function (c) { corner(c[0], c[1], RR, -ZF, hubSats(c[0])); });
  for (k = 0; k < K; k++) { i = str(k); set(F[1], i, R[0][i] * W, R[1][i] * H, 0, 1, 0); }
  corners.forEach(function (c, ci) {
    set(F[1], c.p, 0, 0, 1, 4.5, 1); F[1].c[c.p] = c.p === 6 ? 1 : 0;
    c.sats.forEach(function (sid, q) {
      set(F[1], sid, 0, 0, .8, 1.8, 0);
      F[1].e.push({ a: c.p, b: sid, w: .14, d: q / S * .6 + ci * .08 });
      F[1].e.push({ a: sid, b: c.sats[(q + 1) % S], w: .2, d: .6 + q / S * .5 + ci * .08 });
    });
  });
  [[6, 0, 1], [6, 2], [6, 5, 1], [v8, 1], [v8, 4], [v8, 3], [1, 2], [2, 4], [4, 5], [5, 3], [3, 0], [0, 1]].forEach(function (q, n) {
    F[1].e.push({ a: q[0], b: q[1], w: .38, acc: q[2], d: 1.2 + n * .09, hub: 1 });
  });
  F[1].dz = new Float32Array(N).fill(1);
  F[1].cube = { cx: b1.x0 + b1.w / 2, cy: b1.y0 + b1.h / 2, sc: RH / RR, rS: RH * .19, D: 5.5, corners: corners };
  projectCube(F[1], -.32, .16);

  /* F2 — a timeline: evidence filed along the right margin while projects are read */
  var spX = W - (m ? 12 : Math.max(22, W * .022)), order = [], o;
  for (h = 0; h < 7; h++) { order.push(h); for (j = 0; j < S; j++) order.push(sat(h, j)); }
  for (o = 0; o < order.length; o++) {
    i = order[o];
    var hubb = i < 7;
    set(F[2], i, spX, H * (.24 + .52 * o / (order.length - 1)), hubb ? .55 : .2, hubb ? 2 : 1, 0);
  }
  F[2].e.push({ a: order[0], b: order[order.length - 1], w: .14 });
  for (k = 0; k < K; k++) { i = str(k); set(F[2], i, spX, R[1][i] * H, 0, 1, 0); }

  /* F3 — service blueprint: 5 stages × 4 layers, drawn by the same points */
  var b3 = box(inl ? [.02, .12, .98, .84] : m ? [.06, .11, .95, .50] : [.44, .2, .96, .82]);
  var cS = b3.x0 + b3.w * (m ? .2 : .16), cE = b3.x0 + b3.w * .97;
  var colX = [0, 1, 2, 3, 4].map(function (c) { return cS + c * (cE - cS) / 4; });
  var laneY = [0, 1, 2, 3].map(function (l) { return b3.y0 + b3.h * (.2 + l * .25); });
  F[3].lanes = { y: laneY, x0: colX[0] - 20, x1: colX[4] + 20 };
  var slot = {}, sl = 0;
  COLS.forEach(function (lanes, c) { lanes.forEach(function (l) { slot[c * 4 + l] = sl; i = sl; set(F[3], i, colX[c], laneY[l], 1, 4.5, 1); F[3].col[i] = c; sl++; }); });
  var rest = [];
  for (i = sl; i < 7 + 7 * S; i++) rest.push(i);
  var perLane = Math.ceil(rest.length / 4);
  rest.forEach(function (i, q) { var l = Math.floor(q / perLane), n = q % perLane; set(F[3], i, colX[0] + (colX[4] - colX[0]) * (n + .5) / perLane, laneY[Math.min(3, l)], .32, 1.1, 0); });
  for (k = 0; k < K; k++) { i = str(k); var cc = k % 5, nn = Math.floor(k / 5), per = Math.ceil(K / 5); set(F[3], i, colX[cc], b3.y0 + b3.h * (.1 + .85 * (nn + .5) / per), .22, 1, 0); }
  BP.forEach(function (e) { F[3].e.push({ a: slot[e[0] * 4 + e[1]], b: slot[e[2] * 4 + e[3]], w: e[4] ? .95 : .34, acc: e[4], curve: e[1] !== e[3] && e[0] !== e[2], st: Math.max(e[0], e[2]) }); });
  F[3].e.push({ a: slot[4 * 4 + 3], b: slot[1], w: .2, loop: 1, st: 5, by: b3.y0 + b3.h * 1.02 });
  LANES.forEach(function (n, l) { F[3].l.push({ x: b3.x0, y: laneY[l] + 3.5, t: n, kind: 'lane' }); });
  STAGES.forEach(function (n, c) { F[3].l.push({ x: colX[c], y: b3.y0, t: '0' + (c + 1) + (m ? '' : '  ' + n.toUpperCase()), kind: 'col', c: c, align: 'center' }); });

  /* F4 — four lenses overlapping on one opportunity */
  var b4 = box(inl ? [.1, .14, .9, .86] : m ? [.08, .1, .92, .44] : [.56, .16, .95, .84]);
  var cx = b4.x0 + b4.w / 2, cy = b4.y0 + b4.h / 2, R4 = Math.min(b4.w, b4.h) * .27, off = R4 * .56;
  var SG = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  F[4].rings = SG.map(function (s) { return { x: cx + s[0] * off, y: cy + s[1] * off, r: R4 }; });
  set(F[4], 6, cx, cy, 1, 5, 1); F[4].c[6] = 1;
  for (h = 0; h < 6; h++) { var ah = h / 6 * 6.283 + .5; set(F[4], h, cx + Math.cos(ah) * R4 * .9, cy + Math.sin(ah) * R4 * .9, .9, 3.5, 1); }
  var sats = [];
  for (i = 7; i < 7 + 7 * S; i++) sats.push(i);
  var perR = Math.ceil(sats.length / 4);
  sats.forEach(function (i, q) { var rg = q % 4, n = Math.floor(q / 4), ri = F[4].rings[rg], an = n / perR * 6.283 + rg; set(F[4], i, ri.x + Math.cos(an) * ri.r, ri.y + Math.sin(an) * ri.r, .7, 1.7, 0); F[4].ring[i] = rg; });
  for (k = 0; k < K; k++) { i = str(k); set(F[4], i, cx + (R[0][i] - .5) * R4 * 1.2, cy + (R[1][i] - .5) * R4 * 1.2, .14, 1, 0); }
  for (h = 0; h < 6; h++) F[4].e.push({ a: h, b: 6, w: .26 });
  SG.forEach(function (s, q) {
    var ri = F[4].rings[q];
    if (inl) F[4].l.push({ x: s[0] < 0 ? 4 : W - 4, y: s[1] < 0 ? 12 : H - 6, t: LENSES[q], kind: 'ring', k: q, align: s[0] < 0 ? 'left' : 'right' });
    else F[4].l.push({ x: ri.x + s[0] * ri.r * .8, y: ri.y + s[1] * (ri.r * .8 + 16), t: LENSES[q], kind: 'ring', k: q, align: s[0] < 0 ? 'right' : 'left' });
  });

  /* F5 — the network rests as a seed while you read, gaining links */
  var sr = m ? 26 : 50, sx = W - (m ? 104 : 200), sy = H - (m ? 56 : 112);
  set(F[5], 6, sx, sy, 1, 3.2, 1); F[5].c[6] = 1;
  for (h = 0; h < 6; h++) { var a5 = h / 6 * 6.283 - 1.57; set(F[5], h, sx + Math.cos(a5) * sr, sy + Math.sin(a5) * sr, 1, 2.8, 1); }
  for (h = 0; h < 7; h++) for (j = 0; j < S; j++) { i = sat(h, j); var a6 = R[2][i] * 6.283, d6 = sr * .28 * R[3][i]; set(F[5], i, F[5].x[h] + Math.cos(a6) * d6, F[5].y[h] + Math.sin(a6) * d6, .5, 1, 0); }
  for (k = 0; k < K; k++) { i = str(k); set(F[5], i, sx, sy, 0, 1, 0); }
  HUBE.forEach(function (p, q) { F[5].e.push({ a: p[0], b: p[1], w: .5, acc: p[2], prog: q }); });
  if (!m) F[5].l.push({ x: sx, y: sy + sr + 26, t: 'A REDE DE PESQUISA', kind: 'cap', align: 'center' });

  /* F6 — contact: the network dissolves where it rests, leaving the section clean */
  var F6 = F[6];
  for (i = 0; i < N; i++) { F6.x[i] = F[5].x[i]; F6.y[i] = F[5].y[i]; F6.s[i] = F[5].s[i]; F6.g[i] = F[5].g[i]; F6.c[i] = F[5].c[i]; F6.a[i] = 0; }
  F6.e = []; F6.l = [];
  /* F5 — the corner seed ("The Research Network") is removed: nothing is drawn while reading */
  for (i = 0; i < N; i++) F[5].a[i] = 0;
  F[5].e = []; F[5].l = [];

  return F;
}

/* mobile: draw one formation in its own canvas, animated by time instead of scroll */
function drawStill(ctx, Fx, k, w, h, o) {
  ctx.clearRect(0, 0, w, h);
  var X = Fx.x, Y = Fx.y, N = X.length, i, q, ap = o.ap, act = o.active, lensA = o.lensA;
  var app = o.red ? 1 : eo(o.time / .9);
  ctx.lineWidth = 1;
  if (k === 3 && Fx.lanes) {
    ctx.strokeStyle = 'rgba(' + TH.ink + ',' + (.2 * app) + ')';
    Fx.lanes.y.forEach(function (ly) { var yy = Math.round(ly) + .5; ctx.beginPath(); ctx.moveTo(Fx.lanes.x0, yy); ctx.lineTo(Fx.lanes.x1, yy); ctx.stroke(); });
  }
  if (k === 4 && Fx.rings) Fx.rings.forEach(function (rg, n) {
    var on = n === lensA;
    ctx.strokeStyle = 'rgba(' + TH.ink + ',' + ((on ? .55 : .14) * app) + ')'; ctx.lineWidth = on ? 1.2 : 1;
    ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 6.283); ctx.stroke();
  });
  for (q = 0; q < Fx.e.length; q++) {
    var e = Fx.e[q], pr = 1;
    if (k === 1 && !o.red) pr = eo((o.time - .3 - e.d * .8) / 1);
    if (k === 3) pr = c01((ap * 5 - e.st + .9) / .8);
    if (pr <= 0) continue;
    var A = e.a, B = e.b, dep = Fx.dz ? (Fx.dz[A] + Fx.dz[B]) / 2 : 1;
    var aa = e.w * c01(Math.min(Fx.a[A], Fx.a[B]) * 1.6) * (.3 + .7 * dep) * app;
    if (aa <= .005) continue;
    ctx.strokeStyle = 'rgba(' + (e.acc ? TH.acc : TH.ink) + ',' + Math.min(1, aa) + ')';
    ctx.lineWidth = (e.acc ? 1.4 : 1) * (.7 + .45 * dep);
    var x1 = X[A], y1 = Y[A], x2 = X[B], y2 = Y[B], sg, n, u, v;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    if (e.loop) { n = 40; for (sg = 1; sg <= n * pr; sg++) { u = sg / n; v = 1 - u; ctx.lineTo(v * v * v * x1 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x2, v * v * v * y1 + 3 * v * v * u * e.by + 3 * v * u * u * e.by + u * u * u * y2); } }
    else if (e.curve) { var mx = (x1 + x2) / 2; n = 24; for (sg = 1; sg <= n * pr; sg++) { u = sg / n; v = 1 - u; ctx.lineTo(v * v * v * x1 + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * x2, v * v * v * y1 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y2); } }
    else ctx.lineTo(x1 + (x2 - x1) * pr, y1 + (y2 - y1) * pr);
    ctx.stroke();
  }
  for (i = 0; i < N; i++) {
    var a = Fx.a[i] * app; if (a <= .01) continue;
    var sz = Fx.s[i], acc = Fx.c[i], ring = Fx.g[i];
    if (k === 3 && Fx.col[i] > -1) { if (Fx.col[i] > act) a *= .35; if (Fx.col[i] === act) { sz += 1.5; acc = 1; } }
    if (k === 4 && Fx.ring[i] > -1 && lensA > -1) a *= Fx.ring[i] === lensA ? 1.25 : .45;
    if (o.hi && i < 7 && o.hi.indexOf(i) > -1) { sz += 1.5; acc = 1; }
    a = Math.min(1, a);
    ctx.beginPath(); ctx.arc(X[i], Y[i], sz, 0, 6.283);
    if (ring && !acc) {
      ctx.fillStyle = TH.bg; ctx.fill(); ctx.strokeStyle = 'rgba(' + TH.ink + ',' + a + ')'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(X[i], Y[i], Math.max(1, sz * .36), 0, 6.283); ctx.fillStyle = 'rgba(' + TH.ink + ',' + a + ')'; ctx.fill();
    } else { ctx.fillStyle = 'rgba(' + (acc ? TH.acc : TH.ink) + ',' + a + ')'; ctx.fill(); }
  }
  ctx.font = '400 8.5px ' + MONO;
  Fx.l.forEach(function (L) {
    var a = app;
    if (L.hub) {
      if (k === 1 && !o.red) a *= c01((o.time - 1.2) / .8);
      a *= Fx.a[L.i];
      var hotL = o.hi && o.hi.indexOf(L.i) > -1;
      ctx.fillStyle = hotL ? 'rgba(' + TH.acc + ',' + Math.min(1, a * 1.25) + ')' : 'rgba(' + TH.ink + ',' + (a * (o.hi ? .5 : .75)) + ')';
      ctx.textAlign = L.ux > .3 ? 'left' : L.ux < -.3 ? 'right' : 'center';
      ctx.fillText(L.t, X[L.i] + L.ux * L.off, Y[L.i] + L.uy * L.off + (L.uy > .3 ? 9 : L.uy < -.3 ? -1 : 3.5));
    } else {
      var c = TH.mute, f = 1;
      if (L.kind === 'col') { if (L.c === act) c = TH.ink; else if (L.c > act) f = .5; }
      if (L.kind === 'ring' && L.k === lensA) c = TH.ink;
      ctx.fillStyle = 'rgba(' + c + ',' + (a * f) + ')';
      ctx.textAlign = L.align || 'left';
      ctx.fillText(L.t, L.x, L.y);
    }
  });
  ctx.textAlign = 'left';
}

class Component extends DCLogic {
  state = { stage: 1, menu: false, pub: 'all', all: false, theme: (function () { try { return localStorage.getItem('ac-theme2') === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } })() };
  rvEls = []; lensEls = []; parEls = []; panEls = []; mouse = { on: false, x: -999, y: -999 };
  seg = { f0: 1, f1: 1, t: 1 }; ap = 0; gp5 = 0; hi = null; lensHover = -1; lensScroll = -1;

  refRoot = (el) => { this.root = el; };
  refCv = (el) => { this.cv = el; };
  refHeader = (el) => { this.header = el; };
  refHero = (el) => { this.hero = el; };
  refWork = (el) => { this.work = el; };
  refAppr = (el) => { this.appr = el; };
  refExp = (el) => { this.exp = el; };
  refWriting = (el) => { this.writing = el; };
  refContact = (el) => { this.contact = el; };
  refBar = (el) => { this.bar = el; };
  mCv = {}; mVis = {}; mSt = {};
  mRef(key, el) { if (!el) return; this.mCv[key] = el; if (this.mio) this.mio.observe(el); }
  refMHero = (el) => this.mRef('hero', el);
  refMAppr = (el) => this.mRef('appr', el);
  refMExp = (el) => this.mRef('exp', el);
  refExpList = (el) => { this.expList = el; };
  refHs = (el) => { this.hs = el; };
  refTrack = (el) => { this.track = el; };
  refHsCount = (el) => { this.hsCount = el; };
  refHsBar = (el) => { this.hsBar = el; };
  pan = (el) => { if (el && this.panEls.indexOf(el) < 0) { this.panEls.push(el); this.rv(el); } };
  focusPan = [0, 1, 2, 3, 4, 5].map((i) => () => {
    if (!this.hs || !this.hsDist) return;
    /* the browser may scroll the clipped container to reveal the focused card: undo it, the page scroll drives the track */
    var box = this.track && this.track.parentNode; if (box) { box.scrollLeft = 0; box.scrollTop = 0; }
    var top = this.hs.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + this.hsDist * i / 5, behavior: 'auto' });
  });
  refCursor = (el) => { this.cursor = el; };
  rv = (el) => { if (el && this.rvEls.indexOf(el) < 0) { this.rvEls.push(el); if (this.io) this.io.observe(el); } };
  lens = (el) => { if (el && this.lensEls.indexOf(el) < 0) { this.lensEls.push(el); this.rv(el); } };
  par = (el) => { if (el && this.parEls.indexOf(el) < 0) this.parEls.push(el); };

  goStage = [0, 1, 2, 3, 4].map((s) => () => {
    if (this.mob) { this.mHoldAp = (s + .1) / 5; this.mHold = (performance.now() - this.t0) / 1000 + 6; this.apClock = this.mHoldAp * 10; if (this.state.stage !== s + 1) this.setState({ stage: s + 1 }); return; }
    if (!this.appr) return;
    var top = this.appr.getBoundingClientRect().top + window.scrollY;
    var span = this.appr.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * (s + .5) / 5, behavior: this.reduce ? 'auto' : 'smooth' });
  });
  pickPub = FILTERS.map((f) => () => { this.setState({ pub: f[0], all: false }); });
  toggleTheme = () => { var t = this.state.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('ac-theme2', t); } catch (e) {} this.setState({ theme: t }); };
  toggleAll = () => { this.setState({ all: !this.state.all }); };
  toggleMenu = () => { this.setState({ menu: !this.state.menu }); };
  closeMenu = () => { this.setState({ menu: false }); };
  cursorOn = () => { if (this.cursor) this.cursor.classList.add('on'); };
  cursorOff = () => { if (this.cursor) this.cursor.classList.remove('on'); };
  kwEls = [];
  kw = (el) => { if (el && this.kwEls.indexOf(el) < 0) this.kwEls.push(el); };
  /* the headline cycles pessoas -> produto -> negócios; the cube turns the matching corners to the front */
  setHeroStep(k) {
    this.heroStep = k;
    this.kwEls.forEach((el) => el.classList.toggle('on', +el.getAttribute('data-k') === k));
    this.hi = HERO_GROUPS[k];
    var d = HERO_YAW[k];
    if (this.yawT === undefined) this.yawT = d;
    else this.yawT += ((d - this.yawT) % 6.2832 + 6.2832) % 6.2832;
  }
  heroTick = () => { if (this.heroHold < 0 && !document.hidden) this.setHeroStep((this.heroStep + 1) % 3); };
  heroRestart() { clearInterval(this.heroTimer); if (!this.reduce) this.heroTimer = setInterval(this.heroTick, HERO_STEP); }
  heroHold = -1;
  hiWord(k) { this.heroHold = k; if (k !== this.heroStep) this.setHeroStep(k); }
  hiPeople = () => { this.hiWord(0); };
  hiProduct = () => { this.hiWord(1); };
  hiBiz = () => { this.hiWord(2); };
  hiOff = () => { this.heroHold = -1; this.heroRestart(); };
  /* eased yaw/pitch shared by the fixed canvas and the inline mobile canvas */
  cubeAngles(time, red) {
    var ty = this.yawT === undefined ? -.32 : this.yawT, tp = .16, mo = this.mouse;
    if (!red) {
      ty += Math.sin(time * .21) * .08; tp += Math.sin(time * .16) * .06;
      if (mo.on && !this.mob) { ty += (mo.x / window.innerWidth - .5) * .3; tp -= (mo.y / window.innerHeight - .5) * .2; }
    }
    this.ya = this.ya === undefined || red ? ty : this.ya + (ty - this.ya) * .045;
    this.pa = this.pa === undefined || red ? tp : this.pa + (tp - this.pa) * .05;
  }
  lensOn0 = () => { this.lensHover = 0; };
  lensOn1 = () => { this.lensHover = 1; };
  lensOn2 = () => { this.lensHover = 2; };
  lensOn3 = () => { this.lensHover = 3; };
  lensOff = () => { this.lensHover = -1; };

  componentDidMount() {
    var w = window;
    this.reduce = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!this.reduce && this.root) this.root.classList.add('js');
    if ('IntersectionObserver' in w) {
      this.io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); this.io.unobserve(e.target); } });
      }, { threshold: .1, rootMargin: '0px 0px -6% 0px' });
      this.rvEls.forEach((el) => this.io.observe(el));
    } else this.rvEls.forEach((el) => el.classList.add('is-in'));
    this.onScroll = () => { if (!this.sq) { this.sq = true; requestAnimationFrame(() => { this.sq = false; this.measure(); }); } };
    this.onMove = (e) => {
      this.mouse.on = true; this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (this.cursor) this.cursor.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    };
    this.onLeave = () => { this.mouse.on = false; };
    w.addEventListener('scroll', this.onScroll, { passive: true });
    w.addEventListener('resize', this.onScroll);
    w.addEventListener('pointermove', this.onMove, { passive: true });
    document.addEventListener('pointerleave', this.onLeave);
    this.t0 = performance.now();
    this.measure();
    setTimeout(this.onScroll, 400);
    var rm = rng(9), NM = 7 + 7 * 6 + 14; this.Rm = [];
    for (var q = 0; q < 6; q++) { this.Rm.push(new Float32Array(NM)); for (var qi = 0; qi < NM; qi++) this.Rm[q][qi] = rm(); }
    if ('IntersectionObserver' in w) {
      this.mio = new IntersectionObserver((es) => { es.forEach((e) => { this.mVis[e.target.getAttribute('data-m')] = e.isIntersecting; }); }, { threshold: 0 });
      Object.keys(this.mCv).forEach((k) => this.mio.observe(this.mCv[k]));
    } else { this.mVis = { hero: true, appr: true, exp: true }; }
    this.setHeroStep(0); this.heroRestart();
    this.loop = (now) => { this.raf = requestAnimationFrame(this.loop); this.cubeAngles((now - this.t0) / 1000, this.reduce); this.frame(now); this.frameM(now); };
    this.raf = requestAnimationFrame(this.loop);
  }

  componentWillUnmount() {
    var w = window;
    cancelAnimationFrame(this.raf);
    clearInterval(this.heroTimer);
    w.removeEventListener('scroll', this.onScroll);
    w.removeEventListener('resize', this.onScroll);
    w.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerleave', this.onLeave);
    if (this.io) this.io.disconnect();
  }

  measure() {
    var w = window, y = w.scrollY || document.documentElement.scrollTop || 0, vh = w.innerHeight;
    if (this.header) this.header.classList.toggle('is-scrolled', y > 24);
    if (!this.hero || !this.work || !this.appr || !this.exp || !this.writing || !this.contact) return;
    function top(el) { return el.getBoundingClientRect().top + y; }
    if (this.hs && this.track && !this.reduce) {
      var dist = Math.max(0, this.track.scrollWidth - w.innerWidth);
      var stickH = w.matchMedia && w.matchMedia('(max-width: 680px)').matches && this.track.parentNode ? this.track.parentNode.offsetHeight : vh;
      var want = Math.round(dist + stickH);
      if (this.hsH !== want) { this.hs.style.height = want + 'px'; this.hsH = want; }
      this.hsDist = dist;
      var hp = c01((y - top(this.hs)) / Math.max(1, dist));
      this.track.style.transform = 'translate3d(' + (-hp * dist).toFixed(1) + 'px,0,0)';
      if (this.hsBar) this.hsBar.style.transform = 'scaleX(' + hp.toFixed(3) + ')';
      var cx0 = w.innerWidth / 2, on = 0, bd0 = 1e9;
      this.panEls.forEach((el, q) => { var r = el.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - cx0); if (d < bd0) { bd0 = d; on = q; } });
      this.panEls.forEach((el, q) => el.classList.toggle('is-on', q === on));
      if (this.hsCount && this.hsOn !== on) { this.hsCount.textContent = '0' + (on + 1) + ' / 0' + this.panEls.length; this.hsOn = on; }
    }
    var heroH = this.hero.offsetHeight, wT = top(this.work), aT = top(this.appr), aH = this.appr.offsetHeight;
    var eT = top(this.exp), eB = eT + this.exp.offsetHeight, wrT = top(this.writing), cT = top(this.contact);
    var A = [[0, 1], [heroH * .25, 1], [wT, 2], [aT - vh * 1.1, 2], [aT, 3], [aT + aH - vh, 3], [eT + vh * .25, 4], [eB - vh, 4], [wrT, 5], [cT - vh * .6, 5], [cT - vh * .05, 6]];
    for (var i = 1; i < A.length; i++) if (A[i][0] <= A[i - 1][0]) A[i][0] = A[i - 1][0] + 1;
    var f0 = 6, f1 = 6, t = 1;
    if (y <= A[0][0]) { f0 = f1 = 1; }
    else for (i = 0; i < A.length - 1; i++) {
      if (y >= A[i][0] && y < A[i + 1][0]) { f0 = A[i][1]; f1 = A[i + 1][1]; t = (y - A[i][0]) / (A[i + 1][0] - A[i][0]); break; }
    }
    if (f0 === f1) t = 1;
    this.seg = { f0: f0, f1: f1, t: t };
    this.ap = c01((y - aT) / Math.max(1, aH - vh));
    this.gp5 = c01((y - wrT) / Math.max(1, cT - vh * .6 - wrT));
    this.mob = !!(w.matchMedia && w.matchMedia('(max-width: 680px)').matches);
    if (!this.mob) {
      if (this.bar) this.bar.style.transform = 'scaleX(' + this.ap.toFixed(3) + ')';
      var st = Math.min(5, Math.floor(this.ap * 5) + 1);
      if (st !== this.state.stage) this.setState({ stage: st });
    }
    var best = -1, bd = 1e9;
    this.lensEls.forEach((el) => { var r = el.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * .5); if (d < bd && r.bottom > 0 && r.top < vh) { bd = d; best = +el.getAttribute('data-k'); } });
    this.lensScroll = best;
    if (!this.reduce) this.parEls.forEach((el) => {
      var r = el.parentNode.getBoundingClientRect();
      el.style.translate = (((r.left + r.width / 2) - w.innerWidth / 2) * -.06).toFixed(1) + 'px 0';
    });
  }

  ensure(W, H) {
    var m = W < 680, S = 6, K = m ? 14 : 34;
    if (this.F && this.W === W && this.H === H) return;
    var N = 7 + 7 * S + K;
    if (!this.R || this.R[0].length !== N) {
      var r = rng(9), R = [];
      for (var q = 0; q < 6; q++) { R.push(new Float32Array(N)); for (var i = 0; i < N; i++) R[q][i] = r(); }
      this.R = R;
      this.cx = new Float32Array(N); this.cy = new Float32Array(N); this.ox = new Float32Array(N); this.oy = new Float32Array(N);
      this.started = false;
    }
    this.F = build(W, H, m, S, K, this.R); this.W = W; this.H = H; this.N = N; this.m = m;
    if (!this.started) { for (var j = 0; j < N; j++) { this.cx[j] = this.F[0].x[j]; this.cy[j] = this.F[0].y[j]; } this.started = true; }
  }

  frame(now) {
    var cv = this.cv; if (!cv) return;
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), BW = Math.round(w * dpr), BH = Math.round(h * dpr);
    if (cv.width !== BW || cv.height !== BH) { cv.width = BW; cv.height = BH; }
    this.ensure(w, h);
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    try { ctx.letterSpacing = '0.06em'; } catch (e) {}
    TH = THEMES[this.state.theme === 'dark' ? 'dark' : 'light'];
    var red = this.reduce, time = red ? 99 : (now - this.t0) / 1000, F = this.F, N = this.N, R = this.R;
    var sg = this.seg, f0 = sg.f0, f1 = sg.f1, t = sg.t, A = F[f0], B = F[f1];
    var intro = time < 6;
    var w0 = f0 === f1 ? 0 : 1 - t, w1 = f0 === f1 ? 1 : t;
    function wf(k) { return (f0 === k ? w0 : 0) + (f1 === k ? w1 : 0); }
    var W2 = wf(2), W3 = wf(3), W4 = wf(4), W1 = wf(1), W6 = wf(6);
    var active = Math.min(4, Math.floor(this.ap * 5)), lensA = this.lensHover > -1 ? this.lensHover : this.lensScroll;
    var hiSet = this.hi, mo = this.mouse, i;
    if (F[1].cube && (W1 > 0 || intro)) projectCube(F[1], this.ya, this.pa);

    /* positions: staggered flight between formations, softened by a spring */
    for (i = 0; i < N; i++) {
      var ti = f0 === f1 ? 1 : ease((t - R[4][i] * .32) / .68);
      var ax = A.x[i], ay = A.y[i], bx = B.x[i], by = B.y[i];
      if (intro) {
        var k1 = eo((time - .2 - R[5][i] * 1.4) / 2.4);
        if (f0 === 1) { ax = F[0].x[i] + (ax - F[0].x[i]) * k1; ay = F[0].y[i] + (ay - F[0].y[i]) * k1; }
        if (f1 === 1) { bx = F[0].x[i] + (bx - F[0].x[i]) * k1; by = F[0].y[i] + (by - F[0].y[i]) * k1; }
      }
      var tx = ax + (bx - ax) * ti, ty = ay + (by - ay) * ti;
      var kk = red ? 1 : .14;
      this.cx[i] += (tx - this.cx[i]) * kk; this.cy[i] += (ty - this.cy[i]) * kk;
      var mx = 0, my = 0;
      if (mo.on && !red && W2 < .5 && W1 < .5) { var dx = this.cx[i] - mo.x, dy = this.cy[i] - mo.y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (d < 130) { var ff = 1 - d / 130; ff = ff * ff * 16; mx = dx / d * ff; my = dy / d * ff; } }
      this.ox[i] += (mx - this.ox[i]) * .1; this.oy[i] += (my - this.oy[i]) * .1;
    }
    var px = new Float32Array(N), py = new Float32Array(N), al = new Float32Array(N);
    for (i = 0; i < N; i++) {
      var dr = red ? 0 : (i < 7 ? 1.2 : 2.6) * (1 - W2) * (1 - W1);
      px[i] = this.cx[i] + this.ox[i] + Math.sin(time * (.3 + R[2][i] * .5) + R[3][i] * 6.28) * dr;
      py[i] = this.cy[i] + this.oy[i] + Math.cos(time * (.25 + R[3][i] * .5) + R[2][i] * 6.28) * dr;
      var tj = f0 === f1 ? 1 : ease((t - R[4][i] * .32) / .68);
      al[i] = (A.a[i] + (B.a[i] - A.a[i]) * tj) * (red ? 1 : c01((time - R[5][i] * .9) / .6));
    }
    var ap5 = this.ap, gp5 = this.gp5;

    /* overlays: lens circles, blueprint loop */
    if (W3 > .01 && F[3].lanes) {
      var LN = F[3].lanes;
      ctx.strokeStyle = 'rgba(' + TH.ink + ',' + (.2 * W3) + ')'; ctx.lineWidth = 1;
      LN.y.forEach(function (ly) { var yy = Math.round(ly) + .5; ctx.beginPath(); ctx.moveTo(LN.x0, yy); ctx.lineTo(LN.x1, yy); ctx.stroke(); });
    }
    if (W4 > .01) {
      F[4].rings.forEach(function (rg, q) {
        var on = q === lensA;
        ctx.strokeStyle = 'rgba(' + TH.ink + ',' + ((on ? .55 : .14) * W4) + ')'; ctx.lineWidth = on ? 1.2 : 1;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r * (.6 + .4 * eo(W4)), 0, 6.283); ctx.stroke();
      });
    }

    /* edges */
    function drawSet(Fs, wgt, incoming) {
      if (wgt <= .01) return;
      var es = Fs.e;
      for (var q = 0; q < es.length; q++) {
        var e = es[q], pr = incoming ? eo(wgt) : 1, a = e.w * wgt;
        if (Fs === F[1] || Fs === F[6]) { if (intro) pr *= eo((time - 1.6 - e.d) / 1.1); }
        if (Fs === F[3]) pr *= c01((ap5 * 5 - e.st + .9) / .8);
        if (Fs === F[5]) { if (e.prog !== undefined) pr *= c01(gp5 * 13 - e.prog); }
        if (pr <= 0) continue;
        var A1 = e.a, B1 = e.b, aa = a * c01(Math.min(al[A1], al[B1]) * 1.6), dep = Fs.dz ? (Fs.dz[A1] + Fs.dz[B1]) / 2 : 1;
        aa *= .3 + .7 * dep;
        if (hiSet && (Fs === F[1] || Fs === F[6]) && (hiSet.indexOf(A1) > -1 || hiSet.indexOf(B1) > -1)) aa = Math.min(1, aa * 2.4);
        ctx.strokeStyle = e.acc ? 'rgba(' + TH.acc + ',' + Math.min(1, aa) + ')' : 'rgba(' + TH.ink + ',' + Math.min(1, aa) + ')';
        ctx.lineWidth = (e.acc ? 1.4 : 1) * (.7 + .45 * dep);
        ctx.beginPath();
        var x1 = px[A1], y1 = py[A1], x2 = px[B1], y2 = py[B1];
        if (e.loop) {
          var yb = e.by, steps = 40;
          ctx.moveTo(x1, y1);
          for (var s = 1; s <= steps * pr; s++) { var u = s / steps, v = 1 - u; ctx.lineTo(v * v * v * x1 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x2, v * v * v * y1 + 3 * v * v * u * yb + 3 * v * u * u * yb + u * u * u * y2); }
        } else if (e.curve && W3 > .5) {
          var mxp = (x1 + x2) / 2, n = 24;
          ctx.moveTo(x1, y1);
          for (var s2 = 1; s2 <= n * pr; s2++) { var u2 = s2 / n, v2 = 1 - u2; ctx.lineTo(v2 * v2 * v2 * x1 + 3 * v2 * v2 * u2 * mxp + 3 * v2 * u2 * u2 * mxp + u2 * u2 * u2 * x2, v2 * v2 * v2 * y1 + 3 * v2 * v2 * u2 * y1 + 3 * v2 * u2 * u2 * y2 + u2 * u2 * u2 * y2); }
        } else { ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * pr, y1 + (y2 - y1) * pr); }
        ctx.stroke();
      }
    }
    if (f0 !== f1) drawSet(A, w0, false);
    drawSet(B, w1, f0 !== f1);

    /* points */
    for (i = 0; i < N; i++) {
      var a2 = al[i]; if (a2 <= .01) continue;
      var tk = f0 === f1 ? 1 : ease((t - R[4][i] * .32) / .68);
      var sz = A.s[i] + (B.s[i] - A.s[i]) * tk, ringP = (tk < .5 ? A.g[i] : B.g[i]), acc = (tk < .5 ? A.c[i] : B.c[i]);
      var ink = 23, aa2 = a2;
      if (W3 > .5 && F[3].col[i] > -1) {
        var cI = F[3].col[i];
        if (cI > active) aa2 *= .35;
        if (cI === active) { sz += 1.5; acc = 1; }
      }
      if (W4 > .5 && F[4].ring[i] > -1 && lensA > -1) aa2 *= F[4].ring[i] === lensA ? 1.25 : .45;
      var hot = hiSet && i < 7 && hiSet.indexOf(i) > -1 && (W1 > .5 || W6 > .5);
      if (hot) { sz += 2; acc = 1; }
      ctx.beginPath(); ctx.arc(px[i], py[i], sz, 0, 6.283);
      if (ringP && !acc) {
        ctx.fillStyle = TH.bg; ctx.fill();
        ctx.strokeStyle = 'rgba(' + TH.ink + ',' + Math.min(1, aa2) + ')'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(px[i], py[i], Math.max(1, sz * .36), 0, 6.283); ctx.fillStyle = 'rgba(' + TH.ink + ',' + Math.min(1, aa2) + ')'; ctx.fill();
      } else {
        ctx.fillStyle = acc ? 'rgba(' + TH.acc + ',' + Math.min(1, aa2) + ')' : 'rgba(' + TH.ink + ',' + Math.min(1, aa2) + ')';
        ctx.fill();
      }
    }

    /* labels */
    var m = this.m;
    function drawLabels(Fs, wgt) {
      if (wgt <= .02) return;
      Fs.l.forEach(function (L) {
        var a = wgt * wgt;
        if (L.hub) {
          if (intro) a *= c01((time - 2.4) / 1);
          a *= al[L.i];
          var hot = hiSet && hiSet.indexOf(L.i) > -1, dim = hiSet && !hot;
          ctx.font = (hot ? '500 ' : '400 ') + (m ? 9 : hot ? 11 : 10) + 'px ' + MONO;
          ctx.fillStyle = hot ? 'rgba(' + TH.acc + ',' + Math.min(1, a * 1.25) + ')' : 'rgba(' + TH.ink + ',' + (a * (dim ? .5 : .75)) + ')';
          if (L.off) { ctx.textAlign = L.ux > .3 ? 'left' : L.ux < -.3 ? 'right' : 'center'; ctx.fillText(L.t, px[L.i] + L.ux * L.off, py[L.i] + L.uy * L.off + (L.uy > .3 ? 9 : L.uy < -.3 ? -1 : 3.5)); }
          else { var rt = px[L.i] < (m ? .62 : .82) * w; ctx.textAlign = rt ? 'left' : 'right'; ctx.fillText(L.t, px[L.i] + (rt ? 12 : -12), py[L.i] + 3.5); }
        } else {
          ctx.font = '400 ' + (m ? 8.5 : 10) + 'px ' + MONO;
          ctx.textAlign = L.align || 'left';
          var col = 'rgba(' + TH.mute + ',' + a + ')';
          if (L.kind === 'col' && L.c === active) col = 'rgba(' + TH.ink + ',' + a + ')';
          if (L.kind === 'col' && L.c > active) col = 'rgba(' + TH.mute + ',' + (a * .5) + ')';
          if (L.kind === 'ring' && L.k === lensA) col = 'rgba(' + TH.ink + ',' + a + ')';
          ctx.fillStyle = col;
          ctx.fillText(L.t, L.x, L.y);
        }
      });
      ctx.textAlign = 'left';
    }
    if (f0 !== f1) drawLabels(A, w0);
    drawLabels(B, w1);
  }

  frameM(now) {
    if (!this.mob) return;
    var t = (now - this.t0) / 1000, dt = Math.min(.1, Math.max(0, t - (this.mLast || t))), red = this.reduce;
    this.mLast = t;
    TH = THEMES[this.state.theme === 'dark' ? 'dark' : 'light'];
    var held = this.mHold > t;
    if (!held && this.mVis.appr) this.apClock = (this.apClock || 0) + dt;
    var ap = red ? 1 : held ? this.mHoldAp : c01(((this.apClock || 0) % 12.5) / 10);
    var act = Math.min(4, Math.floor(ap * 5));
    if (this.mVis.appr && act + 1 !== this.state.stage) this.setState({ stage: act + 1 });
    if (this.bar && this.mVis.appr) this.bar.style.transform = 'scaleX(' + ap.toFixed(3) + ')';
    var lensA = Math.floor(t / 2.6) % 4;
    if (this.expList && this.lastLens !== lensA) { this.expList.setAttribute('data-lens', String(lensA)); this.lastLens = lensA; }
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    [['hero', 1], ['appr', 3], ['exp', 4]].forEach((pair) => {
      var key = pair[0], k = pair[1], cv = this.mCv[key];
      if (!cv || !this.mVis[key]) return;
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      var BW = Math.round(w * dpr), BH = Math.round(h * dpr);
      if (cv.width !== BW || cv.height !== BH) { cv.width = BW; cv.height = BH; }
      var st = this.mSt[key] || (this.mSt[key] = {});
      if (!st.F || st.w !== w || st.h !== h) { st.F = build(w, h, true, 6, 14, this.Rm, true)[k]; st.w = w; st.h = h; }
      if (st.t0 === undefined) st.t0 = t;
      var lt = red ? 99 : t - st.t0;
      if (k === 1) projectCube(st.F, this.ya === undefined ? -.32 : this.ya, this.pa === undefined ? .16 : this.pa);
      var ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { ctx.letterSpacing = '0.06em'; } catch (e) {}
      drawStill(ctx, st.F, k, w, h, { time: lt, ap: ap, active: act, lensA: lensA, red: red, hi: k === 1 ? this.hi : null });
    });
  }

  sync() {
    var s = this.state, d = document, dark = s.theme === 'dark';
    d.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var tc = d.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', dark ? '#121212' : '#F8F8F6');
    var fab = d.querySelector('.fab');
    if (fab) { var lb = dark ? 'Ativar tema claro' : 'Ativar tema escuro'; fab.setAttribute('aria-pressed', dark ? 'true' : 'false'); fab.setAttribute('aria-label', lb); fab.setAttribute('title', lb); }
    var menu = !!s.menu, mb = d.querySelector('.menu-btn'), mm = d.getElementById('mmenu');
    if (mb) { mb.setAttribute('aria-expanded', menu ? 'true' : 'false'); mb.textContent = menu ? 'FECHAR' : 'MENU'; }
    if (mm) mm.setAttribute('data-open', menu ? 'true' : 'false');
    d.body.style.overflow = menu ? 'hidden' : '';
    var st = s.stage || 1, sp = d.querySelector('.sp');
    if (sp) sp.setAttribute('data-stage', String(st));
    d.querySelectorAll('.stg button').forEach(function (b, i) { if (i + 1 === st) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    var pub = s.pub || 'all', all = !!s.all;
    d.querySelectorAll('.w-f').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pub') === pub ? 'true' : 'false'); });
    var shown = 0, total = 0;
    d.querySelectorAll('.wl > li').forEach(function (li) {
      var k = li.getAttribute('data-pub'), ok = pub === 'all' || k === pub || (pub === 'O' && 'CAD'.indexOf(k) > -1), vis = false;
      if (ok) { total++; vis = all || total <= PREVIEW; if (vis) shown++; }
      li.hidden = !vis;
    });
    var set = function (key, v) { var el = d.querySelector('[data-b="' + key + '"]'); if (el) el.textContent = v; };
    set('shown', shown); set('total', total);
    set('moreLabel', all ? 'MOSTRAR MENOS' : 'MOSTRAR TODOS (' + total + ')'); set('moreSign', all ? '−' : '+');
    var more = d.getElementById('w-more');
    if (more) { more.hidden = total <= PREVIEW; more.setAttribute('aria-expanded', all ? 'true' : 'false'); }
  }
}

function acBoot(comp, resolve) {
  document.querySelectorAll('[data-ref]').forEach(function (el) {
    var f = comp[el.getAttribute('data-ref')];
    if (typeof f === 'function') f(el);
  });
  [['data-click', 'click'], ['data-enter', 'mouseenter'], ['data-leave', 'mouseleave'], ['data-focus', 'focus']].forEach(function (p) {
    document.querySelectorAll('[' + p[0] + ']').forEach(function (el) {
      var fn = resolve(el.getAttribute(p[0]));
      if (fn) el.addEventListener(p[1], fn);
    });
  });
  if (comp.componentDidMount) comp.componentDidMount();
  if (comp.sync) comp.sync();
}

(function () {
  var comp = new Component();
  acBoot(comp, function (name) {
    var m;
    if (typeof comp[name] === 'function') return comp[name];
    if ((m = /^goStage(\d)$/.exec(name))) return comp.goStage[+m[1]];
    if ((m = /^pick(\d)$/.exec(name))) return comp.pickPub[+m[1]];
    if ((m = /^focus(\d)$/.exec(name))) return comp.focusPan[+m[1]];
    return null;
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && comp.state.menu) comp.closeMenu(); });
})();
