// Solar system adapted from a public CodePen by jumplander, MIT License.
// Original: https://codepen.io/jumplander/pen/azOwEor
(function () {
  "use strict";

  function initSolarSystem() {
    var container = document.getElementById("redesign-solar-system");
    if (!container || !window.THREE) {
      console.warn("[Solar] Container ou THREE não encontrado. Sistema solar não iniciado.");
      return;
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var SOLAR_SPEED = reduceMotion ? 0.05 : 0.35;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    camera.position.set(0, 95, 360);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
    container.appendChild(renderer.domElement);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minDistance = 260;
    controls.maxDistance = 1400;
    controls.target.set(0, 0, 0);
    controls.update();
    camera.lookAt(0, 0, 0);

    renderer.domElement.addEventListener("wheel", function (event) {
      event.preventDefault();
    }, { passive: false });

    var ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);

    var solarRoot = new THREE.Object3D();
    solarRoot.scale.setScalar(0.62);
    solarRoot.position.y = -8;
    scene.add(solarRoot);

    var textureLoader = new THREE.TextureLoader();
    var PLANET_TEXTURE_PATH = "/assets/img/planets/";

    var planetTextureFiles = {
      sun: "2k_sun.jpg",
      mercury: "2k_mercury.jpg",
      venus: "2k_venus_atmosphere.jpg",
      earth: "2k_earth_daymap.jpg",
      mars: "2k_mars.jpg",
      jupiter: "2k_jupiter.jpg",
      saturn: "2k_saturn.jpg",
      saturnRings: "2k_saturn_ring_alpha.png",
      uranus: "2k_uranus.jpg",
      neptune: "2k_neptune.jpg"
    };

    function loadPlanetTexture(fileName, label, fallbackTexture, onLoad) {
      if (!fileName) {
        console.warn("[Solar textures] arquivo ausente para:", label);
        return fallbackTexture || null;
      }

      var path = PLANET_TEXTURE_PATH + fileName;
      var texture = textureLoader.load(
        path,
        function () {
          console.log("[Solar textures] carregada:", label, path);
          if (onLoad) {
            onLoad(texture);
          }
        },
        undefined,
        function (error) {
          console.warn("[Solar textures] FALHA:", label, path, error);
          if (fallbackTexture && fallbackTexture.image) {
            texture.image = fallbackTexture.image;
            texture.needsUpdate = true;
          }
        }
      );

      if ("encoding" in texture && THREE.sRGBEncoding) {
        texture.encoding = THREE.sRGBEncoding;
      }

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;

      if (fallbackTexture && fallbackTexture.image) {
        texture.image = fallbackTexture.image;
        texture.needsUpdate = true;
      }

      return texture;
    }

    function applyTextureEncoding(texture) {
      if (!texture) {
        return null;
      }

      if (THREE.sRGBEncoding) {
        texture.encoding = THREE.sRGBEncoding;
      }

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;
      return texture;
    }

    function createCanvasTexture(drawFn, size) {
      var textureSize = size || 512;
      var canvas = document.createElement("canvas");
      canvas.width = textureSize;
      canvas.height = textureSize;
      var context = canvas.getContext("2d");
      drawFn(context, textureSize);

      var texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    function createSolidTexture(color) {
      return applyTextureEncoding(createCanvasTexture(function (context, size) {
        context.fillStyle = color;
        context.fillRect(0, 0, size, size);
      }, 16));
    }

    function createTexturedPlanetMaterial(texture) {
      return new THREE.MeshBasicMaterial({
        map: texture
      });
    }

    function setTextureDefaults(texture) {
      texture.needsUpdate = true;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    }

    function drawRadialBase(context, size, innerColor, midColor, outerColor, offsetX, offsetY, radiusScale) {
      var gradient = context.createRadialGradient(
        size * (offsetX || 0.35),
        size * (offsetY || 0.35),
        0,
        size / 2,
        size / 2,
        size * (radiusScale || 0.5)
      );
      gradient.addColorStop(0, innerColor);
      gradient.addColorStop(0.6, midColor);
      gradient.addColorStop(1, outerColor);
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }

    function addNoiseDots(context, size, count, colors, minRadius, maxRadius, alpha) {
      for (var i = 0; i < count; i += 1) {
        var x = Math.random() * size;
        var y = Math.random() * size;
        var radius = minRadius + Math.random() * (maxRadius - minRadius);
        context.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
        context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }

    function addSoftBlotches(context, size, count, colors, minRadius, maxRadius, alpha) {
      for (var i = 0; i < count; i += 1) {
        var x = Math.random() * size;
        var y = Math.random() * size;
        var radius = minRadius + Math.random() * (maxRadius - minRadius);
        var gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        var color = colors[Math.floor(Math.random() * colors.length)];
        gradient.addColorStop(0, color.replace("__A__", alpha.toFixed(3)));
        gradient.addColorStop(1, color.replace("__A__", "0"));
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function createMercuryTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#e2ddd2", "#a9a39a", "#4d4740", 0.35, 0.35, 0.52);
        addNoiseDots(context, size, 1200, ["rgba(255,255,255,0.08)", "rgba(67,61,56,0.22)", "rgba(150,140,132,0.18)"], 0.5, 2.2, 0.55);
        for (var i = 0; i < 18; i += 1) {
          var cx = Math.random() * size;
          var cy = Math.random() * size;
          var crater = 8 + Math.random() * 26;
          context.fillStyle = "rgba(40, 36, 33, 0.18)";
          context.beginPath();
          context.arc(cx, cy, crater, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = "rgba(255,255,255,0.08)";
          context.lineWidth = 1.5;
          context.beginPath();
          context.arc(cx + 1.5, cy - 1.5, crater * 0.85, 0, Math.PI * 2);
          context.stroke();
        }
      }, 512));
    }

    function createVenusTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#fff0bf", "#dfb04d", "#7a461c", 0.32, 0.3, 0.54);
        for (var i = 0; i < 24; i += 1) {
          var y = (i / 24) * size + (Math.random() * 18 - 9);
          var h = 10 + Math.random() * 28;
          context.globalAlpha = 0.22 + Math.random() * 0.15;
          context.fillStyle = i % 2 === 0 ? "rgba(255, 245, 198, 0.42)" : "rgba(191, 121, 32, 0.35)";
          context.fillRect(0, y, size, h);
        }
        context.globalAlpha = 0.18;
        context.fillStyle = "rgba(255, 255, 255, 0.55)";
        for (var j = 0; j < 60; j += 1) {
          context.beginPath();
          context.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 8, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }, 512));
    }

    function createEarthTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#bfe8ff", "#1d77d1", "#163170", 0.34, 0.32, 0.52);
        context.globalAlpha = 0.92;
        context.fillStyle = "#247b3f";
        var continents = [
          [0.28, 0.35, 0.08, 0.13], [0.36, 0.5, 0.13, 0.1], [0.57, 0.38, 0.1, 0.16],
          [0.68, 0.58, 0.12, 0.08], [0.18, 0.68, 0.11, 0.09], [0.46, 0.68, 0.14, 0.07]
        ];
        continents.forEach(function (shape) {
          context.beginPath();
          context.ellipse(size * shape[0], size * shape[1], size * shape[2], size * shape[3], Math.random() * Math.PI, 0, Math.PI * 2);
          context.fill();
        });
        context.fillStyle = "#7d5535";
        for (var i = 0; i < 10; i += 1) {
          context.beginPath();
          context.ellipse(Math.random() * size, Math.random() * size, 14 + Math.random() * 24, 8 + Math.random() * 16, Math.random() * Math.PI, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = "rgba(255,255,255,0.75)";
        for (var j = 0; j < 85; j += 1) {
          context.beginPath();
          context.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 12, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 0.2;
        context.fillStyle = "rgba(255,255,255,0.8)";
        context.fillRect(0, 0, size, size);
        context.globalAlpha = 1;
      }, 512));
    }

    function createMoonTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#f0f0f0", "#c9ccd1", "#8a8d93", 0.34, 0.34, 0.52);
        addNoiseDots(context, size, 900, ["rgba(95,95,95,0.22)", "rgba(245,245,245,0.1)", "rgba(145,145,145,0.18)"], 0.5, 1.8, 0.5);
        for (var i = 0; i < 16; i += 1) {
          var cx = Math.random() * size;
          var cy = Math.random() * size;
          var crater = 6 + Math.random() * 18;
          context.fillStyle = "rgba(56, 56, 56, 0.16)";
          context.beginPath();
          context.arc(cx, cy, crater, 0, Math.PI * 2);
          context.fill();
        }
      }, 256));
    }

    function createMarsTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#ffc28d", "#d85b2d", "#8f2b16", 0.33, 0.34, 0.52);
        addNoiseDots(context, size, 900, ["rgba(95,34,18,0.2)", "rgba(255,218,176,0.12)", "rgba(126,49,28,0.18)"], 0.7, 2.1, 0.55);
        context.globalAlpha = 0.22;
        context.fillStyle = "rgba(66, 28, 18, 0.55)";
        for (var i = 0; i < 12; i += 1) {
          context.beginPath();
          context.ellipse(Math.random() * size, Math.random() * size, 18 + Math.random() * 30, 8 + Math.random() * 16, Math.random() * Math.PI, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }, 512));
    }

    function createJupiterTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#fff2d3", "#e6c78f", "#a87d4d", 0.33, 0.33, 0.54);
        var bands = [
          ["rgba(255, 243, 219, 0.9)", 0.07],
          ["rgba(206, 165, 105, 0.9)", 0.08],
          ["rgba(250, 204, 146, 0.88)", 0.06],
          ["rgba(166, 114, 68, 0.9)", 0.08],
          ["rgba(240, 213, 163, 0.92)", 0.07],
          ["rgba(178, 126, 75, 0.9)", 0.09],
          ["rgba(243, 218, 175, 0.92)", 0.06],
          ["rgba(152, 104, 63, 0.92)", 0.08]
        ];
        var y = 0;
        for (var i = 0; i < bands.length; i += 1) {
          var bandColor = bands[i][0];
          var bandHeight = size * bands[i][1];
          context.fillStyle = bandColor;
          context.fillRect(0, y, size, bandHeight);
          y += bandHeight;
        }
        for (var j = 0; j < 14; j += 1) {
          var jitterY = Math.random() * size;
          context.globalAlpha = 0.1 + Math.random() * 0.1;
          context.fillStyle = j % 2 === 0 ? "rgba(255,255,255,0.25)" : "rgba(130, 84, 45, 0.26)";
          context.fillRect(0, jitterY, size, 2 + Math.random() * 10);
        }
        context.globalAlpha = 1;
        context.fillStyle = "rgba(168, 80, 64, 0.78)";
        context.beginPath();
        context.ellipse(size * 0.72, size * 0.57, size * 0.1, size * 0.06, -0.2, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(210, 132, 120, 0.35)";
        context.beginPath();
        context.ellipse(size * 0.72, size * 0.57, size * 0.13, size * 0.09, -0.2, 0, Math.PI * 2);
        context.fill();
      }, 512));
    }

    function createSaturnTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#fbf2de", "#ddc692", "#a58752", 0.34, 0.33, 0.54);
        var bands = [
          ["rgba(255, 249, 233, 0.9)", 0.08],
          ["rgba(215, 195, 146, 0.9)", 0.07],
          ["rgba(236, 218, 181, 0.92)", 0.08],
          ["rgba(194, 165, 105, 0.85)", 0.06],
          ["rgba(249, 240, 217, 0.92)", 0.07],
          ["rgba(176, 145, 91, 0.8)", 0.06]
        ];
        var y = 0;
        for (var i = 0; i < bands.length; i += 1) {
          var bandColor = bands[i][0];
          var bandHeight = size * bands[i][1];
          context.fillStyle = bandColor;
          context.fillRect(0, y, size, bandHeight);
          y += bandHeight;
        }
        context.globalAlpha = 0.15;
        for (var j = 0; j < 70; j += 1) {
          context.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(162, 128, 74, 0.28)";
          context.beginPath();
          context.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 6, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }, 512));
    }

    function createUranusTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#e2ffff", "#8fe1e5", "#4b9ca7", 0.34, 0.34, 0.54);
        context.globalAlpha = 0.18;
        addNoiseDots(context, size, 700, ["rgba(255,255,255,0.12)", "rgba(74,172,183,0.16)", "rgba(202,255,255,0.1)"], 0.5, 1.8, 0.45);
        context.globalAlpha = 0.12;
        context.fillStyle = "rgba(255,255,255,0.5)";
        context.fillRect(0, size * 0.46, size, size * 0.08);
        context.globalAlpha = 1;
      }, 512));
    }

    function createNeptuneTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#b8d6ff", "#275fdb", "#11265f", 0.34, 0.34, 0.54);
        context.globalAlpha = 0.16;
        addNoiseDots(context, size, 850, ["rgba(255,255,255,0.14)", "rgba(41,88,192,0.2)", "rgba(10,20,60,0.18)"], 0.5, 2, 0.42);
        context.globalAlpha = 0.16;
        for (var i = 0; i < 12; i += 1) {
          context.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(30,70,180,0.18)";
          context.fillRect(0, (i / 12) * size + (Math.random() * 10 - 5), size, 6 + Math.random() * 10);
        }
        context.globalAlpha = 1;
      }, 512));
    }

    function createSunTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        drawRadialBase(context, size, "#fffbe8", "#ffd84a", "#f3a800", 0.34, 0.32, 0.52);
        context.globalAlpha = 0.22;
        for (var i = 0; i < 1200; i += 1) {
          context.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.25)" : "rgba(255,215,80,0.18)";
          context.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        context.globalAlpha = 1;
      }, 512));
    }

    function createEarthCloudTexture() {
      return setTextureDefaults(createCanvasTexture(function (context, size) {
        context.clearRect(0, 0, size, size);
        context.globalAlpha = 0.0;
        for (var i = 0; i < 90; i += 1) {
          var x = Math.random() * size;
          var y = Math.random() * size;
          var radius = 6 + Math.random() * 18;
          var gradient = context.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, "rgba(255,255,255," + (0.14 + Math.random() * 0.16) + ")");
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          context.fillStyle = gradient;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }, 512));
    }

    function createGradientTexture(colorStops, options) {
      var size = (options && options.size) || 256;
      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      var context = canvas.getContext("2d");
      var centerX = options && options.centerX !== undefined ? options.centerX : size * 0.35;
      var centerY = options && options.centerY !== undefined ? options.centerY : size * 0.35;
      var radius = options && options.radius !== undefined ? options.radius : size * 0.5;
      var gradient = context.createRadialGradient(centerX, centerY, 0, size / 2, size / 2, radius);

      colorStops.forEach(function (stopInfo) {
        gradient.addColorStop(stopInfo.stop, stopInfo.color);
      });

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      return new THREE.CanvasTexture(canvas);
    }

    function createStripedTexture(baseColor, stripeColor, size) {
      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      var context = canvas.getContext("2d");
      var gradient = context.createRadialGradient(size * 0.32, size * 0.32, 0, size * 0.5, size * 0.5, size * 0.5);
      gradient.addColorStop(0, baseColor[0]);
      gradient.addColorStop(0.6, baseColor[1]);
      gradient.addColorStop(1, baseColor[2]);
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      context.globalAlpha = 0.32;
      context.fillStyle = stripeColor;
      for (var i = 0; i < 10; i += 1) {
        var stripeHeight = size * 0.055;
        var y = (i / 10) * size;
        context.fillRect(0, y, size, stripeHeight);
      }
      context.globalAlpha = 1;

      context.strokeStyle = "rgba(255,255,255,0.08)";
      context.lineWidth = 2;
      for (var j = 0; j < 6; j += 1) {
        context.beginPath();
        context.moveTo(0, (j / 6) * size);
        context.lineTo(size, (j / 6) * size + size * 0.02);
        context.stroke();
      }

      return new THREE.CanvasTexture(canvas);
    }

    function createPlanet(size, position, colorStops, ringOptions, textureOptions) {
      var geometry = new THREE.SphereGeometry(size, 40, 40);
      var texture;

      if (textureOptions && textureOptions.map) {
        texture = textureOptions.map;
      } else if (textureOptions && textureOptions.type === "striped") {
        texture = createStripedTexture(textureOptions.baseColor, textureOptions.stripeColor, textureOptions.size || 256);
      } else {
        texture = createGradientTexture(colorStops, textureOptions);
      }

      var material = createTexturedPlanetMaterial(texture);

      var planet = new THREE.Mesh(geometry, material);
      var obj = new THREE.Object3D();
      obj.add(planet);
      planet.position.x = position;

      if (ringOptions) {
        var ringGeo = new THREE.RingGeometry(ringOptions.innerRadius, ringOptions.outerRadius, 96);
        var ringMat = new THREE.MeshBasicMaterial({
          color: ringOptions.color,
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: ringOptions.alphaTest || 0.03,
          opacity: ringOptions.opacity || 0.9
        });

        if (ringOptions.textureFile) {
          var ringTexture = loadPlanetTexture(ringOptions.textureFile, "Anéis de Saturno", createSolidTexture("#d8c08a"), function (loadedTexture) {
            ringMat.map = loadedTexture;
            ringMat.needsUpdate = true;
          });
          ringMat.map = ringTexture;
        }

        var ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -0.5 * Math.PI;
        ringMesh.rotation.z = 0.36;
        planet.add(ringMesh);
      }

      if (position > 0) {
        var orbitGeometry = new THREE.RingGeometry(position - 0.12, position + 0.12, 128);
        var orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          opacity: 0.12,
          transparent: true
        });

        var orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = -0.5 * Math.PI;
        solarRoot.add(orbit);
      }
      solarRoot.add(obj);

      return { mesh: planet, obj: obj };
    }

    var sunColors = [
      { stop: 0.08, color: '#fffde4' },
      { stop: 0.45, color: '#ffe764' },
      { stop: 0.9, color: '#ffb300' }
    ];

    var mercuryColors = [
      { stop: 0, color: '#d8d2c4' },
      { stop: 0.65, color: '#8f8777' },
      { stop: 1, color: '#3b3833' }
    ];

    var venusColors = [
      { stop: 0, color: '#ffe0a3' },
      { stop: 0.65, color: '#d79642' },
      { stop: 1, color: '#6f3d16' }
    ];

    var earthColors = [
      { stop: 0, color: '#a2d2ff' },
      { stop: 0.7, color: '#2088e0' },
      { stop: 1, color: '#1b2e6d' }
    ];

    var moonColors = [
      { stop: 0, color: '#fff' },
      { stop: 0.8, color: '#b4b8cc' }
    ];

    var marsColors = [
      { stop: 0, color: '#ffb48a' },
      { stop: 0.8, color: '#e05a35' },
      { stop: 1, color: '#a02c16' }
    ];

    var jupiterColors = [
      { stop: 0, color: '#ffe9b3' },
      { stop: 0.6, color: '#eccb95' },
      { stop: 1, color: '#bca16b' }
    ];

    var saturnColors = [
      { stop: 0, color: '#f0e5c9' },
      { stop: 0.7, color: '#c7b281' },
      { stop: 1, color: '#8e794b' }
    ];

    var uranusColors = [
      { stop: 0, color: '#d2ffff' },
      { stop: 0.65, color: '#72d4dc' },
      { stop: 1, color: '#236b79' }
    ];

    var neptuneColors = [
      { stop: 0, color: '#9dc8ff' },
      { stop: 0.65, color: '#2358c8' },
      { stop: 1, color: '#10205c' }
    ];

    var planetTextures = {
      sun: loadPlanetTexture(planetTextureFiles.sun, "Sol", createSolidTexture("#ffcf40")),
      mercury: loadPlanetTexture(planetTextureFiles.mercury, "Mercúrio", createSolidTexture("#8f8b84")),
      venus: loadPlanetTexture(planetTextureFiles.venus, "Vênus", createSolidTexture("#c89a45")),
      earth: loadPlanetTexture(planetTextureFiles.earth, "Terra", createSolidTexture("#1e72d8")),
      mars: loadPlanetTexture(planetTextureFiles.mars, "Marte", createSolidTexture("#c5532f")),
      jupiter: loadPlanetTexture(planetTextureFiles.jupiter, "Júpiter", createSolidTexture("#c7ae82")),
      saturn: loadPlanetTexture(planetTextureFiles.saturn, "Saturno", createSolidTexture("#d8c08a")),
      saturnRings: loadPlanetTexture(planetTextureFiles.saturnRings, "Anéis de Saturno", null),
      uranus: loadPlanetTexture(planetTextureFiles.uranus, "Urano", createSolidTexture("#8ed2da")),
      neptune: loadPlanetTexture(planetTextureFiles.neptune, "Netuno", createSolidTexture("#235ac4"))
    };

    var sun = createPlanet(16, 0, sunColors, null, {
      map: planetTextures.sun,
      fallbackColor: "#ffcf40"
    });
    var sunGlow = new THREE.SpriteMaterial({
      map: createGradientTexture([
        { stop: 0, color: 'rgba(255,255,255,0.75)' },
        { stop: 1, color: 'rgba(255,255,255,0)' }
      ], { size: 256, radius: 128 }),
      color: 0xffe484,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.4
    });
    var glowSprite = new THREE.Sprite(sunGlow);
    glowSprite.scale.set(80, 80, 1);
    sun.mesh.add(glowSprite);

    var mercury = createPlanet(2.2, 45, mercuryColors, null, {
      map: planetTextures.mercury,
      fallbackColor: "#8f8b84"
    });
    var venus = createPlanet(4.6, 68, venusColors, null, {
      map: planetTextures.venus,
      fallbackColor: "#c89a45"
    });
    var earth = createPlanet(5.2, 95, earthColors, null, {
      map: planetTextures.earth,
      fallbackColor: "#1e72d8"
    });
    var mars = createPlanet(3.6, 125, marsColors, null, {
      map: planetTextures.mars,
      fallbackColor: "#c5532f"
    });
    var jupiter = createPlanet(11, 180, jupiterColors, null, {
      map: planetTextures.jupiter,
      fallbackColor: "#c7ae82"
    });
    var saturn = createPlanet(9.5, 245, saturnColors, {
      innerRadius: 11.5,
      outerRadius: 22,
      color: 0xeadac0,
      opacity: 0.58,
      textureFile: "2k_saturn_ring_alpha.png"
    }, {
      map: planetTextures.saturn,
      fallbackColor: "#d8c08a"
    });
    var uranus = createPlanet(7, 305, uranusColors, null, {
      map: planetTextures.uranus,
      fallbackColor: "#8ed2da"
    });
    var neptune = createPlanet(7, 360, neptuneColors, null, {
      map: planetTextures.neptune,
      fallbackColor: "#235ac4"
    });

    var moonGeometry = new THREE.SphereGeometry(1.5, 30, 30);
    var moonMaterial = new THREE.MeshBasicMaterial({
      map: createSolidTexture("#b7bcc6")
    });
    var moon = new THREE.Mesh(moonGeometry, moonMaterial);
    var moonObj = new THREE.Object3D();
    moonObj.add(moon);
    moon.position.x = 12;
    earth.mesh.add(moonObj);

    var planets = [
      { planet: sun, speed: 0.004, orbitalSpeed: 0 },
      { planet: mercury, speed: 0.014, orbitalSpeed: 0.018 },
      { planet: venus, speed: 0.011, orbitalSpeed: 0.013 },
      { planet: earth, speed: 0.017, orbitalSpeed: 0.009 },
      { planet: mars, speed: 0.014, orbitalSpeed: 0.007 },
      { planet: jupiter, speed: 0.028, orbitalSpeed: 0.0025 },
      { planet: saturn, speed: 0.025, orbitalSpeed: 0.0017 },
      { planet: uranus, speed: 0.02, orbitalSpeed: 0.0012 },
      { planet: neptune, speed: 0.018, orbitalSpeed: 0.001 }
    ];

    function resizeSolar() {
      var width = container.clientWidth || 1;
      var height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);

      var fitScale = Math.min(width / 1600, height / 1000);
      solarRoot.scale.setScalar(Math.max(0.56, Math.min(0.7, 0.62 + fitScale * 0.05)));
      solarRoot.position.y = -8;
    }

    function animate() {
      requestAnimationFrame(animate);

      for (var i = 0; i < planets.length; i += 1) {
        var p = planets[i];
        p.planet.mesh.rotateY(p.speed * SOLAR_SPEED);
        p.planet.obj.rotateY(p.orbitalSpeed * SOLAR_SPEED);
      }

      moon.rotateY(0.01 * SOLAR_SPEED);
      moonObj.rotateY(0.03 * SOLAR_SPEED);

      controls.update();
      renderer.render(scene, camera);
    }

    window.addEventListener("resize", resizeSolar, { passive: true });
    resizeSolar();
    animate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSolarSystem, { once: true });
  } else {
    initSolarSystem();
  }
})();