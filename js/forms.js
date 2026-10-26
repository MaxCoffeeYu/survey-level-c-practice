/* =========================================================
 * forms.js — 依官方記錄表／答案紙格式繪製表格
 * 角度觀測手簿的角度欄依 PDF 拆成「度｜分｜秒」三格
 * ========================================================= */
(function (G) {
  'use strict';
  const S = G.SU;
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ---------- 值的解析與格式化 ---------- */
  function parseVal(def, raw) {
    if (raw === undefined || raw === null || raw === '') return { v: NaN, empty: true };
    if (typeof raw === 'number') return { v: raw };
    if (def.t === 'dms') { const p = S.parseDMS(raw); return p.ok ? { v: p.deg } : { v: NaN, err: p.err }; }
    if (def.t === 'sta') { const p = S.parseSta(raw); return p.ok ? { v: p.val } : { v: NaN, err: p.err }; }
    if (def.t === 'sel') return { v: raw };
    const s = String(raw).trim().replace(/^\+/, '').replace(/[，,]/g, '');
    const n = Number(s);
    return s !== '' && isFinite(n) ? { v: n } : { v: NaN, err: '請輸入數字' };
  }
  function fmtVal(def, v) {
    if (def.t === 'sel') return v ?? '';
    if (typeof v !== 'number' || !isFinite(v)) return '';
    if (def.t === 'dms') return S.fmtDMS(v, { signed: def.signed });
    if (def.t === 'sta') return S.fmtSta(v);
    return S.fmtNum(v, def.d ?? 3, def.signed);
  }
  /** 角度字串 → [度, 分, 秒] 三格文字 */
  function dmsParts(def, raw) {
    if (raw === undefined || raw === null || raw === '') return ['', '', ''];
    const p = S.parseDMS(raw);
    if (!p.ok) { const a = String(raw).split(/[^0-9.+-]+/); return [a[0] || '', a[1] || '', a[2] || '']; }
    const o = S.degToDms(p.deg);
    const sg = o.sign < 0 ? '-' : (def.signed ? '+' : '');
    return [sg + o.d, String(o.m).padStart(2, '0'), String(o.s).padStart(2, '0')];
  }
  /** 三格文字 → 角度字串 */
  function joinParts(d, m, s) {
    if (!String(d).trim() && !String(m).trim() && !String(s).trim()) return '';
    return `${String(d).trim() || '0'}-${String(m).trim() || '0'}-${String(s).trim() || '0'}`;
  }

  /* ---------- 版面格線計算 ---------- */
  function place(sec) {
    const nCols = sec.head[0].length;
    const occ = [];  // occ[r][c] = true
    const out = [];
    sec.rows.forEach((row, r) => {
      occ[r] = occ[r] || [];
      let c = 0;
      row.forEach(cell => {
        while (occ[r][c]) c++;
        const cs = cell.cs || 1, rs = cell.rs || 1;
        out.push({ r, c, cs, rs, cell });
        for (let i = 0; i < rs; i++) { occ[r + i] = occ[r + i] || []; for (let j = 0; j < cs; j++) occ[r + i][c + j] = true; }
        c += cs;
      });
    });
    return { nCols, cells: out };
  }
  const splitAngles = sec => sec.role === 'obs' && sec.book && sec.rows.some(r => r.some(c => c.k && c.t === 'dms'));

  /** 欄位名稱：列首（含合併列）＋欄名，供說明與錯誤訊息用 */
  function labelsOf(sec, pl) {
    const labels = {};
    const head = sec.head[0];
    const byRow = {};
    pl.cells.forEach(p => { (byRow[p.r] = byRow[p.r] || []).push(p); });
    const rowPts = r => {
      // 涵蓋此列、且為測點類標籤（cls 含 pt）的儲存格
      return pl.cells.filter(p => !p.cell.k && p.cell.cls && p.cell.cls.includes('pt') && p.r <= r && r < p.r + p.rs && p.cs === 1).sort((a, b) => a.c - b.c).map(p => p.cell.label).filter(Boolean);
    };
    const rowLabel = r => {
      let pts = rowPts(r);
      // 「測站、測點」兩欄（第二欄為一般標籤）
      const firstTwo = (byRow[r] || []).filter(p => !p.cell.k && p.c <= 1 && p.cs === 1);
      if (!pts.length && firstTwo.length) pts = firstTwo.map(p => p.cell.label).filter(Boolean);
      if (pts.length < 2) {
        const second = pl.cells.find(p => !p.cell.k && p.c === 1 && p.r === r && p.cs === 1 && p.cell.label && !(p.cell.cls || '').includes('pt'));
        // 只接受點號形式（A、TP1、P…），排除「待求」、距離數字等
        if (second && pts.length === 1 && /^([A-Z][A-Z0-9'’]*|TP\d+'?)$/.test(second.cell.label)) pts = pts.concat([second.cell.label]);
      }
      // 整列說明文字（如「∠C = 180° − ∠A − ∠B」）
      if (!pts.length) { const wide = (byRow[r] || []).find(p => !p.cell.k && p.cs > 1 && p.cell.label); if (wide) return wide.cell.label; }
      if (pts.length) return pts.join(' → ');
      // 沒有列首：取上下兩列的測點（導線邊）
      const up = rowPts(r - 1)[0], dn = rowPts(r + 1)[0];
      return up && dn ? `${up} → ${dn}` : '';
    };
    pl.cells.forEach(p => {
      if (!p.cell.k) return;
      const h = head[p.c] || '';
      // 緊鄰左格是較長的說明文字（如「後視總和 [b]」「閉合差 W」）→ 直接用它
      const leftN = (byRow[p.r] || []).find(q => !q.cell.k && q.c + q.cs === p.c && q.cell.label);
      if (leftN && leftN.cell.label.length > 4) { labels[p.cell.k] = leftN.cell.label; return; }
      const generic = /^(項目|結果|數值|計算結果|)$/.test(h);
      let lbl;
      if (generic) {
        const left = (byRow[p.r] || []).filter(q => !q.cell.k && q.c < p.c).sort((a, b) => b.c - a.c)[0];
        lbl = left ? left.cell.label : rowLabel(p.r);
      } else {
        const rl = rowLabel(p.r);
        lbl = rl ? `${rl}／${h}` : h;
      }
      labels[p.cell.k] = lbl;
    });
    return labels;
  }

  /**
   * 繪製一個表格區塊
   * opt: { blank, vals, ro(def) }
   */
  function renderSection(sec, opt = {}) {
    const pl = place(sec);
    const split = splitAngles(sec);
    const dmsCol = new Array(pl.nCols).fill(false);
    if (split) pl.cells.forEach(p => { if (p.cs === 1 && p.cell.k && p.cell.t === 'dms') dmsCol[p.c] = true; });
    const anyDms = dmsCol.some(Boolean);
    const w = c => (dmsCol[c] ? 3 : 1);
    // 表頭
    let thead = '<tr>' + sec.head[0].map((h, c) => dmsCol[c] ? `<th colspan="3">${esc(h)}</th>` : `<th${anyDms ? ' rowspan="2"' : ''}>${esc(h)}</th>`).join('') + '</tr>';
    if (anyDms) thead += '<tr>' + dmsCol.map(b => b ? '<th>度</th><th>分</th><th>秒</th>' : '').join('') + '</tr>';
    // 表身
    const rows = [];
    pl.cells.forEach(p => { (rows[p.r] = rows[p.r] || []).push(p); });
    const vals = opt.vals || {};
    const body = sec.rows.map((_, r) => '<tr>' + (rows[r] || []).map(p => cellHTML(p, dmsCol, w, vals, opt)).join('') + '</tr>').join('');
    return { html: `<div class="scroll-x"><table class="f">${'<thead>' + thead + '</thead>'}<tbody>${body}</tbody></table></div>`, labels: labelsOf(sec, pl) };
  }

  function cellHTML(p, dmsCol, w, vals, opt) {
    const c = p.cell;
    let span = 0; for (let j = 0; j < p.cs; j++) span += w(p.c + j);
    const rs = p.rs > 1 ? ` rowspan="${p.rs}"` : '';
    const isDmsCol = p.cs === 1 && dmsCol[p.c];
    if (!c.k) {
      if (c.ref) return `<td class="l" data-ref="${c.ref}"${rs}${span > 1 ? ` colspan="${span}"` : ''}>${opt.blank ? '' : '—'}</td>`;
      if (isDmsCol) {
        // 角度欄的標籤（如 0°00'00"）也拆成三格
        const m = String(c.label).match(/^(-?\d+)°(\d+)'(\d+)"$/);
        if (m) return `<td class="l"${rs}>${m[1]}</td><td class="l"${rs}>${m[2]}</td><td class="l"${rs}>${m[3]}</td>`;
        return `<td class="l"${rs} colspan="3">${esc(c.label)}</td>`;
      }
      return `<td class="l"${rs}${span > 1 ? ` colspan="${span}"` : ''}>${esc(c.label)}</td>`;
    }
    if (opt.blank) {
      if (isDmsCol) return `<td${rs}></td><td${rs}></td><td${rs}></td>`;
      return `<td${rs}${span > 1 ? ` colspan="${span}"` : ''}></td>`;
    }
    const ro = opt.ro ? opt.ro(c) : false;
    const roA = ro ? ' readonly tabindex="-1"' : '';
    const raw = vals[c.k] ?? '';
    if (c.t === 'sel') {
      return `<td${rs}${span > 1 ? ` colspan="${span}"` : ''}><select data-k="${c.k}"${ro ? ' disabled' : ''}>${c.options.map(([v, l]) => `<option value="${v}"${raw === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></td>`;
    }
    if (isDmsCol) {
      const parts = dmsParts(c, raw);
      return parts.map((v, i) => `<td class="dms"${rs}><input data-k="${c.k}" data-part="${i}" value="${esc(v)}" inputmode="${i === 0 && c.signed ? 'text' : 'numeric'}" autocomplete="off" aria-label="${['度', '分', '秒'][i]}"${roA}></td>`).join('');
    }
    const shown = raw === '' ? '' : (typeof raw === 'number' ? fmtVal(c, raw) : raw);
    const cls = c.t === 'dms' ? ' class="w-dms"' : '';
    const ph = c.t === 'dms' ? ' placeholder="度-分-秒"' : c.t === 'sta' ? ' placeholder="0K+000.000"' : '';
    return `<td${rs}${span > 1 ? ` colspan="${span}"` : ''}><input data-k="${c.k}"${cls} value="${esc(shown)}"${ph} inputmode="${c.t === 'num' ? 'decimal' : 'text'}" autocomplete="off"${roA}></td>`;
  }

  G.FORMS = { parseVal, fmtVal, dmsParts, joinParts, renderSection, esc };
})(window);
