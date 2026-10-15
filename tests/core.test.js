/* 基础单元测试：node tests/core.test.js */
const assert = require("assert");
const core = require("../js/core.js");

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  ✓ " + name); } catch (e) { fail++; console.log("  ✗ " + name + "\n    " + e.message); } }

console.log("formatWeeks");
t("合并相邻周", () => assert.strictEqual(core.formatWeeks([[1, 1], [2, 2], [3, 9]]), "1-9周"));
t("不连续周", () => assert.strictEqual(core.formatWeeks([[1, 1], [3, 9]]), "1,3-9周"));
t("单周标注", () => assert.strictEqual(core.formatWeeks([[1, 16]], 1), "1-16周（单周）"));
t("空周次", () => assert.strictEqual(core.formatWeeks([]), "全学期"));

console.log("inWeeks");
t("范围命中", () => assert.strictEqual(core.inWeeks({ weeks: [[3, 9]] }, 5), true));
t("范围外", () => assert.strictEqual(core.inWeeks({ weeks: [[3, 9]] }, 10), false));
t("单周：偶数不上", () => assert.strictEqual(core.inWeeks({ weeks: [[1, 9]], parity: 1 }, 4), false));
t("单周：奇数上", () => assert.strictEqual(core.inWeeks({ weeks: [[1, 9]], parity: 1 }, 5), true));
t("双周：奇数不上", () => assert.strictEqual(core.inWeeks({ weeks: [[1, 9]], parity: -1 }, 5), false));
t("双周：偶数上", () => assert.strictEqual(core.inWeeks({ weeks: [[1, 9]], parity: -1 }, 6), true));

console.log("addMin");
t("跨小时", () => assert.strictEqual(core.addMin("08:50", 45), "09:35"));
t("跨天回绕", () => assert.strictEqual(core.addMin("23:30", 45), "00:15"));

console.log("escICS / foldICS");
t("转义逗号分号", () => assert.strictEqual(core.escICS("a,b;c"), "a\\,b\\;c"));
t("换行转义", () => assert.strictEqual(core.escICS("a\nb"), "a\\nb"));
t("短行不折", () => assert.strictEqual(core.foldICS("abc"), "abc"));
t("长行折行前缀空格", () => assert.ok(core.foldICS("x".repeat(100)).includes("\r\n ")));

console.log("findConflicts");
t("重叠节次判为冲突", () => {
  const set = core.findConflicts([
    { key: "a", p1: 1, p2: 2 }, { key: "b", p1: 2, p2: 3 }, { key: "c", p1: 5, p2: 6 },
  ]);
  assert.ok(set.has("a") && set.has("b") && !set.has("c"));
});
t("不重叠不算冲突", () => {
  const set = core.findConflicts([{ key: "a", p1: 1, p2: 2 }, { key: "b", p1: 3, p2: 4 }]);
  assert.strictEqual(set.size, 0);
});

