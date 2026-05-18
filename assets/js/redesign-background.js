// Background effect adapted from a public CodePen by Vicente Alcazar, MIT License. Original: https://codepen.io/Vicente-Alcazar/pen/NPNZavq
(function () {
  "use strict";

  var milkyWayImage = new Image();
  milkyWayImage.src = "/assets/img/planets/2k_stars_milky_way.jpg";

  function drawCoverImage(ctx, image, canvasWidth, canvasHeight) {
    var imageRatio = image.width / image.height;
    var canvasRatio = canvasWidth / canvasHeight;

    var drawWidth;
    var drawHeight;
    var offsetX;
    var offsetY;

    if (imageRatio > canvasRatio) {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imageRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imageRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  }

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
       LOOP
    ====================================================== */
    function draw() {
      if (milkyWayImage.complete && milkyWayImage.naturalWidth > 0) {
        drawCoverImage(context, milkyWayImage, canvas.width, canvas.height);
        context.fillStyle = "rgba(0, 0, 0, 0.45)";
        context.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.fillStyle = "rgba(220, 245, 255, 0.9)";

      for (var sIndex = 0; sIndex < stars.length; sIndex++) {
        var s = stars[sIndex];
        var x = centerX + (s.x / s.z) * canvas.width;
        var y = centerY + (s.y / s.z) * canvas.height;
        var size = s.r * (1 - s.z / canvas.width);

        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();

        s.z -= 0.35;

        if (s.z <= 0) {
          s.z = canvas.width;
          s.x = Math.random() * canvas.width - centerX;
          s.y = Math.random() * canvas.height - centerY;
        }
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