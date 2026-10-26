/* 技術士技能檢定測量丙級術科測試 04200-970301
 * 依「(1100701 起報檢者適用) 丙級測量技術士術科」應檢參考資料：
 * (1) 經緯儀水平角測量（單角法正倒鏡一測回 ∠APB）
 * (2) 水準儀直接水準測量（C→TP1→D 往測、D→TP2→C 返測，HC = 30.000m）
 * (3) 捲尺直接距離測量（E、F 量三次取平均） */
(function (G) {
  'use strict';
  const S = G.SU, E = G.SE, { K, O, A, L } = G.TK;
  const D = S.dmsToDeg;
  const r3 = x => S.rnd(x, 3);
  /** 高程差拆成「＋」「－」欄（－欄記絕對值） */
  const split = h => (h >= 0 ? [h, NaN] : [NaN, -h]);

  const task = {
    id: 1, code: '04200-970301', title: '測量丙級術科測試', short: '丙級術科', time: 45,
    intro: {
      goal: '於 P 點整置經緯儀，以 A 為後視、B 為前視，單角法正倒鏡觀測水平角 ∠APB 一測回；假設 C 點樁頂高程 30.000m，於 C、D 間設轉點往返直接水準測量，求 D 點樁頂平均高程；以捲尺量測 E、F 兩點間水平距離三次並取平均。',
      field: [
        '經緯儀：於 P 點定心定平，正鏡照準 A（得由監評指定起始讀數），順時針照準 B；倒鏡照準 B、A，讀數至秒。',
        '水準儀：C、TP1 間設站讀 C 後視、TP1 前視；TP1、D 間設站讀 TP1 後視、D 前視。往測完成後返測，返測轉點 TP2 不可與 TP1 同一位置且不可固定。',
        '捲尺：服務人員將捲尺零公尺對準 E 點，應檢人於 F 點讀數，共量三次。'
      ],
      calc: [
        '正倒鏡平均 = [正鏡 + (倒鏡 ± 180°)] / 2；∠APB = B 平均 − A 平均',
        '高程差 = 後視 − 前視（正值記「＋」欄、負值記「－」欄）',
        'hCD = Σ後視 − Σ前視（往測）；hDC = Σ後視 − Σ前視（返測）',
        '較差絕對值 W = |hCD + hDC|；平均高程差 h\'CD = (hCD − hDC) / 2',
        'HD = HC + h\'CD；距離平均值 = (第一次 + 第二次 + 第三次) / 3'
      ],
      pitfalls: [
        '返測高程差 hDC 與往測符號相反，平均時是 (hCD − hDC) / 2。',
        '「－」欄記的是高程差的絕對值，加總後 hCD = Σ＋ − Σ－。',
        '答案紙填寫的較差絕對值若與往返測計算不符，水準項扣 10 分。',
        '角度四捨五入計算至秒，高程與距離計算至 0.001m。'
      ]
    },
    rubric: [
      [1, '儀器整置', 5, '定心、定平或高低不合者各扣 1~2 分，扣分至本項零分為止。'],
      [2, '手簿記錄', 5, '塗改或未依格式填寫者，每項次扣 1 分，扣分至本項零分為止。'],
      [3, '經緯儀水平角測量', 45, '評定 ∠APB：與原案相差在 ±15" 以內 45 分；±16~20" 30 分；±21~30" 15 分；±31"（含）以上 0 分。'],
      [4, '水準儀直接水準測量', 35, '(一) D 點平均高程：誤差 ±5mm（含）以內 35 分；±6~10mm 20 分；±11mm（含）以上 0 分。(二) 往返高程差較差絕對值：7mm 以內不扣分；8~15mm 扣 5 分；16mm（含）以上扣 10 分；答案紙填寫之較差絕對值與往返測計算不符者扣 10 分；扣分至 (一) 項 0 分為止。'],
      [5, '距離測量', 10, '評定 E、F 兩點間水平距離平均值：誤差 ±2mm（含）以內 10 分；±3~4mm 5 分；±5mm（含）以上 0 分。']
    ],
    pairs: [['A_L', 'A_R', 'h', 'P→A'], ['B_L', 'B_R', 'h', 'P→B']],
    layout: [
      {
        title: '已知資料', role: 'known',
        head: [['項目', '數值']],
        rows: [[L('C 點樁頂高程 HC (m)'), K('HC', 'num', { d: 3 })]]
      },
      {
        title: '1. 水平角觀測記錄表', role: 'obs', book: true,
        head: [['測站', '測點', '鏡位', '度盤讀數', '正倒鏡平均', '水平角']],
        rows: [
          [L('P', { rs: 4, cls: 'pt' }), L('A', { rs: 2, cls: 'pt' }), L('正'), O('A_L', 'dms'), A('A_M', 'dms', { rs: 2, book: true }), L('0°00\'00"', { rs: 2 })],
          [L('倒'), O('A_R', 'dms')],
          [L('B', { rs: 2, cls: 'pt' }), L('正'), O('B_L', 'dms'), A('B_M', 'dms', { rs: 2, book: true }), A('ang', 'dms', { rs: 2, book: true })],
          [L('倒'), O('B_R', 'dms')]
        ]
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
      },
      {
        title: '3. 距離測量記錄表（單位：m）', role: 'obs', book: true,
        head: [['第一次讀數', '第二次讀數', '第三次讀數', '平均值']],
        rows: [[O('d1', 'num', { d: 3 }), O('d2', 'num', { d: 3 }), O('d3', 'num', { d: 3 }), A('dm', 'num', { d: 3, book: true })]]
      }
    ],

    official() {
      return {
        known: { HC: 30 },
        obs: {
          A_L: D(0, 1, 0), A_R: D(180, 0, 50), B_L: D(31, 12, 30), B_R: D(211, 12, 32),
          fC_bs: 2.0, fT_fs: 1.7, fT_bs: 1.6, fD_fs: 1.1,
          bD_bs: 1.22, bT_fs: 1.714, bT_bs: 1.52, bC_fs: 1.832,
          d1: 19.986, d2: 19.987, d3: 19.985
        }
      };
    },

    random(level) {
      const f = level === 'fine' ? 0.5 : 1, sg = level === 'fine' ? 0.0006 : 0.0012;
      const ang = S.rand(25, 150);
      const L0 = D(0, S.randInt(0, 5), S.pick([0, 0, 10, 20, 30, 40])), c2 = S.noise(6 * f);
      const B_L = S.roundSec(S.norm360(L0 + ang + S.noise(4 * f) / 3600));
      const HC = 30, HD = 30 + S.rand(-1.5, 1.5), T1 = (HC + HD) / 2 + S.rand(-0.4, 0.4), T2 = (HC + HD) / 2 + S.rand(-0.4, 0.4);
      const b = () => S.rnd(S.rand(1.2, 1.9), 3);
      const fC = b(), fT = b(), bD = b(), bT = b();
      const perf = { fC_bs: fC, fT_fs: HC + fC - T1, fT_bs: fT, fD_fs: T1 + fT - HD, bD_bs: bD, bT_fs: HD + bD - T2, bT_bs: bT, bC_fs: T2 + bT - HC };
      const obs = {
        A_L: L0, A_R: S.roundSec(S.norm360(L0 + 180 + (c2 + S.noise(3 * f)) / 3600)), B_L, B_R: S.roundSec(S.norm360(B_L + 180 + (c2 + S.noise(3 * f)) / 3600))
      };
      for (const k in perf) obs[k] = r3(perf[k] + S.noise(sg));
      const dist = S.rand(19.8, 20.3);
      ['d1', 'd2', 'd3'].forEach(k => { obs[k] = r3(dist + S.noise(0.0008 * f)); perf[k] = dist; });
      Object.assign(perf, { A_L: 0, A_R: 180, B_L: ang, B_R: S.norm360(ang + 180) });
      return { known: { HC }, obs, obsPerfect: perf, truthOverride: { ang: S.roundSec(ang), HD: r3(HD), dm: r3(dist) } };
    },

    solve(V) {
      V.req('HC', 'A_L', 'A_R', 'B_L', 'B_R', 'fC_bs', 'fT_fs', 'fT_bs', 'fD_fs', 'bD_bs', 'bT_fs', 'bT_bs', 'bC_fs', 'd1', 'd2', 'd3');
      const A_M = S.meanLR(V('A_L'), V('A_R')), B_M = S.meanLR(V('B_L'), V('B_R'));
      const ang = S.roundSec(S.norm360(B_M - A_M));
      const f1 = r3(V('fC_bs') - V('fT_fs')), f2 = r3(V('fT_bs') - V('fD_fs'));
      const b1 = r3(V('bD_bs') - V('bT_fs')), b2 = r3(V('bT_bs') - V('bC_fs'));
      const fSB = r3(V('fC_bs') + V('fT_bs')), fSF = r3(V('fT_fs') + V('fD_fs'));
      const bSB = r3(V('bD_bs') + V('bT_bs')), bSF = r3(V('bT_fs') + V('bC_fs'));
      const [fT_hp, fT_hm] = split(f1), [fD_hp, fD_hm] = split(f2), [bT_hp, bT_hm] = split(b1), [bC_hp, bC_hm] = split(b2);
      const sum = (...a) => r3(a.filter(isFinite).reduce((x, y) => x + y, 0));
      const fSP = sum(fT_hp, fD_hp), fSM = sum(fT_hm, fD_hm), bSP = sum(bT_hp, bC_hp), bSM = sum(bT_hm, bC_hm);
      const hCD = r3(fSB - fSF), hDC = r3(bSB - bSF);
      const W = r3(Math.abs(hCD + hDC)), hm = r3((hCD - hDC) / 2), HD = r3(V('HC') + hm);
      const dm = r3((V('d1') + V('d2') + V('d3')) / 3);
      const f = S.fmtDMS, n3 = x => S.fmtNum(x, 3), ns = x => S.fmtNum(x, 3, true);
      const steps = [
        E.step('① 水平角', `A 正倒鏡平均 = [${f(V('A_L'))} + (${f(V('A_R'))} − 180°)] / 2 = <b>${f(A_M)}</b>`,
          `B 正倒鏡平均 = [${f(V('B_L'))} + (${f(V('B_R'))} − 180°)] / 2 = <b>${f(B_M)}</b>`, `∠APB = ${f(B_M)} − ${f(A_M)} = <b>${f(ang)}</b>`),
        E.step('② 往測', `TP1：${n3(V('fC_bs'))} − ${n3(V('fT_fs'))} = ${ns(f1)}；D：${n3(V('fT_bs'))} − ${n3(V('fD_fs'))} = ${ns(f2)}`,
          `hCD = Σ後視 − Σ前視 = ${n3(fSB)} − ${n3(fSF)} = <b>${ns(hCD)}</b> m`),
        E.step('③ 返測', `TP2：${n3(V('bD_bs'))} − ${n3(V('bT_fs'))} = ${ns(b1)}；C：${n3(V('bT_bs'))} − ${n3(V('bC_fs'))} = ${ns(b2)}`,
          `hDC = ${n3(bSB)} − ${n3(bSF)} = <b>${ns(hDC)}</b> m`),
        E.step('④ 較差與平均', `W = |hCD + hDC| = |${ns(hCD)} + (${ns(hDC)})| = <b>${n3(W)}</b> m`,
          `h'CD = (hCD − hDC) / 2 = (${ns(hCD)} − (${ns(hDC)})) / 2 = <b>${ns(hm)}</b> m`, `HD = HC + h'CD = ${n3(V('HC'))} + (${ns(hm)}) = <b>${n3(HD)}</b> m`),
        E.step('⑤ 距離', `平均值 = (${n3(V('d1'))} + ${n3(V('d2'))} + ${n3(V('d3'))}) / 3 = <b>${n3(dm)}</b> m`)
      ];
      return { ans: { A_M, B_M, ang, fT_hp, fT_hm, fD_hp, fD_hm, fSB, fSF, fSP, fSM, hCD, bT_hp, bT_hm, bC_hp, bC_hm, bSB, bSF, bSP, bSM, hDC, W, hm, HD, dm }, steps };
    },

    grade(ctx) {
      const { V, sol, truth } = ctx, items = [], hints = [];
      items.push(G.TK.fieldItem(1, '儀器整置', 5, ctx));
      // 手簿記錄：記錄表內之計算欄位，每項次錯誤或未填扣 1 分
      const bookKeys = ['A_M', 'B_M', 'ang', 'fT_hp', 'fT_hm', 'fD_hp', 'fD_hm', 'fSB', 'fSF', 'fSP', 'fSM', 'hCD', 'bT_hp', 'bT_hm', 'bC_hp', 'bC_hm', 'bSB', 'bSF', 'bSP', 'bSM', 'hDC', 'dm'];
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
      if (ref) {
        const ea = E.errSec(V('ang'), ref.ang);
        items.push(E.item(3, '經緯儀水平角測量', 45, E.band(ea, [[15, 45], [20, 30], [30, 15]]), 'obs', isFinite(ea) ? `∠APB 與原案相差 ${ea}"` : '未作答'));
        const eh = E.errMM(V('HD'), ref.HD);
        let got = E.band(eh, [[5, 35], [10, 20]]); const det = [isFinite(eh) ? `HD 誤差 ${eh} mm → ${got} 分` : 'HD 未作答'];
        if (sol) {
          const w = Math.round(sol.W * 1000);
          const dW = w <= 7 ? 0 : w <= 15 ? 5 : 10;
          if (dW) { got -= dW; det.push(`往返較差 ${w} mm，扣 ${dW} 分`); } else det.push(`往返較差 ${w} mm，不扣分`);
          if (!isFinite(V('W')) || E.errMM(V('W'), sol.W) > 0) { got -= 10; det.push(`答案紙較差絕對值${isFinite(V('W')) ? '與往返測計算不符' : '未填'}，扣 10 分`); }
        }
        items.push(E.item(4, '水準儀直接水準測量', 35, Math.max(0, got), 'obs', det.join('；')));
        const ed = E.errMM(V('dm'), ref.dm);
        items.push(E.item(5, '距離測量', 10, E.band(ed, [[2, 10], [4, 5]]), 'obs', isFinite(ed) ? `平均值誤差 ${ed} mm` : '未作答'));
      }
      if (sol) {
        if (isFinite(V('hm')) && E.errMM(V('hm'), r3((sol.hCD + sol.hDC) / 2)) <= 1 && Math.abs(sol.hCD) > 0.01) hints.push({ lvl: 'bad', msg: '返測高程差 hDC 與往測符號相反，平均應為 (hCD − hDC) / 2。' });
        if (isFinite(V('fT_hm')) && V('fT_hm') < 0) hints.push({ lvl: 'bad', msg: '「－」欄請記高程差的絕對值（正數）。' });
      }
      return { items, hints };
    }
  };
  G.TK.register(task);
})(window);
