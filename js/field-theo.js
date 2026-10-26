/* =========================================================
 * field-theo.js — 第一人稱外業：經緯儀與捲尺（沿用乙級第三版）
 *
 * 場地由各題已驗證的隨機產生器建立（坐標、高程、角度與評分一致）。
 * 經緯儀：電子顯示 HR（水平角）與 V（天頂距），可 0SET、正倒鏡切換；
 *         含少量 2C 誤差與指標差，學生需自行照準（粗動拖曳、微動按鈕）。
 * 覘標：鋼釘上的「▼」覘標（尖端對準鋼釘），或三腳架上的稜鏡（試題三、四）。
 * 捲尺：50m 鋼捲尺，最小刻劃 2mm；每次量測略有差異（往返兩次）。
 * ========================================================= */
(function (G) {
  'use strict';
  const S = G.SU, F = G.FORMS, esc = F.esc;
  const A = () => G.APP3, FI = () => G.FIELD._;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const task = id => G.TASKS.find(t => t.id === id);
  const K = 0.4;          // 望遠鏡畫面：每角秒 0.4 px（600 px ≈ 25′）
  const r3 = x => S.rnd(x, 3);
  const P = (x, y, H, label, t = 0) => ({ x, y, H, label, t, kind: 'stake' });
  const ST = (x, y, label) => ({ x, y, label });

  const SCENES = {};  // 丙級場地由 field-c.js 提供

  /* ---------------- 經緯儀狀態 ---------------- */
  const fs = () => FI().fs();
  /** 每次整置：度盤方向隨機、正鏡、儀器 2C 誤差與指標差 */
  function newSetup(sc, id) {
    const s = sc.stations[id];
    const HI = sc.stationHI && sc.stationHI[id] !== undefined ? sc.stationHI[id] : FI().terrain(sc, s.x, s.y) + S.rand(1.40, 1.60);
    if (!sc.instErr) sc.instErr = { c: S.noise(5), i: S.noise(9) };   // 同一部儀器，誤差固定
    return { HI, ori: S.rand(0, 360), face: 'L', c: sc.instErr.c, i: sc.instErr.i };
  }
  /** 目標（鋼釘頂覘標尖端或稜鏡中心）之方位角與天頂距（真值） */
  function trueDir(id) {
    const f = fs(), sc = f.scene, s = sc.stations[f.cur.id], p = sc.pts[id];
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    const az = S.azimuth(s.x, s.y, p.x, p.y);
    const Z = 90 - Math.atan2((p.H + (p.t || 0)) - f.cur.HI, d) * S.R2D;
    return { d, az, Z };
  }
  /** 儀器顯示值：HR、V（含 2C、指標差與照準偏差） */
  function display(id, ax, ay) {
    const f = fs(), cur = f.cur, { az, Z } = trueDir(id);
    const azp = az + ax / 3600, Zp = Z + ay / 3600;
    const HR = cur.face === 'L' ? S.norm360(azp - cur.ori + cur.c / 3600) : S.norm360(azp - cur.ori + 180 - cur.c / 3600);
    const V = cur.face === 'L' ? Zp + cur.i / 3600 : 360 - Zp + cur.i / 3600;
    return { HR: S.roundSec(HR), V: S.roundSec(S.norm360(V)), azp };
  }

  /* ---------------- 全景中的覘標／稜鏡 ---------------- */
  function panoTarget(p, id, x, yOf, gH, d, FOC) {
    const f = fs();
    const m = v => v / d * FOC;
    let g = '';
    if (p.t > 0) {
      // 三腳架＋稜鏡（覘標高 t）
      const yt = yOf(p.H + p.t), yb = yOf(gH), w = Math.max(10, m(0.45));
      g += `<g stroke="#555" stroke-width="${Math.max(1.2, m(0.02))}"><line x1="${x - w}" y1="${yb}" x2="${x}" y2="${yt}"/><line x1="${x + w}" y1="${yb}" x2="${x}" y2="${yt}"/><line x1="${x}" y1="${yb + 2}" x2="${x}" y2="${yt}"/></g>`;
      const pw = Math.max(9, m(0.14));
      g += `<rect x="${x - pw / 2}" y="${yt - pw}" width="${pw}" height="${pw}" fill="#ffd400" stroke="#222"/><circle cx="${x}" cy="${yt - pw / 2}" r="${pw * 0.28}" fill="#333"/>`;
    } else if (f.aimed === id) {
      // 助手持覘標，尖端對準鋼釘
      const tip = yOf(p.H), tw = Math.max(8, m(0.1)), th = Math.max(8, m(0.09));
      g += `<line x1="${x}" y1="${tip - th}" x2="${x}" y2="${yOf(p.H + 1.6)}" stroke="#666" stroke-width="${Math.max(2, m(0.02))}"/>
        <path d="M${x - tw / 2} ${tip - th} L${x} ${tip - th} L${x} ${tip} Z" fill="#d32f2f"/><path d="M${x} ${tip - th} L${x + tw / 2} ${tip - th} L${x} ${tip} Z" fill="#fff" stroke="#d32f2f" stroke-width="0.8"/>`;
      const hx = x + tw * 1.2, hs = 1.7 / d * FOC, yb = yOf(gH);
      g += `<g stroke="#334" stroke-width="${Math.max(1.5, hs / 40)}" fill="none"><circle cx="${hx}" cy="${yb - hs * 0.93}" r="${hs * 0.06}" fill="#f2c9a0"/><line x1="${hx}" y1="${yb - hs * 0.87}" x2="${hx}" y2="${yb - hs * 0.45}"/><line x1="${hx}" y1="${yb - hs * 0.45}" x2="${hx - hs * 0.08}" y2="${yb}"/><line x1="${hx}" y1="${yb - hs * 0.45}" x2="${hx + hs * 0.08}" y2="${yb}"/><line x1="${hx}" y1="${yb - hs * 0.8}" x2="${x}" y2="${yb - hs * 0.85}"/></g>`;
    }
    return g;
  }

  /* ---------------- 經緯儀望遠鏡 ---------------- */
  let sco = null;
  function aim(id) {
    const f = fs();
    const { d } = trueDir(id);
    sco = { id, ax: S.pick([-1, 1]) * S.rand(150, 420), ay: S.pick([-1, 1]) * S.rand(120, 360) };
    if (d > 120) A().toast('距離過遠，請確認目標。');
    renderScope();
    void f;
  }
  function renderScope() {
    const f = fs(), p = f.scene.pts[sco.id];
    $('#ovl').innerHTML = `<div class="ovl scope-ovl"><div class="scope-wrap">
      <div class="scope-h">照準：<b>${esc(FI().ptLabel(p))}</b>${p.t > 0 ? '（稜鏡中心）' : '（覘標尖端／鋼釘中心）'}　拖曳＝粗動，按鈕＝微動</div>
      <div class="scope-c" id="scopeC"></div>
      <div class="lcd" id="lcd"></div>
      <div class="scope-b">
        <span class="mv"><button class="btn" data-mv="-20,0">◀◀</button><button class="btn" data-mv="-1,0">◀</button><button class="btn" data-mv="1,0">▶</button><button class="btn" data-mv="20,0">▶▶</button></span>
        <span class="mv"><button class="btn" data-mv="0,-20">▲▲</button><button class="btn" data-mv="0,-1">▲</button><button class="btn" data-mv="0,1">▼</button><button class="btn" data-mv="0,20">▼▼</button></span>
      </div>
      <div class="scope-b"><button class="btn" id="b0set">0SET 置零</button><button class="btn" id="bFace">${f.cur.face === 'L' ? '縱轉為倒鏡' : '縱轉為正鏡'}</button>
        <button class="btn" id="sBook">記錄本</button><button class="btn primary" id="sBack">返回全景</button></div>
      <div class="note scope-note">▲▼◀▶ 每按一次轉動 1″（雙箭頭 20″）。縱絲與橫絲交點對準覘標尖端（或稜鏡中心）後，讀取 HR（水平角）與 V（天頂距）記錄。</div>
    </div></div>`;
    drawScope();
    const c = $('#scopeC'); let down = null;
    c.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, ax: sco.ax, ay: sco.ay }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => {
      if (!down) return;
      const k = 600 / c.getBoundingClientRect().width / K;  // 每螢幕 px 對應角秒
      // 拖曳畫面＝把目標拉到十字絲：向右拖 → 望遠鏡左轉
      sco.ax = down.ax - (e.clientX - down.x) * k; sco.ay = down.ay - (e.clientY - down.y) * k;
      drawScope();
    });
    c.addEventListener('pointerup', () => { down = null; });
    $$('[data-mv]').forEach(b => b.onclick = () => { const [dx, dy] = b.dataset.mv.split(',').map(Number); sco.ax += dx; sco.ay += dy; drawScope(); });
    $('#b0set').onclick = () => {
      const cur = f.cur, { azp } = display(sco.id, sco.ax, sco.ay);
      cur.ori = cur.face === 'L' ? azp + cur.c / 3600 : azp + 180 - cur.c / 3600;
      A().saveDraft(); drawScope(); A().toast('水平度盤已置零');
    };
    $('#bFace').onclick = () => {
      f.cur.face = f.cur.face === 'L' ? 'R' : 'L';
      sco.ax = S.pick([-1, 1]) * S.rand(120, 300); sco.ay = S.pick([-1, 1]) * S.rand(100, 260);  // 縱轉後需重新照準
      A().saveDraft(); renderScope(); A().toast(f.cur.face === 'L' ? '已縱轉為正鏡，請重新照準' : '已縱轉為倒鏡，請重新照準');
    };
    $('#sBook').onclick = () => FI().openBook(true);
    $('#sBack').onclick = () => { FI().closeOverlays(); sco = null; };
  }
  function drawScope() {
    const f = fs(), p = f.scene.pts[sco.id];
    const { d, Z } = trueDir(sco.id);
    const Zp = Z + sco.ay / 3600;
    const tx = 300 - sco.ax * K, ty = 300 - sco.ay * K;
    const m = v => v / d * S.RHO * K;          // 公尺 → 畫面 px
    const yh = 300 + (90 - Zp) * 3600 * K;      // 地平線
    let g = `<defs><clipPath id="tc"><circle cx="300" cy="300" r="292"/></clipPath>
      <radialGradient id="tv" cx="50%" cy="50%" r="50%"><stop offset="0.8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient></defs>
      <rect width="600" height="600" fill="#111"/><g clip-path="url(#tc)">
      <rect width="600" height="600" fill="#cfe1ef"/><rect y="${Math.min(600, Math.max(-10, yh))}" width="600" height="${Math.max(0, 600 - yh) + 20}" fill="#a9c58b"/>`;
    if (p.t > 0) {
      // 稜鏡：三腳架＋覘標板，中心為照準點
      const yg = ty + m(p.t), pw = m(0.13);
      g += `<g stroke="#555" stroke-width="${Math.max(2, m(0.025))}"><line x1="${tx - m(0.45)}" y1="${yg}" x2="${tx}" y2="${ty + m(0.12)}"/><line x1="${tx + m(0.45)}" y1="${yg}" x2="${tx}" y2="${ty + m(0.12)}"/></g>
        <rect x="${tx - m(0.02)}" y="${ty}" width="${m(0.04)}" height="${m(0.12)}" fill="#444"/>
        <rect x="${tx - pw / 2}" y="${ty - pw / 2}" width="${pw}" height="${pw}" fill="#ffd400" stroke="#222" stroke-width="1"/>
        <path d="M${tx - pw / 2} ${ty - pw / 2} L${tx} ${ty} L${tx - pw / 2} ${ty + pw / 2} Z M${tx + pw / 2} ${ty - pw / 2} L${tx} ${ty} L${tx + pw / 2} ${ty + pw / 2} Z" fill="#222"/>
        <circle cx="${tx}" cy="${ty}" r="${m(0.032)}" fill="#6a6a6a" stroke="#111"/><circle cx="${tx}" cy="${ty}" r="${m(0.012)}" fill="#bfe3ff"/>`;
    } else {
      // 木樁＋鋼釘，覘標「▼」尖端對準鋼釘中心
      const tw = m(0.08), th = m(0.07);
      g += `<rect x="${tx - m(0.018)}" y="${ty + m(0.006)}" width="${m(0.036)}" height="${m(0.3)}" fill="#c8a165" stroke="#6b4f2a"/>
        <rect x="${tx - m(0.003)}" y="${ty}" width="${m(0.006)}" height="${m(0.01)}" fill="#999"/>
        <line x1="${tx}" y1="${ty - th}" x2="${tx}" y2="${ty - th - m(1.2)}" stroke="#666" stroke-width="${Math.max(2, m(0.02))}"/>
        <path d="M${tx - tw / 2} ${ty - th} L${tx} ${ty - th} L${tx} ${ty} Z" fill="#d32f2f"/><path d="M${tx} ${ty - th} L${tx + tw / 2} ${ty - th} L${tx} ${ty} Z" fill="#fff" stroke="#d32f2f"/>`;
    }
    g += `<circle cx="300" cy="300" r="300" fill="url(#tv)"/></g>
      <g stroke="#111" stroke-width="1.2"><line x1="300" y1="8" x2="300" y2="592"/><line x1="8" y1="300" x2="592" y2="300"/>
      <line x1="294" y1="8" x2="294" y2="220"/><line x1="306" y1="8" x2="306" y2="220"/></g>
      <circle cx="300" cy="300" r="292" fill="none" stroke="#000" stroke-width="10"/>`;
    $('#scopeC').innerHTML = `<svg viewBox="0 0 600 600" width="100%" height="100%">${g}</svg>`;
    const dsp = display(sco.id, sco.ax, sco.ay);
    $('#lcd').innerHTML = `<div class="lcd-in"><span class="lcd-face">${f.cur.face === 'L' ? '正鏡' : '倒鏡'}</span>
      <div><b>V</b>　${S.fmtDMS(dsp.V)}</div><div><b>HR</b>　${S.fmtDMS(dsp.HR)}</div></div>`;
  }

  /* ---------------- 捲尺量測（最小刻劃 2mm） ---------------- */
  function tapeMenu() {
    const f = fs(), sc = f.scene;
    $('#ovl').innerHTML = `<div class="ovl"><div class="ovl-box">
      <div class="ovl-h"><b>捲尺量測（50m 鋼捲尺，最小刻劃 2mm）</b><button class="btn" data-close>關閉</button></div>
      <p class="note">每次量測讀數會略有差異（往返各量一次即可看出）。讀數請估讀至 mm 並記入記錄本。</p>
      ${sc.tapes.map((t, i) => `<button class="btn tape-item" data-i="${i}">${esc(t.label)}</button>`).join('')}</div></div>`;
    $('#ovl [data-close]').onclick = FI().closeOverlays;
    $$('#ovl .tape-item').forEach(b => b.onclick = () => tapeView(sc.tapes[+b.dataset.i]));
  }
  function tapeValue(t) {
    const sc = fs().scene;
    if (t.special === 'inst') return { v: sc.instH + S.noise(0.0004), msg: `以捲尺量測 ${esc(t.label)}：零點置於樁頂鋼釘，讀取儀器橫軸中心標記處。` };
    if (t.special === 'prism') {
      const p = sc.pts[t.p];
      if (!(p.t > 0)) return { v: null, msg: `${t.p} 點為鋼釘頂，以覘標尖端對準鋼釘中心，稜鏡高為 0。` };
      return { v: p.t + S.noise(0.0004), msg: `以捲尺量測 ${t.p} 點稜鏡高：零點置於樁頂鋼釘，讀取稜鏡中心標記處。` };
    }
    const a = sc.pts[t.a], b = sc.pts[t.b];
    return { v: Math.hypot(a.x - b.x, a.y - b.y) + S.noise(0.0012), msg: `零點對準 ${t.a} 點鋼釘中心，拉緊捲尺保持水平，讀取 ${t.b} 點鋼釘中心處讀數。` };
  }
  function tapeView(t) {
    const r = tapeValue(t);
    $('#ovl').innerHTML = `<div class="ovl"><div class="ovl-box tape-box">
      <div class="ovl-h"><b>${esc(t.label)}</b><span><button class="btn" id="tAgain">再量一次</button> <button class="btn" id="tBook">記錄本</button> <button class="btn" data-back>返回</button></span></div>
      <p class="note">${r.msg}</p>
      ${r.v === null ? '' : `<div class="tape-c">${tapeSVG(r.v)}</div><p class="note">紅色細線為${t.special ? '量測位置' : '鋼釘中心'}。尺面：最小刻劃 2mm，每公分一長刻；每 10cm 標公分數（旁附紅色小字公尺數）；整公尺為紅色「m」。</p>`}</div></div>`;
    $('#tAgain').onclick = () => tapeView(t);
    $('#tBook').onclick = () => FI().openBook(true);
    $('#ovl [data-back]').onclick = tapeMenu;
  }
  /**
   * 鋼捲尺放大畫面（依使用者提供之 2mm 捲尺樣式）：
   *   白色尺面，刻線由上緣向下：每 2mm 短刻、每公分長刻（不標字）
   *   每 10cm 全高線＋黑色公分數（如「40」），旁附紅色小字公尺數
   *   整公尺全高線＋紅色「1 m」，兩側紅色楔形指向 ±5cm 處的「▼」
   * center：畫面中央對應的尺上讀數；opt.marks：[{val, kind:'nail'|'pin'}]（val 為尺上讀數）
   */
  function tapeSVG(center, opt = {}) {
    const W = 600, H = 170, ppm = 5000;            // 1 mm = 5 px，畫面約 12 cm
    const Y0 = 34, TH = 96;                        // 尺面上緣、尺寬
    const X = val => W / 2 + (val - center) * ppm;
    const marks = opt.marks || [{ val: center, kind: 'nail' }];
    let g = `<rect width="${W}" height="${H}" fill="#9a8c74"/>`;
    const lo = Math.max(opt.zeroEnd ? 0 : -1e9, center - 0.066), hi = center + 0.066;
    const xs = X(lo);
    g += `<rect x="${Math.max(0, xs)}" y="${Y0}" width="${W - Math.max(0, xs)}" height="${TH}" fill="#f7f7f2" stroke="#999"/>`;
    if (opt.zeroEnd && X(0) > -20) {
      // 捲尺零端拉環
      g += `<rect x="${X(0) - 14}" y="${Y0 + 18}" width="14" height="${TH - 36}" rx="3" fill="#888" stroke="#444"/><circle cx="${X(0) - 22}" cy="${Y0 + TH / 2}" r="9" fill="none" stroke="#555" stroke-width="4"/>`;
    }
    const k0 = Math.ceil(lo * 500 - 1e-6), k1 = Math.floor(hi * 500 + 1e-6);   // 以 2mm 為單位
    for (let k = k0; k <= k1; k++) {
      const mm = k * 2, x = X(mm / 1000);
      if (mm % 1000 === 0) {
        // 整公尺：全高線、紅色「n m」、兩側楔形與 ▼（±5cm）
        const m = mm / 1000;
        g += `<line x1="${x}" y1="${Y0}" x2="${x}" y2="${Y0 + TH}" stroke="#111" stroke-width="1.8"/>`;
        if (m > 0) {
          g += `<text x="${x - 8}" y="${Y0 + 76}" font-size="30" font-family="Arial, sans-serif" font-weight="700" text-anchor="end" fill="#e00">${m}</text><text x="${x + 8}" y="${Y0 + 76}" font-size="30" font-family="Arial, sans-serif" font-weight="700" fill="#e00">m</text>`;
          const xl = X(mm / 1000 - 0.05), xl2 = X(mm / 1000 - 0.02), xr = X(mm / 1000 + 0.05), xr2 = X(mm / 1000 + 0.02);
          g += `<path d="M${xl} ${Y0 + 54} L${xl2} ${Y0 + 42} L${xl2} ${Y0 + 88} Z" fill="#e00"/><path d="M${xr} ${Y0 + 54} L${xr2} ${Y0 + 42} L${xr2} ${Y0 + 88} Z" fill="#e00"/>`;
          g += `<path d="M${xl - 7} ${Y0 + 47} L${xl + 7} ${Y0 + 47} L${xl} ${Y0 + 58} Z" fill="#222"/><path d="M${xr - 7} ${Y0 + 47} L${xr + 7} ${Y0 + 47} L${xr} ${Y0 + 58} Z" fill="#222"/>`;
        } else g += `<text x="${x + 10}" y="${Y0 + 76}" font-size="30" font-family="Arial, sans-serif" font-weight="700" fill="#111">0</text>`;
      } else if (mm % 100 === 0) {
        // 每 10cm：全高線＋公分數，旁附紅色小字公尺數
        const m = Math.floor(mm / 1000), c = (mm % 1000) / 10;
        g += `<line x1="${x}" y1="${Y0}" x2="${x}" y2="${Y0 + TH}" stroke="#111" stroke-width="1.5"/>
          <text x="${x - 6}" y="${Y0 + 78}" font-size="30" font-family="Arial, sans-serif" font-weight="700" text-anchor="end" fill="#111">${c}</text>
          <text x="${x + 5}" y="${Y0 + 84}" font-size="13" font-family="Arial, sans-serif" font-weight="700" fill="#e00">${m}m</text>`;
      } else if (mm % 10 === 0) g += `<line x1="${x}" y1="${Y0}" x2="${x}" y2="${Y0 + 40}" stroke="#111" stroke-width="1.5"/>`;
      else g += `<line x1="${x}" y1="${Y0}" x2="${x}" y2="${Y0 + 20}" stroke="#111" stroke-width="1.1"/>`;
    }
    for (const mk of marks) {
      const x = X(mk.val);
      if (mk.kind === 'pin') {
        // 測針（紅白相間）
        g += `<g><rect x="${x - 3}" y="6" width="6" height="${H - 14}" fill="#fff" stroke="#333"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${x - 3}" y="${6 + i * 27}" width="6" height="13" fill="#e00"/>`).join('')}<circle cx="${x}" cy="6" r="6" fill="#333"/></g>`;
      } else {
        // 鋼釘中心
        g += `<line x1="${x}" y1="14" x2="${x}" y2="${H - 6}" stroke="#e00" stroke-width="1.3"/><circle cx="${x}" cy="10" r="5" fill="#777" stroke="#333"/>`;
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
  }

  G.FIELD_THEO = { SCENES, newSetup, aim, panoTarget, tapeMenu, display, trueDir, tapeSVG, tapeValue };
})(window);
