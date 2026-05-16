// Background effect adapted from a public CodePen by Vicente Alcazar, MIT License. Original: https://codepen.io/Vicente-Alcazar/pen/NPNZavq
(function () {
  "use strict";

  function initBackground() {
    if (document.getElementById("space-background")) {
      return;
    }

    var canvas = document.createElement("canvas");
    canvas.id = "space-background";
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("role", "presentation");
    document.body.appendChild(canvas);

    var context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var state = {
      width: 0,
      height: 0,
      dpr: 1,
      stars: [],
      haze: [],
      specks: [],
      running: true,
      reducedMotion: reducedMotionQuery.matches
    };

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function pick(values) {
      return values[Math.floor(Math.random() * values.length)];
    }

    function buildField() {
      var area = state.width * state.height;
      var starCount = Math.max(150, Math.min(360, Math.round(area / 7000)));
      var speckCount = Math.max(80, Math.min(180, Math.round(area / 18000)));
      var hazeCount = 5;

      state.stars = [];
      state.haze = [];
      state.specks = [];

      for (var i = 0; i < starCount; i += 1) {
        state.stars.push({
          x: Math.random() * state.width,
          y: Math.random() * state.height,
          size: Math.random() < 0.82 ? random(0.35, 1.15) : random(1.15, 1.9),
          alpha: random(0.24, 0.9),
          phase: Math.random() * Math.PI * 2,
          speed: random(0.15, 0.95),
          driftX: random(-0.018, 0.03),
          driftY: random(0.004, 0.024),
          tint: Math.random() < 0.2 ? "cold" : "soft"
        });
      }

      for (var j = 0; j < speckCount; j += 1) {
        state.specks.push({
          x: Math.random() * state.width,
          y: Math.random() * state.height,
          size: random(0.25, 0.75),
          alpha: random(0.04, 0.14),
          driftX: random(-0.04, 0.04),
          driftY: random(-0.02, 0.03),
          color: pick([
            "rgba(135, 188, 208, 0.16)",
            "rgba(175, 218, 235, 0.12)",
            "rgba(89, 145, 169, 0.14)"
          ])
        });
      }

      for (var k = 0; k < hazeCount; k += 1) {
        state.haze.push({
          x: random(-0.1, 1.1) * state.width,
          y: random(-0.1, 1.1) * state.height,
          radius: random(state.width * 0.16, state.width * 0.36),
          driftX: random(-0.008, 0.008),
          driftY: random(-0.008, 0.008),
          phase: Math.random() * Math.PI * 2,
          color: pick([
            "rgba(120,80,255,",
            "rgba(255,100,180,",
            "rgba(80,200,255,",
            "rgba(150,255,200,"
          ])
        });
      }
    }

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      canvas.style.width = state.width + "px";
      canvas.style.height = state.height + "px";
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      buildField();
    }

    function drawFrame(time) {
      var background = context.createLinearGradient(0, 0, 0, state.height);
      background.addColorStop(0, "#000000");
      background.addColorStop(0.55, "#030306");
      background.addColorStop(1, "#000000");
      context.fillStyle = background;
      context.fillRect(0, 0, state.width, state.height);

      var glow = context.createRadialGradient(
        state.width * 0.3,
        state.height * 0.18,
        0,
        state.width * 0.3,
        state.height * 0.18,
        state.width * 0.9
      );
      glow.addColorStop(0, "rgba(255, 255, 255, 0.03)");
      glow.addColorStop(0.45, "rgba(255, 255, 255, 0.015)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, state.width, state.height);

      var lowerGlow = context.createRadialGradient(
        state.width * 0.82,
        state.height * 0.84,
        0,
        state.width * 0.82,
        state.height * 0.84,
        state.width * 0.75
      );
      lowerGlow.addColorStop(0, "rgba(255, 255, 255, 0.02)");
      lowerGlow.addColorStop(0.72, "rgba(255, 255, 255, 0.01)");
      lowerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = lowerGlow;
      context.fillRect(0, 0, state.width, state.height);

      context.save();
      context.globalCompositeOperation = "screen";

      for (var i = 0; i < state.haze.length; i += 1) {
        var cloud = state.haze[i];
        cloud.x += cloud.driftX * (state.reducedMotion ? 0.25 : 1);
        cloud.y += cloud.driftY * (state.reducedMotion ? 0.25 : 1);

        if (cloud.x < -cloud.radius * 0.25) cloud.x = state.width + cloud.radius * 0.2;
        if (cloud.x > state.width + cloud.radius * 0.25) cloud.x = -cloud.radius * 0.2;
        if (cloud.y < -cloud.radius * 0.25) cloud.y = state.height + cloud.radius * 0.2;
        if (cloud.y > state.height + cloud.radius * 0.25) cloud.y = -cloud.radius * 0.2;

        var pulse = 0.55 + Math.sin(time * 0.0002 + cloud.phase) * 0.07;
        var cloudGradient = context.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
        cloudGradient.addColorStop(0, cloud.color.replace(/0\.(\d+)\)/, function (_, digits) {
          return Math.min(0.18, parseFloat("0." + digits) * pulse).toFixed(3) + ")";
        }));
        cloudGradient.addColorStop(0.55, cloud.color);
        cloudGradient.addColorStop(1, "rgba(2, 6, 16, 0)");
        context.fillStyle = cloudGradient;
        context.beginPath();
        context.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();

      context.save();
      for (var j = 0; j < state.specks.length; j += 1) {
        var speck = state.specks[j];
        speck.x += speck.driftX * (state.reducedMotion ? 0.2 : 1);
        speck.y += speck.driftY * (state.reducedMotion ? 0.2 : 1);

        if (speck.x < -3) speck.x = state.width + 3;
        if (speck.x > state.width + 3) speck.x = -3;
        if (speck.y < -3) speck.y = state.height + 3;
        if (speck.y > state.height + 3) speck.y = -3;

        var speckAlpha = speck.alpha * (0.72 + Math.sin(time * 0.00045 + j) * 0.14);
        context.fillStyle = speck.color.replace(/0\.(\d+)\)/, function () {
          return speckAlpha.toFixed(3) + ")";
        });
        context.beginPath();
        context.arc(speck.x, speck.y, speck.size, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      context.save();
      for (var k = 0; k < state.stars.length; k += 1) {
        var star = state.stars[k];
        star.x += star.driftX * (state.reducedMotion ? 0.18 : 1);
        star.y += star.driftY * (state.reducedMotion ? 0.18 : 1);

        if (star.x < -4) star.x = state.width + 4;
        if (star.x > state.width + 4) star.x = -4;
        if (star.y < -4) star.y = state.height + 4;
        if (star.y > state.height + 4) star.y = -4;

        var twinkle = 0.5 + Math.sin(time * 0.001 * star.speed + star.phase) * 0.5;
        var alpha = star.alpha * (0.72 + twinkle * 0.35);
        context.fillStyle = star.tint === "cold"
          ? "rgba(214, 240, 250, " + (alpha * 0.9) + ")"
          : "rgba(239, 246, 255, " + alpha + ")";
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();

        if (star.size > 1.1) {
          context.globalAlpha = alpha * 0.24;
          context.fillStyle = "rgba(128, 193, 214, 1)";
          context.beginPath();
          context.arc(star.x, star.y, star.size * 2.1, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
        }
      }
      context.restore();

      if (state.running) {
        requestAnimationFrame(drawFrame);
      }
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    reducedMotionQuery.addEventListener("change", function (event) {
      state.reducedMotion = event.matches;
      state.running = !event.matches;
      if (!event.matches) {
        requestAnimationFrame(drawFrame);
      }
    });

    if (!state.reducedMotion) {
      requestAnimationFrame(drawFrame);
    } else {
      drawFrame(0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBackground, { once: true });
  } else {
    initBackground();
  }
})();