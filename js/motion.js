/* ============ 我的课表 · 手势与弹簧 ============
   依据 Apple《Designing Fluid Interfaces》：
   - 反馈在按下瞬间发生，且过程连续
   - 拖动 1:1 跟手，并尊重抓取时的偏移
   - 动画可被随时抓住并反向，永远从"当前屏幕上的值"开始
   - 松手时把手指速度交给弹簧（velocity handoff）
   - 用速度投影落点，而不是从松手位置就近吸附
   - 越界是渐进阻力，不是硬停
*/
(function (root) {
  "use strict";

  var reduceMQ = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(reduceMQ && reduceMQ.matches); }

  /* 动量投影：松手后按指数减速，会停在哪里（Apple 样本代码的写法） */
  function project(velocity, deceleration) {
    var d = deceleration == null ? 0.998 : deceleration;
    return (velocity / 1000) * (d / (1 - d));
  }

  /* 越界阻尼：越往界外拖，跟手程度越低 */
  function rubberband(overshoot, dimension, constant) {
    var c = constant == null ? 0.55 : constant;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

  /* ---------- 弹簧：闭式解，带初始速度，可随时打断 ---------- */
  function spring(opts) {
    var to = opts.to;
    var zeta = Math.min(1, Math.max(0.06, opts.zeta == null ? 1 : opts.zeta));
    var omega = opts.omega || 20.4;
    var x0 = (opts.from == null ? to : opts.from) - to;
    var v0 = opts.velocity || 0;
    var crit = zeta >= 0.999;
    var wd = omega * Math.sqrt(Math.max(0, 1 - zeta * zeta));
    var B = crit ? 0 : (v0 + zeta * omega * x0) / wd;
    // 单位可能是 px，也可能是归一化进度（0→1），阈值必须跟着单位走
    var eps = opts.epsilon == null ? 0.25 : opts.epsilon;
    var veps = opts.velocityEpsilon == null ? 8 : opts.velocityEpsilon;
    var raf = 0, t0 = 0, cur = to + x0, vel = v0;

    function valueAt(t) {
      if (crit) return to + (x0 + (v0 + omega * x0) * t) * Math.exp(-omega * t);
      var e = Math.exp(-zeta * omega * t);
      return to + e * (x0 * Math.cos(wd * t) + B * Math.sin(wd * t));
    }
    function velAt(t) {
      if (crit) return Math.exp(-omega * t) * (v0 - omega * (v0 + omega * x0) * t);
      var e = Math.exp(-zeta * omega * t);
      return e * ((-zeta * omega * x0 + wd * B) * Math.cos(wd * t) - (zeta * omega * B + wd * x0) * Math.sin(wd * t));
    }

    function frame(now) {
      if (!t0) t0 = now;
      var t = (now - t0) / 1000;
      cur = valueAt(t);
      vel = velAt(t);
      if (opts.onUpdate) opts.onUpdate(cur);
      if (Math.abs(cur - to) < eps && Math.abs(vel) < veps) {
        raf = 0;
        if (opts.onUpdate) opts.onUpdate(to);
        if (opts.onDone) opts.onDone();
        return;
      }
      if (t > 4) {                       // 安全兜底，绝不悬停
        raf = 0;
        if (opts.onUpdate) opts.onUpdate(to);
        if (opts.onDone) opts.onDone();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return {
      stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; return { value: cur, velocity: vel }; },
      get value() { return cur; },
      get velocity() { return vel; }
    };
  }

  /* 按响应时间/回弹量描述弹簧（比 stiffness/damping 更贴近设计意图） */
  function springBy(response, bounce, opts) {
    var o = {};
    for (var k in opts) o[k] = opts[k];
    // ω = 2π / response；ζ = 1 - bounce（bounce 0 = 临界阻尼，无过冲）
    o.omega = (2 * Math.PI) / (response || 0.4);
    o.zeta = 1 - Math.min(0.6, Math.max(0, bounce || 0));
    if (reduced()) { o.omega = 26; o.zeta = 1; }
    return spring(o);
  }

  /* ---------- 1:1 拖动：指针捕获 + 速度历史 ---------- */
  function draggable(el, opts) {
    var axis = opts.axis === "x" ? "clientX" : "clientY";
    var pid = null, active = false, startPos = 0, hist = [], last = 0;

    function velocity() {
      if (hist.length < 2) return 0;
      var a = hist[0], b = hist[hist.length - 1];
      var dt = (b.t - a.t) / 1000;
      if (dt <= 0) return 0;
      return (b.p - a.p) / dt;                    // px/s
    }

    function onMove(e) {
      if (!active || e.pointerId !== pid) return;
      if (opts.preventScroll !== false && e.cancelable) e.preventDefault();
      var d = e[axis] - startPos;
      var t = performance.now();
      hist.push({ p: d, t: t });
      while (hist.length > 2 && t - hist[0].t > 90) hist.shift();
      last = d;
      if (opts.onMove) opts.onMove(d, velocity(), e);
    }

    function finish(e) {
      if (!active || (e && e.pointerId !== pid)) return;
      active = false;
      var v = velocity();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", finish);
      el.removeEventListener("pointercancel", finish);
      pid = null;
      // 拖完之后浏览器还会补一个 click，此时手指下的元素可能已经换了
      // （比如卡片被拖开了），不吞掉就会误触到背后的东西
      if (Math.abs(last) > 4) swallowNextClick();
      if (opts.onEnd) opts.onEnd(last, v, e);
    }

    function swallowNextClick() {
      function swallow(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        document.removeEventListener("click", swallow, true);
      }
      document.addEventListener("click", swallow, true);
      setTimeout(function () { document.removeEventListener("click", swallow, true); }, 350);
    }

    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (opts.filter && !opts.filter(e)) return;
      active = true;
      pid = e.pointerId;
      startPos = e[axis];
      last = 0;
      hist = [{ p: 0, t: performance.now() }];
      try { el.setPointerCapture(pid); } catch (err) {}
      if (opts.onStart) opts.onStart(e);
      el.addEventListener("pointermove", onMove, { passive: false });
      el.addEventListener("pointerup", finish);
      el.addEventListener("pointercancel", finish);
    }

    el.addEventListener("pointerdown", onDown);
    return function destroy() {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", finish);
      el.removeEventListener("pointercancel", finish);
    };
  }

  /* ---------- 按下即有反馈；拖开则取消（提示"松手不会触发"） ---------- */
  var PRESS_SLOP = 10;
  function pressable(selector) {
    var el = null, pid = null, sx = 0, sy = 0;
    function clear() {
      if (el) el.classList.remove("pressed");
      el = null; pid = null;
    }
    function down(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var t = e.target;
      if (!t || typeof t.closest !== "function") return;
      var hit = t.closest(selector);
      if (!hit) return;
      el = hit; pid = e.pointerId; sx = e.clientX; sy = e.clientY;
      hit.classList.add("pressed");
    }
    function move(e) {
      if (!el || e.pointerId !== pid) return;
      if (Math.abs(e.clientX - sx) > PRESS_SLOP || Math.abs(e.clientY - sy) > PRESS_SLOP) clear();
    }
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", clear, true);
    document.addEventListener("pointercancel", clear, true);
    root.addEventListener("blur", clear);
  }

  root.CS_MOTION = {
    project: project,
    rubberband: rubberband,
    spring: spring,
    springBy: springBy,
    draggable: draggable,
    pressable: pressable,
    reduced: reduced
  };
})(window);