console.log("内置节假日");
console.log("findBreaks / breakLabel / fmtGap / breakAt");
const M = (h, m) => h * 60 + m;
const day = [
  { start: M(8, 0), end: M(8, 45) },
  { start: M(8, 50), end: M(9, 35) },
  { start: M(9, 50), end: M(10, 35) },
  { start: M(13, 40), end: M(14, 25) },
];
t("找出相邻课之间的空档", () => {
  const b = core.findBreaks(day);
  assert.deepStrictEqual(b.map((x) => x.minutes), [5, 15, 185]);
});
t("空档带上前后索引与起止", () => {
  const b = core.findBreaks(day);
  assert.strictEqual(b[0].fromIndex, 0);
  assert.strictEqual(b[0].toIndex, 1);
  assert.strictEqual(b[0].start, M(8, 45));
  assert.strictEqual(b[0].end, M(8, 50));
});
t("首尾之外不凭空造空档", () => {
  assert.strictEqual(core.findBreaks(day).length, 3);
  assert.strictEqual(core.findBreaks([{ start: 480, end: 525 }]).length, 0);
  assert.strictEqual(core.findBreaks([]).length, 0);
});
t("1 分钟以内不算空档", () => {
  const b = core.findBreaks([{ start: 480, end: 525 }, { start: 526, end: 570 }]);
  assert.strictEqual(b.length, 0);
  const b2 = core.findBreaks([{ start: 480, end: 525 }, { start: 527, end: 570 }], 1);
  assert.strictEqual(b2.length, 1);
});
t("撞课（空档为负）不产生空档", () => {
  const b = core.findBreaks([{ start: 480, end: 540 }, { start: 530, end: 570 }]);
  assert.strictEqual(b.length, 0);
});
t("短空档叫课间，跨中午的长空档叫午休，其余长空档叫空档", () => {
  assert.strictEqual(core.breakLabel(15, M(9, 35), M(9, 50)), "课间");
  assert.strictEqual(core.breakLabel(85, M(12, 15), M(13, 40)), "午休");
  assert.strictEqual(core.breakLabel(185, M(10, 35), M(13, 40)), "午休");
  assert.strictEqual(core.breakLabel(50, M(17, 55), M(18, 45)), "空档");
  assert.strictEqual(core.breakLabel(40, M(10, 0), M(10, 40)), "空档");
  // 超过 4 小时就不叫午休了：12:15 一直空到 20:25
  assert.strictEqual(core.breakLabel(490, M(12, 15), M(20, 25)), "空档");
  assert.strictEqual(core.breakLabel(240, M(12, 15), M(16, 15)), "午休");
  assert.strictEqual(core.breakLabel(300, M(12, 15), M(17, 15)), "空档");
});
t("时长文案：小时与分钟都要好看", () => {
  assert.strictEqual(core.fmtGap(5), "5 分钟");
  assert.strictEqual(core.fmtGap(85), "1 小时 25 分钟");
  assert.strictEqual(core.fmtGap(60), "1 小时");
  assert.strictEqual(core.fmtGap(185), "3 小时 5 分钟");
  assert.strictEqual(core.fmtGap(25, true), "25 分");
  assert.strictEqual(core.fmtGap(0), "0 分钟");
});
t("当前时刻落在哪个空档里", () => {
  const b = core.findBreaks(day);
  assert.strictEqual(core.breakAt(b, M(9, 40)).minutes, 15);
  assert.strictEqual(core.breakAt(b, M(9, 50)), null);   // 9:50 已在上课
  assert.strictEqual(core.breakAt(b, M(8, 47)), b[0]);   // 8:47 在第一个课间里
  assert.strictEqual(core.breakAt(b, M(13, 39)), b[2]);  // 午休最后一分钟仍算课间
  assert.strictEqual(core.breakAt(b, M(8, 0)), null);
  assert.strictEqual(core.breakAt(b, M(12, 0)).minutes, 185);   // 中午在那个 3 小时长空档里
});
t("同一门课连排（第 1-4 节）时，节与节之间也算空档", () => {
  // 08:00-08:45 / 08:50-09:35 / 09:50-10:35 / 10:40-11:25
  const slots = [
    { start: M(8, 0), end: M(8, 45) },
    { start: M(8, 50), end: M(9, 35) },
    { start: M(9, 50), end: M(10, 35) },
    { start: M(10, 40), end: M(11, 25) },
  ];
  assert.deepStrictEqual(core.findBreaks(slots).map((x) => x.minutes), [5, 15, 5]);
});

const HOL = require("../js/holidays.js");
t("国庆节含 10/1-10/7", () => assert.ok([...Array(7)].every((_, i) => HOL.holidays["2026-10-0" + (i + 1)] === "国庆节")));
t("中秋节 9/25", () => assert.strictEqual(HOL.holidays["2026-09-25"], "中秋节"));
t("春节 2/15-2/23 共 9 天", () => assert.strictEqual(Object.values(HOL.holidays).filter((v) => v === "春节").length, 9));
t("调休上班日存在", () => assert.ok(HOL.makeup["2026-10-10"] && HOL.makeup["2026-09-20"]));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
