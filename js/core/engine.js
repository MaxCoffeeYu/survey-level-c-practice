/* =========================================================
 * engine.js — 評分引擎、水準路線計算引擎、SVG 繪圖工具
 * ========================================================= */
(function (G) {
  'use strict';
  const { rnd, cumCorr, fmtNum } = G.SU;

  /* ---------------- 評分工具 ---------------- */

  /** 依級距給分：bands = [[上限, 分數], ...]（含上限），超出給 0 */
  function band(err, bands) {
    if (!isFinite(err)) return 0;
    for (const [lim, pts] of bands) if (err <= lim + 1e-9) return pts;
    return 0;
  }
  /** 長度誤差（mm，四捨五入至整數 mm） */
  const errMM = (a, b) => (isFinite(a) && isFinite(b)) ? Math.round(Math.abs(a - b) * 1000 + 1e-6) : NaN;
  /** 角度誤差（秒，整數） */
  const errSec = (a, b) => (isFinite(a) && isFinite(b)) ? Math.round(Math.abs(G.SU.angDiffSec(a, b)) + 1e-6) : NaN;

  /**
   * 建立評分項目
   * cat: 'obs' 觀測精度 | 'calc' 計算正確度 | 'field' 現場操作
   */
  function item(no, name, max, got, cat, detail, opt = {}) {
    const na = !!opt.na;
    let status = na ? 'na' : (got >= max - 1e-9 ? 'ok' : (got > 0 ? 'warn' : 'bad'));
    if (opt.status) status = opt.status;
    return { no, name, max, got: na ? 0 : got, cat, detail, status, na };
  }

  /**
   * 子項目逐一比對並依級距計分
   * list: [{label, stu, ref, kind:'mm'|'sec'|'raw', unit}]
   */
  function subScore(list, bands, perMax) {
    let got = 0; const parts = [];
    for (const s of list) {
      let e;
      if (s.kind === 'sec') e = errSec(s.stu, s.ref);
      else if (s.kind === 'mm') e = errMM(s.stu, s.ref);
      else e = (isFinite(s.stu) && isFinite(s.ref)) ? Math.abs(s.stu - s.ref) : NaN;
      const p = isFinite(s.stu) ? band(e, bands) : 0;
      got += p;
      const eTxt = !isFinite(s.stu) ? '未作答' : (s.kind === 'sec' ? `誤差 ${e}"` : s.kind === 'mm' ? `誤差 ${e} mm` : `誤差 ${fmtNum(e, s.dec ?? 3)}${s.unit || ''}`);
      parts.push({ label: s.label, pts: p, max: perMax, txt: eTxt, ok: p >= perMax });
    }
    return { got, parts, detail: parts.map(p => `${p.label}：${p.txt} → ${p.pts}/${p.max}`).join('；') };
  }

  /* ---------------- 水準路線計算引擎 ----------------
   * rows: [{pt, bs, is, fs}]（缺值以 NaN 表示）
   * 改正數：第 k 站（以前視計站）累積 round(-W·k/n)；
   *         間視點取該站後視點之累積改正數
   */
  function levelRoute(rows, H0, Hend) {
    const out = [];
    let Hbs = H0, BS = rows[0].bs, k = 0;
    const n = rows.filter((r, i) => i > 0 && isFinite(r.fs)).length;
    out.push({ pt: rows[0].pt, h: NaN, Hc: H0, k: 0, kind: 'start' });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (isFinite(r.fs)) {
        const h = rnd(BS - r.fs, 3);
        const Hc = rnd(Hbs + h, 3);
        k++;
        out.push({ pt: r.pt, h, Hc, k, kind: 'fs' });
        if (isFinite(r.bs)) { Hbs = Hc; BS = r.bs; }
      } else if (isFinite(r.is)) {
        const h = rnd(BS - r.is, 3);
        out.push({ pt: r.pt, h, Hc: rnd(Hbs + h, 3), k, kind: 'is' });
      } else {
        out.push({ pt: r.pt, h: NaN, Hc: NaN, k, kind: 'none' });
      }
    }
    const last = out[out.length - 1];
    const W = rnd(last.Hc - Hend, 3);
    const sumBS = rnd(rows.reduce((a, r) => a + (isFinite(r.bs) && r !== rows[rows.length - 1] ? r.bs : 0), 0), 3);
    const sumFS = rnd(rows.reduce((a, r) => a + (isFinite(r.fs) ? r.fs : 0), 0), 3);
    for (const o of out) {
      o.v = o.kind === 'start' ? 0 : cumCorr(W, o.k, n);
      o.Ha = rnd(o.Hc + o.v, 3);
    }
    return { rows: out, W, n, sumBS, sumFS };
  }

  /* ---------------- SVG 工具 ---------------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /**
   * 平面圖（N 朝上）
   * opt: { points:[{id,N,E,label,color,r}], lines:[{a,b,color,dash,w,label}],
   *        polylines:[{pts:[ids or {N,E}], color, dash}], arcs, extra:(P)=>svg, w,h, pad }
   */
  function planSVG(opt) {
    const W = opt.w || 520, H = opt.h || 400, pad = opt.pad ?? 46;
    const pts = opt.points.filter(p => isFinite(p.N) && isFinite(p.E));
    const all = pts.concat(opt.bounds || []);
    if (all.length < 1) return emptySVG(W, H, '輸入資料後顯示示意圖');
    let minE = Math.min(...all.map(p => p.E)), maxE = Math.max(...all.map(p => p.E));
    let minN = Math.min(...all.map(p => p.N)), maxN = Math.max(...all.map(p => p.N));
    const spanE = Math.max(maxE - minE, 1e-6), spanN = Math.max(maxN - minN, 1e-6);
    const s = Math.min((W - 2 * pad) / spanE, (H - 2 * pad) / spanN);
    const cx = (minE + maxE) / 2, cy = (minN + maxN) / 2;
    const P = p => ({ x: W / 2 + (p.E - cx) * s, y: H / 2 - (p.N - cy) * s });
    const byId = {}; pts.forEach(p => byId[p.id] = p);
    const get = a => (typeof a === 'string' ? byId[a] : a);
    let g = '';
    // 網格
    g += gridBG(W, H);
    for (const pl of (opt.polylines || [])) {
      const xy = pl.pts.map(get).filter(Boolean).map(P);
      if (xy.length < 2) continue;
      g += `<polyline points="${xy.map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}" fill="${pl.fill || 'none'}" stroke="${pl.color || '#94a3b8'}" stroke-width="${pl.w || 1.5}" ${pl.dash ? `stroke-dasharray="${pl.dash}"` : ''} opacity="${pl.op ?? 1}"/>`;
    }
    for (const l of (opt.lines || [])) {
      const a = get(l.a), b = get(l.b); if (!a || !b) continue;
      const A = P(a), B = P(b);
      g += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${l.color || '#1e293b'}" stroke-width="${l.w || 2}" ${l.dash ? `stroke-dasharray="${l.dash}"` : ''} ${l.arrow ? 'marker-end="url(#arr)"' : ''}/>`;
      if (l.label) {
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        g += `<text x="${mx}" y="${my - 6}" class="svg-lbl" text-anchor="middle" fill="${l.lcolor || '#475569'}">${esc(l.label)}</text>`;
      }
    }
    if (opt.extra) g += opt.extra(P, s, get);
    for (const p of pts) {
      const q = P(p);
      g += `<circle cx="${q.x}" cy="${q.y}" r="${p.r || 5}" fill="${p.color || '#f59e0b'}" stroke="#0f172a" stroke-width="1.5"/>`;
      if (p.label !== '') g += `<text x="${q.x + (p.dx ?? 8)}" y="${q.y + (p.dy ?? -8)}" class="svg-pt">${esc(p.label ?? p.id)}</text>`;
    }
    g += northArrow(28, 34);
    if (opt.scaleBar !== false) g += scaleBar(W, H, s);
    return wrapSVG(W, H, g);
  }

  function gridBG(W, H) {
    return `<rect width="${W}" height="${H}" fill="url(#grid)"/>`;
  }
  function northArrow(x, y) {
    return `<g transform="translate(${x},${y})"><path d="M0,-18 L7,6 L0,1 L-7,6 Z" fill="#ea580c" stroke="#0f172a" stroke-width="1"/><text x="0" y="20" text-anchor="middle" class="svg-pt" style="font-size:11px">N</text></g>`;
  }
  function scaleBar(W, H, s) {
    const cands = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    let len = cands[0];
    for (const c of cands) if (c * s <= 120) len = c;
    const px = len * s;
    return `<g transform="translate(${W - px - 18},${H - 16})"><line x1="0" y1="0" x2="${px}" y2="0" stroke="#0f172a" stroke-width="3"/><line x1="0" y1="-5" x2="0" y2="3" stroke="#0f172a"/><line x1="${px}" y1="-5" x2="${px}" y2="3" stroke="#0f172a"/><text x="${px / 2}" y="-6" text-anchor="middle" class="svg-lbl">${len} m</text></g>`;
  }
  function wrapSVG(W, H, inner) {
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto viz-svg">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 L0 0 0 20" fill="none" stroke="var(--grid)" stroke-width="1"/></pattern>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ea580c"/></marker>
        <marker id="arrB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1e293b"/></marker>
      </defs>${inner}</svg>`;
  }
  function emptySVG(W, H, msg) {
    return wrapSVG(W, H, gridBG(W, H) + `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="svg-lbl">${esc(msg)}</text>`);
  }

  /**
   * 縱斷面/高程剖面圖
   * opt: { series:[{name,color,pts:[{x,y,label}],dash,marker}], xTicks:[{x,label}], yStep, w,h, fills, title, vlines }
   */
  function profileSVG(opt) {
    const W = opt.w || 520, H = opt.h || 320;
    const L = 58, R = 18, T = 26, B = 46;
    const allPts = opt.series.flatMap(s => s.pts).filter(p => isFinite(p.x) && isFinite(p.y));
    if (allPts.length < 2) return emptySVG(W, H, '輸入資料後顯示剖面圖');
    let minX = Math.min(...allPts.map(p => p.x)), maxX = Math.max(...allPts.map(p => p.x));
    let minY = Math.min(...allPts.map(p => p.y)), maxY = Math.max(...allPts.map(p => p.y));
    const yStep = opt.yStep || niceStep((maxY - minY) / 5);
    minY = Math.floor(minY / yStep - 0.5) * yStep; maxY = Math.ceil(maxY / yStep + 0.5) * yStep;
    if (maxX - minX < 1e-9) maxX = minX + 1;
    const X = x => L + (x - minX) / (maxX - minX) * (W - L - R);
    const Y = y => T + (maxY - y) / (maxY - minY) * (H - T - B);
    let g = `<rect width="${W}" height="${H}" fill="var(--panel)"/>`;
    // y 網格
    const ny = Math.round((maxY - minY) / yStep);
    const labelEvery = opt.yLabelEvery || Math.max(1, Math.ceil(ny / 8));
    for (let i = 0; i <= ny; i++) {
      const y = minY + i * yStep;
      g += `<line x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}" stroke="var(--grid)" stroke-width="${i % labelEvery === 0 ? 1.2 : 0.6}"/>`;
      if (i % labelEvery === 0) g += `<text x="${L - 6}" y="${Y(y) + 4}" text-anchor="end" class="svg-lbl">${y.toFixed(opt.yDec ?? 3)}</text>`;
    }
    // x 軸刻度
    for (const t of (opt.xGrid || [])) g += `<line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H - B}" stroke="var(--grid)" stroke-width="0.6"/>`;
    for (const t of (opt.xTicks || [])) {
      g += `<line x1="${X(t.x)}" x2="${X(t.x)}" y1="${T}" y2="${H - B}" stroke="var(--grid)" stroke-width="1.2"/>`;
      g += `<text x="${X(t.x)}" y="${H - B + 16}" text-anchor="middle" class="svg-lbl">${esc(t.label)}</text>`;
    }
    g += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none" stroke="#64748b"/>`;
    if (opt.fills) for (const f of opt.fills) {
      g += `<polygon points="${f.pts.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}" fill="${f.color}" opacity="${f.op ?? 0.25}"/>`;
    }
    for (const s of opt.series) {
      const ps = s.pts.filter(p => isFinite(p.x) && isFinite(p.y));
      if (ps.length < 1) continue;
      g += `<polyline points="${ps.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2.2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
      if (s.marker !== false) for (const p of ps) {
        g += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r || 3.5}" fill="${p.fill || s.color}" stroke="#0f172a" stroke-width="0.8"/>`;
        if (p.label) g += `<text x="${X(p.x) + (p.dx ?? 0)}" y="${Y(p.y) + (p.dy ?? -8)}" text-anchor="middle" class="svg-pt" style="font-size:11px">${esc(p.label)}</text>`;
      }
    }
    for (const v of (opt.vlines || [])) {
      g += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${T}" y2="${H - B}" stroke="${v.color || '#ea580c'}" stroke-dasharray="4 3" stroke-width="1.5"/>`;
      g += `<text x="${X(v.x)}" y="${T - 8}" text-anchor="middle" class="svg-lbl" fill="${v.color || '#ea580c'}">${esc(v.label || '')}</text>`;
    }
    // 圖例
    let lx = L + 6;
    for (const s of opt.series) {
      if (!s.name) continue;
      g += `<line x1="${lx}" x2="${lx + 18}" y1="${H - 10}" y2="${H - 10}" stroke="${s.color}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/><text x="${lx + 22}" y="${H - 6}" class="svg-lbl">${esc(s.name)}</text>`;
      lx += 30 + s.name.length * 12;
    }
    if (opt.yTitle) g += `<text x="12" y="${T - 10}" class="svg-lbl">${esc(opt.yTitle)}</text>`;
    return wrapSVG(W, H, g);
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  /** 計算步驟：{h, lines[]} */
  const step = (h, ...lines) => ({ h, lines });

  G.SE = { band, errMM, errSec, item, subScore, levelRoute, planSVG, profileSVG, wrapSVG, emptySVG, gridBG, northArrow, esc, step, niceStep };
})(window);
