/* ============================================================
   Not Enough Space — animated space background (canvas)
   Layered parallax stars, drifting nebulae, glowing planets,
   and occasional shooting stars. Respects reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("bg-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  function userWantsLessMotion() {
    try {
      return !!(window.NES_STATE && window.NES_STATE.lessMotion());
    } catch (e) {
      return false;
    }
  }
  var reduced =
    userWantsLessMotion() ||
    (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var W = 0,
    H = 0,
    DPR = 1;
  var stars = [];
  var nebulae = [];
  var meteors = [];
  var planets = [];
  var nextMeteorAt = 2500;
  var lastT = 0;
  var rafId = null;
  var resizeTimer = null;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function build(preserve) {
    var oldW = W;
    var oldH = H;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.floor(window.innerWidth * DPR));
    H = Math.max(1, Math.floor(window.innerHeight * DPR));
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    // stars — density scaled to screen area
    var count = Math.min(
      300,
      Math.max(90, Math.round((window.innerWidth * window.innerHeight) / 6500))
    );
    if (preserve && stars.length) {
      // Resize (e.g. the phone address bar hiding) must NOT reshuffle the
      // sky — keep every star where it was, scaled to the new viewport.
      var sx = oldW ? W / oldW : 1;
      var sy = oldH ? H / oldH : 1;
      for (var j = 0; j < stars.length; j++) {
        stars[j].x *= sx;
        stars[j].y *= sy;
        stars[j].r = Math.max(0.4, Math.min(1.7, stars[j].r)) * DPR;
      }
      // add or drop the difference in star count
      while (stars.length < count) stars.push(newStar());
      while (stars.length > count) stars.pop();
    } else {
      stars = [];
      for (var i = 0; i < count; i++) stars.push(newStar());
    }

    // soft nebula blobs (very low alpha — keeps text readable)
    nebulae = [
      { fx: 0.15, fy: 0.16, fr: 0.55, c: "76,120,255", a: 0.15, seed: 1.2 },
      { fx: 0.87, fy: 0.3, fr: 0.5, c: "155,93,229", a: 0.13, seed: 3.7 },
      { fx: 0.6, fy: 0.9, fr: 0.62, c: "76,201,240", a: 0.1, seed: 5.1 },
      { fx: 0.3, fy: 0.66, fr: 0.42, c: "255,107,107", a: 0.06, seed: 7.9 },
    ];

    // decorative planets (subtle, slow bob)
    planets = [
      { fx: 0.9, fy: 0.13, r: 62, base: "52,76,182", hi: "126,156,255", ring: true, bob: 0 },
      { fx: 0.06, fy: 0.7, r: 38, base: "138,60,94", hi: "255,142,152", ring: false, bob: 1.7 },
      { fx: 0.8, fy: 0.8, r: 24, base: "88,68,178", hi: "176,156,255", ring: false, bob: 3.4 },
    ];

    meteors = [];
  }

  function newStar() {
    var roll = Math.random();
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.4, 1.7) * DPR,
      depth: rand(0.15, 1), // parallax drift speed
      phase: Math.random() * Math.PI * 2,
      speed: rand(0.35, 1.5), // twinkle speed
      tint: roll < 0.07 ? "gold" : roll < 0.15 ? "ice" : "white",
    };
  }

  function starColor(star, alpha) {
    if (star.tint === "gold") return "rgba(255,214,150," + alpha + ")";
    if (star.tint === "ice") return "rgba(174,227,255," + alpha + ")";
    return "rgba(247,249,255," + alpha + ")";
  }

  function drawNebulae(t) {
    for (var i = 0; i < nebulae.length; i++) {
      var n = nebulae[i];
      var wobX = Math.sin(t * 0.00004 + n.seed) * 40 * DPR;
      var wobY = Math.cos(t * 0.00003 + n.seed * 1.4) * 30 * DPR;
      var x = n.fx * W + wobX;
      var y = n.fy * H + wobY;
      var r = n.fr * Math.max(W, H) * 0.5;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(" + n.c + "," + n.a + ")");
      g.addColorStop(0.55, "rgba(" + n.c + "," + n.a * 0.4 + ")");
      g.addColorStop(1, "rgba(" + n.c + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function drawPlanets(t, still) {
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];
      var bob = still ? 0 : Math.sin(t * 0.00035 + p.bob) * 9 * DPR;
      var x = p.fx * W;
      var y = p.fy * H + bob;
      var r = p.r * DPR;

      ctx.globalAlpha = 0.5;
      var g = ctx.createRadialGradient(
        x - r * 0.4,
        y - r * 0.4,
        r * 0.1,
        x,
        y,
        r
      );
      g.addColorStop(0, "rgb(" + p.hi + ")");
      g.addColorStop(1, "rgb(" + p.base + ")");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      if (p.ring) {
        ctx.strokeStyle = "rgba(255,222,180,0.55)";
        ctx.lineWidth = 2.5 * DPR;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.75, r * 0.5, -0.38, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawStars(t, dt, still) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!still) {
        // slow parallax drift downward
        s.y += dt * 0.004 * s.depth * DPR;
        if (s.y > H + 4) {
          s.y = -4;
          s.x = Math.random() * W;
        }
      }
      var tw = still
        ? 0.75
        : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = starColor(s, tw);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      // bright core glow on the biggest stars
      if (s.r > 1.4 * DPR) {
        ctx.globalAlpha = tw * 0.25;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function spawnMeteor(t) {
    var fromRight = Math.random() < 0.5;
    meteors.push({
      x: fromRight ? rand(0.45, 1.0) * W : rand(0.0, 0.55) * W,
      y: rand(-0.02, 0.3) * H,
      vx: (fromRight ? -1 : 1) * rand(0.35, 0.6) * DPR, // px per ms
      vy: rand(0.18, 0.32) * DPR,
      life: 1,
    });
    nextMeteorAt = t + rand(3500, 9000);
  }

  function drawMeteors(t, dt) {
    if (!reduced && t > nextMeteorAt) spawnMeteor(t);
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt / 850;
      if (m.life <= 0) {
        meteors.splice(i, 1);
        continue;
      }
      var a = Math.max(0, m.life);
      var tailX = m.x - m.vx * 110;
      var tailY = m.y - m.vy * 110;
      var g = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      g.addColorStop(0, "rgba(255,255,255," + 0.9 * a + ")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8 * DPR;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.6 * DPR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(t, dt, still) {
    ctx.clearRect(0, 0, W, H);
    drawNebulae(still ? 4000 : t);
    drawPlanets(still ? 4000 : t, still);
    drawStars(still ? 4000 : t, dt, still);
    if (!still) drawMeteors(t, dt);
  }

  function frame(t) {
    var dt = lastT ? Math.min(50, t - lastT) : 16;
    lastT = t;
    render(t, dt, false);
    rafId = window.requestAnimationFrame(frame);
  }

  function start(preserve) {
    build(preserve);
    if (reduced) {
      render(4000, 16, true); // one calm static frame
      return;
    }
    render(4000, 16, true); // paint immediately, then animate
    if (rafId) window.cancelAnimationFrame(rafId);
    lastT = 0;
    rafId = window.requestAnimationFrame(frame);
  }

  // debug/verification hook
  window.NES_BG = {
    drawOnce: function () {
      render(4000, 16, true);
    },
    starCount: function () {
      return stars.length;
    },
  };

  // Resize: keep the same sky, just rescale it.
  window.addEventListener("resize", function () {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      start(true);
    }, 180);
  });

  // Pause the animation when the tab is hidden — saves battery on phones.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (!reduced && !rafId) {
      lastT = 0;
      rafId = window.requestAnimationFrame(frame);
    }
  });

  start(false);
})();
