/* 纯逻辑工具（可被浏览器与 Node 测试共用） */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.CS_CORE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 某课程在第 w 周是否上课（支持单双周）
  function inWeeks(c, w, totalWeeks) {
    if (c.parity === 1 && w % 2 === 0) return false;
    if (c.parity === -1 && w % 2 === 1) return false;
    const ws = (c.weeks && c.weeks.length) ? c.weeks : [[1, c.totalWeeks || totalWeeks || 18]];
    return ws.some(function (r) { return w >= r[0] && w <= r[1]; });
  }

  // 周次范围格式化（合并相邻）
  function formatWeeks(weeks, parity) {
    const tail = parity === 1 ? "（单周）" : parity === -1 ? "（双周）" : "";
    if (!weeks || !weeks.length) return "全学期" + tail;
    const rs = weeks.map(function (w) { return w.slice(); }).sort(function (a, b) { return a[0] - b[0]; });
    const m = [];
    rs.forEach(function (r) {
      const l = m[m.length - 1];
      if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else m.push(r);
    });
    return m.map(function (r) { return r[0] === r[1] ? String(r[0]) : r[0] + "-" + r[1]; }).join(",") + "周" + tail;
  }

  // iCal 文本转义 / 折行
  function escICS(s) {
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }
  function foldICS(line) {
    if (line.length <= 73) return line;
    let out = line.slice(0, 73), rest = line.slice(73);
    while (rest.length) { out += "\r\n " + rest.slice(0, 72); rest = rest.slice(72); }
    return out;
  }

  // 时间加减
  function addMin(hhmm, min) {
    const p = hhmm.split(":").map(Number);
    let t = (((p[0] * 60 + p[1] + min) % 1440) + 1440) % 1440;
    return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  }

  function overlaps(a, b) { return a.p1 <= b.p2 && b.p1 <= a.p2; }

  // 找出相互冲突的事件（返回含冲突的 key 集合）
  function findConflicts(events) {
    const set = new Set();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (events[i].key === events[j].key) continue;
        if (overlaps(events[i], events[j])) { set.add(events[i].key); set.add(events[j].key); }
      }
    }
    return set;
  }

  return { inWeeks, formatWeeks, escICS, foldICS, addMin, overlaps, findConflicts };
});
