/* =========================================================
 * field-c.js — 丙級術科第一人稱外業場地
 *   P 點經緯儀：A、B 兩點三腳架覘標（距 P 約 60m），單角法正倒鏡 ∠APB
 *   C、D 直接水準（約 120m）：轉點不固定，由應檢人選位置放置尺墊；
 *     返測 TP2 不可與往測 TP1 同一位置（只有一個尺墊，需重新擺置）
 *   E、F 捲尺量距（約 20m）：零點對準 E，於 F 讀數三次
 * ========================================================= */
(function (G) {
  'use strict';
  const S = G.SU, F = G.FORMS, esc = F.esc;
  const A = () => G.APP3, FI = () => G.FIELD._;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const r3 = x => S.rnd(x, 3);

  function makeScene() {
    const t = G.TASKS.find(x => x.id === 1);
    const HC = 30, HD = 30 + S.rand(-1.5, 1.5);
    const a0 = S.rand(0, 360), ang = S.rand(25, 150);
    const P0 = { N: 0, E: 0 };
    const pA = S.polar(P0, a0 + 180, S.rand(57, 63)), pB = S.polar(P0, a0 + 180 + ang, S.rand(57, 63));
    const base = S.rand(29.3, 30.3);
    const pts = {
      P: { x: 0, y: 0, H: base, label: 'P', kind: 'stake' },
      A: { x: pA.E, y: pA.N, H: base + S.rand(-0.3, 0.3), label: 'A', kind: 'stake', t: 1.35 },
      B: { x: pB.E, y: pB.N, H: base + S.rand(-0.3, 0.3), label: 'B', kind: 'stake', t: 1.35 },
      C: { x: -60, y: -110, H: HC, label: 'C', kind: 'stake' },
      D: { x: 60, y: -110, H: HD, label: 'D', kind: 'stake' }
    };
    // 可放尺墊的位置（C、D 中間附近）
    const slotXY = [[-3, -107], [4, -113], [-6, -114], [7, -106]];
    slotXY.forEach(([x, y], i) => {
      const g = HC + (HD - HC) * (x + 60) / 120 + S.rand(-0.35, 0.35);
      pts['T' + (i + 1)] = { id: 'T' + (i + 1), x, y, H: g + 0.03, ground: g, label: `尺墊位置${'①②③④'[i]}`, kind: 'slot' };
    });
    const dEF = S.rand(19.8, 20.3);
    pts.E = { x: -12, y: -150, H: base - 0.2, label: 'E', kind: 'stake' };
    pts.F = { x: -12 + dEF, y: -150, H: base - 0.2, label: 'F', kind: 'stake' };
    const stations = {
      P: { x: 0, y: 0, label: 'P 點（經緯儀）', kind: 'theo' },
      L1: { x: -30, y: -106, label: 'C、轉點之間（北）', kind: 'level' },
      L2: { x: 30, y: -106, label: '轉點、D 之間（北）', kind: 'level' },
      L3: { x: 30, y: -114, label: '轉點、D 之間（南）', kind: 'level' },
      L4: { x: -30, y: -114, label: 'C、轉點之間（南）', kind: 'level' }
    };
    const trueAng = S.norm360(S.azimuth(0, 0, pB.E, pB.N) - S.azimuth(0, 0, pA.E, pA.N));
    // 標準答案所需的無誤差觀測（供 truthOf 推算）；評分以真值覆寫
    const Tm = (HC + HD) / 2;
    const perfect = { A_L: 0, A_R: 180, B_L: trueAng, B_R: S.norm360(trueAng + 180), fC_bs: 1.5, fT_fs: HC + 1.5 - Tm, fT_bs: 1.5, fD_fs: Tm + 1.5 - HD, bD_bs: 1.5, bT_fs: HD + 1.5 - Tm, bT_bs: 1.5, bC_fs: Tm + 1.5 - HC, d1: dEF, d2: dEF, d3: dEF };
    return {
      kind: 'level', mixed: true, slots: true, pts, stations, x: S.randInt(-6, 6),
      known: { HC }, perfect, override: { ang: S.roundSec(trueAng), HD: r3(HD), dm: r3(dEF) },
      tapes: [{ key: 'EF', label: 'E → F 水平距離（零點對準 E 點，於 F 點讀數）', a: 'E', b: 'F' }],
      hint: '①於 P 點整置經緯儀，正鏡照準 A（0SET）、照準 B，倒鏡照準 B、A。②水準：先「放置尺墊」為 TP1，於 C、TP1 間設站讀 C、TP1；於 TP1、D 間設站讀 TP1、D；再將尺墊移至不同位置為 TP2 返測。③「捲尺量測」E→F 量三次。'
    };
  }
  G.FIELD.SCENES[1] = makeScene;

  /* ---------------- 放置尺墊 ---------------- */
  function plateMenu() {
    const f = FI().fs(), sc = f.scene;
    const slots = Object.keys(sc.pts).filter(k => sc.pts[k].kind === 'slot');
    const used = f.tpUse || {};
    $('#ovl').innerHTML = `<div class="ovl"><div class="ovl-box">
      <div class="ovl-h"><b>放置尺墊（轉點）</b><button class="btn" data-close>關閉</button></div>
      <p class="note">檢定只提供一個尺墊。往測時放置為 TP1；往測完成後移到<b>不同位置</b>作為返測的 TP2。移動尺墊後，原位置就沒有尺墊了。</p>
      <p>目前：${f.plate ? `尺墊在 <b>${esc(sc.pts[f.plate.slot].label)}</b>，作為 <b>${f.plate.role}</b>` : '尚未放置'}</p>
      <table class="f"><thead><tr><th>位置</th><th>作為往測 TP1</th><th>作為返測 TP2</th></tr></thead><tbody>
      ${slots.map(k => `<tr><td class="l">${esc(sc.pts[k].label)}${used.TP1 === k ? '（曾作 TP1）' : ''}${used.TP2 === k ? '（曾作 TP2）' : ''}</td>
        <td><button class="btn" data-slot="${k}" data-role="TP1">放這裡</button></td><td><button class="btn" data-slot="${k}" data-role="TP2">放這裡</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
    $('#ovl [data-close]').onclick = FI().closeOverlays;
    $$('#ovl [data-slot]').forEach(b => b.onclick = () => {
      const k = b.dataset.slot, role = b.dataset.role, p = sc.pts[k];
      f.plate = { slot: k, role, H: p.ground + 0.02 + S.noise(0.0015) };   // 每次擺放沉陷略有不同
      f.tpUse = Object.assign({}, f.tpUse, { [role]: k });
      A().saveDraft(); FI().closeOverlays(); FI().drawPano(); FI().drawMini();
      const same = f.tpUse.TP1 && f.tpUse.TP2 && f.tpUse.TP1 === f.tpUse.TP2;
      A().toast(same ? '注意：返測轉點 TP2 不可與往測 TP1 同一位置！' : `尺墊已放在${p.label}，作為 ${role}`);
    });
  }

  /** 評審附註：TP2 與 TP1 同位置不符試題規定 */
  function adjustGrade(t, items) {
    const f = FI().fs(); if (!f || !f.tpUse) return;
    const it = items.find(i => i.no === 4);
    if (it && f.tpUse.TP1 && f.tpUse.TP1 === f.tpUse.TP2) it.detail += '；注意：返測轉點 TP2 與 TP1 同一位置，不符試題規定';
  }

  G.FIELD_C = { makeScene, plateMenu, adjustGrade };
})(window);
