/* =========================================================
 * explain.js — 欄位計算說明（丙級）
 * explain(k, V, a) → { f: 公式, s: 代入數值, deps: [來源欄位鍵] }
 * ========================================================= */
(function (G) {
  'use strict';
  const S = G.SU;
  const d = x => S.fmtDMS(x), n = x => S.fmtNum(x, 3), ns = x => S.fmtNum(x, 3, true);
  const X = (f, s, deps) => ({ f, s, deps: deps || [] });
  const EX = {};

  /** 四題（三部分與完整試題）欄位鍵不重複，共用同一份說明 */
  const ex = (k, V, a) => {
    if (k === 'A_M' || k === 'B_M') {
      const p = k[0];
      return X('正倒鏡平均 = [正鏡 + (倒鏡 ± 180°)] / 2', `[${d(V(p + '_L'))} + (${d(V(p + '_R'))} − 180°)] / 2`, [p + '_L', p + '_R']);
    }
    if (k === 'ang') return X('∠APB = B 正倒鏡平均 − A 正倒鏡平均', `${d(a.B_M)} − ${d(a.A_M)}`, ['B_M', 'A_M']);
    // 高程差（＋／－欄）
    const hd = { fT: ['fC_bs', 'fT_fs', 'C', 'TP1'], fD: ['fT_bs', 'fD_fs', 'TP1', 'D'], bT: ['bD_bs', 'bT_fs', 'D', 'TP2'], bC: ['bT_bs', 'bC_fs', 'TP2', 'C'] };
    let m = k.match(/^(fT|fD|bT|bC)_h([pm])$/);
    if (m) {
      const [bs, fs, p0, p1] = hd[m[1]], h = V(bs) - V(fs);
      const sign = m[2] === 'p' ? '＋' : '－';
      return X(`高程差 = 後視（${p0}）− 前視（${p1}）；正值記「＋」欄、負值取絕對值記「－」欄`, `${n(V(bs))} − ${n(V(fs))} = ${ns(h)} → ${(h >= 0) === (m[2] === 'p') ? `記入「${sign}」欄` : `此欄空白`}`, [bs, fs]);
    }
    m = k.match(/^([fb])S([BFPM])$/);
    if (m) {
      const pre = m[1], col = m[2];
      const keys = { B: [pre === 'f' ? 'fC_bs' : 'bD_bs', pre + 'T_bs'], F: [pre + 'T_fs', pre === 'f' ? 'fD_fs' : 'bC_fs'], P: [pre + 'T_hp', (pre === 'f' ? 'fD' : 'bC') + '_hp'], M: [pre + 'T_hm', (pre === 'f' ? 'fD' : 'bC') + '_hm'] }[col];
      const name = { B: '後視總和', F: '前視總和', P: '「＋」欄總和', M: '「－」欄總和' }[col];
      const vals = keys.map(x => (col === 'P' || col === 'M') ? a[x] : V(x)).map(v => (isFinite(v) ? n(v) : '0'));
      return X(`${name} = 各列相加（空白視為 0）`, vals.join(' + '), keys);
    }
    if (k === 'hCD') return X('往測高程差 hCD = Σ後視 − Σ前視（＝ Σ＋ − Σ－）', `${n(a.fSB)} − ${n(a.fSF)}`, ['fSB', 'fSF']);
    if (k === 'hDC') return X('返測高程差 hDC = Σ後視 − Σ前視（＝ Σ＋ − Σ－）', `${n(a.bSB)} − ${n(a.bSF)}`, ['bSB', 'bSF']);
    if (k === 'W') return X('往返高程差之較差的絕對值 W = |hCD + hDC|', `|${ns(a.hCD)} + (${ns(a.hDC)})|`, ['hCD', 'hDC']);
    if (k === 'hm') return X("高程差之平均值 h'CD = (hCD − hDC) / 2", `(${ns(a.hCD)} − (${ns(a.hDC)})) / 2`, ['hCD', 'hDC']);
    if (k === 'HD') return X("D 點高程平均值 HD = HC + h'CD", `${n(V('HC'))} + (${ns(a.hm)})`, ['HC', 'hm']);
    if (k === 'dm') return X('平均值 = (第一次 + 第二次 + 第三次) / 3', `(${n(V('d1'))} + ${n(V('d2'))} + ${n(V('d3'))}) / 3`, ['d1', 'd2', 'd3']);
    return null;
  };

  G.TASKS.forEach(t => { EX[t.id] = ex; });
  G.EXPLAIN = EX;
})(window);
