/* =========================================================
 * taskkit.js — 題目模組共用建構工具
 *
 * 每一題以一個物件註冊到 TASKS，介面如下（方便擴充題庫）：
 * {
 *   id, code, title, time(分鐘),
 *   intro:{goal, field[], calc[], pitfalls[]},   // 教學說明
 *   rubric:[[編號, 名稱, 配分, 評分標準]],        // 官方評審表
 *   layout:[{title, role, note, head:[[...]], rows:[[cell...]]}], // 手簿/答案紙格式
 *   official():{known, obs},                      // 官方範例數據
 *   random(level):{known, obs, obsPerfect},       // 隨機生成（含/不含誤差的觀測值）
 *   solve(V):{ans, steps},                        // 由已知+觀測計算全部答案
 *   grade(ctx):{items, hints, fatal},             // 依官方評審表評分
 *   draw(V, sol):svgString,                       // 動態示意圖
 *   pairs:[[L鍵, R鍵, 'h'|'v', 說明]]             // 正倒鏡檢核
 * }
 * ========================================================= */
(function (G) {
  'use strict';
  G.TASKS = [];
  const mk = role => (k, t = 'num', x = {}) => Object.assign({ k, t, role }, x);
  G.TK = {
    K: mk('known'),       // 已知資料
    O: mk('obs'),         // 外業觀測值
    A: mk('ans'),         // 應檢人計算答案
    /** 標籤儲存格；rs=rowspan, cs=colspan */
    L: (v, x = {}) => Object.assign({ label: v }, x),
    register(task) { G.TASKS.push(task); G.TASKS.sort((a, b) => a.id - b.id); },
    /** 現場操作自評項目 */
    fieldItem(no, name, max, ctx) {
      const ok = ctx.self.instrument !== false;
      return G.SE.item(no, name, max, ok ? max : 0, 'field', ok ? '現場操作自評：正確（可於題目控制台取消勾選）' : '現場操作自評：未達標準');
    },
    /** 時間配當：各題通用 */
    stdPitfalls: [
      'DMS（度分秒）請勿以十進位直接相乘，計算機輸入須轉換（例 72°28\'00" ≠ 72.28°）。',
      '長度計算至 0.001 m，角度計算至秒，依官方注意事項四捨五入。',
      '計算式須列公式及計算過程，否則該項不予計分。'
    ]
  };
})(window);
