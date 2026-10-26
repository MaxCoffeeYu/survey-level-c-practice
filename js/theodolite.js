/* =========================================================
 * theodolite.js（3.1 版）— 共用電子經緯儀（仿 Topcon DT-200）
 *
 * 試題一～五共用同一部儀器與同一個望遠鏡介面：
 *   面板：左側螢幕、右側六鍵（R/L、V/%、HOLD、0 SET、FUNC、POWER）
 *   POWER：開機後才可操作；開機時螢幕只顯示水平角（預設 HR 右旋）
 *   0 SET：連按兩次水平角歸零（防誤觸）
 *   HOLD ：鎖定水平角讀數，再按一次解除
 *   R/L  ：切換右旋角 HR／左旋角 HL
 *   V/%  ：顯示天頂距 → 顯示坡度 % → 關閉垂直角
 *   水平制動螺旋旁：左右轉動（粗動／微動）；垂直制動螺旋旁：上下轉動
 *   縱轉望遠鏡：望遠鏡翻轉後指向反方向，須自行水平旋轉約 180° 再照準
 *
 * 儀器指向：f.point = { az（視線方位角）, Z（視線天頂距） }，全景畫面中央即視線方向。
 * ========================================================= */
(function (G) {
  'use strict';
  const S = G.SU;
  const A = () => G.APP3, FI = () => G.FIELD._;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const K = 0.4;                 // 望遠鏡畫面：每角秒 0.4 px
  const ARM_MS = 3000;           // 0 SET 第二次按鍵的有效時間
  const fs = () => A().st.field;
  let arm = 0, armT = null;      // 0 SET 第一次按下的時間
  let ui = null;                 // 目前望遠鏡畫面的設定（各題提供）
  let bootUntil = 0;             // 開機時全段顯示的結束時間

  /* ---------------- 儀器狀態 ---------------- */
  /** 新整置：未開機、HR 右旋、垂直角關閉、未 HOLD */
  function initCur(cur) { Object.assign(cur, { power: false, hr: 'R', vm: 0, hold: false }); delete cur.heldHR; return cur; }
  function ensurePoint(f = fs()) { if (!f.point) f.point = { az: f.az, Z: 90 }; return f.point; }
  /** 度盤讀數（右旋，未 HOLD）：含 2C */
  function rawHR() {
    const f = fs(), c = f.cur, az = ensurePoint(f).az;
    return S.norm360(c.face === 'L' ? az - c.ori + c.c / 3600 : az - c.ori + 180 - c.c / 3600);
  }
  function curHR() { const c = fs().cur; return S.roundSec(c.hold ? c.heldHR : rawHR()); }
  /** 天頂距讀數：含指標差；倒鏡為 360° − Z */
  function curV() {
    const f = fs(), c = f.cur, Z = ensurePoint(f).Z;
    return S.roundSec(S.norm360(c.face === 'L' ? Z + c.i / 3600 : 360 - Z + c.i / 3600));
  }
  /** 螢幕上的水平角：HR 或 HL（= 360° − HR） */
  function shownH() { const c = fs().cur, hr = curHR(); return c.hr === 'L' ? S.roundSec(S.norm360(360 - hr)) : hr; }
  /** 令目前視線的右旋讀數為 val（轉動度盤） */
  function setHR(val) {
    const f = fs(), c = f.cur, az = ensurePoint(f).az;
    c.ori = c.face === 'L' ? az + c.c / 3600 - val : az + 180 - c.c / 3600 - val;
  }
  /** 轉動望遠鏡（角秒）；HOLD 時度盤跟著轉，讀數不變 */
  function turn(dAz, dZ) {
    const f = fs(), c = f.cur, p = ensurePoint(f);
    p.az = S.norm360(p.az + dAz / 3600);
    p.Z = Math.max(5, Math.min(175, p.Z + dZ / 3600));
    if (c.hold) setHR(c.heldHR);
    f.az = p.az;
  }
  /** 以照準器粗略對準目標（留下數分的偏差，須以微動鈕精確照準） */
  function aimRough(az, Z) {
    const p = ensurePoint();
    const ta = az + S.pick([-1, 1]) * S.rand(150, 400) / 3600, tz = Z + S.pick([-1, 1]) * S.rand(100, 300) / 3600;
    turn(S.wrap180(ta - p.az) * 3600, (tz - p.Z) * 3600);
  }

  /* ---------------- 螢幕 ---------------- */
  function pctText(V) {
    const e = V < 180 ? 90 - V : V - 270, pc = Math.tan(e * S.D2R) * 100;
    return Math.abs(pc) >= 1000 ? '－－－－' : (pc >= 0 ? '+' : '') + pc.toFixed(2);
  }
  function lcdHTML() {
    const f = fs(), c = f && f.cur;
    if (!c || !c.power) return `<div class="dt-lcd off"><div class="dt-row"><i></i><span></span></div><div class="dt-row"><i></i><span></span></div></div>`;
    if (Date.now() < bootUntil) return `<div class="dt-lcd"><div class="dt-row"><i>VHt</i><span>-8.8.8°8.8'8.8"</span><em>%</em></div><div class="dt-row"><i>HRL</i><span>-8.8.8°8.8'8.8"</span><em>G</em></div></div>`;
    const blink = arm && Date.now() - arm < ARM_MS;
    const v = c.vm === 1 ? `<i>V</i><span>${S.fmtDMS(curV())}</span><em></em>` : c.vm === 2 ? `<i>V</i><span>${pctText(curV())}</span><em>%</em>` : '<i></i><span></span><em></em>';
    return `<div class="dt-lcd"><div class="dt-row">${v}</div>
      <div class="dt-row${blink || c.hold ? ' blink' : ''}"><i>${c.hr === 'L' ? 'HL' : 'HR'}</i><span>${S.fmtDMS(shownH())}</span><em>${c.hold ? 'H' : ''}</em></div></div>`;
  }
  /** 重繪所有螢幕（望遠鏡面板、全景右上角） */
  function refreshLCD() {
    $$('.dt-lcd-slot').forEach(el => { el.innerHTML = lcdHTML(); });
    const fb = $('#dtFace'); if (fb && fs().cur) fb.innerHTML = `縱轉望遠鏡<small>目前：${fs().cur.face === 'L' ? '正鏡' : '倒鏡'}</small>`;
  }

  /* ---------------- 面板按鍵 ---------------- */
  function key(k) {
    const f = fs(), c = f.cur; if (!c) return;
    if (k === 'POWER') {
      c.power = !c.power;
      if (c.power) {
        initCur(c); c.power = true; bootUntil = Date.now() + 900;
        setTimeout(refreshLCD, 950);
        A().toast('電源開啟：螢幕顯示水平角 HR（右旋）');
      } else { bootUntil = 0; c.hold = false; delete c.heldHR; A().toast('電源關閉'); }
      A().saveDraft(); refreshLCD(); return;
    }
    if (!c.power) return A().toast('儀器尚未開機，請先按 POWER 鍵');
    if (Date.now() < bootUntil) return;
    if (k === '0SET') {
      if (arm && Date.now() - arm < ARM_MS) {
        arm = 0; clearTimeout(armT);
        setHR(0); if (c.hold) c.heldHR = 0;
        A().toast('水平角已歸零 0°00\'00"');
      } else {
        arm = Date.now(); clearTimeout(armT);
        armT = setTimeout(() => { arm = 0; refreshLCD(); }, ARM_MS);
        A().toast('讀數閃爍中：再按一次 0 SET 即歸零');
      }
    } else if (k === 'HOLD') {
      if (!c.hold) { c.heldHR = curHR(); c.hold = true; A().toast('HOLD：水平角讀數已鎖定，轉動儀器讀數不變'); }
      else { c.hold = false; delete c.heldHR; A().toast('已解除 HOLD'); }
    } else if (k === 'RL') {
      c.hr = c.hr === 'L' ? 'R' : 'L';
      A().toast(c.hr === 'L' ? '左旋角模式 HL' : '右旋角模式 HR');
    } else if (k === 'V') {
      c.vm = (c.vm + 1) % 3;
      A().toast(['垂直角顯示關閉', '顯示天頂距 V', '顯示坡度 %'][c.vm]);
    } else if (k === 'FUNC') {
      A().toast('FUNC 用於倍角測量等功能，本檢定用不到');
    }
    A().saveDraft(); refreshLCD();
    if (ui) draw();
  }
  /** 縱轉望遠鏡：視線指向反方向（天頂距讀數變為 360° − Z），須自行水平旋轉約 180° */
  function transit() {
    const f = fs(), c = f.cur, p = ensurePoint(f);
    c.face = c.face === 'L' ? 'R' : 'L';
    p.az = S.norm360(p.az + 180); f.az = p.az;
    if (c.hold) setHR(c.heldHR);
    A().saveDraft();
    A().toast(c.face === 'R' ? '已縱轉為倒鏡：望遠鏡現在朝向反方向，請水平旋轉約 180° 重新照準' : '已縱轉為正鏡：請水平旋轉約 180° 重新照準');
    if (ui) render();
  }

  /** 儀器面板（左螢幕、右六鍵）＋水平／垂直制動螺旋旁的微動按鈕 */
  function panelHTML() {
    const kb = (k, label, cls = '') => `<button class="dt-key ${cls}" data-dtk="${k}">${label}</button>`;
    return `<div class="dt">
      <div class="dt-knob dt-h"><span class="kn"></span><b>水平制動／微動</b>
        <div class="mv"><button class="btn" data-mv="-20,0" title="左轉 20″">◀◀</button><button class="btn" data-mv="-1,0" title="左轉 1″">◀</button><button class="btn" data-mv="1,0" title="右轉 1″">▶</button><button class="btn" data-mv="20,0" title="右轉 20″">▶▶</button></div></div>
      <div class="dt-panel"><div class="dt-lcd-slot">${lcdHTML()}</div>
        <div class="dt-keys">${kb('RL', 'R/L')}${kb('V', 'V/%')}${kb('HOLD', 'HOLD')}${kb('0SET', '0 SET')}${kb('FUNC', 'FUNC')}${kb('POWER', '<svg class="pw-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"><path d="M7.5 6.5a7.5 7.5 0 1 0 9 0"/><path d="M12 3v8"/></svg>', 'pw')}</div></div>
      <div class="dt-knob dt-v"><span class="kn"></span><b>垂直制動／微動</b>
        <div class="mv"><button class="btn" data-mv="0,-20" title="上仰 20″">▲▲</button><button class="btn" data-mv="0,-1" title="上仰 1″">▲</button><button class="btn" data-mv="0,1" title="下俯 1″">▼</button><button class="btn" data-mv="0,20" title="下俯 20″">▼▼</button></div></div>
    </div>`;
  }

  /* ---------------- 望遠鏡畫面 ----------------
   * opt = { title, items():[{az,Z,d,svg(x,y,m),label}], extra():html, bindExtra(), buttons:html, bindButtons(), note } */
  function openScope(opt) { ui = opt; ensurePoint(); render(); }
  function render() {
    const f = fs();
    $('#ovl').innerHTML = `<div class="ovl scope-ovl"><div class="scope-wrap">
      <div class="scope-h">${ui.title}</div>
      <div class="scope-box"><div class="scope-c" id="scopeC"></div><button class="btn dt-face" id="dtFace">縱轉望遠鏡<small>目前：${f.cur.face === 'L' ? '正鏡' : '倒鏡'}</small></button></div>
      ${panelHTML()}
      ${ui.extra ? ui.extra() : ''}
      <div class="scope-b">${ui.buttons || ''}<button class="btn primary" id="dtBack">返回全景</button></div>
      <div class="note scope-note">${ui.note || ''}拖曳畫面＝鬆開制動螺旋粗轉；◀▶▲▼ 每按一次轉動 1″（雙箭頭 20″）。</div>
    </div></div>`;
    draw();
    const c = $('#scopeC'); let down = null;
    c.addEventListener('pointerdown', e => { const p = ensurePoint(); down = { x: e.clientX, y: e.clientY, az: p.az, Z: p.Z }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => {
      if (!down) return;
      const k = 600 / c.getBoundingClientRect().width / K, p = ensurePoint();
      // 拖曳畫面＝把目標拉到十字絲：向右拖 → 望遠鏡左轉
      const wantAz = down.az - (e.clientX - down.x) * k / 3600, wantZ = down.Z - (e.clientY - down.y) * k / 3600;
      turn(S.wrap180(wantAz - p.az) * 3600, (wantZ - p.Z) * 3600);
      draw();
    });
    c.addEventListener('pointerup', () => { if (down) A().saveDraft(); down = null; });
    $$('#ovl [data-mv]').forEach(b => b.onclick = () => { const [dx, dy] = b.dataset.mv.split(',').map(Number); turn(dx, dy); draw(); A().saveDraft(); });
    $$('#ovl [data-dtk]').forEach(b => b.onclick = () => key(b.dataset.dtk));
    $('#dtFace').onclick = transit;
    $('#dtBack').onclick = closeScope;
    if (ui.bindExtra) ui.bindExtra();
    if (ui.bindButtons) ui.bindButtons();
  }
  function closeScope() { ui = null; FI().closeOverlays(); FI().drawPano(); FI().drawMini(); }
  function draw() {
    if (!ui || !$('#scopeC')) return;
    const P0 = ensurePoint();
    const X = az => 300 + S.wrap180(az - P0.az) * 3600 * K;
    const Y = Z => 300 + (Z - P0.Z) * 3600 * K;
    const yh = Y(90);
    let g = `<defs><clipPath id="kc"><circle cx="300" cy="300" r="292"/></clipPath>
      <radialGradient id="kv" cx="50%" cy="50%" r="50%"><stop offset="0.8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient></defs>
      <rect width="600" height="600" fill="#111"/><g clip-path="url(#kc)"><rect width="600" height="600" fill="#cfe1ef"/>
      <rect y="${Math.min(620, Math.max(-20, yh))}" width="600" height="${Math.max(0, 640 - yh)}" fill="#a9c58b"/>`;
    // 地面紋理（方便感受轉動）
    for (let i = -6; i <= 6; i++) { const x = X(Math.round(P0.az * 60) / 60 + i / 60); g += `<line x1="${x}" y1="${Math.max(yh, 0)}" x2="${x}" y2="600" stroke="#9cb97f" stroke-width="1"/>`; }
    const edge = [];
    for (const it of ui.items()) {
      const x = X(it.az), y = Y(it.Z), m = v => v / it.d * S.RHO * K;
      // 視野外：在邊緣以箭頭提示方向
      if ((x < 15 || x > 585 || y < 15 || y > 585) && Math.abs(S.wrap180(it.az - P0.az)) < 20 && it.label) edge.push({ x, y, label: it.label });
      if (x < -400 || x > 1000 || y < -600 || y > 1200) continue;
      g += it.svg(x, y, m);
    }
    g += `<circle cx="300" cy="300" r="300" fill="url(#kv)"/></g>
      <g stroke="#111" stroke-width="1.2"><line x1="300" y1="8" x2="300" y2="592"/><line x1="8" y1="300" x2="592" y2="300"/><line x1="294" y1="8" x2="294" y2="220"/><line x1="306" y1="8" x2="306" y2="220"/></g>`;
    for (const e of edge) {
      const a = Math.atan2(e.y - 300, e.x - 300), ex = 300 + 255 * Math.cos(a), ey = 300 + 255 * Math.sin(a);
      g += `<g transform="translate(${ex},${ey}) rotate(${a * S.R2D})"><path d="M14 0 L-6 -10 L-6 10 Z" fill="#ffd400" stroke="#111"/></g>
        <text x="${ex - 22 * Math.cos(a)}" y="${ey - 22 * Math.sin(a) + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">${e.label}</text>`;
    }
    g += `<circle cx="300" cy="300" r="292" fill="none" stroke="#000" stroke-width="10"/>`;
    $('#scopeC').innerHTML = `<svg viewBox="0 0 600 600" width="100%" height="100%">${g}</svg>`;
    refreshLCD();
  }

  /* ---------------- 全景 ---------------- */
  /** 全景中央＝視線方向：全景轉動即儀器水平轉動（遵守 HOLD），並更新右上角螢幕 */
  function panoSync(f) {
    const p = ensurePoint(f);
    const d = S.wrap180(f.az - p.az) * 3600;
    if (Math.abs(d) > 0.01) turn(d, 0);
    const box = $('#panoLcd');
    if (box) box.innerHTML = `<div class="dt-lcd-slot">${lcdHTML()}</div>
      <div class="pano-lcd-note">${f.cur.power ? '畫面中央縱線＝望遠鏡指向（全景轉動較粗，精確對準請開望遠鏡用微動鈕）' : '儀器未開機：開啟望遠鏡後按面板 POWER 鍵'}</div>`;
  }

  G.DT = { initCur, ensurePoint, rawHR, curHR, curV, shownH, setHR, turn, aimRough, key, transit, lcdHTML, refreshLCD, openScope, closeScope, draw, panoSync, K };
})(window);
