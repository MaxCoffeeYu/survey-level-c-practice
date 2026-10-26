/* =========================================================
 * utils.js — 測量計算工具函式庫
 * 角度、DMS 轉換、方位角、距離、四捨五入、樁號、亂數
 * ========================================================= */
(function (G) {
  'use strict';

  const RHO = 206264.806;            // 1 弧度 = 206264.806"
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  /** 四捨五入（遠離零），n 位小數；避免浮點 x.xxx5 誤差 */
  function rnd(x, n = 3) {
    if (!isFinite(x)) return NaN;
    const f = Math.pow(10, n);
    return Math.sign(x) * Math.round(Math.abs(x) * f + 1e-7) / f;
  }

  /** 角度正規化至 [0, 360) */
  function norm360(a) { return ((a % 360) + 360) % 360; }
  /** 角度差正規化至 (-180, 180] */
  function wrap180(a) { let x = norm360(a); return x > 180 ? x - 360 : x; }
  /** 兩角差（秒） a - b */
  function angDiffSec(a, b) { return wrap180(a - b) * 3600; }

  /** 度分秒 → 十進位度 */
  function dmsToDeg(deg, min = 0, sec = 0) {
    const neg = deg < 0 || Object.is(deg, -0) || min < 0 || sec < 0;
    const v = Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600;
    return neg ? -v : v;
  }

  /** 十進位度 → {sign, d, m, s}（秒四捨五入至整數，可指定小數位） */
  function degToDms(decimalDeg, secDigits = 0) {
    const sign = decimalDeg < 0 ? -1 : 1;
    const f = Math.pow(10, secDigits);
    let t = Math.round(Math.abs(decimalDeg) * 3600 * f + 1e-6) / f;
    let d = Math.floor(t / 3600 + 1e-12);
    t = t - d * 3600;
    let m = Math.floor(t / 60 + 1e-12);
    let s = rnd(t - m * 60, secDigits);
    if (s >= 60) { s -= 60; m += 1; }
    if (m >= 60) { m -= 60; d += 1; }
    return { sign, d, m, s };
  }

  /** 格式化為 125°24'30" ；signed=true 時正值顯示 + */
  function fmtDMS(x, opt = {}) {
    if (!isFinite(x)) return '';
    const { signed = false, secDigits = 0 } = opt;
    const o = degToDms(x, secDigits);
    const ss = secDigits ? o.s.toFixed(secDigits).padStart(3 + secDigits, '0') : String(o.s).padStart(2, '0');
    const sg = o.sign < 0 ? '-' : (signed ? '+' : '');
    return `${sg}${o.d}°${String(o.m).padStart(2, '0')}'${ss}"`;
  }

  /** 以「度-分-秒」顯示（手簿用） */
  function fmtDMSDash(x) {
    if (!isFinite(x)) return '';
    const o = degToDms(x);
    return `${o.sign < 0 ? '-' : ''}${o.d}-${String(o.m).padStart(2, '0')}-${String(o.s).padStart(2, '0')}`;
  }

  /**
   * 解析 DMS 字串：
   *   "125-24-30"、"125 24 30"、"125°24'30\""、"-0-30-30"、"+0°30'30\""
   *   單一數字（如 "125.5"）視為十進位度
   * 回傳 {ok, deg, err, raw, singleNumber}
   */
  function parseDMS(str) {
    const raw = String(str ?? '').trim();
    if (raw === '') return { ok: false, empty: true, raw };
    let s = raw.replace(/[，,]/g, ' ').replace(/[＋]/g, '+').replace(/[－—–]/g, '-');
    let neg = false;
    if (/^[+-]/.test(s)) { neg = s[0] === '-'; s = s.slice(1); }
    const parts = s.split(/[^0-9.]+/).filter(p => p !== '');
    if (parts.length === 0 || parts.length > 3) return { ok: false, raw, err: '格式錯誤，請用 度-分-秒（例 125-24-30）' };
    const nums = parts.map(Number);
    if (nums.some(n => !isFinite(n))) return { ok: false, raw, err: '含無法辨識的字元' };
    if (parts.length === 1) {
      return { ok: true, deg: neg ? -nums[0] : nums[0], raw, singleNumber: true };
    }
    const [d, m = 0, sec = 0] = nums;
    if (m >= 60) return { ok: false, raw, err: '分不可 ≥ 60' };
    if (sec >= 60) return { ok: false, raw, err: '秒不可 ≥ 60' };
    const v = d + m / 60 + sec / 3600;
    return { ok: true, deg: neg ? -v : v, raw };
  }

  /** DD.MMSS（計算機格式）→ 十進位度，用於誤用偵測 */
  function ddmmssToDeg(x) {
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const d = Math.floor(x); const r = (x - d) * 100;
    const m = Math.floor(r + 1e-9); const s = (r - m) * 100;
    return sign * (d + m / 60 + s / 3600);
  }

  /**
   * 方位角（自北順時針，0~360°），四象限修正
   * x = E（橫坐標），y = N（縱坐標）
   */
  function azimuth(x1, y1, x2, y2) {
    const dE = x2 - x1, dN = y2 - y1;
    if (Math.abs(dE) < 1e-12 && Math.abs(dN) < 1e-12) return NaN;
    // 象限修正：atan2(ΔE, ΔN) 直接給出 -180~180，再正規化
    return norm360(Math.atan2(dE, dN) * R2D);
  }
  /** 以 (N,E) 物件呼叫 */
  function azNE(p1, p2) { return azimuth(p1.E, p1.N, p2.E, p2.N); }
  function distNE(p1, p2) { return Math.hypot(p2.E - p1.E, p2.N - p1.N); }
  /** 由起點、方位角、距離推算 */
  function polar(p, az, d) { return { N: p.N + d * Math.cos(az * D2R), E: p.E + d * Math.sin(az * D2R) }; }

  const sinD = a => Math.sin(a * D2R);
  const cosD = a => Math.cos(a * D2R);
  const tanD = a => Math.tan(a * D2R);

  /** 正倒鏡平均（水平角）：L 與 (R-180) 的平均，秒四捨五入 */
  function meanLR(L, R) {
    const r = norm360(R - 180);
    const m = norm360(L + wrap180(r - L) / 2);
    return roundSec(m);
  }
  /** 天頂距平均：Z = (L - R + 360) / 2 */
  function zenithLR(L, R) { return roundSec((L - R + 360) / 2); }
  /** 指標差 = (L + R - 360) / 2（秒） */
  function indexErr(L, R) { return wrap180(L + R - 360) * 3600 / 2; }
  /** 2C 差（秒）= L - (R ± 180) */
  function twoC(L, R) { return wrap180(L - (R - 180)) * 3600; }
  /** 角度四捨五入至整秒 */
  function roundSec(a) { return Math.sign(a) * Math.round(Math.abs(a) * 3600 + 1e-6) / 3600; }

  /** 樁號格式 2K+390.450 */
  function fmtSta(m, dec = 3) {
    if (!isFinite(m)) return '';
    const k = Math.floor((m + 1e-9) / 1000);
    const rest = rnd(m - k * 1000, dec);
    const restStr = rest.toFixed(dec).padStart(dec ? 4 + dec : 3, '0');
    return `${k}K+${restStr}`;
  }
  function parseSta(str) {
    const s = String(str ?? '').trim().toUpperCase().replace(/\s/g, '');
    if (!s) return { ok: false, empty: true };
    const m = s.match(/^(\d+)K\+?(\d+(?:\.\d*)?)$/);
    if (m) return { ok: true, val: Number(m[1]) * 1000 + Number(m[2]) };
    const n = Number(s);
    if (isFinite(n)) return { ok: true, val: n };
    return { ok: false, err: '樁號格式：2K+390.450 或 2390.450' };
  }

  /** 數字格式化 */
  function fmtNum(x, d = 3, signed = false) {
    if (!isFinite(x)) return '';
    const v = rnd(x, d);
    const s = (Object.is(v, -0) ? 0 : v).toFixed(d);
    return signed && v > 0 ? '+' + s : (signed && v === 0 ? '+' + s.replace('-', '') : s);
  }

  /** 亂數工具 */
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function gauss(sigma = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /** 截尾常態，避免產生過大誤差 */
  const noise = (sigma, cap = 2.5) => Math.max(-cap * sigma, Math.min(cap * sigma, gauss(sigma)));
  /** 加入秒級誤差 */
  const addSec = (deg, sec) => deg + sec / 3600;

  /** 最大餘數法：將整數總量依權重分配（測量常用：餘數給較大者） */
  function distribute(totalInt, weights) {
    const W = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map(w => totalInt * w / W);
    const base = raw.map(r => Math.trunc(r));
    let rem = totalInt - base.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => ({ i, f: Math.abs(r - base[i]) })).sort((a, b) => b.f - a.f);
    const step = Math.sign(rem);
    for (let k = 0; k < Math.abs(rem); k++) base[order[k % order.length].i] += step;
    return base;
  }

  /** 累積配賦（水準測量：第 k 站改正數 = round(-W·k/n)） */
  function cumCorr(W, k, n, dec = 3) { return rnd(-W * k / n, dec); }

  G.SU = {
    RHO, D2R, R2D, rnd, norm360, wrap180, angDiffSec, dmsToDeg, degToDms, fmtDMS, fmtDMSDash, parseDMS,
    ddmmssToDeg, azimuth, azNE, distNE, polar, sinD, cosD, tanD, meanLR, zenithLR, indexErr, twoC,
    roundSec, fmtSta, parseSta, fmtNum, rand, randInt, pick, gauss, noise, addSec, distribute, cumCorr
  };
})(window);
