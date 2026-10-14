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
  // 一天里课程之间的空档（课间 / 午休 / 空档）
  // lessons: [{ start: 分钟, end: 分钟 }]，需按 start 升序；返回空档数组（含前后索引）
  function findBreaks(lessons, minMinutes) {
    var min = minMinutes == null ? 2 : minMinutes;
    var out = [];
    for (var i = 0; i < lessons.length - 1; i++) {
      var a = lessons[i], b = lessons[i + 1];
      var gap = b.start - a.end;
      if (gap >= min) out.push({ fromIndex: i, toIndex: i + 1, start: a.end, end: b.start, minutes: gap });
    }
    return out;
  }

  // 空档怎么称呼：跨过中午、且长度在 30 分 ~ 4 小时之间的叫午休；
  // 再长就不是"午休"了（比如 12:15 一直空到晚上），叫空档更诚实；短的就是课间
  function breakLabel(minutes, startMin, endMin) {
    if (minutes < 30) return "课间";
    var noonStart = 11 * 60 + 30, noonEnd = 14 * 60;
    var spansNoon = startMin < noonEnd && endMin > noonStart;
    return spansNoon && minutes <= 240 ? "午休" : "空档";
  }

  // 时长文案：85 → “1 小时 25 分钟”；60 → “1 小时”；5 → “5 分钟”；short 时用“分”
  function fmtGap(minutes, short) {
    var m = Math.max(0, Math.round(minutes));
    var unit = short ? " 分" : " 分钟";
    var h = Math.floor(m / 60), r = m % 60;
    if (h && !r) return h + " 小时";
    if (h) return h + " 小时 " + r + unit;
    return m + unit;
  }

  // 当前时刻落在哪个空档里（分钟）
  function breakAt(breaks, minutesNow) {
    for (var i = 0; i < breaks.length; i++) {
      if (minutesNow >= breaks[i].start && minutesNow < breaks[i].end) return breaks[i];
    }
    return null;
  }

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

  return { inWeeks, formatWeeks, escICS, foldICS, addMin, overlaps, findConflicts,
    findBreaks, breakLabel, fmtGap, breakAt };
});
