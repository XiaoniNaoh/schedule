/* ============ 我的课表 · 应用逻辑 ============ */
(function () {
  "use strict";

  const APP_VERSION = "4.6.1";
  const CHANGELOG = [
    { v: "4.6.1", items: [
      "移动端流畅度优化：把一直在重绘的呼吸光影改成只动透明度，动画一个没少",
      "去掉整屏磨砂和隐藏弹层的毛玻璃（手机上很贵），顶栏模糊也收窄了一档",
      "进度条改走合成层（不再每帧重排）；每 30 秒的重建改成按分钟更新，少一次卡顿",
    ] },
    { v: "4.6.0", items: [
      "课间现在按「节」算：一门连排课（第 1-4 节这种）节与节之间的课间也算进来了",
      "连排课的卡片会列出它的课间（如「08:45 课间 5 分 · 09:35 课间 15 分」），上课时提示的是最近那个",
      "正在课间里时，卡片那一行点亮倒数，置顶摘要换成「课间 · 高数 · 10:50 · 15 分」",
    ] },
    { v: "4.5.0", items: [
      "新增「课间」：课与课之间画一条标尺，写明课间 / 午休 / 空档有多长",
      "上课时告诉你下一个课间几点开始、多久（课卡与置顶摘要都会说）",
      "正在课间里时标尺点亮并倒数，摘要把「还剩多久、下节几点、上什么」并排显示",
      "顺带修正：日视图按时间排序（后添加的早课不会再排到最后），中间课取消时空档会正确合并",
    ] },
    { v: "4.4.2", items: ["修复编辑课程时底部动作栏只显示「删除」，「取消 / 保存」被挤到屏幕外的问题"] },
    { v: "4.4.1", items: ["课程小票的入场动画换回原来的打印式：整张从票头往下打出来，配一道扫过的高光"] },
    { v: "4.4.0", items: [
      "弹层与课程小票可下拉关闭：跟手、越界有阻力、松手按速度决定去留，随时能反悔",
      "切换日/周与日期标签改为弹簧驱动，可被中途打断并从当前位置继续",
      "滚动时顶栏出现渐隐边缘、副标题收起，内容区不被硬分割线切一刀",
      "排版统一：字号/行高/字距成组定义，数字等宽，间距改用 4px 基准",
      "去掉循环闪烁类装饰（脉冲、扫光、呼吸点），改为一次性入场与连续进度",
      "按压反馈改为按下即生效、拖开即取消；支持减少动态/减少透明度/提高对比",
    ] },
    { v: "4.3.0", items: ["重做添加/编辑课程界面：分组行更紧凑清爽", "保存按钮常驻底部，手机上无需滚动即可提交"] },
    { v: "4.2.0", items: ["预设调色板扩充到 17 色，色相覆盖更全", "编辑课程界面重排：教师/地点并排、节次与周次分区更清晰、操作按钮更顺手"] },
    { v: "4.0.2", items: ["更新界面重做：只突出当前版本，历史更新折叠收纳", "「刷新以应用」按钮固定在底部，无需滚动到底"] },
    { v: "4.0.1", items: ["修复「现在」时间线会显示在「午后」分组标题下方的问题", "Service Worker 改为网络优先并自动更新，导入/更新即时生效"] },
    { v: "4.0.0", items: ["一门课支持多个时间段（一门课一周可上多次）", "同名课程自动合并为一门课，统一颜色", "课程编辑表单可增删时间段", "新增/编辑课程后可同步到手机日历"] },
    { v: "3.9.1", items: ["同一天同名课程合并为一门（同一门课可含多个时间段）"] },
    { v: "3.9.0", items: ["日视图左右滑动改为双图层连贯滑动", "日视图可跨周滑动；下周从周一、上周从周日开始", "移动端周视图进入时当天列左对齐（明后天在右侧）", "周视图拖拽自动跟随手势方向横移"] },
    { v: "3.8.0", items: ["内置 2026 法定节假日与调休；节日专属配色与祝福", "节假日可批量搬迁课程或直接取消（可撤销）", "删除/调课会随「同步到手机日历」一并移除（重新导入生效）", "移动端全面适配、周视图拖拽手感优化"] },
    { v: "3.7.0", items: ["拖拽调课：把课程直接拖到别的节次/日期", "冲突检测：撞课自动高亮提示", "节假日 / 调休设置", "课表分享图（可保存/分享）", "学期进度条", "更新提示（含更新内容）"] },
    { v: "3.6.0", items: ["左右切换增加跟手拖动与回弹手感", "Toast 位置上移"] },
    { v: "3.5.0", items: ["课程库可编辑/删除导入课程，并同步日历", "日/周切换滑动动画"] },
    { v: "3.4.0", items: ["课程时间与每日节数可自定义", "日视图早晨/午后/夜晚时段节点", "日历导出增强（时区+双提醒）"] },
  ];
  const CS_CORE = window.CS_CORE;
  const findConflicts = (evs) => CS_CORE.findConflicts(evs);
  // 课间（空档）相关：纯逻辑在 core.js，那里有单测
  const findBreaks = (lessons, min) => CS_CORE.findBreaks(lessons, min);
  const breakLabel = (m, s, e) => CS_CORE.breakLabel(m, s, e);
  const fmtGap = (m, short) => CS_CORE.fmtGap(m, short);
  const breakAt = (breaks, m) => CS_CORE.breakAt(breaks, m);
  const CN = window.CN_HOLIDAYS || { holidays: {}, makeup: {} };
  // 每个节日的专属颜色与祝福（文案偏年轻）
  const HOLIDAY_STYLE = {
    "元旦": { c: "#3b82f6", t: "新的一年，好运拉满！" },
    "春节": { c: "#e11d48", t: "新年快乐，红包安排上～" },
    "清明节": { c: "#10b981", t: "清明踏青，记得添衣。" },
    "劳动节": { c: "#f97316", t: "好好休息，才是劳动节。" },
    "端午节": { c: "#0d9488", t: "粽子管够，端午快乐！" },
    "中秋节": { c: "#f59e0b", t: "月色真美，中秋快乐！" },
    "国庆节": { c: "#ef4444", t: "为祖国庆生，假期愉快！" },
    "假期": { c: "#8b5cf6", t: "假期快乐，随心安排～" },
  };
  const holidayStyle = (name) => HOLIDAY_STYLE[name] || HOLIDAY_STYLE["假期"];

  const DEFAULT_WEEK1 = "2026-09-07"; // 第 1 周周一（可在设置中修改）
  const DEFAULT_PERIODS = [
    ["08:00", "08:45"], ["08:50", "09:35"], ["09:50", "10:35"], ["10:40", "11:25"], ["11:30", "12:15"],
    ["13:40", "14:25"], ["14:30", "15:15"], ["15:30", "16:15"], ["16:20", "17:05"], ["17:10", "17:55"],
    ["18:45", "19:30"], ["19:35", "20:20"], ["20:25", "21:10"],
  ].map(([s, e], i) => ({ n: i + 1, start: s, end: e }));

  const LS = {
    settings: "cs.settings.v1", overrides: "cs.overrides.v1", notified: "cs.notified.v1",
    my: "cs.mycourses.v1", personal: "cs.personal.v1", celebrated: "cs.celebrated.v1",
    sync: "cs.sync.v1", co: "cs.courseoverrides.v1", coDel: "cs.coursedeleted.v1",
    ics: "cs.icsuids.v1",
  };
  function markDirty() { write(LS.sync, Object.assign(read(LS.sync, {}), { dirty: true })); }
  function markSynced() { write(LS.sync, { dirty: false, at: Date.now() }); }
  const isSyncDirty = () => read(LS.sync, {}).dirty === true;

  /* ---------- state ---------- */
  let settings = Object.assign(
    { week1Start: DEFAULT_WEEK1, leadMin: 15, notify: false, showWeekend: true, intensity: "std", periods: null, holidays: [], builtinHolidays: true },
    read(LS.settings, {})
  );
  function builtinHolidayName(key) { return settings.builtinHolidays === false ? null : CN.holidays[key]; }
  function holidayName(key) { return (settings.holidays || []).indexOf(key) >= 0 ? "假期" : builtinHolidayName(key); }
  let overrides = read(LS.overrides, []);
  let notified = new Set(read(LS.notified, []));
  let state = { week: 1, day: 1, view: "day" };
  let quietRender = false;

  /* ---------- data（示例 / 个人） ---------- */
  let DATA, PERIODS, COURSES, MY, TOTAL_WEEKS;
  function loadData() {
    DATA = read(LS.personal, null) || window.COURSE_DATA;
    PERIODS = effectivePeriods();
    COURSES = (DATA.courses || []).slice();
    MY = read(LS.my, []).map((c) => (c && c.id ? c : Object.assign({}, c, { id: "u" + Math.random().toString(36).slice(2, 10) })));
    CO = read(LS.co, {}); CODEL = read(LS.coDel, []);
    TOTAL_WEEKS = (DATA.meta && DATA.meta.totalWeeks) || 18;
  }
  // 课节时间：默认取数据，若在设置中自定义则以自定义为准
  function effectivePeriods() {
    const ov = settings.periods;
    if (Array.isArray(ov) && ov.length) return ov.map((p, i) => ({ n: i + 1, start: p.start, end: p.end }));
    const src = (DATA.periods && DATA.periods.length) ? DATA.periods : DEFAULT_PERIODS;
    return src.map((p) => ({ n: p.n, start: p.start, end: p.end }));
  }
  const perAt = (n) => PERIODS[Math.min(Math.max(1, n || 1), PERIODS.length) - 1] || PERIODS[0];
  // 对「导入/示例课表」课程的编辑(CO)与删除(CODEL)覆盖
  let CO = read(LS.co, {});
  let CODEL = read(LS.coDel, []);
  const allCourses = () => {
    const base = COURSES.filter((c) => CODEL.indexOf(c.id) < 0)
      .map((c) => (CO[c.id] ? Object.assign({}, c, CO[c.id]) : c));
    return base.concat(MY);
  };
  const isPersonal = () => !!read(LS.personal, null);
  // 视觉强度：std/rich 即当前观感；min 给省电或极简场景（去毛玻璃、去阴影、去动效）
  function applyIntensity() { document.documentElement.dataset.intensity = settings.intensity || "std"; }
  loadData();

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  // 手势与弹簧（js/motion.js）。缺失时降级为"直接到位"，不影响任何功能
  const M = window.CS_MOTION || {
    project: (v) => v / 2,
    rubberband: (o) => o * .3,
    reduced: () => false,
    springBy: (r, b, o) => { if (o.onUpdate) o.onUpdate(o.to); if (o.onDone) o.onDone(); return { stop: () => ({ value: o.to, velocity: 0 }) }; },
    draggable: () => () => {},
    pressable: () => {}
  };

  /* ---------- icons ---------- */
  const I = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    bellOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><circle cx="19" cy="5" r="3.2" fill="#e5484d" stroke="var(--surface)" stroke-width="1.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 0 8h-1"/><path d="m17 20 4-4-4-4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    loc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2-9.5L3 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M4 21h16"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="m7 12 5-5 5 5"/><path d="M4 3h16"/></svg>',
    install: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/><path d="M12 6v7"/><path d="m9 10 3 3 3-3"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.9L21.6 18l-1.9.7L19 20.6l-.7-1.9L16.4 18l1.9-.7z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  // 多彩美学色卡（相邻项色相差距大，整周不重复）
  // 预设调色板：17 色按色相均匀铺开，明度/饱和错落，彼此互不雷同
  const PALETTE = [
    "#cf3a3a", "#cf6f3a", "#e6b337", "#dce637", "#92cf3a", "#5dcf3a",
    "#34c546", "#34c579", "#34c5ac", "#3ab5cf", "#3a80cf", "#3a4ccf",
    "#5d3acf", "#9643d0", "#c843d0", "#cf3aa3", "#cf3a6f",
  ];

  /* ---------- utils ---------- */
  function read(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  const pad = (n) => String(n).padStart(2, "0");
  const _nowOverride = (() => { const v = new URLSearchParams(location.search).get("now"); const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; })();
  const nowD = () => (_nowOverride ? new Date(_nowOverride) : new Date());
  const clock = () => { const d = nowD(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- 文案 ---------- */
  function pick(arr, seed) {
    let h = 0; const s = String(seed);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return arr[h % arr.length];
  }
  function greeting() {
    const h = nowD().getHours();
    if (h < 5) return "夜深了";
    if (h < 9) return "早八人上线";
    if (h < 12) return "上午加油";
    if (h < 14) return "饭点到了";
    if (h < 18) return "下午别困";
    if (h < 22) return "晚上好";
    return "该收工啦";
  }
  const EMPTY_TODAY = [
    "今天没课，躺平合法",
    "空课 day，摸鱼有理",
    "今天不用上课，随意安排",
    "没课的一天，快乐加倍",
  ];
  const EMPTY_DAY = [
    "这天没课，睡到自然醒",
    "空着的一天，随便造",
    "这天暂无安排，轻松一下",
    "无课，属于你的时间",
  ];
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function parseYmd(s) { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); }
  const atMid = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = atMid(d); x.setDate(x.getDate() + n); return x; };
  const dayDiff = (a, b) => Math.round((atMid(a) - atMid(b)) / 86400000);
  const weekday = (d) => ((d.getDay() + 6) % 7) + 1; // 周一=1
  const DAY_CN = ["一", "二", "三", "四", "五", "六", "日"];

  function weekStart(w) { return addDays(parseYmd(settings.week1Start), (w - 1) * 7); }
  function dateOf(w, day) { return addDays(weekStart(w), day - 1); }
  function weekOf(date) { return Math.floor(dayDiff(date, parseYmd(settings.week1Start)) / 7) + 1; }
  const inWeeks = (c, w) => window.CS_CORE.inWeeks(c, w, TOTAL_WEEKS);

  const fmtWeeks = (weeks, parity) => window.CS_CORE.formatWeeks(weeks, parity);

  // 颜色按「天 + 课名」分配：同一天的同一门课同色，跨天的同名课视为不同课、用不同色
  // 一门课 = 名字相同的一门课，可含多个时间段
  function courseSessions(c) {
    if (Array.isArray(c.sessions) && c.sessions.length) {
      return c.sessions.map((s, i) => ({ si: i, day: s.day, p1: s.p1, p2: s.p2, room: s.room || c.room || "", weeks: s.weeks || [], parity: s.parity || 0 }));
    }
    if (c.day) return [{ si: 0, day: c.day, p1: c.p1, p2: c.p2, room: c.room || "", weeks: c.weeks || [], parity: c.parity || 0 }];
    return [];
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (x) => Math.round(255 * f(x)).toString(16).padStart(2, "0");
    return "#" + to(0) + to(8) + to(4);
  }
  // 活泼年轻配色：同一天内课程色相均匀错开（彼此好区分，如红/蓝，而非粉/梅红）；同名课程始终同色
  const DAY_OFFSET = { 1: 8, 2: 41, 3: 74, 4: 107, 5: 140, 6: 173, 7: 206 };
  const COLOR_BY_ID = {};
  let COLOR_BY_NAME = {};
  function assignColors() {
    for (const k in COLOR_BY_ID) delete COLOR_BY_ID[k];
    COLOR_BY_NAME = {};
    const byDay = {};
    allCourses().forEach((c) => {
      const s = courseSessions(c)[0];
      const d = s ? s.day : 0;
      (byDay[d] = byDay[d] || []);
      if (!byDay[d].includes(c.name)) byDay[d].push(c.name);
    });
    Object.keys(byDay).map(Number).sort((a, b) => a - b).forEach((day) => {
      const names = byDay[day].slice().sort();
      const n = names.length;
      const step = 360 / Math.max(1, n);          // 天内均匀分布色相 → 相邻课色差最大
      const off = DAY_OFFSET[day] !== undefined ? DAY_OFFSET[day] : (day * 53) % 360;
      names.forEach((nm, i) => {
        const c = allCourses().find((x) => x.name === nm);
        if (c && c.color) { COLOR_BY_NAME[nm] = c.color; return; }
        const hue = (off + i * step) % 360;
        const light = 54 + (i % 2 ? 7 : -2);       // 52 / 61 交替，进一步拉开
        COLOR_BY_NAME[nm] = hslToHex(hue, 70, light);
      });
    });
    allCourses().forEach((c) => { COLOR_BY_ID[c.id] = c.color || COLOR_BY_NAME[c.name]; });
  }
  assignColors();

  function colorOf(id, name) {
    const n = name !== undefined ? name : id;
    if (id && COLOR_BY_ID[id]) return COLOR_BY_ID[id];
    if (n && COLOR_BY_NAME[n]) return COLOR_BY_NAME[n];
    let h = 0; const s = String(n || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  // 根据底色明度选择黑/白前景色，保证填充块文字可读
  function textOn(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return lum > 0.36 ? "#141a20" : "#ffffff";
  }

  /* ---------- event model ---------- */
  function occFromCourse(c, s, date, kind, extra) {
    return {
      key: `${c.id}#${s.si}|${kind}|${ymd(date)}`,
      courseId: c.id, si: s.si, name: c.name, teacher: c.teacher,
      room: (extra && extra.room) || s.room,
      day: (extra && extra.day) || s.day,
      p1: (extra && extra.p1) || s.p1, p2: (extra && extra.p2) || s.p2,
      weeks: s.weeks, parity: s.parity || 0, date, kind, note: (extra && extra.note) || "",
      origDate: (extra && extra.origDate) || ymd(date),
      id: (extra && extra.id) || null, color: c.color,
    };
  }

  function eventsForDate(date, week, ignoreHoliday) {
    const key = ymd(date);
    if (!ignoreHoliday && ((settings.holidays || []).indexOf(key) >= 0 || builtinHolidayName(key))) return []; // 节假日/调休：不上课
    const w = week != null ? week : weekOf(date);
    const out = [];
    for (const ov of overrides) {
      if (ov.type === "custom" && ov.date === key) {
        out.push({ key: "custom|" + ov.id, courseId: null, name: ov.name, teacher: ov.teacher || "", room: ov.room || "",
          day: weekday(date), p1: ov.p1, p2: ov.p2, weeks: [], date, kind: "custom", note: ov.note || "", id: ov.id, color: ov.color });
      }
    }
    for (const ov of overrides) {
      if (ov.type === "move" && ov.toDate === key) {
        const c = allCourses().find((x) => x.id === ov.courseId); if (!c) continue;
        const s = courseSessions(c).find((x) => x.si === (ov.si || 0)); if (!s) continue;
        const occ = occFromCourse(c, s, date, "moved", { day: weekday(date), p1: ov.p1, p2: ov.p2, room: ov.room, origDate: ov.date, id: ov.id });
        occ.cancelled = !!hasOv("cancel", ov.courseId, ov.si || 0, ov.date);
        out.push(occ);
      }
    }
    for (const c of allCourses()) {
      if (w < 1 || w > TOTAL_WEEKS) continue;
      for (const s of courseSessions(c)) {
        if (!inWeeks(s, w)) continue;
        if (s.day !== weekday(date)) continue;
        if (hasOv("move", c.id, s.si, key)) continue;
        const occ = occFromCourse(c, s, date, "normal", null);
        occ.cancelled = !!hasOv("cancel", c.id, s.si, key);
        out.push(occ);
      }
    }
    out.sort((a, b) => a.p1 - b.p1 || dayDiff(a.date, b.date));
    return out;
  }

  function hasOv(type, courseId, si, dateKey) {
    return overrides.find((o) => o.type === type && o.courseId === courseId && (o.si || 0) === (si || 0) && o.date === dateKey);
  }
  function deleteOv(id) { overrides = overrides.filter((o) => o.id !== id); saveOverrides(); }
  function saveOverrides() { write(LS.overrides, overrides); markDirty(); }

  /* ---------- toast ---------- */
  const TOAST_ICON = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.7-10-9.3C.7 9 2 6 5 5.3 7 4.8 8.7 5.6 10 7c1.3-1.4 3-2.2 5-1.7 3 .7 4.3 3.7 3 6.4C19.5 16.3 12 21 12 21z"/></svg>',
  };
  let toastT;
  function toast(msg, type) {
    const el = $("#toast");
    if (!el) return;
    if (el._t) { clearTimeout(el._t); el._t = null; }
    if (type === true) type = "ok";
    type = type || "ok";
    const icon = TOAST_ICON[type];
    el.className = "toast " + type;
    el.innerHTML = (icon ? '<span class="ti">' + icon + "</span>" : "")
      + '<span class="tt">' + esc(msg) + "</span>"
      + '<span class="bar"></span>';
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(toastT);
    const dur = Math.min(4600, 1900 + String(msg).length * 45);
    const bar = el.querySelector(".bar");
    if (bar) { bar.style.animationDuration = dur + "ms"; bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
    toastT = el._t = setTimeout(() => el.classList.remove("show"), dur);
  }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) {} }

  /* ---------- sheets ---------- */
  function lockScroll(on) { document.documentElement.style.overflow = on ? "hidden" : ""; document.body.style.overflow = on ? "hidden" : ""; }

  /* ---------- 弹层位移：弹簧驱动 + 下拉关闭 ----------
     依据 Apple《Designing Fluid Interfaces》：
     从"当前屏幕上的值"开始、跟手 1:1（含抓取偏移）、越界渐进阻力、
     松手按速度投影决定去留、任何时刻都能被抓住并反向。 */
  function setSheetY(el, y) { el._y = y; el.style.transform = "translate3d(-50%, " + y + "px, 0)"; }
  function stopMotion(el) { if (el && el._stop) { el._stop(); el._stop = null; } }
  function runMotion(el, sp) { stopMotion(el); el._stop = sp.stop; return sp; }
  const sheetHeight = (el) => el.offsetHeight || 600;

  function animateSheet(el, to, velocity, done) {
    const finish = function () { el.classList.remove("moving"); if (done) done(); };
    if (M.reduced()) { el.classList.remove("moving"); setSheetY(el, to); finish(); return; }
    el.classList.add("moving");
    // 抓取中被打断时，从实时位置与实时速度接着走，不跳变
    runMotion(el, M.springBy(0.34, 0, {
      from: el._y == null ? to : el._y,
      to: to,
      velocity: velocity || 0,
      onUpdate: function (v) { setSheetY(el, v); },
      onDone: finish
    }));
  }

  function openSheetEl(el) {
    if (!el) return;
    document.documentElement.classList.add("sheet-open");
    el.classList.add("show");
    el._y = null;
    if (M.reduced()) { setSheetY(el, 0); el.style.transform = ""; return; }
    setSheetY(el, sheetHeight(el));           // 先落到屏幕外，再从那里上来
    animateSheet(el, 0, 0, function () { el.style.transform = ""; el._y = 0; });
  }

  function closeSheetEl(el, velocity, done) {
    if (!el || !el.classList.contains("show")) { if (done) done(); return; }
    if (M.reduced()) {
      el.classList.remove("show", "moving");
      el.style.transform = ""; el._y = null;
      if (done) done();
      return;
    }
    animateSheet(el, sheetHeight(el), velocity || 0, function () {
      el.classList.remove("show");
      el.style.transform = ""; el._y = null;
      if (done) done();
    });
  }

  function openSheet(id) {
    const el = $("#" + id);
    const ov = $("#overlay");
    if (ov) { ov.style.opacity = ""; ov.classList.add("show"); }
    openSheetEl(el);
    lockScroll(true);
  }

  // 最后一个弹层收完之后，才让主内容回到原处
  function afterOverlaysClosed() {
    if (document.querySelector(".sheet.show") || document.querySelector("#ticketModal.show")) return;
    document.documentElement.classList.remove("sheet-open");
    const ov = $("#overlay");
    if (ov) { ov.classList.remove("show"); ov.style.opacity = ""; }
    lockScroll(false);
  }

  function closeSheets() {
    const open = $$(".sheet.show");
    const tm = $("#ticketModal");
    const tmOpen = !!(tm && tm.classList.contains("show"));
    const ov = $("#overlay");
    if (ov) { ov.classList.remove("show"); ov.style.opacity = ""; }
    lockScroll(false);
    if (!open.length && !tmOpen) { document.documentElement.classList.remove("sheet-open"); return; }
    let pending = open.length + (tmOpen ? 1 : 0);
    const done = function () { pending -= 1; if (pending <= 0) afterOverlaysClosed(); };
    open.forEach(function (s) { closeSheetEl(s, 0, done); });
    if (tmOpen) closeTicket(tm, 0, false, done);
  }

  /* 把手一带下拉即可关闭；正文区域照常滚动 */
  function wireSheetDrag(el) {
    M.draggable(el, {
      axis: "y",
      filter: function (e) {
        if (!el.classList.contains("show")) return false;
        const t = e.target;
        if (!t || typeof t.closest !== "function") return false;
        if (t.closest("button, input, select, textarea, a")) return false;
        return !!t.closest(".handle, .shead");
      },
      onStart: function () {
        stopMotion(el);
        el._base = el._y == null ? 0 : el._y;
        el.classList.add("moving");
      },
      onMove: function (d) {
        const h = sheetHeight(el);
        let y = el._base + d;
        // 越界不是硬停，是越来越不跟手
        if (y < 0) y = -M.rubberband(-y, h, .5);
        else if (y > h) y = h + M.rubberband(y - h, h, .5);
        setSheetY(el, y);
        const ov = $("#overlay");
        if (ov) ov.style.opacity = String(Math.max(0, 1 - (y / h) * 1.2));
      },
      onEnd: function (d, v) {
        const h = sheetHeight(el);
        const y = el._y == null ? 0 : el._y;
        el.classList.remove("moving");
        const ov = $("#overlay");
        if (ov) ov.style.opacity = "";
        // 用速度投影落点，而不是从松手位置就近判断
        const projected = y + M.project(v, .998);
        if (v > 620 || projected > h * .45) {
          closeSheetEl(el, v, afterOverlaysClosed);
        } else {
          animateSheet(el, 0, v, function () { el.style.transform = ""; el._y = 0; });
        }
      }
    });
  }

  $("#overlay").addEventListener("click", closeSheets);
  $$("[data-close]").forEach((b) => b.addEventListener("click", closeSheets));

  /* ---------- 课程小票：从被点的那张卡长出来，也可以下拉收回 ---------- */
  const ticketHeight = (tk) => tk.offsetHeight || 420;
  // 可见尺寸：矮视口下小票会整体等比缩小，拖拽的位移与判定都要按缩放后的尺寸来
  function ticketMetrics(tk) {
    const fit = tk._fit || 1;
    return { fit: fit, h: ticketHeight(tk) * fit };
  }
  function ticketTransform(y, h, fit) {
    const s = (fit || 1) * (1 - 0.06 * Math.min(1, Math.abs(y) / (h || 1)));
    return "translate3d(0, " + y + "px, 0) scale(" + s.toFixed(4) + ")";
  }
  /* 小票保持一页：放不下时整体等比缩小装进视口。
     注意不能靠 max-height 裁切——裁掉的部分缩放也救不回来，底部操作就够不到了。 */
  function fitTicket(tk) {
    if (!tk) return 1;
    tk.style.setProperty("--tk-fit", "1");
    const wrap = tk.parentElement;
    let avail = window.innerHeight - 24;
    if (wrap) {
      const cs = getComputedStyle(wrap);
      avail = wrap.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    }
    const need = tk.offsetHeight;                 // 不裁切时，盒子高度就是内容高度
    const fit = need > avail && need > 0 ? Math.max(0.74, avail / need) : 1;
    const v = Math.round(fit * 1000) / 1000;
    tk.style.setProperty("--tk-fit", String(v));
    tk._fit = v;
    return v;
  }

  function openTicket(tm) {
    const tk = tm.querySelector(".tk2");
    if (tk) { tk.style.transition = ""; tk.style.transform = ""; tk._y = 0; tk.classList.remove("moving"); }
    const ov = $("#overlay");
    if (ov) ov.classList.add("show");
    lockScroll(true);
    document.documentElement.classList.add("sheet-open");
    void tm.offsetWidth;
    tm.classList.add("show");
    fitTicket(tk);
  }

  function closeTicket(tm, velocity, dragged, done) {
    const tk = tm.querySelector(".tk2");
    // 手指拖出去过：按手指的方向收走；否则按进场原路缩回（进出同一条路径）
    if (!tk || M.reduced() || !dragged) {
      if (tk) { tk.style.transition = ""; tk.style.transform = ""; tk.classList.remove("moving"); tk._y = 0; }
      tm.classList.remove("show");
      if (done) done();
      return;
    }
    const m = ticketMetrics(tk);
    stopMotion(tk);
    tm.classList.remove("show");        // 淡出与收走同时发生
    tk.style.transition = "none";
    tk.classList.add("moving");
    runMotion(tk, M.springBy(0.34, 0, {
      from: tk._y == null ? 0 : tk._y,
      to: m.h * 0.95,
      velocity: velocity || 0,
      onUpdate: function (v) { tk.style.transform = ticketTransform(v, m.h, m.fit); },
      onDone: function () {
        tk.style.transform = "";
        tk.classList.remove("moving");
        tk._y = 0;
        // 下一帧再交还给 CSS 过渡，避免刚归位又补一段回弹
        requestAnimationFrame(function () { tk.style.transition = ""; });
        if (done) done();
      }
    }));
  }

  function wireTicketDrag(tm) {
    M.draggable(tm, {
      axis: "y",
      filter: function (e) {
        if (!tm.classList.contains("show")) return false;
        const t = e.target;
        if (!t || typeof t.closest !== "function") return false;
        if (t.closest("button, input, select, textarea, a")) return false;
        return !!t.closest(".tk2");
      },
      onStart: function () {
        const tk = tm.querySelector(".tk2"); if (!tk) return;
        stopMotion(tk);
        tk.style.transition = "none";
        tk.classList.add("moving");
      },
      onMove: function (d) {
        const tk = tm.querySelector(".tk2"); if (!tk) return;
        const m = ticketMetrics(tk);
        let y = d;
        if (y < 0) y = -M.rubberband(-y, m.h, .55);
        else if (y > m.h) y = m.h + M.rubberband(y - m.h, m.h, .55);
        tk._y = y;
        tk.style.transform = ticketTransform(y, m.h, m.fit);
      },
      onEnd: function (d, v) {
        const tk = tm.querySelector(".tk2"); if (!tk) return;
        const m = ticketMetrics(tk);
        const y = tk._y == null ? 0 : tk._y;
        tk.classList.remove("moving");
        const projected = y + M.project(v, .998);
        if (v > 620 || projected > m.h * .38) { closeTicket(tm, v, true, afterOverlaysClosed); return; }
        runMotion(tk, M.springBy(0.36, 0.08, {
          from: y, to: 0, velocity: v,
          onUpdate: function (val) { tk._y = val; tk.style.transform = ticketTransform(val, m.h, m.fit); },
          onDone: function () { tk.style.transform = ""; tk.style.transition = ""; tk._y = 0; }
        }));
      }
    });
  }

  /* ---------- 指示器：弹簧驱动，可被中途打断 ---------- */
  function slideIndicator(el, x, w, animate) {
    if (!el) return;
    const st = el._slide || (el._slide = {});
    // 打断上一段：拿它在屏幕上的当前值与速度，接着走（不是从目标值重新开始）
    let liveX = null, liveV = 0;
    if (st.stopX) { const r = st.stopX(); liveX = r.value; liveV = r.velocity; st.stopX = null; }
    if (st.stopW) { st.stopW(); st.stopW = null; }
    const toW = w == null ? null : w;
    // 只有"第一次定位"或明确要求不动画时才直接落位
    if (animate === false || st.x == null) {
      st.x = x; st.w = toW;
      el.style.transform = "translateX(" + x + "px)";
      if (toW != null) el.style.width = toW + "px";
      return;
    }
    const fromX = liveX == null ? st.x : liveX;
    const fromW = st.w == null ? (toW == null ? el.offsetWidth : toW) : st.w;
    st.x = fromX; st.w = fromW;
    const spX = M.springBy(0.34, 0, {
      from: fromX, to: x, velocity: liveV,
      onUpdate: function (v) { st.x = v; el.style.transform = "translateX(" + v + "px)"; }
    });
    st.stopX = spX.stop;
    if (toW != null) {
      const spW = M.springBy(0.34, 0, {
        from: fromW, to: toW, velocity: 0,
        onUpdate: function (v) { st.w = v; el.style.width = v + "px"; }
      });
      st.stopW = spW.stop;
    }
  }

  /* ---------- top bar ---------- */
  function renderTop() {
    $("#brandName").textContent = (DATA.meta && DATA.meta.title) || "我的课表";
    const db = $("#demoBadge");
    if (db) db.classList.toggle("hidden", isPersonal());
    $("#brandTerm").textContent = `${greeting()} · 现在 ${clock()}`;
    $("#btnSettings").innerHTML = I.gear;
    const on = settings.notify && "Notification" in window && Notification.permission === "granted";
    $("#btnRemind").innerHTML = on ? I.bellOn : I.bell;
    $("#btnRemind").classList.toggle("on", on);
    const bi = $("#btnInstall");
    bi.innerHTML = I.install;
    bi.classList.toggle("hidden", isStandalone());
    bi.onclick = doInstall;
    $("#fabAdd").innerHTML = I.plus;
  }

  /* ---------- 置顶摘要（仅当天 · 扁平 · 可展开） ---------- */
  let sumOpen = false;
  function renderSummary() {
    const el = $("#summary");
    if (!el) return;
    // 手势进行中就别动这里：内容正在跟手，头部高度若同时变化会把两层页面对不齐
    if (gestureActive) return;
    const date = dateOf(state.week, state.day);
    if (dayDiff(date, nowD()) !== 0) {
      // 只收起来，不清内容：让收起也有高度过渡，不会"啪"一下消失
      el.className = "summary";
      return;
    }
    const evs = eventsForDate(date, state.week).filter((e) => !e.cancelled);
    if (!evs.length) {
      el.className = "summary on";
      el.innerHTML = `<div class="sum-bar quiet"><span class="sb-n">今天没课，随意安排</span></div>`;
      return;
    }
    const now = nowD();
    const items = evs.map((ev) => {
      const p1t = perAt(ev.p1), p2t = perAt(ev.p2);
      const end = p2t ? p2t.end : p1t.end;
      return { ev, p1t, end, startAt: parseTimeOn(date, p1t.start), endAt: parseTimeOn(date, end), col: ev.color || colorOf(ev.courseId, ev.name) };
    }).sort((a, b) => a.startAt - b.startAt);
    const live = items.find((it) => now >= it.startAt && now < it.endAt);
    const next = items.find((it) => it.startAt > now);
    // 课间：正在课间时把"还剩多久、下节几点"说清楚；在上课时则预告下一个课间
    const slots = daySlots(items);
    const brks = findBreaks(slots, 2);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const liveBk = breakAt(brks, nowMin);

    let main;
    if (liveBk) {
      // 正在课间里（含连排课的节间课间）：先说清楚这是课间、还剩多久、几点回到课上
      const label = breakLabel(liveBk.minutes, liveBk.start, liveBk.end);
      const nx = slots[liveBk.toIndex];
      main = `<span class="sb-dot pulse" style="--c:${nx.it.col}"></span><span class="sb-k">${label}</span><span class="sb-n">${esc(nx.it.ev.name)}</span><span class="sb-t">${fromMin(nx.start)} · ${fmtGap(liveBk.minutes, true)}</span>`;
    } else if (live) {
      const left = Math.max(0, Math.round((live.endAt - now) / 60000));
      const nb = nextBreakFor(brks, slots, live, nowMin);
      const tail = nb
        ? `${fromMin(nb.start)} ${breakLabel(nb.minutes, nb.start, nb.end)} ${fmtGap(nb.minutes, true)}`
        : `剩 ${left} 分`;
      main = `<span class="sb-dot pulse" style="--c:${live.col}"></span><span class="sb-k">正在上</span><span class="sb-n">${esc(live.ev.name)}</span><span class="sb-t">${tail}</span>`;
    } else if (next) {
      const m = Math.max(0, Math.round((next.startAt - now) / 60000));
      main = `<span class="sb-dot" style="--c:${next.col}"></span><span class="sb-k">接下来</span><span class="sb-n">${esc(next.ev.name)}</span><span class="sb-t">${next.p1t.start} · ${m <= 0 ? "马上" : m + " 分后"}</span>`;
    } else {
      main = `<span class="sb-k">今天</span><span class="sb-n">课都上完啦</span><span class="sb-t">共 ${items.length} 节</span>`;
    }
    const list = items.map((it) => {
      const st = now >= it.endAt ? "done" : now >= it.startAt ? "live" : it.startAt <= (next ? next.startAt : Infinity) && it.startAt > now ? "next" : "";
      return `<div class="sb-row ${st}"><span class="sb-time">${it.p1t.start}</span><span class="sb-rm" style="--c:${it.col}"></span><span class="sb-nm">${esc(it.ev.name)}</span><span class="sb-loc">${esc(it.ev.room || "")}</span></div>`;
    }).join("");

    el.className = "summary" + (sumOpen ? " open" : "") + " on";
    el.innerHTML =
      `<button class="sum-bar" id="sumToggle">${main}<span class="sb-chev">&#8250;</span></button>
       <div class="sum-more"><div class="sb-row head"><span class="sb-time">时间</span><span class="sb-nm">今天 · 共 ${items.length} 节</span></div>${list}</div>`;
    el.querySelector("#sumToggle").onclick = () => { sumOpen = !sumOpen; el.classList.toggle("open", sumOpen); };
  }

  /* ---------- week nav ---------- */
  function renderWeekBar() {
    const w = state.week;
    $("#weekLabel").innerHTML = `第 ${w} 周` + (w === weekOf(nowD()) ? ' <span class="now-tag">本周</span>' : "");
    const a = weekStart(w), b = addDays(a, 6);
    $("#weekRange").textContent = `${a.getMonth() + 1}/${a.getDate()} – ${b.getMonth() + 1}/${b.getDate()}`;
    const bar = $("#weekProgBar");
    if (bar) bar.style.width = Math.round((w / TOTAL_WEEKS) * 100) + "%";
    $("#prevWeek").disabled = w <= 1;
    $("#nextWeek").disabled = w >= TOTAL_WEEKS;
  }

  /* ---------- day tabs ---------- */
  function renderDayTabs() {
    const box = $("#dayTabs");
    const today = nowD();
    const days = settings.showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
    // 复用的滑动指示块（保持在首位，不随重建丢失，保证平滑过渡）
    let ind = box.querySelector(".dt-ind");
    if (!ind) { ind = document.createElement("span"); ind.className = "dt-ind"; }
    let tabs = Array.from(box.querySelectorAll(".daytab"));
    tabs.slice(days.length).forEach((t) => t.remove());
    days.forEach((d, i) => {
      let el = tabs[i];
      if (!el) {
        el = document.createElement("button");
        el.className = "daytab";
        // 节点只建一次：每次重建 innerHTML 会让颜色过渡失效（新节点没有"上一状态"）
        el.innerHTML = '<span class="d"></span><span class="n"></span><span class="pip"></span>';
        box.appendChild(el);
      }
      const date = dateOf(state.week, d);
      el.classList.toggle("today", weekday(today) === d && weekOf(today) === state.week);
      el.classList.toggle("active", state.day === d);
      const evs = eventsForDate(date, state.week);
      el.querySelector(".d").textContent = `周${DAY_CN[d - 1]}`;
      el.querySelector(".n").textContent = date.getDate();
      el.querySelector(".pip").classList.toggle("hidden", !evs.length);
      el.onclick = () => { state.day = d; renderAll(); if (state.view === "week") scrollToDay(d); };
    });
    if (box.firstChild !== ind) box.insertBefore(ind, box.firstChild);
  }
  function positionDayInd(animate) {
    const box = $("#dayTabs"); const ind = box.querySelector(".dt-ind"); const act = box.querySelector(".daytab.active");
    if (!ind) return;
    if (!act || !act.offsetWidth) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "1";
    slideIndicator(ind, act.offsetLeft, act.offsetWidth, animate);
  }

  /* ---------- day view ---------- */
  function renderDay() {
    const box = $("#dayView");
    const date = dateOf(state.week, state.day);
    const evs = eventsForDate(date, state.week);
    const isToday = dayDiff(date, nowD()) === 0;
    const hkey = ymd(date);
    const hname = holidayName(hkey);
    const mk = settings.builtinHolidays === false ? null : CN.makeup[hkey];
    const mkName = mk ? String(mk).replace("调休", "") : "";
    const holiEl = hname ? holiBanner(hname) : mk ? makeupBanner(mk) : null;
    const swapEl = hname ? holidaySwapCard(hkey) : null;
    // 记下当前进度条宽度：30 秒自动刷新时让它接着长，而不是从 0 重播
    const prevBar = box.querySelector(".lesson.now .progress i");
    const prevProgress = prevBar ? (prevBar.style.getPropertyValue("--p") || "") : "";
    const prependHead = () => {
      const frag = document.createDocumentFragment();
      if (holiEl) frag.appendChild(holiEl);
      if (swapEl) frag.appendChild(swapEl);
      if (frag.childNodes.length) box.insertBefore(frag, box.firstChild);
    };
    box.innerHTML = "";
    if (!evs.length) {
      const line = hname ? hname + " · 放假啦" : isToday ? pick(EMPTY_TODAY, hkey + "t") : pick(EMPTY_DAY, hkey);
      box.innerHTML = `<div class="empty"><div class="big">&#8212;</div><div class="et">${line}</div><div class="es">${date.getMonth() + 1} 月 ${date.getDate()} 日 · 周${DAY_CN[state.day - 1]}${isToday ? " · 今天" : ""}</div></div>`;
      prependHead();
      return;
    }
    const now = nowD();
    const isTodayDate = dayDiff(date, now) === 0;

    // 计算每节的起止时间与状态
    const items = evs.map((ev) => {
      const p1t = perAt(ev.p1), p2t = perAt(ev.p2);
      const end = p2t ? p2t.end : p1t.end;
      const startAt = parseTimeOn(date, p1t.start);
      const endAt = parseTimeOn(date, end);
      return { ev, p1t, end, startAt, endAt };
    // 按时间排：课程库的顺序不代表一天的先后（后添加的早课会排在最后）
    }).sort((a, b) => a.startAt - b.startAt);
    const nextItem = isTodayDate ? items.find((it) => !it.ev.cancelled && it.startAt > now) : null;
    const conflicts = findConflicts(items.filter((it) => !it.ev.cancelled).map((it) => ({ key: it.ev.key, p1: it.ev.p1, p2: it.ev.p2 })));

    // 课间：按"节"算空档。同一门课的节间空档留在卡内，跨课的空档插在卡与卡之间
    const slots = daySlots(items);
    const brks = findBreaks(slots, 2);
    const brkAfter = new Map();
    const brkIn = new Map();
    brks.forEach((bk) => {
      const from = slots[bk.fromIndex], to = slots[bk.toIndex];
      if (from.it === to.it) {
        if (!brkIn.has(from.it)) brkIn.set(from.it, []);
        brkIn.get(from.it).push(bk);
      } else {
        brkAfter.set(from.it, { bk: bk, nextIt: to.it });
      }
    });
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let insertedNowLine = false;
    let pendingBrk = null;   // 上一张卡之后要插的课间标尺（等下一轮再插，好安排「现在」的位置）
    const addNowLine = () => {
      insertedNowLine = true;
      const hh = pad(now.getHours()), mm = pad(now.getMinutes());
      const el = document.createElement("div");
      el.className = "nowline";
      el.innerHTML = `<span class="t">现在 ${hh}:${mm}</span><span class="dot"></span><span class="line"></span>`;
      box.appendChild(el);
    };

    const SEC = (p1) => (p1 <= 5 ? "morning" : p1 <= 10 ? "afternoon" : "evening");
    const SEC_LABEL = { morning: "早晨", afternoon: "午后", evening: "夜晚" };
    const secRange = (k) => { const L = PERIODS.length, g = (i) => PERIODS[Math.min(i, L - 1)]; return k === "morning" ? [PERIODS[0], g(4)] : k === "afternoon" ? [g(5), g(9)] : [g(10), g(L - 1)]; };
    const addSection = (k) => {
      const [a, b] = secRange(k);
      const el = document.createElement("div");
      el.className = "day-sec";
      el.innerHTML = `<span class="ds-label">${SEC_LABEL[k]}</span><span class="ds-range">${a.start} - ${b.end}</span><span class="ds-line"></span>`;
      box.appendChild(el);
    };
    let lastSec = "";

    items.forEach((it, idx) => {
      const { ev, p1t, end, startAt, endAt } = it;
      const sec = SEC(ev.p1);
      // 上一张卡之后的课间标尺：等这一轮再插，好把「现在」时间线放对位置
      const pend = pendingBrk; pendingBrk = null;
      const pendLive = !!pend && isTodayDate && nowMin >= pend.bk.start && nowMin < pend.bk.end;
      // 「现在」时间线：位置就是时间。不在课间里时排在标尺前面，正在课间里时排在它后面
      const wantNowLine = isTodayDate && !insertedNowLine && startAt > now;
      if (wantNowLine && !pendLive) addNowLine();
      if (pend) box.appendChild(breakRow(pend.bk, pend.nextIt, isTodayDate, now));
      if (wantNowLine && pendLive) addNowLine();
      if (sec !== lastSec) { addSection(sec); lastSec = sec; }

      const col = ev.color || colorOf(ev.courseId, ev.name);
      const card = document.createElement("div");
      card.className = "lesson";
      card.style.setProperty("--c", col);
      card.style.setProperty("--ct", textOn(col));
      if (quietRender) card.classList.add("no-anim"); else card.style.animationDelay = (idx * 40) + "ms";
      const isCancelled = !!ev.cancelled;
      const isNow = !isCancelled && isTodayDate && now >= startAt && now < endAt;
      const isDone = !isCancelled && isTodayDate && now >= endAt;
      const isNext = !isCancelled && nextItem === it;

      let tag = "";
      if (isCancelled) tag = '<span class="tag cancel">本次不上</span>';
      else if (ev.kind === "moved") tag = '<span class="tag move">已调整</span>';
      else if (ev.kind === "custom") tag = '<span class="tag custom">自定义</span>';

      let chip = "";
      if (isNext) {
        const inMin = Math.max(0, Math.round((startAt - now) / 60000));
        chip = `<span class="chip">${inMin <= 1 ? "即将开始" : inMin + " 分钟后"}</span>`;
      }

      const isConflict = !isCancelled && conflicts.has(ev.key);
      if (isConflict) card.classList.add("conflict");
      if (isCancelled) card.classList.add("cancelled");
      else if (isNow) card.classList.add("now");
      else if (isDone) card.classList.add("done");
      else if (isNext) card.classList.add("next");
      if (tag || chip) card.classList.add("has-tag");

      let live = "";
      if (isNow) {
        const left = Math.max(0, Math.round((endAt - now) / 60000));
        live = `<div class="live"><span class="pulse"></span>进行中 · 还剩 ${left} 分钟</div>`;
      }
      // 连排课（第 1-4 节这种）：把节与节之间的课间列出来
      const inList = brkIn.get(it) || [];
      const bkText = (b) => `${fromMin(b.start)} ${breakLabel(b.minutes, b.start, b.end)} ${fmtGap(b.minutes, true)}`;
      const wbk = inList.length
        ? `<div class="wbk"${inList.length > 4 ? ` title="${esc(inList.map(bkText).join(" · "))}"` : ""}>` +
          inList.slice(0, 4).map((b) => `<span class="wbk-i">${bkText(b)}</span>`).join('<span class="wbk-s">·</span>') +
          `${inList.length > 4 ? '<span class="wbk-s">…</span>' : ""}</div>`
        : "";
      // 正在上这节：顺手把"下一个课间什么时候、多久"写在下面（课内课间优先）
      let brkLine = "";
      const nextBk = isNow ? nextBreakFor(brks, slots, it, nowMin) : null;
      if (nextBk) {
        const p = bkPoints(nextBk, nowMin);
        brkLine = p.live
          ? `<div class="bk live"><span class="brk-dot"></span>${p.label} · 还剩 ${fmtGap(p.left, true)} · ${fromMin(nextBk.end)} 上课</div>`
          : `<div class="bk">${p.label} ${fromMin(nextBk.start)} – ${fromMin(nextBk.end)} · ${fmtGap(nextBk.minutes)}</div>`;
      }

      let progress = "";
      if (isNow) {
        const pct = Math.min(100, Math.max(0, ((now - startAt) / (endAt - startAt)) * 100)).toFixed(1);
        progress = quietRender
          ? `<div class="progress"><i style="--p:${prevProgress || pct + "%"}"></i></div>`
          : `<div class="progress"><i class="grow" style="--p:${pct}%"></i></div>`;
      }

      card.innerHTML =
        `<div class="bar"></div>${tag}${chip}${progress}
         <div class="time">
           <div class="t1">${p1t.start}</div>
           <div class="t2">${end}</div>
           <div class="sec">第 ${ev.p1}${ev.p2 > ev.p1 ? "-" + ev.p2 : ""} 节</div>
         </div>
         <div class="info">
           <div class="name">${esc(ev.name)}</div>
           <div class="meta">
             ${ev.room ? `<span>${I.loc}${esc(ev.room)}</span>` : ""}
             ${ev.teacher ? `<span>${I.user}${esc(ev.teacher)}</span>` : ""}
             ${isConflict ? '<span class="cf">时间冲突</span>' : ""}
           </div>
           ${live || (ev.kind !== "custom"
              ? `<div class="wk">${fmtWeeks(ev.weeks, ev.parity)}${ev.note ? " · " + esc(ev.note) : ""}</div>`
              : (ev.note ? `<div class="wk">${esc(ev.note)}</div>` : ""))}
           ${brkLine}
           ${wbk}
         </div>`;
      card.onclick = () => openDetail(ev);
      box.appendChild(card);
      if (brkAfter.has(it)) pendingBrk = brkAfter.get(it);
      if (isNow && quietRender && prevProgress) {
        const bar = card.querySelector(".progress i");
        const target = Math.min(100, Math.max(0, ((now - startAt) / (endAt - startAt)) * 100)).toFixed(1) + "%";
        // 用 --p 驱动 scaleX：合成层，不触发布局（原来动 width 每帧都要重排）
        if (bar) requestAnimationFrame(() => { bar.style.setProperty("--p", target); });
      }
    });
    if (isTodayDate && !insertedNowLine) addNowLine();
    prependHead();
    // 今天有课且已全部结束 → 触发一次庆祝
    if (isTodayDate) {
      const active = items.filter((it) => !it.ev.cancelled);
      const lastEnd2 = active.reduce((m, it) => Math.max(m, it.endAt), 0);
      if (active.length && lastEnd2 > 0 && now >= lastEnd2) celebrate(ymd(date));
    }
  }
  function holiBanner(name) {
    const st = holidayStyle(name);
    const el = document.createElement("div");
    el.className = "holi-banner";
    el.style.setProperty("--hc", st.c);
    el.innerHTML = `<span class="hb-ic">&#9733;</span><span class="hb-name">${esc(name)}</span><span class="hb-bless">${esc(st.t)}</span>`;
    return el;
  }
  function makeupBanner(mk) {
    const el = document.createElement("div");
    el.className = "holi-banner makeup";
    el.innerHTML = `<span class="hb-ic">&#8635;</span><span class="hb-name">${esc(String(mk))}</span><span class="hb-bless">今天照常，按调休安排 · 可能补课</span>`;
    return el;
  }
  function nearestMakeup(fromKey) {
    const from = parseYmd(fromKey);
    let best = null, bd = 1e9;
    Object.keys(CN.makeup).forEach((k) => {
      const d = dayDiff(parseYmd(k), from);
      if (d >= -3 && d < bd) { bd = d; best = k; }
    });
    return best || ymd(addDays(from, 1));
  }
  // 该天原本的课表（忽略调休/调课，用于节假日搬迁）
  function baseEventsForDate(from) {
    const w = weekOf(from), out = [];
    for (const c of allCourses()) {
      for (const s of courseSessions(c)) {
        if (!inWeeks(s, w)) continue;
        if (s.day !== weekday(from)) continue;
        out.push(occFromCourse(c, s, from, "normal", null));
      }
    }
    return out;
  }
  // 节假日：不直接删课，提示“批量把这一天原本的课挪到某天（调休）”
  function holidaySwapCard(fromKey) {
    const from = parseYmd(fromKey);
    const base = baseEventsForDate(from);
    if (!base.length) return null;
    const moves = overrides.filter((o) => o.type === "move" && o.date === fromKey);
    const cancels = overrides.filter((o) => o.type === "cancel" && o.date === fromKey);
    const el = document.createElement("div");
    const undoAll = (msg) => {
      overrides = overrides.filter((o) => !((o.type === "move" || o.type === "cancel") && o.date === fromKey));
      saveOverrides(); renderAll(); toast(msg);
    };
    if (moves.length >= base.length) {
      el.className = "holi-swap done";
      el.innerHTML =
        `<div class="hs-txt">已把 <b>${base.length}</b> 节课安排到 ${[...new Set(moves.map((o) => o.toDate))].map(esc).join("、")}</div>` +
        `<button class="btn ghost" id="hsUndo">撤销</button>`;
      el.querySelector("#hsUndo").onclick = () => undoAll("已撤销");
    } else if (cancels.length >= base.length) {
      el.className = "holi-swap done";
      el.innerHTML =
        `<div class="hs-txt">已取消当天 <b>${base.length}</b> 节课（不调休）</div>` +
        `<button class="btn ghost" id="hsUndo">撤销</button>`;
      el.querySelector("#hsUndo").onclick = () => undoAll("已撤销");
    } else {
      const def = nearestMakeup(fromKey);
      el.className = "holi-swap";
      el.innerHTML =
        `<div class="hs-txt">周${DAY_CN[weekday(from) - 1]}本有 <b>${base.length}</b> 节课</div>` +
        `<div class="hs-row"><input type="date" id="hsDate" value="${def}"><button class="btn primary" id="hsGo">批量搬迁到这天</button></div>` +
        `<button class="btn ghost row" id="hsCancel">不调休 · 直接取消课程</button>` +
        `<div class="hs-hint">「批量搬迁」把这些课挪到所选日期；「取消课程」则像放假一样直接不上。</div>`;
      el.querySelector("#hsGo").onclick = () => {
        const to = el.querySelector("#hsDate").value;
        if (!to) { toast("请选择日期", "warn"); return; }
        batchMoveDay(fromKey, to);
      };
      el.querySelector("#hsCancel").onclick = () => cancelBatchDay(fromKey);
    }
    return el;
  }
  function cancelBatchDay(fromKey) {
    const base = baseEventsForDate(parseYmd(fromKey));
    let n = 0;
    base.forEach((ev) => {
      if (!overrides.find((o) => o.type === "cancel" && o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === fromKey)) {
        overrides.push({ id: uid(), type: "cancel", courseId: ev.courseId, si: ev.si, date: fromKey });
      }
      n++;
    });
    saveOverrides(); buzz(12); renderAll();
    toast(`已取消当天 ${n} 节课 · 记得同步日历`, "ok");
  }
  function batchMoveDay(fromKey, toKey) {
    const base = baseEventsForDate(parseYmd(fromKey));
    let n = 0;
    base.forEach((ev) => {
      const exist = overrides.find((o) => o.type === "move" && o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === fromKey);
      if (exist) Object.assign(exist, { toDate: toKey, p1: ev.p1, p2: ev.p2 });
      else overrides.push({ id: uid(), type: "move", courseId: ev.courseId, si: ev.si, date: fromKey, toDate: toKey, p1: ev.p1, p2: ev.p2, room: ev.room, note: ev.note || "" });
      n++;
    });
    saveOverrides(); buzz(14); renderAll();
    toast(`已把 ${n} 节课挪到 ${toKey} · 记得同步日历`, "ok");
  }

  function parseTimeOn(date, hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
  }
  // 一天的分钟数 ↔ "HH:MM"，课间是"两个时刻之间的空"和日期无关，用分钟算最省事
  const toMin = (hhmm) => { const p = String(hhmm).split(":"); return Number(p[0]) * 60 + (Number(p[1]) || 0); };
  const fromMin = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);

  /* ---------- 课间（空档）：把"课与课之间的空"画出来 ---------- */
  // 一天的"占用片段"：一门连排（第 1-4 节）会拆成 4 段，
  // 于是"课与课之间的空"和"同一门课节与节之间的空"用同一套算法算出来。
  // 已取消的课不占时间，所以不参与计算。
  function daySlots(items) {
    const out = [];
    items.forEach((it) => {
      if (it.ev.cancelled) return;
      const last = Math.max(it.ev.p1, it.ev.p2 || it.ev.p1);
      for (let p = it.ev.p1; p <= last; p++) {
        const t = perAt(p);
        out.push({ start: toMin(t.start), end: toMin(t.end), it: it, period: p });
      }
    });
    return out.sort((a, b) => a.start - b.start);
  }
  // 这门课接下来最近的一个课间：先看课内（节与节之间），再看课后
  function nextBreakFor(brks, slots, it, nowMin) {
    for (let i = 0; i < brks.length; i++) {
      const b = brks[i];
      if (slots[b.fromIndex].it !== it) continue;
      if (nowMin < b.end) return b;
    }
    return null;
  }
  const bkPoints = (brk, nowMin) => ({
    label: breakLabel(brk.minutes, brk.start, brk.end),
    live: nowMin >= brk.start && nowMin < brk.end,
    left: Math.max(0, brk.end - nowMin),
  });
  // 课间标尺：一条细线 + 居中的时长；正处在课间里时整行点亮并倒数
  function breakRow(bk, nextIt, isTodayDate, now) {
    const label = breakLabel(bk.minutes, bk.start, bk.end);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const live = isTodayDate && nowMin >= bk.start && nowMin < bk.end;
    const el = document.createElement("div");
    el.className = "brk" + (live ? " live" : "");
    const left = live ? Math.max(0, bk.end - nowMin) : 0;
    el.innerHTML = live
      ? `<span class="brk-dot"></span><span class="brk-t">${label} · 还剩 ${fmtGap(left, true)}${nextIt ? " · " + nextIt.p1t.start + " 上课" : ""}</span>`
      : `<span class="brk-t">${label} ${fmtGap(bk.minutes)}</span>`;
    return el;
  }

  /* ---------- week view ---------- */
  function renderWeek() {
    const box = $("#weekView");
    const today = nowD();
    const days = settings.showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
    let html = '<div class="gridwrap"><div class="grid">';
    html += '<div class="gh"></div>';
    let todayIdx = -1;
    days.forEach((d, di) => {
      const date = dateOf(state.week, d);
      const isToday = dayDiff(date, today) === 0;
      if (isToday) todayIdx = di;
      html += `<div class="gh ${isToday ? "today" : ""}" data-day="${d}" style="grid-column:${di + 2}">周${DAY_CN[d - 1]}<small>${date.getMonth() + 1}/${date.getDate()}</small></div>`;
    });
    for (let p = 1; p <= PERIODS.length; p++) {
      const t = PERIODS[p - 1];
      html += `<div class="gtime" style="grid-row:${p + 1}"><b>${t.start}</b></div>`;
      days.forEach((d, di) => {
        html += `<div class="cell" data-day="${d}" data-p="${p}" style="grid-row:${p + 1};grid-column:${di + 2}"></div>`;
      });
    }
    if (todayIdx >= 0) html += `<div class="colnow" style="grid-row:2 / span ${PERIODS.length};grid-column:${todayIdx + 2}"></div>`;
    // blocks
    days.forEach((d, di) => {
      const date = dateOf(state.week, d);
      const isToday = dayDiff(date, today) === 0;
      const evs = eventsForDate(date, state.week);
      const dayConfs = findConflicts(evs.filter((e) => !e.cancelled).map((e) => ({ key: e.key, p1: e.p1, p2: e.p2 })));
      evs.forEach((ev, bi) => {
        const col = ev.color || colorOf(ev.courseId, ev.name);
        const rows = p2row(ev.p1, ev.p2);
        const p1t = perAt(ev.p1), p2t = perAt(ev.p2);
        const end = p2t ? p2t.end : p1t.end;
        const startAt = parseTimeOn(date, p1t.start), endAt = parseTimeOn(date, end);
        const isNow = isToday && !ev.cancelled && today >= startAt && today < endAt;
        const isDone = isToday && !ev.cancelled && today >= endAt;
        let cls = ev.kind === "moved" ? "moved" : ev.kind === "custom" ? "custom" : "";
        if (ev.cancelled) cls += " cancelled";
        else if (dayConfs.has(ev.key)) cls += " conflict";
        if (isNow) cls += " now";
        else if (isDone) cls += " done";
        const delay = (di * 40 + bi * 55) + "ms";
        html += `<div class="blk ${cls}" data-day="${d}" data-key="${esc(ev.key)}" title="${esc(ev.name)}"
          style="grid-row:${rows};grid-column:${di + 2};--c:${col};--ct:${textOn(col)};animation-delay:${delay}">
          <div class="n">${esc(ev.name.replace(/（.*?）/, ""))}</div>
          <div class="r">${isNow ? "● 进行中" : esc(ev.room || "")}</div></div>`;
      });
    });
    html += "</div></div>";
    box.innerHTML = html;
    alignDayLeft(state.day); // 先同步对齐，避免动画结束后再“补”一次移动
    requestAnimationFrame(() => alignDayLeft(state.day)); // 布局/字体就绪后再校正一次
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alignDayLeft(state.day)).catch(() => {});
    box.querySelectorAll(".blk").forEach((b) => {
      b.onclick = () => {
        const date = dateOf(state.week, +b.dataset.day);
        const ev = eventsForDate(date, state.week).find((e) => e.key === b.dataset.key);
        if (ev) openDetail(ev);
      };
    });
    wireWeekDrag(box);
  }
  function p2row(p1, p2) { return `${p1 + 1} / ${p2 + 2}`; }
  function scrollToDay(d) { alignDayLeft(d); }

  /* ---------- 周视图：长按拖拽调课 ---------- */
  let _wkSuppress = false;
  function wireWeekDrag(box) {
    const gridwrap = box.querySelector(".gridwrap");
    if (!gridwrap) return;
    box.addEventListener("click", (e) => { if (_wkSuppress) { e.stopPropagation(); e.preventDefault(); _wkSuppress = false; } }, true);
    gridwrap.addEventListener("contextmenu", (e) => e.preventDefault());
    box.querySelectorAll(".blk").forEach((blk) => {
      let timer = null, dragging = false, ghost = null, ev = null, target = null, sx = 0, sy = 0, pid = null, lastX = 0, raf = null;
      const getEv = () => eventsForDate(dateOf(state.week, +blk.dataset.day), state.week).find((e) => e.key === blk.dataset.key);
      const autoScroll = () => {
        if (!dragging) { raf = null; return; }
        const r = gridwrap.getBoundingClientRect(), w = r.width, zone = w * 0.34;
        const max = gridwrap.scrollWidth - gridwrap.clientWidth;
        let v = 0;
        if (lastX < r.left + zone) v = -((r.left + zone - lastX) / zone) * 24; // 向左拖 → 向左滚
        else if (lastX > r.right - zone) v = ((lastX - (r.right - zone)) / zone) * 24; // 向右拖 → 向右滚
        if (v) gridwrap.scrollLeft = Math.min(max, Math.max(0, gridwrap.scrollLeft + v));
        raf = requestAnimationFrame(autoScroll);
      };
      const cleanup = () => {
        if (ghost) { ghost.remove(); ghost = null; }
        blk.classList.remove("dragging");
        gridwrap.classList.remove("dragging-grid");
        if (target) { target.classList.remove("drop-target"); target = null; }
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        dragging = false;
      };
      const enter = () => {
        ev = getEv(); if (!ev) return;
        dragging = true;
        try { if (pid != null) blk.setPointerCapture(pid); } catch (err) {}
        blk.classList.add("dragging");
        gridwrap.classList.add("dragging-grid");
        ghost = blk.cloneNode(true);
        ghost.classList.add("drag-ghost");
        ghost.style.width = blk.offsetWidth + "px";
        ghost.style.height = blk.offsetHeight + "px";
        ghost.style.left = sx + "px"; ghost.style.top = sy + "px";
        document.body.appendChild(ghost);
        lastX = sx;
        if (!raf) raf = requestAnimationFrame(autoScroll);
        buzz(12);
      };
      const onMove = (e) => {
        if (pid != null && e.pointerId !== pid) return;
        if (!dragging) { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(timer); return; }
        e.preventDefault(); // 阻止原生滚动/回弹，避免左右震动
        lastX = e.clientX;
        if (ghost) { ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px"; }
        let cell = null;
        gridwrap.querySelectorAll(".cell").forEach((c) => {
          const r = c.getBoundingClientRect();
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) cell = c;
        });
        if (target && target !== cell) target.classList.remove("drop-target");
        target = cell;
        if (target) target.classList.add("drop-target");
      };
      const onUp = (e) => {
        if (pid != null && e.pointerId !== pid) return;
        clearTimeout(timer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        if (!dragging) return;
        const cell = target;
        cleanup();
        _wkSuppress = true;
        if (cell && ev) applyDrop(ev, +cell.dataset.day, +cell.dataset.p);
      };
      blk.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        sx = e.clientX; sy = e.clientY; pid = e.pointerId;
        clearTimeout(timer); timer = setTimeout(enter, 340);
        window.addEventListener("pointermove", onMove, { passive: false });
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
    });
  }
  function applyDrop(ev, tDay, tP) {
    const len = Math.max(1, ev.p2 - ev.p1 + 1);
    const p1 = Math.min(Math.max(1, tP), Math.max(1, PERIODS.length - len + 1));
    const p2 = Math.min(PERIODS.length, p1 + len - 1);
    const toDate = ymd(dateOf(state.week, tDay));
    if (ev.kind === "custom") {
      const ov = overrides.find((o) => o.id === ev.id);
      if (ov) { ov.date = toDate; ov.p1 = p1; ov.p2 = p2; saveOverrides(); }
    } else {
      const exist = overrides.find((o) => o.type === "move" && o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === ev.origDate);
      if (exist) Object.assign(exist, { toDate, p1, p2, room: ev.room, note: ev.note || "" });
      else overrides.push({ id: uid(), type: "move", courseId: ev.courseId, si: ev.si, date: ev.origDate, toDate, p1, p2, room: ev.room, note: ev.note || "" });
      saveOverrides();
    }
    buzz(18); renderAll();
    toast(`已移动到 周${DAY_CN[tDay - 1]} 第 ${p1}${p2 > p1 ? "-" + p2 : ""} 节 · 记得同步日历`);
  }
  function ensureDayVisible(d) {
    const gw = document.querySelector(".gridwrap");
    if (!gw) return;
    const gh = gw.querySelector('.gh[data-day="' + d + '"]');
    if (!gh) return;
    const gwR = gw.getBoundingClientRect(), r = gh.getBoundingClientRect();
    const gutter = 36;
    if (r.left < gwR.left + gutter) gw.scrollLeft -= (gwR.left + gutter - r.left);
    else if (r.right > gwR.right - 4) gw.scrollLeft += (r.right - gwR.right + 4);
  }

  /* ---------- render ---------- */
  let lastView = null;
  function positionIndicator(animate) {
    const sw = $("#viewSwitch"); const ind = sw.querySelector(".ind"); const act = sw.querySelector("button.active");
    if (!ind || !act) return;
    slideIndicator(ind, act.offsetLeft - 3, act.offsetWidth, animate);
  }
  let lastRender = { day: null, week: null };
  let _suppressSlide = false;
  function renderAll() {
    renderWeekBar(); renderDayTabs(); renderSummary();
    const changed = lastView && lastView !== state.view;
    lastView = state.view;
    // 切换方向（日/周）
    let dir = 0;
    if (lastRender.day != null) {
      if (state.day !== lastRender.day && state.week === lastRender.week) dir = state.day > lastRender.day ? 1 : -1;
      else if (state.week !== lastRender.week) dir = state.week > lastRender.week ? 1 : -1;
    }
    const prevWeek = lastRender.week;
    lastRender.day = state.day; lastRender.week = state.week;
    const navAnim = dir !== 0 && !quietRender && !_suppressSlide;
    if (navAnim) quietRender = true; // 用容器滑动代替逐卡入场，避免叠加

    $("#dayTabs").classList.toggle("hidden", state.view === "week");
    if (state.view === "day") { renderDay(); $("#dayView").classList.remove("hidden"); $("#weekView").classList.add("hidden"); }
    else { renderWeek(); $("#weekView").classList.remove("hidden"); $("#dayView").classList.add("hidden"); }
    quietRender = false;

    $$("#viewSwitch button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
    const shown = state.view === "day" ? $("#dayView") : $("#weekView");
    shown.classList.remove("view-anim", "slide-r", "slide-l");
    void shown.offsetWidth;
    if (changed) shown.classList.add("view-anim");
    else if (navAnim) shown.classList.add(dir > 0 ? "slide-r" : "slide-l");
    requestAnimationFrame(() => { positionIndicator(); positionDayInd(); });
    try { const u = `?w=${state.week}&d=${state.day}&view=${state.view}`; if (location.search !== u) history.replaceState(null, "", u); } catch (e) {}
  }
  // 把某天列滚到最左侧（紧贴时间栏右侧），其后依次是接下来几天
  function alignDayLeft(day) {
    const box = $("#weekView");
    const gw = box.querySelector(".gridwrap"); if (!gw) return;
    const gh = box.querySelector('.gh[data-day="' + day + '"]'); if (!gh) return;
    const gwR = gw.getBoundingClientRect(), ghR = gh.getBoundingClientRect();
    const contentLeft = (ghR.left - gwR.left) + gw.scrollLeft;
    const gt = box.querySelector(".gtime");
    const gutter = gt ? gt.offsetWidth : 38;
    gw.scrollLeft = Math.max(0, Math.round(contentLeft - gutter));
  }

  /* ---------- 课程详情：居中「电影票」弹层（两列信息 + 内置操作） ---------- */
  function openDetail(ev) {
    const c = allCourses().find((x) => x.id === ev.courseId);
    const p1t = perAt(ev.p1), p2t = perAt(ev.p2);
    const d = ev.date, end = p2t ? p2t.end : p1t.end;
    const cls = (ev.name.match(/（(.*?)）/) || [])[1] || "";
    const col = ev.color || colorOf(ev.courseId, ev.name);
    const st = ev.cancelled ? ["本次不上", "c-cancel"] : ev.kind === "moved" ? ["已调整", "c-move"] : ev.kind === "custom" ? ["自定义", "c-custom"] : ["正常", "c-ok"];
    const startAt = parseTimeOn(d, p1t.start), endAt = parseTimeOn(d, end);
    const now = nowD(), isToday = dayDiff(d, now) === 0;
    const durMin = Math.round((endAt - startAt) / 60000);
    const dayEvs = eventsForDate(d, weekOf(d)).filter((e) => !e.cancelled)
      .map((e) => ({ e, s: parseTimeOn(d, perAt(e.p1).start) })).sort((a, b) => a.s - b.s);
    const idx = dayEvs.findIndex((x) => x.e.key === ev.key) + 1;
    const cellsList = [
      `<div class="tk2-cell"><span class="tk2-k">状态</span><span class="tk2-v"><span class="tk-status ${st[1]}">${st[0]}</span></span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">本日</span><span class="tk2-v">${idx ? `第 ${idx} / ${dayEvs.length} 节` : "—"}</span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">日期</span><span class="tk2-v">${d.getMonth() + 1}月${d.getDate()}日 周${DAY_CN[weekday(d) - 1]}</span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">时间</span><span class="tk2-v">${p1t.start}–${end}</span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">节次</span><span class="tk2-v">第 ${ev.p1}${ev.p2 > ev.p1 ? "-" + ev.p2 : ""} 节</span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">时长</span><span class="tk2-v">${durMin} 分钟</span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">地点</span><span class="tk2-v">${esc(ev.room || "—")}</span></div>`,
      `<div class="tk2-cell"><span class="tk2-k">教师</span><span class="tk2-v">${esc(ev.teacher || "—")}</span></div>`,
    ];
    if (ev.note) cellsList.push(`<div class="tk2-cell"><span class="tk2-k">备注</span><span class="tk2-v">${esc(ev.note)}</span></div>`);
    if (cellsList.length % 2) cellsList.push(`<div class="tk2-cell blank"></div>`);
    const cells = cellsList.join("");
    const sub = ((cls ? cls + " · " : "") + (ev.kind !== "custom" ? fmtWeeks(ev.weeks, ev.parity) : "仅一次")).trim();

    const acts = [];
    if (ev.kind === "custom") {
      acts.push(btn(I.edit, "编辑事件", "primary dark", "editCustom"));
      acts.push(btn(I.trash, "删除事件", "danger", "del"));
    } else if (ev.cancelled) {
      acts.push(btn(I.undo, "恢复本次课", "primary", "uncancel"));
      acts.push(btn(I.swap, "调课 / 临时调整", "ghost", "editOcc"));
      if (ev.kind === "moved") acts.push(btn(I.undo, "取消调课", "danger", "reset"));
    } else {
      acts.push(btn(I.swap, "调课 / 临时调整", "primary dark", "editOcc"));
      acts.push(btn(I.bell, "上课提醒", "ghost", "remind"));
      acts.push(btn(I.close, "本次课不上", "danger", "cancelOnce"));
      if (isUserCourse(ev.courseId)) {
        acts.push(btn(I.edit, "编辑这门课", "ghost", "editCourse"));
        acts.push(btn(I.trash, "删除这门课", "danger", "delCourse"));
      }
    }

    // 调课：原定 / 调整后 聚在一起（紧凑），并带上「取消调课」
    let movedBlock = "";
    if (ev.kind === "moved" && !ev.cancelled && c) {
      const s0 = courseSessions(c)[ev.si] || {};
      movedBlock =
        `<div class="tk2-moved">
           <div class="mv-line"><span class="mv-k">原定</span><span class="mv-v old">周${DAY_CN[(s0.day || 1) - 1]} · 第 ${s0.p1}${s0.p2 > s0.p1 ? "-" + s0.p2 : ""} 节 · ${esc(s0.room || "—")}</span></div>
           <div class="mv-line now"><span class="mv-k">调整后</span><span class="mv-v">周${DAY_CN[weekday(d) - 1]} · 第 ${ev.p1}${ev.p2 > ev.p1 ? "-" + ev.p2 : ""} 节 · ${esc(ev.room || "—")}</span></div>
           <button class="mv-cancel" data-act="reset">${I.undo}<span>取消调课</span></button>
         </div>`;
    }
    const sessList = c ? courseSessions(c) : [];
    const sessLine = sessList.length > 1 ? sessList.map((s) => `周${DAY_CN[s.day - 1]} 第${s.p1}${s.p2 > s.p1 ? "-" + s.p2 : ""}节`).join("，") : "";
    const tkNo = "NO. " + ymd(d).replace(/-/g, "") + "-" + pad(ev.p1);

    // 正在上 / 下一节 的重点标记
    const live = isToday && now >= startAt && now < endAt;
    const upcoming = isToday && !live ? dayEvs.filter((x) => x.s.getTime() > now.getTime()).sort((a, b) => a.s - b.s)[0] : null;
    const isNext = !!upcoming && upcoming.e.key === ev.key;
    let flag = "";
    if (live) flag = `<div class="tk2-flag live"><span class="fl-dot"></span>正在上课 · 还剩 ${Math.max(0, Math.round((endAt - now) / 60000))} 分钟</div>`;
    else if (isNext) { const m = Math.max(0, Math.round((startAt - now) / 60000)); flag = `<div class="tk2-flag next"><span class="fl-dot"></span>下一节 · ${m <= 1 ? "马上开始" : m + " 分钟后"}</div>`; }

    const tm = $("#ticketModal");
    if (!tm) return;
    tm.classList.remove("show");
    tm.innerHTML =
      `<div class="tk2" style="--c:${col}">
         <button class="tk2-close" id="tkClose">&#10005;</button>
         <div class="tk2-head">
           <div class="tk2-name">${esc(ev.name)}</div>
           ${sub ? `<div class="tk2-cls">${esc(sub)}</div>` : ""}
           ${sessLine ? `<div class="tk2-cls">本课时间：${esc(sessLine)}</div>` : ""}
         </div>
         ${flag}
         <div class="tk2-perf"></div>
         <div class="tk2-grid">${cells}</div>
         ${movedBlock}
         <div class="tk2-perf"></div>
         <div class="tk2-foot">
           <span class="tk2-no">${tkNo}</span>
           <span class="tk2-code"></span>
         </div>
         <div class="tk2-acts">${acts.join("")}</div>
       </div>`;
    openTicket(tm);
    tm.onclick = (e) => { if (e.target === tm) closeSheets(); };
    $("#tkClose").onclick = closeSheets;
    tm.querySelectorAll("button[data-act]").forEach((b) => {
      b.onclick = () => handleDetailAction(b.dataset.act, ev, c);
    });
  }
  function btn(icon, label, cls, key) {
    return `<button data-act="${key}" class="btn ${cls}">${icon}<span>${label}</span></button>`;
  }

  function handleDetailAction(act, ev, c) {
    buzz(10);
    if (act === "editOcc") { closeSheets(); setTimeout(() => openEditOcc(ev, c), 200); }
    else if (act === "editCustom") { closeSheets(); setTimeout(() => openEditCustom(overrides.find((o) => o.id === ev.id)), 200); }
    else if (act === "editCourse") { closeSheets(); setTimeout(() => openCourseForm(MY.find((x) => x.id === ev.courseId)), 200); }
    else if (act === "delCourse") {
      if (confirm("删除这门课程？")) { deleteMyCourse(ev.courseId); closeSheets(); toast("删掉咯", "warn"); }
    }
    else if (act === "cancelOnce") {
      const any = overrides.find((o) => o.type === "cancel" && o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === ev.origDate);
      if (!any) overrides.push({ id: uid(), type: "cancel", courseId: ev.courseId, si: ev.si, date: ev.origDate });
      saveOverrides(); closeSheets(); renderAll(); toast("这次不上，想上点回来", "warn");
    } else if (act === "uncancel") {
      overrides = overrides.filter((o) => !(o.type === "cancel" && o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === ev.origDate));
      saveOverrides(); closeSheets(); renderAll(); toast("回来了，照常上课");
    } else if (act === "reset") {
      overrides = overrides.filter((o) => !(o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === ev.origDate));
      saveOverrides(); closeSheets(); renderAll(); toast("还原成原来的样子");
    } else if (act === "del") {
      deleteOv(ev.id); closeSheets(); renderAll(); toast("删掉啦");
    } else if (act === "remind") {
      settings.notify = true; write(LS.settings, settings); renderTop();
      requestNotify(() => { toast("好嘞，开课前 " + settings.leadMin + " 分钟喊你"); });
    }
  }

  /* ---------- edit occurrence ---------- */
  function openEditOcc(ev, c) {
    $("#eTitle").textContent = "调课 / 临时调整";
    $("#eSub").textContent = ev.name.replace(/（.*?）$/, "") + " · 原定 " + ev.origDate;
    const d = ev.date;
    $("#eBody").innerHTML =
      fieldDate("日期", ymd(d)) +
      `<div class="field"><label>节次</label>
        <div class="seg" style="gap:8px">
          <select id="ep1">${optPeriods(ev.p1)}</select>
          <span style="align-self:center;color:var(--text-3)">至</span>
          <select id="ep2">${optPeriods(ev.p2)}</select>
        </div></div>` +
      fieldText("地点", ev.room) +
      fieldText("备注（可选）", "") +
      `<div class="actions">
        <button class="btn primary row" id="eSave">${I.edit}<span>保存调整</span></button>
        <button class="btn ghost row" id="eCancel">取消</button>
      </div>`;
    $("#eCancel").onclick = closeSheets;
    $("#eSave").onclick = () => {
      buzz(10);
      const toDate = $("#edate").value;
      let p1 = +$("#ep1").value, p2 = +$("#ep2").value;
      if (p2 < p1) p2 = p1;
      const room = $("#eroom").value.trim();
      const note = $("#enote").value.trim();
      const exist = overrides.find((o) => o.type === "move" && o.courseId === ev.courseId && (o.si || 0) === ev.si && o.date === ev.origDate);
      const data = { courseId: ev.courseId, si: ev.si, date: ev.origDate, toDate, p1, p2, room, note };
      if (exist) Object.assign(exist, data);
      else overrides.push(Object.assign({ id: uid(), type: "move" }, data));
      saveOverrides(); closeSheets(); renderAll();
      toast(toDate === ev.origDate ? "改好啦" : "已调到 " + toDate + " · 记得同步日历");
    };
    openSheet("sheetEdit");
  }
  function openEditCustom(ov) {
    $("#eTitle").textContent = ov ? "编辑事件" : "添加事件";
    $("#eSub").textContent = "自定义事件（如组会、讲座）";
    const base = ov || { name: "", date: ymd(nowD()), p1: 6, p2: 6, room: "", note: "" };
    $("#eBody").innerHTML =
      fieldText("名称", base.name, "例如：组会 / 学术报告") +
      fieldDate("日期", base.date) +
      `<div class="field"><label>节次</label>
        <div class="seg" style="gap:8px">
          <select id="ep1">${optPeriods(base.p1)}</select>
          <span style="align-self:center;color:var(--text-3)">至</span>
          <select id="ep2">${optPeriods(base.p2)}</select>
        </div></div>` +
      fieldText("地点（可选）", base.room) +
      fieldText("备注（可选）", base.note) +
      `<div class="actions">
        <button class="btn primary row" id="eSave">保存</button>
        <button class="btn ghost row" id="eCancel">取消</button>
      </div>`;
    $("#eCancel").onclick = closeSheets;
    $("#eSave").onclick = () => {
      buzz(10);
      const name = $("#ename").value.trim();
      if (!name) { toast("请填写名称"); return; }
      let p1 = +$("#ep1").value, p2 = +$("#ep2").value; if (p2 < p1) p2 = p1;
      const data = { name, date: $("#edate").value, p1, p2, room: $("#eroom").value.trim(), note: $("#enote").value.trim() };
      if (ov) Object.assign(ov, data);
      else overrides.push(Object.assign({ id: uid(), type: "custom", color: PALETTE[Math.floor(Math.random() * PALETTE.length)] }, data));
      saveOverrides(); closeSheets(); renderAll(); toast(ov ? "记下啦" : "事件安排上啦");
    };
    openSheet("sheetEdit");
  }

  function fieldText(label, val, ph) {
    return `<div class="field"><label>${label}</label><input id="${idFor(label)}" type="text" value="${esc(val || "")}" placeholder="${ph || ""}"></div>`;
  }
  function fieldDate(label, val) {
    return `<div class="field"><label>${label}</label><input id="${idFor(label)}" type="date" value="${val}"></div>`;
  }
  function idFor(label) {
    if (label.indexOf("名称") === 0) return "ename";
    if (label.indexOf("日期") === 0) return "edate";
    if (label.indexOf("地点") === 0) return "eroom";
    if (label.indexOf("备注") === 0) return "enote";
    return "e_" + label;
  }
  function optPeriods(sel) {
    return PERIODS.map((p) => `<option value="${p.n}" ${p.n === sel ? "selected" : ""}>第 ${p.n} 节 ${p.start}</option>`).join("");
  }
  const uid = () => Math.random().toString(36).slice(2, 10);
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---------- settings ---------- */
  function openSettings() {
    $("#sBody").innerHTML =
      `<div class="set-group">
         <div class="set-h">课 表</div>
         <div class="set-card">
           <div class="set-row"><span class="sr-ic">${I.cal}</span><span class="sr-label">第 1 周周一</span><span class="sr-ctl"><input type="date" id="setWeek1" value="${settings.week1Start}"></span></div>
           <div class="set-row"><span class="sr-ic">${I.clock}</span><span class="sr-label">周末显示</span><span class="sr-ctl"><span class="seg mini" id="setWeekend">
             <button data-v="1" class="${settings.showWeekend ? "active" : ""}">含周末</button>
             <button data-v="0" class="${!settings.showWeekend ? "active" : ""}">工作日</button>
           </span></span></div>
           <button class="set-row act" id="setTimes"><span class="sr-ic">${I.clock}</span><span class="sr-label">课程时间</span><span class="sr-ctl">${settings.periods ? "已自定义" : "默认"}</span><span class="sr-chev">&#8250;</span></button>
           <button class="set-row act" id="setHoli"><span class="sr-ic">${I.cal}</span><span class="sr-label">节假日 / 调休</span><span class="sr-ctl">${(settings.holidays || []).length ? (settings.holidays.length) + " 天" : "无"}</span><span class="sr-chev">&#8250;</span></button>
           <div class="set-row"><span class="sr-ic">${I.sparkle}</span><span class="sr-label">内置法定节假日</span><span class="sr-ctl"><span class="seg mini" id="setBuiltin"><button data-v="1" class="${settings.builtinHolidays !== false ? "active" : ""}">开启</button><button data-v="0" class="${settings.builtinHolidays === false ? "active" : ""}">关闭</button></span></span></div>
         </div>
       </div>
       <div class="set-group">
         <div class="set-h">提 醒</div>
         <div class="set-card">
           <button class="set-row act" id="setNotify"><span class="sr-ic">${I.bell}</span><span class="sr-label">上课提醒</span><span class="sr-ctl">${settings.notify ? "已开启" : "未开启"}</span><span class="sr-chev">&#8250;</span></button>
           <div class="set-row"><span class="sr-ic">${I.clock}</span><span class="sr-label">提前提醒</span><span class="sr-ctl"><select id="setLead">${[5, 10, 15, 20, 30, 45, 60].map((m) => `<option value="${m}" ${m === settings.leadMin ? "selected" : ""}>${m} 分钟</option>`).join("")}</select></span></div>
           <button class="set-row act" id="setIcs"><span class="sr-ic">${I.cal}</span><span class="sr-label">同步到手机日历</span><span class="sr-ctl">${isSyncDirty() ? "待更新" : "已同步"}</span><span class="sr-chev">&#8250;</span></button>
           <button class="set-row act" id="setTest"><span class="sr-ic">${I.bell}</span><span class="sr-label">发送测试通知</span><span class="sr-chev">&#8250;</span></button>
         </div>
       </div>
       <div class="set-group">
         <div class="set-h">课 程</div>
         <div class="set-card">
           <button class="set-row act" id="setManager"><span class="sr-ic">${I.list}</span><span class="sr-label">课程管理</span><span class="sr-ctl">${allCourses().length} 门</span><span class="sr-chev">&#8250;</span></button>
         </div>
       </div>
       <div class="set-group">
         <div class="set-h">数 据</div>
         <div class="set-card">
           <button class="set-row act" id="setExport"><span class="sr-ic">${I.download}</span><span class="sr-label">导出备份</span><span class="sr-chev">&#8250;</span></button>
           <button class="set-row act" id="setImport"><span class="sr-ic">${I.upload}</span><span class="sr-label">导入备份</span><span class="sr-chev">&#8250;</span></button>
           ${MY.length ? `<button class="set-row act danger" id="setClearMy"><span class="sr-ic">${I.trash}</span><span class="sr-label">清理我添加的课程</span><span class="sr-ctl">${MY.length}</span><span class="sr-chev">&#8250;</span></button>` : ""}
           <button class="set-row act danger" id="setClear"><span class="sr-ic">${I.trash}</span><span class="sr-label">清除调课与事件</span><span class="sr-chev">&#8250;</span></button>
         </div>
       </div>
       <div class="set-group">
         <div class="set-h">其 它</div>
         <div class="set-card">
           ${isStandalone() ? "" : `<button class="set-row act" id="setInstall"><span class="sr-ic">${I.install}</span><span class="sr-label">安装到手机桌面</span><span class="sr-chev">&#8250;</span></button>`}
           <button class="set-row act" id="setShare"><span class="sr-ic">${I.upload}</span><span class="sr-label">分享课表图片</span><span class="sr-chev">&#8250;</span></button>
           <button class="set-row act" id="setCelebrate"><span class="sr-ic">${I.sparkle}</span><span class="sr-label">预览下课庆祝</span><span class="sr-chev">&#8250;</span></button>
           <button class="set-row act" id="setChange"><span class="sr-ic">${I.bell}</span><span class="sr-label">更新内容</span><span class="sr-ctl">v${APP_VERSION}</span><span class="sr-chev">&#8250;</span></button>
         </div>
       </div>
       <div class="hint">数据保存在本机，断网可用。想让 iPhone 关掉网页也能提醒：先「同步到手机日历（.ics）」再导入系统日历；之后如删课/调课，点一次重新导出并**再次导入**同一文件，日历会按最新内容更新（移除已删除/调走的课）。如一直没更新，可在系统日历里删除旧订阅后重新导入。</div>
       <div class="devmark" id="devMark">© 2026 course-schedule</div>`;
    const rerender = () => { renderTop(); renderAll(); };
    wireDevMark();
    $("#setWeek1").onchange = (e) => { settings.week1Start = e.target.value || DEFAULT_WEEK1; write(LS.settings, settings); state.week = clampWeek(weekOf(nowD())); rerender(); };
    $("#setLead").onchange = (e) => { settings.leadMin = +e.target.value; write(LS.settings, settings); };
    $$("#setWeekend button").forEach((b) => (b.onclick = () => {
      settings.showWeekend = b.dataset.v === "1"; write(LS.settings, settings);
      $$("#setWeekend button").forEach((x) => x.classList.toggle("active", x === b));
      if (!settings.showWeekend && state.day > 5) state.day = 1;
      rerender();
    }));
    $("#setNotify").onclick = () => {
      settings.notify = !settings.notify; write(LS.settings, settings);
      const ctl = $("#setNotify .sr-ctl"); if (ctl) ctl.textContent = settings.notify ? "已开启" : "未开启";
      renderTop();
      if (settings.notify) requestNotify(() => toast("提醒开了，放心"));
      else toast("提醒先关咯");
    };
    if ($("#setTimes")) $("#setTimes").onclick = () => { closeSheets(); setTimeout(openTimeEditor, 180); };
    if ($("#setHoli")) $("#setHoli").onclick = () => { closeSheets(); setTimeout(openHolidayEditor, 180); };
    $$("#setBuiltin button").forEach((b) => (b.onclick = () => {
      settings.builtinHolidays = b.dataset.v === "1"; write(LS.settings, settings);
      $$("#setBuiltin button").forEach((x) => x.classList.toggle("active", x === b));
      renderAll();
    }));
    if ($("#setShare")) $("#setShare").onclick = () => { closeSheets(); setTimeout(shareImage, 200); };
    if ($("#setChange")) $("#setChange").onclick = () => { closeSheets(); setTimeout(openChangelog, 180); };
    if ($("#setCelebrate")) $("#setCelebrate").onclick = () => { closeSheets(); setTimeout(() => celebrate(ymd(nowD()), true), 220); };
    if ($("#setInstall")) $("#setInstall").onclick = doInstall;
    $("#setManager").onclick = () => { closeSheets(); setTimeout(openCourseManager, 180); };
    $("#setIcs").onclick = exportICS;
    $("#setTest").onclick = () => notify("测试通知", "提醒功能正常，上课前 " + settings.leadMin + " 分钟会通知你。");
    $("#setExport").onclick = exportBackup;
    $("#setImport").onclick = importBackup;
    if ($("#setClearMy")) $("#setClearMy").onclick = () => { if (confirm("删除所有你手动添加的课程？")) { MY = []; write(LS.my, MY); assignColors(); closeSheets(); renderAll(); toast("都清理干净了"); } };
    $("#setClear").onclick = () => { if (confirm("确定清除所有调课与自定义事件？此操作不可撤销。")) { overrides = []; saveOverrides(); closeSheets(); renderAll(); toast("清爽了"); } };
    openSheet("sheetSettings");
  }
  const clampWeek = (w) => Math.max(1, Math.min(TOTAL_WEEKS, w || 1));

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ settings, overrides, exportedAt: nowD().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "课表备份-" + ymd(nowD()) + ".json"; a.click();
    URL.revokeObjectURL(a.href); toast("备份已存好");
  }
  function importBackup() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { const o = JSON.parse(r.result); if (o.settings) settings = Object.assign(settings, o.settings); if (Array.isArray(o.overrides)) overrides = o.overrides; write(LS.settings, settings); saveOverrides(); closeSheets(); renderTop(); renderAll(); toast("恢复好啦"); } catch (e) { toast("这文件读不了，换一个试试", "warn"); } };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ---------- notifications ---------- */
  function requestNotify(cb) {
    if (!("Notification" in window)) { toast("当前浏览器不支持通知"); return; }
    if (Notification.permission === "granted") { cb && cb(); return; }
    if (Notification.permission === "denied") { toast("通知已被浏览器阻止，请在设置中开启"); return; }
    Notification.requestPermission().then((p) => { if (p === "granted") { toast("通知开了"); cb && cb(); } else toast("未授予通知权限"); });
  }
  function notify(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") { toast(body || title); return; }
    const opts = { body, tag: "cs-" + Date.now(), icon: "icons/icon-192.png", badge: "icons/icon-192.png" };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opts)).catch(() => new Notification(title, opts));
    } else { new Notification(title, opts); }
  }

  function scheduleCheck() {
    if (!settings.notify || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = nowD();
    const today = ymd(now);
    for (const ev of eventsForDate(now, weekOf(now))) {
      const p1t = perAt(ev.p1);
      const start = parseTimeOn(now, p1t.start);
      const diff = (start - now) / 60000;
      const nk = "n|" + today + "|" + ev.key;
      if (diff > 0 && diff <= settings.leadMin && !notified.has(nk)) {
        notified.add(nk); write(LS.notified, Array.from(notified).slice(-200));
        notify(`${ev.name.replace(/（.*?）$/, "")} 即将开始`, `${p1t.start} 第 ${ev.p1} 节 · ${ev.room || "地点待定"}${diff <= 1 ? "（马上上课）" : ""}`);
      }
    }
  }

  /* ---------- PWA 安装 ---------- */
  let deferredPrompt = null;
  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && "ontouchend" in document);
  function doInstall() {
    if (isStandalone()) { toast("已安装到桌面，断网也能打开"); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((c) => { if (c.outcome === "accepted") toast("正在安装…"); deferredPrompt = null; }).catch(() => {});
      return;
    }
    toast(isIOS() ? "点底部「分享」→「添加到主屏幕」" : "打开浏览器菜单 →「安装应用 / 添加到主屏幕」", true);
  }
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; toast("已安装到桌面"); });

  /* ---------- 个人数据（加密导入） ---------- */
  const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function decryptBlob(code) {
    const b = window.PRIVATE_BLOB;
    if (!b) throw new Error("未找到数据");
    if (!(window.crypto && window.crypto.subtle)) throw new Error("需在 https 或 localhost 下导入");
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64ToBytes(b.salt), iterations: b.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(b.iv) }, key, b64ToBytes(b.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function rebuild() {
    loadData(); assignColors(); markDirty();
    state.week = clampWeek(weekOf(nowD()));
    if (!settings.showWeekend && state.day > 5) state.day = 1;
    renderTop(); renderAll();
  }
  async function importPersonal(code) {
    const data = await decryptBlob(code.trim());
    if (!data || !Array.isArray(data.courses)) throw new Error("数据无效");
    write(LS.personal, data);
    rebuild();
  }
  function exitPersonal() { try { localStorage.removeItem(LS.personal); } catch (e) {} rebuild(); }

  function openDev() {
    closeSheets();
    $("#devCode").value = "";
    $("#devHint").innerHTML = !window.PRIVATE_BLOB ? "数据缺失" : isPersonal() ? "当前：个人模式已启用" : "";
    openSheet("sheetDev");
    setTimeout(() => { try { $("#devCode").focus(); } catch (e) {} }, 260);
  }
  function wireDev() {
    const go = async () => {
      const code = $("#devCode").value;
      if (!code) { toast("请输入开发者代码", "warn"); return; }
      try { await importPersonal(code); closeSheets(); toast("导入成功，欢迎回来"); }
      catch (e) { $("#devHint").textContent = "开发者代码不对，或环境不支持（" + (e && e.message ? e.message : "") + "）"; }
    };
    $("#devGo").onclick = go;
    $("#devCode").onkeydown = (e) => { if (e.key === "Enter") go(); };
    $("#devOut").onclick = () => { exitPersonal(); closeSheets(); toast("已恢复为示例课表"); };
  }
  // 不起眼的角落：设置页底部版权字样 —— 仅「长按 4 秒」打开开发者代码
  function wireDevMark() {
    const mark = $("#devMark");
    if (!mark || mark._wired) return;
    mark._wired = true;
    let t = null, sx = 0, sy = 0;
    const fire = () => { t = null; openDev(); };
    const down = (e) => {
      const p = e.touches ? e.touches[0] : e;
      sx = p.clientX; sy = p.clientY;
      clearTimeout(t); t = setTimeout(fire, 4000);
    };
    const move = (e) => { const p = e.touches ? e.touches[0] : e; if (Math.abs(p.clientX - sx) > 12 || Math.abs(p.clientY - sy) > 12) clearTimeout(t); };
    const up = () => clearTimeout(t);
    mark.addEventListener("touchstart", down, { passive: true });
    mark.addEventListener("touchmove", move, { passive: true });
    mark.addEventListener("touchend", up, { passive: true });
    mark.addEventListener("mousedown", down);
    mark.addEventListener("mouseup", up);
    mark.addEventListener("mouseleave", up);
    mark.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ---------- 我的课程（新增/编辑/删除） ---------- */
  const isUserCourse = (id) => typeof id === "string" && id.indexOf("u") === 0;
  function saveMyCourse(obj) {
    buzz(10);
    if (obj.id) { const i = MY.findIndex((x) => x.id === obj.id); if (i >= 0) MY[i] = Object.assign(MY[i], obj); }
    else MY.push(Object.assign({}, obj, { id: "u" + uid() }));
    write(LS.my, MY); markDirty(); assignColors(); renderTop(); renderAll();
  }
  function deleteMyCourse(id) { buzz(12); MY = MY.filter((x) => x.id !== id); write(LS.my, MY); markDirty(); assignColors(); renderAll(); }

  const optWeeks = (sel) => Array.from({ length: TOTAL_WEEKS }, (_, i) => `<option value="${i + 1}" ${i + 1 === sel ? "selected" : ""}>第 ${i + 1} 周</option>`).join("");
  const optDays = (sel) => DAY_CN.map((d, i) => `<option value="${i + 1}" ${i + 1 === sel ? "selected" : ""}>周${d}</option>`).join("");

  function openAddMenu() { openSheet("sheetAdd"); }

  const addMin = (hhmm, min) => window.CS_CORE.addMin(hhmm, min);
  function openTimeEditor() {
    let cur = (settings.periods && settings.periods.length ? settings.periods : effectivePeriods())
      .map((p) => ({ start: p.start, end: p.end }));
    const render = () => {
      let html = '<div class="time-list">';
      cur.forEach((p, i) => {
        html += `<div class="time-row"><span class="tr-k">第 ${i + 1} 节</span>
          <input type="time" class="tr-in" data-i="${i}" data-f="start" value="${p.start}">
          <span class="tr-dash">–</span>
          <input type="time" class="tr-in" data-i="${i}" data-f="end" value="${p.end}">
          ${cur.length > 1 ? `<button class="tr-del" data-del="${i}" aria-label="删除本节">&#10005;</button>` : ""}
        </div>`;
      });
      html += `</div>
        <button class="btn ghost row" id="tAdd" style="margin-top:12px">${I.plus}<span>添加一节</span></button>
        <div class="actions">
          <button class="btn primary row" id="tSave">保存</button>
          <button class="btn ghost row" id="tReset">恢复默认（13 节）</button>
        </div>
        <div class="hint">可增删每天的节数并调整时间；保存后，时间显示、当前节次判断与上课提醒都按此计算。</div>`;
      $("#timeBody").innerHTML = html;
      const collect = () => { $$(".tr-in").forEach((inp) => { const i = +inp.dataset.i, f = inp.dataset.f; if (cur[i]) cur[i][f] = inp.value || cur[i][f]; }); };
      $$(".tr-in").forEach((inp) => (inp.oninput = () => { const i = +inp.dataset.i, f = inp.dataset.f; if (cur[i]) cur[i][f] = inp.value; }));
      $$("[data-del]").forEach((b) => (b.onclick = () => { collect(); cur.splice(+b.dataset.del, 1); render(); }));
      $("#tAdd").onclick = () => { collect(); const last = cur[cur.length - 1] || { start: "08:00", end: "08:45" }; cur.push({ start: last.end, end: addMin(last.end, 45) }); render(); };
      $("#tSave").onclick = () => {
        collect();
        settings.periods = cur.map((p) => ({ start: p.start, end: p.end }));
        write(LS.settings, settings);
        PERIODS = effectivePeriods();
        closeSheets(); renderAll(); toast("课程节数与时间已更新");
      };
      $("#tReset").onclick = () => {
        settings.periods = null; write(LS.settings, settings);
        PERIODS = effectivePeriods();
        closeSheets(); renderAll(); toast("已恢复默认节数与时间");
      };
    };
    render();
    openSheet("sheetTimes");
  }

  function openCourseManager() {
    const list = allCourses().slice();
    // 计算每门课的“所属天”（取第一个时间段）用于分组
    list.forEach((c) => { const s = courseSessions(c)[0] || { day: 9 }; c.__day = s.day; });
    list.sort((a, b) => a.__day - b.__day || (a.name < b.name ? -1 : 1));
    const byDay = {};
    list.forEach((c) => (byDay[c.__day] = byDay[c.__day] || []).push(c));
    let html = `<button class="btn primary row" id="cmAdd">${I.plus}<span>添加课程</span></button>`;
    Object.keys(byDay).map(Number).sort((a, b) => a - b).forEach((day) => {
      html += `<div class="cm-day">${day >= 1 && day <= 7 ? "周" + DAY_CN[day - 1] : "其它"}</div>`;
      byDay[day].forEach((c) => {
        const col = colorOf(c.id, c.name);
        const sess = courseSessions(c);
        const user = isUserCourse(c.id);
        const meta = sess.map((s) => `周${DAY_CN[s.day - 1]} 第${s.p1}${s.p2 > s.p1 ? "-" + s.p2 : ""}节`).join("，");
        const wks = sess.map((s) => fmtWeeks(s.weeks, s.parity)).filter((v, i, a) => a.indexOf(v) === i).join(" / ");
        html += `<div class="cm-row" data-id="${c.id}">
          <span class="cm-bar" style="background:${col}"></span>
          <div class="cm-info">
            <div class="cm-name">${esc(c.name)}</div>
            <div class="cm-meta">${esc(meta)}${c.room ? " · " + esc(c.room) : ""}${c.teacher ? " · " + esc(c.teacher) : ""}</div>
            <div class="cm-wk">${wks}${sess.length > 1 ? " · " + sess.length + " 个时间段" : ""}${user ? " · 我添加的" : " · 导入"}</div>
          </div>
          <button class="cm-act" data-edit="${c.id}">编辑</button>
          <button class="cm-act del" data-del="${c.id}">删</button>
        </div>`;
      });
    });
    $("#cmSub").textContent = `共 ${list.length} 门课 · 可编辑/删除`;
    $("#cmBody").innerHTML = html;
    $("#cmAdd").onclick = () => { closeSheets(); setTimeout(() => openCourseForm(null, true), 180); };
    $$("#cmBody [data-edit]").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const c = allCourses().find((x) => x.id === b.dataset.edit);
      closeSheets(); setTimeout(() => openCourseForm(c, true), 180);
    }));
    $$("#cmBody [data-del]").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      if (!confirm("删除这门课程？")) return;
      const id = b.dataset.del;
      if (isUserCourse(id)) deleteMyCourse(id);
      else { CODEL.push(id); delete CO[id]; write(LS.coDel, CODEL); write(LS.co, CO); markDirty(); assignColors(); }
      toast("已删除 · 记得同步日历", "warn");
      openCourseManager();
    }));
    $$("#cmBody .cm-row").forEach((row) => (row.onclick = () => {
      const c = allCourses().find((x) => x.id === row.dataset.id);
      if (!c) return;
      const s0 = courseSessions(c)[0] || {};
      closeSheets();
      state.day = s0.day || state.day;
      state.week = clampWeek((s0.weeks && s0.weeks[0] && s0.weeks[0][0]) || state.week);
      state.view = "day";
      renderAll();
    }));
    openSheet("sheetCourses");
  }

  const optParity = (sel) => `<option value="0" ${(sel || 0) === 0 ? "selected" : ""}>每周</option><option value="1" ${sel === 1 ? "selected" : ""}>单周</option><option value="-1" ${sel === -1 ? "selected" : ""}>双周</option>`;
  function openCourseForm(course, fromManager) {
    const editing = !!course;
    const isBase = editing && !isUserCourse(course.id);
    const PC = PERIODS.length;
    $("#eTitle").textContent = editing ? "编辑课程" : "添加课程";
    $("#eSub").textContent = editing ? course.name : "一门课可有多个时间段";
    const base = Object.assign({ name: "", teacher: "", room: "", color: "" }, course || {});
    let picked = base.color || "";
    let sessions = (editing ? courseSessions(course) : []).map((s) => ({ day: s.day, p1: Math.min(s.p1, PC), p2: Math.min(s.p2, PC), w1: (s.weeks[0] || [1, TOTAL_WEEKS])[0], w2: (s.weeks[0] || [1, TOTAL_WEEKS])[1], parity: s.parity || 0 }));
    if (!sessions.length) sessions = [{ day: state.day, p1: 1, p2: 2, w1: 1, w2: TOTAL_WEEKS, parity: 0 }];

    const swatches = ['<button class="sw auto" data-c="" title="自动"></button>']
      .concat(PALETTE.map((c) => `<button class="sw" data-c="${c}" style="background:${c}"></button>`)).join("");

    $("#eBody").innerHTML =
      `<div class="fsec">
         <div class="frow"><label>课程</label><input id="cName" type="text" value="${esc(base.name)}" placeholder="名称，如 高等数学"></div>
         <div class="frow"><label>教师</label><input id="cTeacher" type="text" value="${esc(base.teacher || "")}" placeholder="可选"></div>
         <div class="frow"><label>地点</label><input id="cRoom" type="text" value="${esc(base.room || "")}" placeholder="可选"></div>
       </div>
       <div class="fsec">
         <div class="fsec-t">上课时间<span class="fsec-h">可加多个时间段</span></div>
         <div id="cSessions"></div>
         <button class="addsess" id="cAddSess">${I.plus}<span>添加时间段</span></button>
       </div>
       <div class="fsec">
         <div class="fsec-t">颜色<span class="fsec-h">选“自动”则由系统分配</span></div>
         <div class="swatches" id="cSwatches">${swatches}</div>
       </div>`;

    $("#eFoot").innerHTML =
      `${editing ? '<button class="btn danger row" id="cDel">删除</button>' : ""}
       <button class="btn ghost row" id="cCancel">取消</button>
       <button class="btn primary row" id="cSave">保存</button>`;

    const renderSessions = () => {
      $("#cSessions").innerHTML = sessions.map((s, i) => `
        <div class="sess" data-i="${i}">
          ${sessions.length > 1 ? `<div class="sess-hd"><span class="sess-t">时间段 ${i + 1}</span><button class="tr-del" data-del="${i}" aria-label="删除时间段">&#10005;</button></div>` : ""}
          <div class="frow"><label>星期</label><div class="ctl">
            <select data-f="day">${optDays(s.day)}</select>
            <select data-f="parity">${optParity(s.parity)}</select>
          </div></div>
          <div class="frow"><label>节次</label><div class="ctl">
            <select data-f="p1">${optPeriods(s.p1)}</select><span class="dash">–</span><select data-f="p2">${optPeriods(s.p2)}</select>
          </div></div>
          <div class="frow"><label>周次</label><div class="ctl">
            <select data-f="w1">${optWeeks(s.w1)}</select><span class="dash">–</span><select data-f="w2">${optWeeks(s.w2)}</select>
          </div></div>
        </div>`).join("");
      $$("#cSessions [data-del]").forEach((b) => (b.onclick = () => { collect(); sessions.splice(+b.dataset.del, 1); renderSessions(); }));
      $$("#cSessions select").forEach((sel) => (sel.onchange = () => collect()));
    };
    const collect = () => {
      $$("#cSessions .sess").forEach((row) => {
        const i = +row.dataset.i; if (!sessions[i]) return;
        const g = (f) => { const el = row.querySelector('[data-f="' + f + '"]'); return el ? el.value : null; };
        sessions[i].day = +g("day"); sessions[i].parity = +g("parity");
        sessions[i].p1 = +g("p1"); sessions[i].p2 = +g("p2");
        sessions[i].w1 = +g("w1"); sessions[i].w2 = +g("w2");
      });
    };
    renderSessions();

    const markSel = () => $$("#cSwatches .sw").forEach((b) => b.classList.toggle("active", b.dataset.c === picked));
    $$("#cSwatches .sw").forEach((b) => (b.onclick = () => { picked = b.dataset.c; markSel(); }));
    markSel();

    const backFrom = () => { closeSheets(); if (fromManager) setTimeout(openCourseManager, 200); };
    $("#cAddSess").onclick = () => { collect(); const last = sessions[sessions.length - 1] || { day: 1, p1: 1, p2: 2, w1: 1, w2: TOTAL_WEEKS, parity: 0 }; sessions.push(Object.assign({}, last)); renderSessions(); };
    $("#cCancel").onclick = backFrom;
    if ($("#cDel")) $("#cDel").onclick = () => {
      if (!course) return;
      if (isBase) { CODEL.push(course.id); delete CO[course.id]; write(LS.coDel, CODEL); write(LS.co, CO); markDirty(); assignColors(); }
      else { deleteMyCourse(course.id); }
      toast("已删除该课程 · 记得同步日历", "warn");
      closeSheets(); if (fromManager) setTimeout(openCourseManager, 200); else renderAll();
    };
    $("#cSave").onclick = () => {
      buzz(10);
      const name = $("#cName").value.trim();
      if (!name) { toast("请填写课程名称", "warn"); return; }
      collect();
      const list = sessions.map((s) => {
        let p1 = s.p1, p2 = Math.max(s.p1, s.p2);
        let w1 = s.w1, w2 = Math.max(s.w1, s.w2);
        return { day: s.day, p1, p2, weeks: [[w1, w2]], parity: s.parity || 0, room: $("#cRoom").value.trim() };
      }).filter((s) => s.p1 >= 1);
      if (!list.length) { toast("请至少填一个时间段", "warn"); return; }
      const fields = { name, teacher: $("#cTeacher").value.trim(), room: $("#cRoom").value.trim(), sessions: list, color: picked || undefined };
      if (isBase) {
        CO[course.id] = Object.assign({ id: course.id, name: base.name, teacher: base.teacher, room: base.room }, fields);
        write(LS.co, CO); markDirty(); assignColors();
        toast("改好啦 · 记得同步日历"); backFrom();
      } else {
        saveMyCourse(Object.assign({}, fields, { id: editing ? course.id : undefined }));
        toast(editing ? "改好啦 · 记得同步日历" : "新课程安排上啦");
        if (fromManager) setTimeout(openCourseManager, 200); else closeSheets();
      }
    };
    openSheet("sheetEdit");
  }

  /* ---------- 导出日历 .ics（iOS 后台提醒） ---------- */
  function icsStamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  const escICS = (s) => window.CS_CORE.escICS(s);
  const foldICS = (line) => window.CS_CORE.foldICS(line);
  function exportICS() {
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CourseSchedule//CN//CN", "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH", "X-WR-CALNAME:我的课表", "X-WR-TIMEZONE:Asia/Shanghai",
      "BEGIN:VTIMEZONE", "TZID:Asia/Shanghai",
      "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0800", "TZOFFSETTO:+0800", "TZNAME:CST", "END:STANDARD",
      "END:VTIMEZONE",
    ];
    const stamp = nowD().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    let count = 0;
    const curUids = {};
    // 按「实际发生的每一节课」导出：含调课(改时间/地点)、自定义事件，剔除「本次不上」
    for (let w = 1; w <= TOTAL_WEEKS; w++) {
      for (let d = 1; d <= 7; d++) {
        const date = dateOf(w, d);
        for (const ev of eventsForDate(date, w)) {
          if (ev.cancelled) continue;
          const p1t = perAt(ev.p1), p2t = perAt(ev.p2);
          const end = p2t ? p2t.end : p1t.end;
          const s = parseTimeOn(date, p1t.start), e2 = parseTimeOn(date, end);
          const uid = ev.key.replace(/[^\w-]/g, "") + "@schedule";
          curUids[uid] = icsStamp(s);
          const desc = [
            ev.teacher ? "教师：" + ev.teacher : "",
            ev.kind === "moved" ? "（已调课）" : "",
            "第 " + ev.p1 + (ev.p2 > ev.p1 ? "-" + ev.p2 : "") + " 节",
          ].filter(Boolean).join(" ");
          lines.push("BEGIN:VEVENT",
            "UID:" + uid,
            "DTSTAMP:" + stamp,
            "DTSTART;TZID=Asia/Shanghai:" + icsStamp(s),
            "DTEND;TZID=Asia/Shanghai:" + icsStamp(e2),
            "SUMMARY:" + foldICS(escICS(ev.name || "")),
            "LOCATION:" + foldICS(escICS(ev.room || "")),
            "DESCRIPTION:" + foldICS(escICS(desc)),
            "STATUS:CONFIRMED",
            "TRANSP:OPAQUE",
            "SEQUENCE:0",
            "BEGIN:VALARM", "TRIGGER:-PT" + settings.leadMin + "M", "ACTION:DISPLAY", "DESCRIPTION:" + foldICS(escICS(ev.name || "")), "END:VALARM",
            "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:" + foldICS(escICS("开始：" + (ev.name || ""))), "END:VALARM",
            "END:VEVENT");
          count++;
        }
      }
    }
    // 上次导出过、这次不再出现的课（删除/调走/取消）→ 发取消事件，重新导入即会从手机日历移除
    const prev = read(LS.ics, {});
    let removed = 0;
    Object.keys(prev).forEach((uid) => {
      if (!curUids[uid]) {
        lines.push("BEGIN:VEVENT",
          "UID:" + uid,
          "DTSTAMP:" + stamp,
          "DTSTART;TZID=Asia/Shanghai:" + (prev[uid] || icsStamp(nowD())),
          "STATUS:CANCELLED",
          "SEQUENCE:1",
          "TRANSP:TRANSPARENT",
          "SUMMARY:已取消",
          "END:VEVENT");
        removed++;
      }
    });
    lines.push("END:VCALENDAR");
    write(LS.ics, curUids);
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "我的课表.ics"; a.click();
    URL.revokeObjectURL(a.href);
    markSynced();
    toast("已导出 " + count + " 节课" + (removed ? "，并同步移除 " + removed + " 节" : "") + "（重新导入即可更新日历）", true);
  }

  /* ---------- 下课庆祝（全屏渐变 + 大字） ---------- */
  function showCelebration(opts) {
    if (document.querySelector(".celebrate")) return;
    opts = opts || {};
    const t1 = opts.t1 || "今天的课";
    const t2 = opts.t2 || "全部上完啦";
    const sub = opts.sub || pick(["收工，剩下的时间归你", "去干点开心的事吧", "又是充实的一天，给自己鼓个掌"], "cele");
    const ov = document.createElement("div");
    ov.className = "celebrate";
    let stars = "";
    for (let i = 0; i < 46; i++) {
      stars += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 70).toFixed(1)}%;--tw:${(2.6 + Math.random() * 3).toFixed(2)}s;--d:${(Math.random() * 4).toFixed(2)}s"></i>`;
    }
    ov.innerHTML =
      '<div class="cel-night"></div>' +
      '<div class="aur"><span class="r r1"></span><span class="r r2"></span><span class="r r3"></span><span class="r r4"></span></div>' +
      '<div class="stars">' + stars + "</div>" +
      '<div class="cel-txt">' +
        '<div class="t1">' + esc(t1) + "</div>" +
        '<div class="t2">' + esc(t2) + "</div>" +
        '<div class="sub">' + esc(sub) + "</div>" +
      "</div>";
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add("in"));
    setTimeout(() => ov.classList.remove("in"), 3300);
    setTimeout(() => ov.remove(), 4300);
  }
  function celebrate(dateKey, preview) {
    if (!preview) {
      const done = read(LS.celebrated, []);
      if (done.indexOf(dateKey) >= 0) return;
      done.push(dateKey); write(LS.celebrated, done.slice(-90));
    }
    showCelebration();
    buzz(30);
  }


  /* ---------- 日期/周切换：跟手拖动（可随时反悔/回弹）、滚轮、键盘 ---------- */
  let gestureActive = false;   // 手势进行中：30 秒自动刷新别来插手
  function wireSwipe() {
    const main = document.querySelector("main");
    const busy = () => document.querySelector(".sheet.show") || document.querySelector("#ticketModal.show");
    const maxDay = () => (settings.showWeekend ? 7 : 5);
    const canPrev = () => (state.view === "day" ? state.day > 1 || state.week > 1 : state.week > 1);
    const canNext = () => (state.view === "day" ? state.day < maxDay() || state.week < TOTAL_WEEKS : state.week < TOTAL_WEEKS);
    const viewEl = () => (state.view === "day" ? $("#dayView") : $("#weekView"));
    // 日视图：到周尾/周首可跨周（向后=下周一，向前=上周日）
    const step = (dir) => {
      if (state.view === "day") {
        let d = state.day + dir;
        if (d > maxDay()) { if (state.week < TOTAL_WEEKS) { state.week++; d = 1; } else d = maxDay(); }
        else if (d < 1) { if (state.week > 1) { state.week--; d = maxDay(); } else d = 1; }
        state.day = d;
      } else {
        state.week = clampWeek(state.week + dir);
      }
      renderAll(); buzz(9);
    };

    let sx = 0, sy = 0, down = false, engaged = false, suppress = false;
    let baseView = null, out = null, dual = false, dir0 = 0, newStart = 0, oldEnd = 0;
    let hist = [], vx = 0, dim = 0, lastX = 0, slideStop = null;

    // 速度要用最近几十毫秒的位置历史算，不能只看松手那一刻
    const track = (p, t) => {
      hist.push({ p: p, t: t });
      while (hist.length > 2 && t - hist[0].t > 90) hist.shift();
      const a = hist[0], b = hist[hist.length - 1];
      const dt = (b.t - a.t) / 1000;
      vx = dt > 0 ? (b.p - a.p) / dt : 0;
    };

    const resetLayers = () => {
      if (slideStop) { slideStop(); slideStop = null; }
      if (out) { out.remove(); out = null; }
      if (baseView) {
        baseView.style.transform = "";
        baseView.style.opacity = "";
        baseView.classList.remove("sliding");
      }
      document.documentElement.classList.remove("dragging");
      gestureActive = false;
      dual = false;
      renderSummary();   // 手势收势后再更新摘要，避免拖动途中头部高度突变
    };

    // 手指一动就进入"双层"：旧内容留在克隆里，新内容先摆到另一侧，
    // 所以拖动过程中就能看见下一页，而不是拖开一片空白。
    const engage = (d) => {
      engaged = true; suppress = true;
      baseView = viewEl();
      dim = main.clientWidth;
      hist = [{ p: 0, t: performance.now() }];
      vx = 0; lastX = 0;
      dir0 = d;
      baseView.classList.remove("slide-r", "slide-l", "view-anim");
      baseView.classList.add("sliding");
      document.documentElement.classList.add("dragging");
      gestureActive = true;
      if (d === 1 ? !canNext() : !canPrev()) { dual = false; return; }  // 到头了：只做阻尼

      const parent = baseView.parentElement;
      const gw = baseView.querySelector(".gridwrap");
      const curScroll = gw ? gw.scrollLeft : 0;
      const W = parent.clientWidth;
      out = baseView.cloneNode(true);
      out.removeAttribute("id");
      out.classList.remove("slide-r", "slide-l", "view-anim", "sliding");
      out.setAttribute("aria-hidden", "true");
      const st = out.style;
      st.position = "absolute"; st.top = "0"; st.left = "0"; st.right = "0";
      st.pointerEvents = "none"; st.transition = "none"; st.zIndex = "3";
      st.transform = "translateX(0px)";
      parent.appendChild(out);
      // 必须先入文档再设滚动位置：游离状态的元素 scrollLeft 会被夹成 0
      const ogw = out.querySelector(".gridwrap");
      if (ogw) ogw.scrollLeft = curScroll;

      newStart = d === 1 ? W : -W;
      oldEnd = d === 1 ? -W : W;
      quietRender = true;
      step(d);                              // 动作已经开始，页面随之渲染（标签也一起跟过去）
      quietRender = false;
      baseView.style.transform = "translateX(" + newStart + "px)";
      void parent.offsetWidth;              // 让起点先落地，再从那里驱动
      dual = true;
    };

    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!engaged) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        engage(dx < 0 ? 1 : -1);
      }
      lastX = dx;
      track(dx, performance.now());
      if (dual) {
        // 两张页面 1:1 跟手；拖过一屏之后才开始有阻力
        let d = dx;
        if (Math.abs(d) > dim) d = Math.sign(d) * (dim + M.rubberband(Math.abs(d) - dim, dim, .4));
        out.style.transform = "translateX(" + d + "px)";
        baseView.style.transform = "translateX(" + (newStart + d) + "px)";
      } else {
        let d = dx;
        if ((d > 0 && !canPrev()) || (d < 0 && !canNext())) d = Math.sign(d) * M.rubberband(Math.abs(d), dim, .55);
        baseView.style.transform = "translateX(" + d + "px)";
        baseView.style.opacity = String(Math.max(0.6, 1 - Math.abs(d) / (dim * 1.6)));
      }
    };

    const onUp = () => {
      if (!down) return; down = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!engaged) return;
      const dx = lastX, v = vx;
      const instant = M.reduced();

      if (!dual) {
        // 已经到头：只把当前页弹回去
        if (instant) { resetLayers(); return; }
        slideStop = M.springBy(0.36, 0.08, {
          from: dx, to: 0, velocity: v,
          onUpdate: function (val) {
            baseView.style.transform = "translateX(" + val + "px)";
            baseView.style.opacity = String(Math.max(0.6, 1 - Math.abs(val) / (dim * 1.6)));
          },
          onDone: resetLayers
        }).stop;
        return;
      }

      // 翻过去还是翻回来：用动量投影落到哪一半来决定（速度方向优先于位移）
      const progress = -dir0 * dx / dim;
      const velToward = -dir0 * v;
      const projected = progress * dim + (velToward > 0 ? M.project(velToward, .998) : 0);
      const commit = projected > dim * 0.45 && progress > -0.02;

      if (!commit) { quietRender = true; step(-dir0); quietRender = false; }  // 状态退回（页面在屏幕外，看不见）
      if (instant) { resetLayers(); return; }

      const outFrom = dx, outTo = commit ? oldEnd : 0;
      const viewFrom = newStart + dx, viewTo = commit ? 0 : newStart;
      const denom = outTo - outFrom;
      const vq = denom !== 0 ? v / denom : 0;   // 相对速度：松手那一刻的手速不丢
      slideStop = M.springBy(0.36, 0, {
        from: 0, to: 1, velocity: vq, epsilon: 0.001, velocityEpsilon: 0.05,
        onUpdate: function (q) {
          if (out) out.style.transform = "translateX(" + (outFrom + (outTo - outFrom) * q) + "px)";
          baseView.style.transform = "translateX(" + (viewFrom + (viewTo - viewFrom) * q) + "px)";
        },
        onDone: resetLayers
      }).stop;
    };
    main.addEventListener("pointerdown", (e) => {
      if (busy() || e.button === 2) return;
      if (e.target.closest(".gridwrap")) return;
      if (slideStop || out) resetLayers();   // 上一段落位还没走完：先归位，再开始新的手势
      sx = e.clientX; sy = e.clientY; down = true; engaged = false; suppress = false;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
    // 拖动后抑制紧随其后的 click（避免误开课程）
    main.addEventListener("click", (e) => { if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; } }, true);

    // 触控板横向滑动
    let acc = 0, lock = 0;
    main.addEventListener("wheel", (e) => {
      if (busy()) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const now = Date.now(); if (now < lock) { acc = 0; return; }
      acc += e.deltaX;
      if (Math.abs(acc) > 70) { step(acc > 0 ? 1 : -1); acc = 0; lock = now + 420; }
    }, { passive: true });

    // 键盘左右方向键
    window.addEventListener("keydown", (e) => {
      if (busy()) return;
      if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === "ArrowLeft") { buzz(6); step(-1); }
      else if (e.key === "ArrowRight") { buzz(6); step(1); }
    });
  }

  /* ---------- 节假日 / 调休 ---------- */
  function openHolidayEditor() {
    const renderH = () => {
      const hs = (settings.holidays || []).slice().sort();
      let html = `<div class="field"><label>添加日期</label><input type="date" id="holiDate"></div>
        <button class="btn primary row" id="holiAdd">${I.plus}<span>添加为不上课</span></button>`;
      if (hs.length) {
        html += `<div class="set-group"><div class="set-h">不上课的日期</div><div class="set-card">`;
        hs.forEach((d) => { html += `<div class="set-row"><span class="sr-ic">${I.cal}</span><span class="sr-label">${d} · 周${DAY_CN[weekday(parseYmd(d)) - 1]}</span><button class="cm-act del" data-h="${d}">删</button></div>`; });
        html += `</div></div>`;
      } else html += `<div class="hint">还没有节假日。添加后，这天不会显示任何课程（可用于放假、调休不上课）。</div>`;
      $("#holiBody").innerHTML = html;
      $("#holiAdd").onclick = () => {
        const v = $("#holiDate").value;
        if (!v) { toast("请选择日期", "warn"); return; }
        if ((settings.holidays || []).indexOf(v) < 0) { settings.holidays = (settings.holidays || []).concat(v); write(LS.settings, settings); markDirty(); renderAll(); toast("已添加"); }
        renderH();
      };
      $$("#holiBody [data-h]").forEach((b) => (b.onclick = () => {
        settings.holidays = (settings.holidays || []).filter((x) => x !== b.dataset.h);
        write(LS.settings, settings); markDirty(); renderAll(); renderH();
      }));
    };
    renderH();
    openSheet("sheetHoli");
  }

  /* ---------- 更新内容 ---------- */
  function openChangelog() {
    $("#clVer").textContent = "v" + APP_VERSION;
    const head = CHANGELOG[0] || { v: APP_VERSION, items: [] };
    const older = CHANGELOG.slice(1);
    const list = (items) => items.map((it) => `<div class="cl-item">${esc(it)}</div>`).join("");
    $("#clBody").innerHTML =
      `<div class="cl-hero"><span class="cl-badge">v${head.v}</span><span class="cl-now">当前版本</span></div>` +
      `<div class="cl-list">${list(head.items)}</div>` +
      (older.length
        ? `<details class="cl-old"><summary>更早的更新（${older.length}）</summary><div class="cl-old-body">${older
            .map((g) => `<div class="cl-old-ver">v${g.v}</div><div class="cl-list dim">${list(g.items)}</div>`)
            .join("")}</div></details>`
        : "");
    $("#clReload").onclick = () => location.reload();
    $("#clOk").onclick = closeSheets;
    openSheet("sheetChangelog");
  }
  function initUpdate() {
    const bar = $("#updateBar");
    if (!bar) return;
    if (read("cs.seenVer", null) !== APP_VERSION) {
      bar.innerHTML = `<span class="ub-dot"></span><span>已更新到 v${APP_VERSION} · 点此查看更新内容</span>`;
      bar.classList.remove("hidden");
      bar.onclick = () => { write("cs.seenVer", APP_VERSION); bar.classList.add("hidden"); openChangelog(); };
    }
  }

  /* ---------- 分享课表图片 ---------- */
  function rrPath(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fitText(ctx, text, maxW) {
    let t = String(text || "");
    if (ctx.measureText(t).width <= maxW) return t;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  }
  function shareImage() {
    const FONT = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    const days = settings.showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
    const W = 1000, pad = 56, s = 2;
    const title = (DATA.meta && DATA.meta.title) || "我的课表";
    const a = weekStart(state.week), b = addDays(a, 6);
    const sub = `第 ${state.week} / ${TOTAL_WEEKS} 周 · ${a.getMonth() + 1}/${a.getDate()} - ${b.getMonth() + 1}/${b.getDate()}`;
    const blocks = [];
    days.forEach((d) => {
      const date = dateOf(state.week, d);
      const evs = eventsForDate(date, state.week).filter((e) => !e.cancelled).sort((x, y) => x.p1 - y.p1);
      if (!evs.length) return;
      blocks.push({ day: d, date });
      evs.forEach((ev) => blocks.push({ ev, date }));
    });
    let H = pad + 118 + 30;
    blocks.forEach((bl) => (H += bl.ev ? 74 : 44));
    H += 70;
    const c = document.createElement("canvas");
    c.width = W * s; c.height = H * s;
    const ctx = c.getContext("2d"); ctx.scale(s, s);
    ctx.fillStyle = "#f5f6f8"; ctx.fillRect(0, 0, W, H);
    // 头部
    ctx.fillStyle = "#14181f"; ctx.font = "700 40px " + FONT; ctx.fillText(title, pad, pad + 40);
    ctx.fillStyle = "#6a7280"; ctx.font = "400 22px " + FONT; ctx.fillText(sub, pad, pad + 78);
    ctx.strokeStyle = "#e6e9ee"; ctx.beginPath(); ctx.moveTo(pad, pad + 104); ctx.lineTo(W - pad, pad + 104); ctx.stroke();
    let y = pad + 118;
    blocks.forEach((bl) => {
      if (!bl.ev) {
        ctx.fillStyle = "#98a0ad"; ctx.font = "600 22px " + FONT;
        ctx.fillText(`周${DAY_CN[bl.day - 1]}   ${bl.date.getMonth() + 1}/${bl.date.getDate()}`, pad, y + 20);
        y += 44;
        return;
      }
      const ev = bl.ev, p1t = perAt(ev.p1), p2t = perAt(ev.p2), col = ev.color || colorOf(ev.courseId, ev.name);
      ctx.fillStyle = "#ffffff"; rrPath(ctx, pad, y, W - pad * 2, 62, 14); ctx.fill();
      ctx.fillStyle = col; rrPath(ctx, pad, y, 6, 62, 3); ctx.fill();
      ctx.fillStyle = "#14181f"; ctx.font = "600 24px " + FONT;
      ctx.fillText(fitText(ctx, ev.name, W - pad * 2 - 300), pad + 24, y + 27);
      ctx.fillStyle = "#6a7280"; ctx.font = "400 18px " + FONT;
      ctx.fillText(`${p1t.start}-${p2t.end}   第 ${ev.p1}${ev.p2 > ev.p1 ? "-" + ev.p2 : ""} 节   ${ev.room || ""}`, pad + 24, y + 52);
      y += 74;
    });
    ctx.fillStyle = "#98a0ad"; ctx.font = "400 18px " + FONT;
    ctx.fillText("由「我的课表」生成", pad, H - 34);
    c.toBlob((blob) => {
      if (!blob) { toast("生成失败", "warn"); return; }
      const fname = `课表-第${state.week}周.png`;
      const file = new File([blob], fname, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: title }).catch(() => {});
      } else {
        const a2 = document.createElement("a");
        a2.href = URL.createObjectURL(blob); a2.download = fname; a2.click();
        URL.revokeObjectURL(a2.href);
      }
      toast("已生成课表图片");
    }, "image/png");
  }

  /* ---------- init ---------- */
  /* ---------- 顶栏：滚动边缘 + 大标题收缩 ---------- */
  function wireScrollEdge() {
    const head = document.querySelector(".stickyhead");
    if (!head) return;
    let on = false, queued = false;
    const apply = () => {
      queued = false;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      // 用一点回滞，避免在阈值附近来回抖
      if (!on && y > 26) { on = true; head.classList.add("scrolled"); }
      else if (on && y < 10) { on = false; head.classList.remove("scrolled"); }
    };
    window.addEventListener("scroll", () => {
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  /* ---------- 按下瞬间就反馈；拖开则取消（提前告诉用户"松手不会触发"） ---------- */
  function wirePressFeedback() {
    M.pressable(
      ".lesson, .grid .blk, .btn, .daytab, .iconbtn, .weekbar .navbtn, .week-pill, .sum-bar, " +
      ".set-row.act, .cm-row, .cm-act, .tr-del, .fab, .sheet .close, .tk2-close, .mv-cancel, " +
      ".addsess, .seg button, .swatches .sw, .updatebar"
    );
  }

  function init() {
    const now = nowD();
    const w = weekOf(now);
    state.week = w >= 1 && w <= TOTAL_WEEKS ? w : 1;
    state.day = weekday(now);
    if (!settings.showWeekend && state.day > 5) state.day = 1;

    const qs = new URLSearchParams(location.search);
    if (qs.get("w")) state.week = clampWeek(+qs.get("w"));
    if (qs.get("d")) state.day = Math.max(1, Math.min(7, +qs.get("d")));
    if (qs.get("view") === "week" || qs.get("view") === "day") state.view = qs.get("view");

    if (location.protocol === "file:") {
      document.title += "（离线版）";
    }

    $("#prevWeek").onclick = () => { if (state.week > 1) { state.week--; state.day = settings.showWeekend ? 7 : 5; renderAll(); } };
    $("#nextWeek").onclick = () => { if (state.week < TOTAL_WEEKS) { state.week++; state.day = 1; renderAll(); } };
    $("#weekPill").onclick = () => { state.week = clampWeek(weekOf(nowD())); state.day = weekday(nowD()); renderAll(); };
    $$("#viewSwitch button").forEach((b) => (b.onclick = () => { state.view = b.dataset.view; renderAll(); }));
    $("#btnSettings").onclick = openSettings;
    $("#btnRemind").onclick = () => {
      settings.notify = !settings.notify; write(LS.settings, settings);
      if (settings.notify) requestNotify(() => { renderTop(); toast("已开启提醒，提前 " + settings.leadMin + " 分钟"); });
      else { renderTop(); toast("已关闭提醒"); }
    };
    $("#fabAdd").onclick = openAddMenu;
    $("#addCourse").onclick = () => { closeSheets(); setTimeout(() => openCourseForm(null), 180); };
    $("#addEvent").onclick = () => { closeSheets(); setTimeout(() => openEditCustom(null), 180); };
    window.addEventListener("resize", () => {
      positionIndicator(false); positionDayInd(false);
      // 转屏后小票要重新算一次"一页"能不能放下
      const tm = $("#ticketModal");
      if (tm && tm.classList.contains("show")) fitTicket(tm.querySelector(".tk2"));
    });
    wireDev(); wireSwipe(); applyIntensity();
    wireScrollEdge(); wirePressFeedback();
    $$(".sheet").forEach(wireSheetDrag);
    wireTicketDrag($("#ticketModal"));

    renderTop(); renderAll(); initUpdate();

    let lastTickMin = -1;
    const tick = (first) => {
      // 界面上所有文案都是分钟级的（"还剩 65 分钟"、"现在 10:20"），
      // 同一分钟内不必重建 DOM —— 每 30 秒整块重排是手机上可感知的一次顿。
      const m = nowD().getMinutes();
      if (!first && m === lastTickMin) return;
      lastTickMin = m;
      $("#brandTerm").textContent = `${greeting()} · 现在 ${clock()}`;
      renderSummary();
      // 首帧刚渲染过，不必再重建一次 DOM（否则会把入场动画吞掉）
      if (!first && !gestureActive && state.view === "day" && dayDiff(dateOf(state.week, state.day), nowD()) === 0) { quietRender = true; renderDay(); quietRender = false; }
    };
    setInterval(() => { tick(); scheduleCheck(); }, 30000);
    tick(true); scheduleCheck();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { tick(); renderWeekBar(); scheduleCheck(); } });

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      if (navigator.serviceWorker.controller) {
        let refreshed = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshed) return; refreshed = true; location.reload();
        });
      }
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
        .then((reg) => { try { reg.update(); } catch (e) {} })
        .catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
