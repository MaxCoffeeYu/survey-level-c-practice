/* 技術士技能檢定測量丙級術科測試 04200-970301
 * 依「(1100701 起報檢者適用) 丙級測量技術士術科」應檢參考資料：
 * (1) 經緯儀水平角測量（單角法正倒鏡一測回 ∠APB）
 * (2) 水準儀直接水準測量（C→TP1→D 往測、D→TP2→C 返測，HC = 30.000m）
 * (3) 捲尺直接距離測量（E、F 量三次取平均）
 *
 * 為方便練習，三部分各自註冊為一題（id 1～3），另保留三部分合併的完整試題（id 4）。
 * 各部分的記錄表、計算、評分定義於 PARTS，再由 build() 組成題目物件。 */
(function (G) {
  'use strict';
  const S = G.SU, E = G.SE, { K, O, A, L } = G.TK;
  const D = S.dmsToDeg;
  const r3 = x => S.rnd(x, 3);
  /** 高程差拆成「＋」「－」欄（－欄記絕對值） */
  const split = h => (h >= 0 ? [h, NaN] : [NaN, -h]);
  const f = S.fmtDMS, n3 = x => S.fmtNum(x, 3), ns = x => S.fmtNum(x, 3, true);

  const PARTS = {
    /* ---------------- (1) 經緯儀水平角測量 ---------------- */
    ang: {
      name: '經緯儀水平角測量', short: '水平角', time: 15,
      goal: '於 P 點整置經緯儀，以 A 為後視、B 為前視，單角法正倒鏡觀測水平角 ∠APB 一測回',
      field: ['經緯儀：於 P 點定心定平，正鏡照準 A（得由監評指定起始讀數），順時針照準 B；倒鏡照準 B、A，讀數至秒。'],
      calc: ['正倒鏡平均 = [正鏡 + (倒鏡 ± 180°)] / 2；∠APB = B 平均 − A 平均'],
      pitfalls: ['角度四捨五入計算至秒。'],
      caution: '角度四捨五入計算至秒。',
      rubric: [[3, '經緯儀水平角測量', 45, '評定 ∠APB：與原案相差在 ±15" 以內 45 分；±16~20" 30 分；±21~30" 15 分；±31"（含）以上 0 分。']],
      setup: true,
      pairs: [['A_L', 'A_R', 'h', 'P→A'], ['B_L', 'B_R', 'h', 'P→B']],
      layout: [{
        title: '1. 水平角觀測記錄表', role: 'obs', book: true,
        head: [['測站', '測點', '鏡位', '度盤讀數', '正倒鏡平均', '水平角']],
        rows: [
          [L('P', { rs: 4, cls: 'pt' }), L('A', { rs: 2, cls: 'pt' }), L('正'), O('A_L', 'dms'), A('A_M', 'dms', { rs: 2, book: true }), L('0°00\'00"', { rs: 2 })],
          [L('倒'), O('A_R', 'dms')],
          [L('B', { rs: 2, cls: 'pt' }), L('正'), O('B_L', 'dms'), A('B_M', 'dms', { rs: 2, book: true }), A('ang', 'dms', { rs: 2, book: true })],
          [L('倒'), O('B_R', 'dms')]
        ]
      }],
      book: ['A_M', 'B_M', 'ang'],
      official: { known: {}, obs: { A_L: D(0, 1, 0), A_R: D(180, 0, 50), B_L: D(31, 12, 30), B_R: D(211, 12, 32) } },
      random(fac) {
        const ang = S.rand(25, 150);
        const L0 = D(0, S.randInt(0, 5), S.pick([0, 0, 10, 20, 30, 40])), c2 = S.noise(6 * fac);
        const B_L = S.roundSec(S.norm360(L0 + ang + S.noise(4 * fac) / 3600));
        const obs = { A_L: L0, A_R: S.roundSec(S.norm360(L0 + 180 + (c2 + S.noise(3 * fac)) / 3600)), B_L, B_R: S.roundSec(S.norm360(B_L + 180 + (c2 + S.noise(3 * fac)) / 3600)) };
        return { known: {}, obs, perf: { A_L: 0, A_R: 180, B_L: ang, B_R: S.norm360(ang + 180) }, truth: { ang: S.roundSec(ang) } };
      },
      solve(V) {
        V.req('A_L', 'A_R', 'B_L', 'B_R');
        const A_M = S.meanLR(V('A_L'), V('A_R')), B_M = S.meanLR(V('B_L'), V('B_R'));
        const ang = S.roundSec(S.norm360(B_M - A_M));
        return {
          ans: { A_M, B_M, ang },
          steps: [['水平角', `A 正倒鏡平均 = [${f(V('A_L'))} + (${f(V('A_R'))} − 180°)] / 2 = <b>${f(A_M)}</b>`,
            `B 正倒鏡平均 = [${f(V('B_L'))} + (${f(V('B_R'))} − 180°)] / 2 = <b>${f(B_M)}</b>`, `∠APB = ${f(B_M)} − ${f(A_M)} = <b>${f(ang)}</b>`]]
        };
      },
      grade({ V }, ref, items) {
        const ea = E.errSec(V('ang'), ref.ang);
        items.push(E.item(3, '經緯儀水平角測量', 45, E.band(ea, [[15, 45], [20, 30], [30, 15]]), 'obs', isFinite(ea) ? `∠APB 與原案相差 ${ea}"` : '未作答'));
      }
    },

    /* ---------------- (2) 水準儀直接水準測量 ---------------- */
    lev: {
      name: '水準儀直接水準測量', short: '直接水準', time: 20,
      goal: '假設 C 點樁頂高程 30.000m，於 C、D 間設轉點往返直接水準測量，求 D 點樁頂平均高程',
      field: ['水準儀：C、TP1 間設站讀 C 後視、TP1 前視；TP1、D 間設站讀 TP1 後視、D 前視。往測完成後返測，返測轉點 TP2 不可與 TP1 同一位置且不可固定。'],
      calc: [
        '高程差 = 後視 − 前視（正值記「＋」欄、負值記「－」欄）',
        'hCD = Σ後視 − Σ前視（往測）；hDC = Σ後視 − Σ前視（返測）',
        '較差絕對值 W = |hCD + hDC|；平均高程差 h\'CD = (hCD − hDC) / 2',
        'HD = HC + h\'CD'
      ],
      pitfalls: [
        '返測高程差 hDC 與往測符號相反，平均時是 (hCD − hDC) / 2。',
        '「－」欄記的是高程差的絕對值，加總後 hCD = Σ＋ − Σ－。',
        '答案紙填寫的較差絕對值若與往返測計算不符，水準項扣 10 分。',
        '高程計算至 0.001m。'
      ],
      caution: '高程計算至 0.001m。　假設 C 點樁頂高程 HC = 30.000m。',
      rubric: [[4, '水準儀直接水準測量', 35, '(一) D 點平均高程：誤差 ±5mm（含）以內 35 分；±6~10mm 20 分；±11mm（含）以上 0 分。(二) 往返高程差較差絕對值：7mm 以內不扣分；8~15mm 扣 5 分；16mm（含）以上扣 10 分；答案紙填寫之較差絕對值與往返測計算不符者扣 10 分；扣分至 (一) 項 0 分為止。']],
      setup: true,
      pairs: [],
      layout: [
        {
          title: '已知資料', role: 'known',
          head: [['項目', '數值']],
          rows: [[L('C 點樁頂高程 HC (m)'), K('HC', 'num', { d: 3 })]]
        },
        {
          title: '2. 直接水準測量記錄表　(1) 往測', role: 'obs', book: true,
          head: [['樁號', '後視 (m)', '前視 (m)', '高程差 ＋ (m)', '高程差 － (m)']],
          rows: [
            [L('C', { cls: 'pt' }), O('fC_bs', 'num', { d: 3 }), L(''), L(''), L('')],
            [L('TP1', { cls: 'pt' }), O('fT_bs', 'num', { d: 3 }), O('fT_fs', 'num', { d: 3 }), A('fT_hp', 'num', { d: 3, book: true }), A('fT_hm', 'num', { d: 3, book: true })],
            [L('D', { cls: 'pt' }), L(''), O('fD_fs', 'num', { d: 3 }), A('fD_hp', 'num', { d: 3, book: true }), A('fD_hm', 'num', { d: 3, book: true })],
            [L('總和', { cls: 'pt' }), A('fSB', 'num', { d: 3, book: true }), A('fSF', 'num', { d: 3, book: true }), A('fSP', 'num', { d: 3, book: true }), A('fSM', 'num', { d: 3, book: true })],
            [L('高程差 hCD (m)', { cs: 3 }), A('hCD', 'num', { d: 3, signed: true, cs: 2 })]
          ]
        },
        {
          title: '2. 直接水準測量記錄表　(2) 返測', role: 'obs', book: true,
          head: [['樁號', '後視 (m)', '前視 (m)', '高程差 ＋ (m)', '高程差 － (m)']],
          rows: [
            [L('D', { cls: 'pt' }), O('bD_bs', 'num', { d: 3 }), L(''), L(''), L('')],
            [L('TP2', { cls: 'pt' }), O('bT_bs', 'num', { d: 3 }), O('bT_fs', 'num', { d: 3 }), A('bT_hp', 'num', { d: 3, book: true }), A('bT_hm', 'num', { d: 3, book: true })],
            [L('C', { cls: 'pt' }), L(''), O('bC_fs', 'num', { d: 3 }), A('bC_hp', 'num', { d: 3, book: true }), A('bC_hm', 'num', { d: 3, book: true })],
            [L('總和', { cls: 'pt' }), A('bSB', 'num', { d: 3, book: true }), A('bSF', 'num', { d: 3, book: true }), A('bSP', 'num', { d: 3, book: true }), A('bSM', 'num', { d: 3, book: true })],
            [L('高程差 hDC (m)', { cs: 3 }), A('hDC', 'num', { d: 3, signed: true, cs: 2 })]
          ]
        },
        {
          title: '2. 直接水準測量　(3) 計算', role: 'ans',
          head: [['項目', '結果']],
          rows: [
            [L('往返高程差之較差的絕對值 W (m)'), A('W', 'num', { d: 3 })],
            [L('高程差之平均值 h\'CD (m)'), A('hm', 'num', { d: 3, signed: true })],
            [L('D 點高程平均值 HD (m)'), A('HD', 'num', { d: 3 })]
          ]
        }
      ],
      book: ['fT_hp', 'fT_hm', 'fD_hp', 'fD_hm', 'fSB', 'fSF', 'fSP', 'fSM', 'hCD', 'bT_hp', 'bT_hm', 'bC_hp', 'bC_hm', 'bSB', 'bSF', 'bSP', 'bSM', 'hDC'],
      official: { known: { HC: 30 }, obs: { fC_bs: 2.0, fT_fs: 1.7, fT_bs: 1.6, fD_fs: 1.1, bD_bs: 1.22, bT_fs: 1.714, bT_bs: 1.52, bC_fs: 1.832 } },
      random(fac) {
        const sg = 0.0012 * fac;
        const HC = 30, HD = 30 + S.rand(-1.5, 1.5), T1 = (HC + HD) / 2 + S.rand(-0.4, 0.4), T2 = (HC + HD) / 2 + S.rand(-0.4, 0.4);
        const b = () => S.rnd(S.rand(1.2, 1.9), 3);
        const fC = b(), fT = b(), bD = b(), bT = b();
        const perf = { fC_bs: fC, fT_fs: HC + fC - T1, fT_bs: fT, fD_fs: T1 + fT - HD, bD_bs: bD, bT_fs: HD + bD - T2, bT_bs: bT, bC_fs: T2 + bT - HC };
        const obs = {}; for (const k in perf) obs[k] = r3(perf[k] + S.noise(sg));
        return { known: { HC }, obs, perf, truth: { HD: r3(HD) } };
      },
      solve(V) {
        V.req('HC', 'fC_bs', 'fT_fs', 'fT_bs', 'fD_fs', 'bD_bs', 'bT_fs', 'bT_bs', 'bC_fs');
        const f1 = r3(V('fC_bs') - V('fT_fs')), f2 = r3(V('fT_bs') - V('fD_fs'));
        const b1 = r3(V('bD_bs') - V('bT_fs')), b2 = r3(V('bT_bs') - V('bC_fs'));
        const fSB = r3(V('fC_bs') + V('fT_bs')), fSF = r3(V('fT_fs') + V('fD_fs'));
        const bSB = r3(V('bD_bs') + V('bT_bs')), bSF = r3(V('bT_fs') + V('bC_fs'));
        const [fT_hp, fT_hm] = split(f1), [fD_hp, fD_hm] = split(f2), [bT_hp, bT_hm] = split(b1), [bC_hp, bC_hm] = split(b2);
        const sum = (...a) => r3(a.filter(isFinite).reduce((x, y) => x + y, 0));
        const fSP = sum(fT_hp, fD_hp), fSM = sum(fT_hm, fD_hm), bSP = sum(bT_hp, bC_hp), bSM = sum(bT_hm, bC_hm);
        const hCD = r3(fSB - fSF), hDC = r3(bSB - bSF);
        const W = r3(Math.abs(hCD + hDC)), hm = r3((hCD - hDC) / 2), HD = r3(V('HC') + hm);
        return {
          ans: { fT_hp, fT_hm, fD_hp, fD_hm, fSB, fSF, fSP, fSM, hCD, bT_hp, bT_hm, bC_hp, bC_hm, bSB, bSF, bSP, bSM, hDC, W, hm, HD },
          steps: [
            ['往測', `TP1：${n3(V('fC_bs'))} − ${n3(V('fT_fs'))} = ${ns(f1)}；D：${n3(V('fT_bs'))} − ${n3(V('fD_fs'))} = ${ns(f2)}`,
              `hCD = Σ後視 − Σ前視 = ${n3(fSB)} − ${n3(fSF)} = <b>${ns(hCD)}</b> m`],
            ['返測', `TP2：${n3(V('bD_bs'))} − ${n3(V('bT_fs'))} = ${ns(b1)}；C：${n3(V('bT_bs'))} − ${n3(V('bC_fs'))} = ${ns(b2)}`,
              `hDC = ${n3(bSB)} − ${n3(bSF)} = <b>${ns(hDC)}</b> m`],
            ['較差與平均', `W = |hCD + hDC| = |${ns(hCD)} + (${ns(hDC)})| = <b>${n3(W)}</b> m`,
              `h'CD = (hCD − hDC) / 2 = (${ns(hCD)} − (${ns(hDC)})) / 2 = <b>${ns(hm)}</b> m`, `HD = HC + h'CD = ${n3(V('HC'))} + (${ns(hm)}) = <b>${n3(HD)}</b> m`]
          ]
        };
      },
      grade({ V, sol }, ref, items, hints) {
        const eh = E.errMM(V('HD'), ref.HD);
        let got = E.band(eh, [[5, 35], [10, 20]]); const det = [isFinite(eh) ? `HD 誤差 ${eh} mm → ${got} 分` : 'HD 未作答'];
        if (sol) {
          const w = Math.round(sol.W * 1000);
          const dW = w <= 7 ? 0 : w <= 15 ? 5 : 10;
          if (dW) { got -= dW; det.push(`往返較差 ${w} mm，扣 ${dW} 分`); } else det.push(`往返較差 ${w} mm，不扣分`);
          if (!isFinite(V('W')) || E.errMM(V('W'), sol.W) > 0) { got -= 10; det.push(`答案紙較差絕對值${isFinite(V('W')) ? '與往返測計算不符' : '未填'}，扣 10 分`); }
          if (isFinite(V('hm')) && E.errMM(V('hm'), r3((sol.hCD + sol.hDC) / 2)) <= 1 && Math.abs(sol.hCD) > 0.01) hints.push({ lvl: 'bad', msg: '返測高程差 hDC 與往測符號相反，平均應為 (hCD − hDC) / 2。' });
          if (isFinite(V('fT_hm')) && V('fT_hm') < 0) hints.push({ lvl: 'bad', msg: '「－」欄請記高程差的絕對值（正數）。' });
        }
        items.push(E.item(4, '水準儀直接水準測量', 35, Math.max(0, got), 'obs', det.join('；')));
      }
    },

    /* ---------------- (3) 捲尺直接距離測量 ---------------- */
    dist: {
      name: '捲尺直接距離測量', short: '距離測量', time: 10,
      goal: '以捲尺量測 E、F 兩點間水平距離三次並取平均',
      field: ['捲尺：服務人員將捲尺零公尺對準 E 點，應檢人於 F 點讀數，共量三次。'],
      calc: ['距離平均值 = (第一次 + 第二次 + 第三次) / 3'],
      pitfalls: ['距離計算至 0.001m。'],
      caution: '距離計算至 0.001m。',
      rubric: [[5, '距離測量', 10, '評定 E、F 兩點間水平距離平均值：誤差 ±2mm（含）以內 10 分；±3~4mm 5 分；±5mm（含）以上 0 分。']],
      setup: false,
      pairs: [],
      layout: [{
        title: '3. 距離測量記錄表（單位：m）', role: 'obs', book: true,
        head: [['第一次讀數', '第二次讀數', '第三次讀數', '平均值']],
        rows: [[O('d1', 'num', { d: 3 }), O('d2', 'num', { d: 3 }), O('d3', 'num', { d: 3 }), A('dm', 'num', { d: 3, book: true })]]
      }],
      book: ['dm'],
      official: { known: {}, obs: { d1: 19.986, d2: 19.987, d3: 19.985 } },
      random(fac) {
        const dist = S.rand(19.8, 20.3), obs = {}, perf = {};
        ['d1', 'd2', 'd3'].forEach(k => { obs[k] = r3(dist + S.noise(0.0008 * fac)); perf[k] = dist; });
        return { known: {}, obs, perf, truth: { dm: r3(dist) } };
      },
      solve(V) {
        V.req('d1', 'd2', 'd3');
        const dm = r3((V('d1') + V('d2') + V('d3')) / 3);
        return { ans: { dm }, steps: [['距離', `平均值 = (${n3(V('d1'))} + ${n3(V('d2'))} + ${n3(V('d3'))}) / 3 = <b>${n3(dm)}</b> m`]] };
      },
      grade({ V }, ref, items) {
        const ed = E.errMM(V('dm'), ref.dm);
        items.push(E.item(5, '距離測量', 10, E.band(ed, [[2, 10], [4, 5]]), 'obs', isFinite(ed) ? `平均值誤差 ${ed} mm` : '未作答'));
      }
    }
  };

  const CIRC = '①②③④⑤⑥⑦⑧⑨';
  /** 由一或多個部分組成題目 */
  function build(id, keys, extra) {
    const ps = keys.map(k => PARTS[k]);
    const setup = ps.some(p => p.setup);
    const full = keys.length === 3;
    const rubric = [];
    if (setup) rubric.push([1, '儀器整置', 5, '定心、定平或高低不合者各扣 1~2 分，扣分至本項零分為止。']);
    rubric.push([2, '手簿記錄', 5, '塗改或未依格式填寫者，每項次扣 1 分，扣分至本項零分為止。']);
    ps.forEach(p => rubric.push(...p.rubric));
    const join = (sel) => ps.flatMap(sel);
    const goals = ps.map(p => p.goal);
    return Object.assign({
      id, parts: keys, code: '04200-970301', time: ps.reduce((s, p) => s + p.time, 0),
      intro: {
        goal: (full ? goals.slice(0, -1).join('；') + '；' + goals[goals.length - 1] : goals[0]) + '。',
        field: join(p => p.field), calc: join(p => p.calc), pitfalls: join(p => p.pitfalls)
      },
      caution: full ? '角度四捨五入計算至秒，高程計算至 0.001m，距離計算至 0.001m。　假設 C 點樁頂高程 HC = 30.000m。' : ps[0].caution,
      rubric,
      pairs: join(p => p.pairs),
      layout: join(p => p.layout),

      official() {
        return { known: Object.assign({}, ...ps.map(p => p.official.known)), obs: Object.assign({}, ...ps.map(p => p.official.obs)) };
      },

      random(level) {
        const fac = level === 'fine' ? 0.5 : 1, out = { known: {}, obs: {}, obsPerfect: {}, truthOverride: {} };
        ps.forEach(p => { const r = p.random(fac); Object.assign(out.known, r.known); Object.assign(out.obs, r.obs); Object.assign(out.obsPerfect, r.perf); Object.assign(out.truthOverride, r.truth); });
        return out;
      },

      solve(V) {
        const ans = {}, raw = [];
        ps.forEach(p => { const r = p.solve(V); Object.assign(ans, r.ans); raw.push(...r.steps); });
        const steps = raw.map(([t, ...ls], i) => E.step(`${raw.length > 1 ? CIRC[i] + ' ' : ''}${t}`, ...ls));
        return { ans, steps };
      },

      grade(ctx) {
        const { V, sol, truth } = ctx, items = [], hints = [];
        if (setup) items.push(G.TK.fieldItem(1, '儀器整置', 5, ctx));
        // 手簿記錄：記錄表內之計算欄位，每項次錯誤或未填扣 1 分
        const bookKeys = join(p => p.book);
        if (sol) {
          const bad = bookKeys.filter(k => {
            const ref = sol[k], stu = V(k);
            if (!isFinite(ref)) return isFinite(stu);
            if (!isFinite(stu)) return true;
            return ['A_M', 'B_M', 'ang'].includes(k) ? E.errSec(stu, ref) > 1 : E.errMM(stu, ref) > 0;
          });
          items.push(E.item(2, '手簿記錄', 5, Math.max(0, 5 - bad.length), 'calc', bad.length ? `記錄表有 ${bad.length} 項計算錯誤或未依格式填寫（每項扣 1 分）` : '記錄表計算均正確'));
        } else items.push(E.item(2, '手簿記錄', 5, 0, 'calc', '觀測資料不完整'));
        const ref = truth || sol;
        if (ref) ps.forEach(p => p.grade(ctx, ref, items, hints));
        return { items, hints };
      }
    }, extra);
  }

  G.TK.register(build(1, ['ang'], { title: '經緯儀水平角測量', short: '水平角', no: '第一部分' }));
  G.TK.register(build(2, ['lev'], { title: '水準儀直接水準測量', short: '直接水準', no: '第二部分' }));
  G.TK.register(build(3, ['dist'], { title: '捲尺直接距離測量', short: '距離測量', no: '第三部分' }));
  G.TK.register(build(4, ['ang', 'lev', 'dist'], { title: '測量丙級術科測試（完整試題）', short: '完整試題', no: '完整模擬', time: 45 }));
})(window);
