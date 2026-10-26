/* =========================================================
 * app.js（第三版）— 選題 → 選模式 → 原格式記錄表／答案紙作答
 * 模式：calc 純內業練習、guide 教學引導（field 第一人稱外業：第 2 階段）
 * ========================================================= */
(function (G) {
  'use strict';
  const S = G.SU, E = G.SE, F = G.FORMS, esc = F.esc;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const CN = '一二三四五六七八九十';
  const MODES = {
    field: { name: '術科外業＋內業練習', desc: '第一人稱操作儀器觀測、記錄，結束外業後完成內業計算。' },
    calc: { name: '純內業練習', desc: '系統隨機生成外業觀測數據並填入記錄表，你只需完成內業計算，依官方時間計時、交卷評分。' },
    guide: { name: '教學引導模式', desc: '使用官方範例數據，依計算順序一格一格引導，說明每一格的公式與代入數值。' }
  };

  const st = { task: null, mode: null, defs: {}, labels: {}, vals: {}, sc: null, truth: null, submitted: false, guide: null, timer: null, sol: null };

  // 與乙級網站同在 github.io 網域，localStorage 須以不同前綴區隔（題號 1 會重複）
  const PFX = 'c3_';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PFX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* 無法儲存時略過 */ } },
    del(k) { try { localStorage.removeItem(PFX + k); } catch (e) { /* 略過 */ } }
  };

  /* ---------------- 共用工具 ---------------- */
  function makeV(obj) {
    const V = k => (obj[k] === undefined ? NaN : obj[k]);
    V.req = (...ks) => {
      const miss = ks.filter(k => obj[k] === undefined || obj[k] === '' || (typeof obj[k] === 'number' && !isFinite(obj[k])));
      if (miss.length) { const e = new Error('資料未填寫完整'); e.missing = miss; throw e; }
    };
    return V;
  }
  function values() { const o = {}; for (const k in st.defs) o[k] = F.parseVal(st.defs[k], st.vals[k]).v; return o; }
  function solveNow() { try { return st.task.solve(makeV(values())).ans; } catch (e) { return null; } }
  function isRight(def, stu, ref) {
    if (!(typeof ref === 'number' && isFinite(ref))) return !isFinite(stu);
    if (!isFinite(stu)) return false;
    if (def.t === 'dms') return Math.abs(S.angDiffSec(stu, ref)) <= (def.tol ?? 1.5);
    if (def.tolRel) return Math.abs(stu - ref) <= Math.abs(ref) * def.tolRel;
    return Math.abs(stu - ref) <= (def.tol ?? 1.5 * Math.pow(10, -(def.d ?? 3)));
  }
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }
  const taskName = t => t.title;
  const LICENSE_URL = 'LICENSE.md';
  /** 頁尾：著作權與授權條款 */
  const siteFoot = () => `<footer class="site-foot">© 2026 MaxCoffeeYu　｜　依<a href="${LICENSE_URL}" target="_blank" rel="noopener">本網站授權條款</a>使用：須標示作者、不得商用、改作須以相同條款分享，分享或修改者須同意台灣是一個獨立的國家。</footer>`;

  /* ---------------- 路由 ---------------- */
  function route() {
    stopTimer(); hideTip();
    const m = location.hash.match(/^#\/t(\d+)(?:\/(\w+))?/);
    const t = m && G.TASKS.find(x => x.id === +m[1]);
    if (!t) return viewHome();
    if (!m[2] || !MODES[m[2]]) return viewMode(t);
    if (m[2] === 'field') return (G.FIELD && G.FIELD.supports(t)) ? G.FIELD.enter(t) : viewMode(t, true);
    return viewWork(t, m[2]);
  }
  window.addEventListener('hashchange', route);

  /* ---------------- 首頁：丙級只有一份試題，拆成三部分分開練習（另有完整試題） ---------------- */
  const PART_DESC = {
    ang: '於 P 點整置經緯儀，以 A 為後視方向、B 為前視方向，採用單角法正倒鏡觀測水平角 ∠APB 一測回，讀數至秒。',
    lev: '假設 C 點樁頂高程為 30.000m，於 C、D 中間設轉點 TP1 往測，再設轉點 TP2 返測（TP2 不可與 TP1 同一位置且不可固定），計算往返高程差較差的絕對值及 D 點平均高程。',
    dist: '於 F 點利用捲尺測量 E、F 兩點間之水平距離三次（服務人員將捲尺零公尺對準 E 點），計算平均值。'
  };
  const maxOf = t => t.rubric.reduce((s, r) => s + r[2], 0);
  function viewHome() {
    document.title = '測量丙級術科練習';
    const full = G.TASKS.find(t => t.parts.length > 1);
    $('#app').innerHTML = `
      <div class="bar"><div class="bar-in"><h1 class="serif">技術士技能檢定測量丙級　術科練習<small>試題編號 ${full.code}　檢定時間 ${full.time} 分鐘（含觀測與計算）</small></h1></div></div>
      <div class="wrap">
        <div class="paper"><div class="paper-title">試題說明</div>
          <p class="note" style="text-align:center;margin-top:-4px">依「(1100701 起報檢者適用) 丙級測量技術士術科」應檢參考資料</p>
          <p>丙級術科只有一份試題，包含三部分。為方便練習，三部分可分開練習，也可做完整試題模擬檢定。</p>
          <p class="note">總分 100 分，60 分（含）以上及格。本網站之答案紙依應檢參考資料之格式呈現。</p></div>
        <h3 style="margin:22px 0 4px">請選擇練習題目</h3>
        <div class="modes">
          ${G.TASKS.map(t => `<a class="card" href="#/t${t.id}"><div class="no">${t.no}<span class="badge">練習 ${t.time} 分鐘</span><span class="badge">${maxOf(t)} 分</span></div>
            <div class="tt">${esc(t.title)}</div><p>${t.parts.length > 1 ? '三部分合併，依官方檢定時間 45 分鐘、總分 100 分模擬完整檢定。' : PART_DESC[t.parts[0]]}</p></a>`).join('')}
        </div>
        ${siteFoot()}
      </div>`;
  }
  function viewMode(t, fieldMsg) {
    document.title = `${t.title}｜測量丙級術科練習`;
    const single = t.parts.length === 1;
    $('#app').innerHTML = `
      <div class="bar"><div class="bar-in"><a class="btn" href="#/">← 選擇題目</a><h1 class="serif">${esc(t.title)}<small>${t.no}　${single ? `練習時間 ${t.time} 分鐘　本部分 ${maxOf(t)} 分` : `試題編號 ${t.code}　檢定時間 ${t.time} 分鐘（含觀測與計算）`}</small></h1>
        <button class="btn" id="btnPrintBlank">列印空白${single ? '記錄表' : '答案紙'}</button></div></div>
      <div class="wrap">
        <div class="paper"><div class="paper-title">試題說明</div>
          <p class="note" style="text-align:center;margin-top:-4px">依「(1100701 起報檢者適用) 丙級測量技術士術科」應檢參考資料</p>
          <ol class="parts">${t.parts.map(k => `<li value="${['ang', 'lev', 'dist'].indexOf(k) + 1}"><b>${esc(G.TASKS.find(x => x.parts.length === 1 && x.parts[0] === k).title)}</b>：${PART_DESC[k]}</li>`).join('')}</ol>
          <p class="note">${single ? `本部分為分項練習：評審項目依官方評審表中與本部分相關的項目（滿分 ${maxOf(t)} 分），結果另換算為百分制供參考；練習時間為建議值，非官方規定。` : '總分 100 分，60 分（含）以上及格。本網站之答案紙依應檢參考資料之格式呈現。'}</p></div>
        <h3 style="margin:22px 0 4px">請選擇練習模式</h3>
        ${fieldMsg ? '<p class="fatal" style="background:#fff">第一人稱外業模式目前無法使用。</p>' : ''}
        <div class="modes">
          <a class="card${G.FIELD && G.FIELD.supports(t) ? '' : ' disabled'}" href="#/t${t.id}/field"><div class="no">模式 1</div><div class="tt">${MODES.field.name}</div><p>${MODES.field.desc}</p></a>
          <a class="card" href="#/t${t.id}/calc"><div class="no">模式 2</div><div class="tt">${MODES.calc.name}</div><p>${MODES.calc.desc}</p></a>
          <a class="card" href="#/t${t.id}/guide"><div class="no">模式 3</div><div class="tt">${MODES.guide.name}</div><p>${MODES.guide.desc}</p></a>
        </div>
        ${siteFoot()}
      </div>`;
    $('#btnPrintBlank').onclick = () => printBlank(t);
  }

  /* ---------------- 作答頁 ---------------- */
  function buildDefs(t) { const d = {}; t.layout.forEach(sec => sec.rows.forEach(r => r.forEach(c => { if (c.k) d[c.k] = c; }))); return d; }
  /** 第一人稱外業才需要的區塊（如第五題實地測設誤差）在內業模式隱藏 */
  const fieldOnly = sec => sec.rows.every(r => r.every(c => !c.k || c.free));

  function newScenario(kind) {
    const t = st.task;
    // 一般觀測品質：閉合差不為零，學生才需實際做改正數配賦
    const sc = kind === 'official' ? t.official() : t.random('normal');
    sc.source = kind;
    st.sc = sc;
    // 內業練習：給定的觀測值即視為正確外業成果，標準答案依此推算
    try { st.truth = t.solve(makeV(Object.assign({}, sc.known, sc.obs))).ans; } catch (e) { st.truth = null; }
    st.vals = {};
    for (const k in st.defs) {
      const d = st.defs[k];
      if (d.role === 'known' && k in sc.known) st.vals[k] = F.fmtVal(d, sc.known[k]);
      if (d.role === 'obs' && !d.free && sc.obs && k in sc.obs) st.vals[k] = F.fmtVal(d, sc.obs[k]);
    }
    st.calcText = '';
    st.submitted = false;
  }
  const draftKey = () => `draft_${st.task.id}_${st.mode}`;
  function saveDraft() {
    clearTimeout(saveDraft.t);
    saveDraft.t = setTimeout(() => store.set(draftKey(), { field: st.field || null, sc: st.sc, vals: st.vals, calcText: st.calcText, submitted: st.submitted, remain: st.timer ? st.timer.remain : null, gi: st.guide ? st.guide.i : 0 }), 300);
  }

  function viewWork(t, mode) {
    st.task = t; st.mode = mode; st.defs = buildDefs(t); st.labels = {};
    document.title = `${t.title}｜${MODES[mode].name}`;
    const d = store.get(draftKey(), null);
    if (d && d.sc) {
      const nan = o => { if (o) for (const k in o) if (o[k] === null) o[k] = NaN; return o; };
      nan(d.sc.known); nan(d.sc.obs);
      st.sc = d.sc; st.vals = d.vals || {}; st.calcText = d.calcText || ''; st.submitted = !!d.submitted;
      try { st.truth = t.solve(makeV(Object.assign({}, st.sc.known, st.sc.obs))).ans; } catch (e) { st.truth = null; }
    } else newScenario(mode === 'guide' ? 'official' : 'random');
    st.timer = mode === 'calc' ? { limit: t.time * 60, remain: d && d.remain != null ? d.remain : t.time * 60, running: false, h: null } : null;
    renderWork();
    if (mode === 'guide') startGuide(d ? d.gi : 0);
    if (d && d.sc) toast(st.submitted ? '已交卷，以下為評審結果' : '已還原上次作答');
  }

  function renderWork() {
    const t = st.task, mode = st.mode;
    const ro = def => st.submitted || ((def.role === 'known' || def.role === 'obs') && !def.free);
    const sec = role => t.layout.filter(s => s.role === role && !fieldOnly(s));
    const block = list => list.map(s => {
      const r = F.renderSection(s, { vals: st.vals, ro });
      Object.assign(st.labels, r.labels);
      return `<h3>${esc(s.title)}</h3>${r.html}`;
    }).join('');
    const hdr = kind => `<div class="paper-title">技術士技能檢定測量丙級術科測試${kind}</div>
      <table class="hdr"><tr><td class="k">試題編號</td><td>${t.code}</td><td class="k">試題名稱</td><td colspan="3">${esc(t.title)}</td></tr>
      <tr><td class="k">應檢人姓名</td><td></td><td class="k">准考證號碼</td><td></td><td class="k">檢定日期</td><td>　　年　　月　　日</td></tr></table>`;
    const timerHTML = st.timer ? `<span class="timer" id="timer"></span><button class="btn" id="btnTimer"></button>` : '';
    const actions = (mode === 'calc' || mode === 'field')
      ? `${timerHTML}<button class="btn" id="btnNew">${mode === 'field' ? '重新開始（新場地）' : '重新出題'}</button><button class="btn primary" id="btnSubmit"${st.submitted ? ' disabled' : ''}>${st.submitted ? '已交卷' : '交卷'}</button>`
      : `<button class="btn" id="btnRestart">重新開始</button><button class="btn primary" id="btnSubmit"${st.submitted ? ' disabled' : ''}>${st.submitted ? '已完成' : '完成並檢核'}</button>`;
    $('#app').innerHTML = `
      <div class="bar"><div class="bar-in"><a class="btn" href="#/t${t.id}">← 選擇模式</a>
        <h1 class="serif">${esc(taskName(t))}<small>${MODES[mode].name}${mode === 'guide' ? '（官方範例數據）' : ''}</small></h1>${actions}</div></div>
      <div class="papers form-root" id="papers">
        <div id="rubricSlot"></div>
        <section class="paper">${hdr('試題')}
          <p><b>${t.parts.length > 1 ? '檢定時間' : '練習時間'}：</b>${t.time} 分鐘（含觀測與計算）</p>
          <p><b>題目：</b>${esc(t.intro.goal)}</p>
          <p class="note">${mode === 'field' ? '外業已結束，觀測記錄表為你在外業時親自記錄的讀數（不得再修改）；已知資料已發給。請完成記錄表中的計算欄位及答案紙後交卷。' : mode === 'calc' ? '本模式為純內業練習：外業觀測數據已由系統隨機生成並填入記錄表，請依已知資料完成記錄表中的計算欄位及答案紙。' : '教學引導：下方面板會依計算順序指出目前要填的格子（黃色），並以藍色標示會用到的資料。可自行填寫，或按「顯示答案」。'}</p>
        </section>
        <section class="paper">${hdr('答案紙')}<p class="caution">注意事項：${esc(t.caution)}</p>${block(t.layout.filter(s => s.role !== 'known' && !fieldOnly(s)))}
          <h3>計算式（請列出公式及計算過程）</h3><textarea class="calc-area" id="calcText" ${st.submitted ? 'readonly' : ''} placeholder="在此列出計算式（不列入系統評分，練習書寫用）">${esc(st.calcText || '')}</textarea>
        </section>
      </div>
      ${mode === 'guide' ? '<div class="guide" id="guide"></div>' : ''}`;
    bindWork();
    refreshRefs();
    if (st.timer) renderTimer();
    if (st.submitted) showResult(false);
  }

  function bindWork() {
    const papers = $('#papers');
    papers.addEventListener('input', onInput);
    papers.addEventListener('change', onInput);
    papers.addEventListener('focusout', onBlur);
    papers.addEventListener('keydown', onKey);
    papers.addEventListener('mouseover', e => { const el = e.target.closest('[data-k]'); if (el && st.submitted) showTip(el); });
    papers.addEventListener('mouseout', e => { const el = e.target.closest('[data-k]'); if (el && !el.contains(e.relatedTarget) && document.activeElement !== el) hideTip(); });
    papers.addEventListener('focusin', e => { const el = e.target.closest('[data-k]'); if (!el) return; if (st.submitted) showTip(el); else if (st.mode === 'guide') guideJump(el.dataset.k); });
    const ct = $('#calcText'); if (ct) ct.addEventListener('input', () => { st.calcText = ct.value; saveDraft(); });
    $('#btnSubmit').onclick = () => {
      if (st.submitted) return;
      if (st.mode === 'calc' || st.mode === 'field') {
        const blank = Object.keys(st.defs).filter(k => st.defs[k].role === 'ans' && !String(st.vals[k] ?? '').trim()).length;
        if (!confirm(`確定交卷？${blank ? `尚有 ${blank} 格未填。` : ''}交卷後不能再修改。`)) return;
      }
      submit(false);
    };
    if ($('#btnNew') && st.mode === 'field') $('#btnNew').onclick = () => { if (confirm('重新開始會換一個新場地並清除所有記錄，確定嗎？')) G.FIELD.reset(); };
    else if ($('#btnNew')) $('#btnNew').onclick = () => { if (confirm('重新出題會清除目前作答並重設時間，確定嗎？')) { store.del(draftKey()); stopTimer(); newScenario('random'); st.timer.remain = st.timer.limit; renderWork(); toast('已重新出題'); } };
    if ($('#btnRestart')) $('#btnRestart').onclick = () => { if (confirm('清除作答，從第一步重新開始？')) { store.del(draftKey()); newScenario('official'); renderWork(); startGuide(0); } };
    if ($('#btnTimer')) $('#btnTimer').onclick = () => (st.timer.running ? stopTimer() : startTimer());
  }

  /* ---------------- 輸入處理 ---------------- */
  function onInput(e) {
    const el = e.target; const k = el.dataset.k; if (!k || st.submitted) return;
    const def = st.defs[k];
    if (el.dataset.part !== undefined) {
      const parts = $$(`[data-k="${k}"][data-part]`).sort((a, b) => a.dataset.part - b.dataset.part).map(x => x.value);
      st.vals[k] = F.joinParts(...parts);
      // 分、秒填滿兩位數（度填滿三位數）自動跳下一格
      const pi = +el.dataset.part, digits = el.value.replace(/[^0-9]/g, '').length;
      if (e.type === 'input' && pi < 2 && digits >= (pi === 0 ? 3 : 2)) { const nx = $(`[data-k="${k}"][data-part="${pi + 1}"]`); if (nx) { nx.focus(); nx.select(); } }
    } else st.vals[k] = el.value;
    const p = F.parseVal(def, st.vals[k]);
    $$(`[data-k="${k}"]`).forEach(x => { x.classList.toggle('err', !!p.err); x.classList.remove('ok', 'bad', 'miss'); x.title = p.err || ''; });
    refreshRefs();
    saveDraft();
    if (st.mode === 'guide') guideCheck(k, false);
  }
  function onBlur(e) {
    const el = e.target; const k = el.dataset && el.dataset.k; if (!k || el.readOnly || el.dataset.part !== undefined) return;
    const def = st.defs[k]; if (def.t === 'sel') return;
    const p = F.parseVal(def, el.value);
    if (!p.err && !p.empty) { const f = F.fmtVal(def, p.v); if (f !== el.value) { el.value = f; st.vals[k] = f; saveDraft(); } }
    if (st.mode === 'guide') guideCheck(k, true);
  }
  function onKey(e) {
    if (e.key !== 'Enter' || !e.target.dataset.k) return;
    e.preventDefault();
    if (st.mode === 'guide') guideCheck(e.target.dataset.k, true);
    const root = e.target.closest('.form-root') || document;
    const list = Array.from(root.querySelectorAll('[data-k]')).filter(x => !x.readOnly && !x.disabled);
    const n = list[list.indexOf(e.target) + (e.shiftKey ? -1 : 1)];
    if (n && st.mode !== 'guide') n.focus();
  }
  function refreshRefs() {
    const o = values();
    $$('[data-ref]').forEach(td => { const k = td.dataset.ref, d = st.defs[k]; td.textContent = d && isFinite(o[k]) ? F.fmtVal(d, o[k]) : '—'; });
  }
  function setField(k, v) {
    const def = st.defs[k];
    st.vals[k] = typeof v === 'number' && isFinite(v) ? F.fmtVal(def, v) : '';
    const els = $$(`#papers [data-k="${k}"]`);
    if (els.length && els[0].dataset.part !== undefined) { const parts = F.dmsParts(def, st.vals[k]); els.forEach(x => { x.value = parts[+x.dataset.part]; }); }
    else els.forEach(x => { x.value = st.vals[k]; });
    refreshRefs(); saveDraft();
  }

  /* ---------------- 計時器（純內業） ---------------- */
  function renderTimer() {
    const tm = st.timer, el = $('#timer'); if (!el) return;
    const m = Math.floor(tm.remain / 60), s = tm.remain % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    el.classList.toggle('low', tm.remain <= 300);
    const b = $('#btnTimer'); if (b) { b.textContent = tm.running ? '暫停' : (tm.remain < tm.limit ? '繼續計時' : '開始計時'); b.disabled = st.submitted; }
  }
  function startTimer() {
    const tm = st.timer; if (!tm || tm.running || st.submitted) return;
    tm.running = true; const t0 = Date.now(), r0 = tm.remain;
    tm.h = setInterval(() => {
      tm.remain = Math.max(0, r0 - Math.floor((Date.now() - t0) / 1000));
      renderTimer(); if (tm.remain % 10 === 0) saveDraft();
      if (tm.remain <= 0) { stopTimer(); toast('時間到，已自動交卷'); if (st.mode === 'field' && G.FIELD && G.FIELD.forceEnd() === false) return; submit(true); }
    }, 250);
    renderTimer();
  }
  function stopTimer() { const tm = st.timer; if (tm && tm.h) { clearInterval(tm.h); tm.h = null; } if (tm) tm.running = false; renderTimer(); }

  /* ---------------- 交卷與評審表 ---------------- */
  function submit(auto) {
    stopTimer();
    st.submitted = true;
    if (st.guide) st.guide.done = true;
    saveDraft();
    renderWork();
    showResult(true, auto);
  }
  function gradeNow() {
    const t = st.task, obj = values(), V = makeV(obj), sol = solveNow();
    const ctx = { V, sol, truth: st.truth, self: { instrument: true }, raw: k => st.vals[k] ?? '', mode: 'auto' };
    let res; try { res = t.grade(ctx); } catch (e) { console.error(e); res = { items: [], hints: [] }; }
    // 外業操作項目在內業模式不評
    if (st.mode === 'field') {
      res.items.forEach(i => { if (i.cat === 'field') i.detail = '每次設站均完成儀器整置（定平）步驟'; });
      if (G.FIELD) G.FIELD.adjustGrade(t, res.items);
    } else res.items.forEach(i => { if (i.cat === 'field') { i.na = true; i.got = 0; i.detail = '外業操作項目，內業練習不評分'; } });
    let fatal = null;
    if (t.ruleZeroIfMismatch && sol) {
      const bad = Object.values(st.defs).filter(d => d.book && d.role === 'ans' && isFinite(obj[d.k]) && isFinite(sol[d.k]) && !isRight(d, obj[d.k], sol[d.k]));
      if (bad.length) fatal = `觀測記錄表中「${bad.map(d => st.labels[d.k] || d.k).join('、')}」與原始觀測數據不符。依注意事項「觀測之數據與計算之數據不符者，總分以零分計」。`;
    }
    const avail = res.items.filter(i => !i.na);
    const raw = avail.reduce((a, i) => a + i.got, 0), max = avail.reduce((a, i) => a + i.max, 0);
    return { items: res.items, raw, max, total: fatal ? 0 : raw, fatal, sol, obj };
  }
  function showResult(scroll, auto) {
    const g = gradeNow();
    st.sol = g.sol;
    // 標示欄位對錯
    for (const k in st.defs) {
      const d = st.defs[k]; if (d.role !== 'ans' || !g.sol) continue;
      const ref = g.sol[k], stu = g.obj[k];
      const refOk = typeof ref === 'number' && isFinite(ref);
      if (!refOk && !isFinite(stu)) continue;
      const cls = !isFinite(stu) ? 'miss' : isRight(d, stu, ref) ? 'ok' : 'bad';
      $$(`#papers [data-k="${k}"]`).forEach(x => x.classList.add(cls));
    }
    const pct = g.max ? Math.round(g.total / g.max * 100) : 0;
    const pass = pct >= 60;
    const t = st.task;
    const rows = t.rubric.filter(r => r[2] > 0 || g.items.some(i => i.no === r[0] && i.got < 0)).map(r => {
      const it = g.items.find(i => i.no === r[0]) || { na: true, got: 0, detail: '' };
      const cls = it.na ? '' : (it.got >= r[2] ? 'full' : it.got === 0 ? 'zero' : '');
      return `<tr><td>${r[0]}</td><td class="d">${esc(r[1])}</td><td>${r[2]}</td><td class="sc ${cls}">${it.na ? '—' : S.fmtNum(it.got, 0)}</td><td class="d">${esc(r[3])}${it.detail ? `<br><span style="color:#1e40af">${it.detail}</span>` : ''}</td></tr>`;
    }).join('');
    const timeRow = t.rubric.find(r => r[2] === 0 && /使用時間/.test(r[1]));
    const steps = (() => { try { return t.solve(makeV(g.obj)).steps; } catch (e) { return null; } })();
    $('#rubricSlot').innerHTML = `
      <section class="paper"><div class="paper-title">技術士技能檢定測量丙級術科測試評審表</div>
        <table class="hdr"><tr><td class="k">試題編號</td><td>${t.code}</td><td class="k">試題名稱</td><td>${esc(t.title)}</td></tr></table>
        ${g.fatal ? `<div class="fatal">${esc(g.fatal)}（不計此規定之原始得分：${S.fmtNum(g.raw, 0)} 分）</div>` : ''}
        <table class="f rubric"><thead><tr><th>編號</th><th>評審項目</th><th>應得分數</th><th>實得分數</th><th>評審標準／說明</th></tr></thead>
        <tbody>${rows}${timeRow ? `<tr><td>${timeRow[0]}</td><td class="d">${esc(timeRow[1])}</td><td>—</td><td class="sc">${auto ? '時間到' : '—'}</td><td class="d">${esc(timeRow[3])}</td></tr>` : ''}
        <tr><td colspan="2">實得分數</td><td>${g.max}</td><td class="sc">${S.fmtNum(g.total, 0)}</td><td class="d">評分結果：${pass ? '■及格　□不及格' : '□及格　■不及格'}${g.max < 100 ? `（可評分項目滿分 ${g.max}，換算 ${pct} 分）` : ''}</td></tr></tbody></table>
        <p class="tip-line">答案欄位：綠色＝正確，紅色刪除線＝錯誤，斜線底＝未填。將滑鼠移到（手機請點選）任一格，可看到該格的計算方式與使用的資料。</p>
        ${steps ? `<details class="steps"><summary>標準答案計算過程</summary>${steps.map(s => `<div class="step"><h4>${s.h}</h4>${s.lines.filter(Boolean).map(l => `<div>${l}</div>`).join('')}</div>`).join('')}</details>` : ''}
      </section>`;
    if (scroll) $('#rubricSlot').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (st.mode === 'guide') renderGuide();
  }

  /* ---------------- 欄位計算說明（交卷後） ---------------- */
  let tipEl = null;
  function explain(k) {
    const fn = G.EXPLAIN[st.task.id]; const a = st.sol || solveNow();
    if (!fn || !a) return null;
    try { return fn(k, makeV(values()), a); } catch (e) { return null; }
  }
  function showTip(el) {
    const k = el.dataset.k, def = st.defs[k];
    if (tipEl && tipEl.dataset.k === k) return;
    hideTip();
    let html = '';
    const a = st.sol || solveNow(); if (!a) return;
    if (def.role === 'ans') {
      const ex = explain(k); if (!ex) return;
      const stu = values()[k], ref = a[k];
      const ok = isRight(def, stu, ref);
      const upBad = ex.deps.filter(x => st.defs[x] && st.defs[x].role === 'ans' && !isRight(st.defs[x], values()[x], a[x]));
      html = `<b class="h">${esc(st.labels[k] || k)}</b>${esc(ex.f)}<div class="s">= ${esc(ex.s)}</div><div class="r">= ${esc(typeof ref === 'number' && isFinite(ref) ? F.fmtVal(def, ref) : '（空白）')}</div>
        <div class="u ${ok ? 'ok' : 'bad'}">你填：${isFinite(stu) ? esc(F.fmtVal(def, stu)) : '（未填）'}　${ok ? '✔ 正確' : '✘'}</div>
        ${upBad.length && !ok ? `<div class="w">上游欄位「${upBad.map(x => esc(st.labels[x] || x)).join('、')}」也有誤，此格可能是連帶錯誤。</div>` : ''}
        ${ex.deps.length ? `<div class="deps">藍色框＝使用的資料</div>` : ''}`;
      ex.deps.forEach(x => $$(`#papers [data-k="${x}"]`).forEach(e => e.classList.add('dep')));
    } else {
      const users = Object.keys(st.defs).filter(k2 => st.defs[k2].role === 'ans' && (explain(k2) || { deps: [] }).deps.includes(k));
      if (!users.length) return;
      html = `<b class="h">${esc(st.labels[k] || k)}</b>${def.role === 'known' ? '已知資料' : '外業觀測值'}，被下列欄位使用（藍色框）：<div class="s">${users.map(x => esc(st.labels[x] || x)).join('、')}</div>`;
      users.forEach(x => $$(`#papers [data-k="${x}"]`).forEach(e => e.classList.add('dep')));
    }
    $$(`#papers [data-k="${k}"]`).forEach(e => e.classList.add('tgt'));
    const tip = $('#exTip'); tip.innerHTML = html; tip.classList.remove('hidden');
    const r = el.getBoundingClientRect(), bw = Math.min(380, innerWidth - 16);
    tip.style.maxWidth = bw + 'px';
    const left = Math.max(8, Math.min(r.left, innerWidth - bw - 8));
    const h = tip.offsetHeight, below = r.bottom + h + 12 < innerHeight;
    tip.style.left = (left + scrollX) + 'px';
    tip.style.top = ((below ? r.bottom + 6 : r.top - h - 6) + scrollY) + 'px';
    tipEl = el;
  }
  function hideTip() {
    $('#exTip').classList.add('hidden');
    $$('#papers .dep, #papers .tgt').forEach(e => e.classList.remove('dep', 'tgt'));
    tipEl = null;
  }
  window.addEventListener('scroll', () => { if (tipEl && document.activeElement !== tipEl) hideTip(); }, { passive: true });

  /* ---------------- 教學引導 ---------------- */
  /** 依相依關係排出計算順序（同層依表格出現順序） */
  function guideOrder() {
    const a = st.truth; const fn = G.EXPLAIN[st.task.id];
    const keys = [];
    st.task.layout.forEach(sec => { if (fieldOnly(sec)) return; sec.rows.forEach(r => r.forEach(c => { if (c.k && c.role === 'ans' && !keys.includes(c.k)) keys.push(c.k); })); });
    const V = makeV(values());
    const deps = {}; keys.forEach(k => { let ex = null; try { ex = fn(k, V, a); } catch (e) { /* 略過 */ } deps[k] = ex ? ex.deps.filter(x => keys.includes(x)) : []; });
    const order = [], placed = new Set();
    let guard = 0;
    while (order.length < keys.length && guard++ < keys.length * keys.length) {
      const nx = keys.find(k => !placed.has(k) && deps[k].every(x => placed.has(x)));
      const pick = nx || keys.find(k => !placed.has(k));
      order.push(pick); placed.add(pick);
    }
    // 正確答案為空白的格子（如填土時的挖土欄）不列入步驟
    return order.filter(k => typeof a[k] === 'number' && isFinite(a[k]));
  }
  function startGuide(i) {
    st.guide = { order: guideOrder(), i: Math.max(0, i || 0), msg: '', cls: '', shown: false, done: st.submitted };
    renderGuide();
    // 剛開始時停在試題說明讓學生先讀題；還原到中途時直接定位
    if (st.guide.i > 0) focusGuide();
  }
  function curKey() { const g = st.guide; return g && g.order[g.i]; }
  function renderGuide() {
    const g = st.guide, box = $('#guide'); if (!g || !box) return;
    $$('#papers .g-cur, #papers .dep').forEach(e => e.classList.remove('g-cur', 'dep'));
    g.order.forEach(k => { const d = st.defs[k]; if (isRight(d, values()[k], st.truth[k])) $$(`#papers [data-k="${k}"]`).forEach(e => e.classList.add('g-done')); });
    const doneN = g.order.filter(k => isRight(st.defs[k], values()[k], st.truth[k])).length;
    if (g.done || doneN === g.order.length && g.i >= g.order.length - 1 && isRight(st.defs[curKey()], values()[curKey()], st.truth[curKey()])) {
      box.innerHTML = `<div class="gprog"><i style="width:100%"></i></div><div class="guide-in"><div class="gl"><div class="gname">${st.submitted ? '已完成檢核，評審表在頁面上方。' : `全部 ${g.order.length} 步完成！`}</div>
        <div class="gmsg">${st.submitted ? '可將滑鼠移到任一格查看計算方式；按「重新開始」可再練一次。' : '按右上角「完成並檢核」查看評審表，或回頭檢查。'}</div></div>
        <div class="gb">${st.submitted ? '' : '<button class="btn primary" id="gFinish">完成並檢核</button>'}</div></div>`;
      const b = $('#gFinish'); if (b) b.onclick = () => submit(false);
      return;
    }
    const k = curKey(), def = st.defs[k];
    let ex = null; try { ex = G.EXPLAIN[st.task.id](k, makeV(values()), st.truth); } catch (e) { /* 略過 */ }
    $$(`#papers [data-k="${k}"]`).forEach(e => e.classList.add('g-cur'));
    if (ex) ex.deps.forEach(x => $$(`#papers [data-k="${x}"]`).forEach(e => e.classList.add('dep')));
    const ans = F.fmtVal(def, st.truth[k]);
    box.innerHTML = `<div class="gprog"><i style="width:${(doneN / g.order.length * 100).toFixed(1)}%"></i></div>
      <div class="guide-in"><div class="gl">
        <div class="gstep">第 ${g.i + 1} / ${g.order.length} 步　（已完成 ${doneN} 格）</div>
        <div class="gname serif">${esc(st.labels[k] || k)}</div>
        ${ex ? `<div class="gf">${esc(ex.f)}</div><div class="gs">= ${esc(ex.s)}</div>` : ''}
        ${g.shown ? `<div class="gans">= ${esc(ans)}</div>` : ''}
        <div class="gmsg ${g.msg ? g.cls : 'def'}">${g.msg || '請在黃色格子填入答案（藍色格子是會用到的資料），填好按 Enter 檢查。'}</div></div>
        <div class="gb"><button class="btn" id="gGo">前往格子</button><button class="btn" id="gPrev"${g.i === 0 ? ' disabled' : ''}>上一步</button><button class="btn" id="gShow">顯示答案</button><button class="btn primary" id="gNext">下一步</button></div></div>`;
    $('#gPrev').onclick = () => { g.i--; g.msg = ''; g.cls = ''; g.shown = false; renderGuide(); focusGuide(); };
    $('#gNext').onclick = () => guideNext();
    $('#gGo').onclick = () => focusGuide();
    $('#gShow').onclick = () => { setField(k, st.truth[k]); g.shown = true; g.msg = '已填入答案，按「下一步」繼續。'; g.cls = 'ok'; renderGuide(); };
  }
  function guideNext() {
    const g = st.guide;
    if (g.i < g.order.length - 1) { g.i++; g.msg = ''; g.cls = ''; g.shown = false; }
    else { g.msg = '已經是最後一步了。'; }
    renderGuide(); focusGuide();
  }
  function focusGuide() {
    const k = curKey(); if (!k) return;
    const el = $(`#papers [data-k="${k}"]`); if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    if (!st.submitted) el.focus({ preventScroll: true });
  }
  function guideCheck(k, final) {
    const g = st.guide; if (!g || st.submitted || k !== curKey()) return;
    const def = st.defs[k], v = values()[k];
    if (isRight(def, v, st.truth[k])) {
      g.msg = '✔ 正確！'; g.cls = 'ok';
      renderGuide();
      clearTimeout(guideCheck.t);
      guideCheck.t = setTimeout(() => { if (curKey() === k) guideNext(); }, 700);
    } else if (final && isFinite(v)) {
      g.msg = '✘ 不正確，請對照公式再算一次，或按「顯示答案」。'; g.cls = 'bad'; renderGuide();
      const el = $(`#papers [data-k="${k}"]`); if (el) el.focus({ preventScroll: true });
    }
  }
  function guideJump(k) {
    const g = st.guide; if (!g) return;
    const i = g.order.indexOf(k);
    if (i >= 0 && i !== g.i) { g.i = i; g.msg = ''; g.cls = ''; g.shown = false; renderGuide(); saveDraft(); }
  }

  /* ---------------- 列印空白記錄表與答案紙 ---------------- */
  function printBlank(t) {
    const hdr = kind => `<div class="paper-title">技術士技能檢定測量丙級術科測試${kind}</div>
      <table class="hdr"><tr><td class="k">試題編號</td><td>${t.code}</td><td class="k">試題名稱</td><td colspan="3">${esc(t.title)}</td></tr>
      <tr><td class="k">應檢人姓名</td><td></td><td class="k">准考證號碼</td><td></td><td class="k">檢定日期</td><td>　　年　　月　　日</td></tr></table>`;
    const blk = role => t.layout.filter(s => s.role === role).map(s => `<h3>${esc(s.title)}</h3>${F.renderSection(s, { blank: true }).html}`).join('');
    $('#printArea').innerHTML = `
      <section class="paper">${hdr('答案紙')}<p class="caution">注意事項：${esc(t.caution)}</p>${t.layout.filter(s => s.role !== 'known').map(s => `<h3>${esc(s.title)}</h3>${F.renderSection(s, { blank: true }).html}`).join('')}</section>`;
    document.body.classList.add('printing');
    setTimeout(() => window.print(), 60);
  }
  window.addEventListener('afterprint', () => document.body.classList.remove('printing'));

  document.addEventListener('DOMContentLoaded', route);
  G.APP3 = { st, values, makeV, submit, solveNow, renderWork, buildDefs, onInput, onBlur, onKey, startTimer, stopTimer, renderTimer, saveDraft, store, toast, taskName, MODES, draftKey, refreshRefs };
})(window);
