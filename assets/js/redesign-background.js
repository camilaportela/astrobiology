// Background effect adapted from a public CodePen by Vicente Alcazar, MIT License. Original: https://codepen.io/Vicente-Alcazar/pen/NPNZavq
(function () {
  "use strict";

  function initBackground() {
    var canvas = document.getElementById("space-background");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "space-background";
      canvas.setAttribute("aria-hidden", "true");
      canvas.setAttribute("role", "presentation");
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    var context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resizeCanvas();

    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    /* ======================================================
       ESTRELLAS
    ====================================================== */
    var stars = [];
    var STAR_COUNT = 700;

    function initStars() {
      stars.length = 0;

      for (var i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width - centerX,
          y: Math.random() * canvas.height - centerY,
          z: Math.random() * canvas.width,
          r: Math.random() * 1.5 + 0.5
        });
      }
    }

    initStars();

    /* ======================================================
       PARTICULAS RAPIDAS
    ====================================================== */
    var particles = [];

    function createParticle() {
      var angle = Math.random() * Math.PI * 2;
      var speed = 6 + Math.random() * 6;

      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 140 + Math.random() * 80,
        collided: false
      });
    }

    /* ======================================================
       EXPLOSIONES
    ====================================================== */
    var explosions = [];

    function createExplosion(x, y, baseVx, baseVy) {
      var count = 12 + Math.floor(Math.random() * 10);

      for (var i = 0; i < count; i++) {
        var angle =
          Math.atan2(baseVy, baseVx) +
          (Math.random() - 0.5) * Math.PI;

        var speed = 2 + Math.random() * 4;

        explosions.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 40 + Math.random() * 30
        });
      }

      // Flash breve reduzido levemente para não agredir o site
      context.save();
      context.fillStyle = "rgba(255,255,255,0.16)";
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    /* ======================================================
       NEBULOSAS
    ====================================================== */
    var nebulas = [];

    function createNebula() {
      var colors = [
        "rgba(120,80,255,",
        "rgba(255,100,180,",
        "rgba(80,200,255,",
        "rgba(150,255,200,"
      ];

      nebulas.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 300 + Math.random() * 500,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0,
        maxAlpha: 0.12 + Math.random() * 0.12,
        phase: "in"
      });
    }

    /* ======================================================
       LOOP
    ====================================================== */
    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);

      /* Fundo estelar */
      context.fillStyle = "white";

      for (var sIndex = 0; sIndex < stars.length; sIndex++) {
        var s = stars[sIndex];
        var x = centerX + (s.x / s.z) * canvas.width;
        var y = centerY + (s.y / s.z) * canvas.height;
        var size = s.r * (1 - s.z / canvas.width);

        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();

        s.z -= 2;

        if (s.z <= 0) {
          s.z = canvas.width;
          s.x = Math.random() * canvas.width - centerX;
          s.y = Math.random() * canvas.height - centerY;
        }
      }

      /* Partículas */
      if (Math.random() < 0.005) createParticle();

      for (var pIndex = particles.length - 1; pIndex >= 0; pIndex--) {
        var p = particles[pIndex];
        var fade = 1 - p.life / p.maxLife;

        context.strokeStyle = "rgba(255,255,255," + fade + ")";
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(p.x, p.y);
        context.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
        context.stroke();

        // Colisão rara com estrelas visíveis
        if (!p.collided && Math.random() < 0.002) {
          p.collided = true;
          createExplosion(p.x, p.y, p.vx, p.vy);
        }

        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife) particles.splice(pIndex, 1);
      }

      /* Explosões */
      for (var eIndex = explosions.length - 1; eIndex >= 0; eIndex--) {
        var e = explosions[eIndex];
        var eFade = 1 - e.life / e.maxLife;

        context.fillStyle = "rgba(255,255,255," + eFade + ")";
        context.beginPath();
        context.arc(e.x, e.y, 1.2, 0, Math.PI * 2);
        context.fill();

        e.x += e.vx;
        e.y += e.vy;
        e.life++;

        if (e.life > e.maxLife) explosions.splice(eIndex, 1);
      }

      /* Nebulosas */
      if (Math.random() < 0.002 && nebulas.length < 2) createNebula();

      for (var nIndex = nebulas.length - 1; nIndex >= 0; nIndex--) {
        var n = nebulas[nIndex];

        n.alpha += n.phase === "in" ? 0.0015 : -0.001;

        if (n.alpha >= n.maxAlpha) n.phase = "out";

        if (n.alpha <= 0) {
          nebulas.splice(nIndex, 1);
          continue;
        }

        var gradient = context.createRadialGradient(
          n.x, n.y, 0, n.x, n.y, n.radius
        );

        gradient.addColorStop(0, n.color + n.alpha + ")");
        gradient.addColorStop(1, n.color + "0)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener("resize", function () {
      resizeCanvas();
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      initStars();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBackground, { once: true });
  } else {
    initBackground();
  }
})();