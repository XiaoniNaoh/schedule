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
const HOL = require("../js/holidays.js");
t("国庆节含 10/1-10/7", () => assert.ok([...Array(7)].every((_, i) => HOL.holidays["2026-10-0" + (i + 1)] === "国庆节")));
t("中秋节 9/25", () => assert.strictEqual(HOL.holidays["2026-09-25"], "中秋节"));
t("春节 2/15-2/23 共 9 天", () => assert.strictEqual(Object.values(HOL.holidays).filter((v) => v === "春节").length, 9));
t("调休上班日存在", () => assert.ok(HOL.makeup["2026-10-10"] && HOL.makeup["2026-09-20"]));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
