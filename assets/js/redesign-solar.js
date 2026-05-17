// Solar system adapted from a public CodePen by jumplander, MIT License.
// Original: https://codepen.io/jumplander/pen/azOwEor
(function () {
  "use strict";

  function initSolarSystem() {
    var container = document.getElementById("redesign-solar-system");
    if (!container || !window.THREE) {
      return;
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var SOLAR_SPEED = reduceMotion ? 0.05 : 0.35;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
    camera.position.set(0, 78, 280);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
    container.appendChild(renderer.domElement);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 120;
    controls.maxDistance = 650;
    controls.target.set(0, 0, 0);
    controls.update();

    var ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);

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
      var texture = textureOptions && textureOptions.type === "striped"
        ? createStripedTexture(textureOptions.baseColor, textureOptions.stripeColor, textureOptions.size || 256)
        : createGradientTexture(colorStops, textureOptions);

      var material = new THREE.MeshBasicMaterial({
        map: texture
      });

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
          opacity: 0.62
        });
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
        scene.add(orbit);
      }
      scene.add(obj);

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

    var sun = createPlanet(16, 0, sunColors, null, { size: 256 });
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

    var mercury = createPlanet(2.2, 45, mercuryColors, null, { size: 192 });
    var venus = createPlanet(4.6, 68, venusColors, null, { size: 192 });
    var earth = createPlanet(5.2, 95, earthColors, null, { size: 192 });
    var mars = createPlanet(3.6, 125, marsColors, null, { size: 192 });
    var jupiter = createPlanet(11, 180, jupiterColors, null, {
      type: 'striped',
      baseColor: ['#fff1c9', '#dcb874', '#8f6844'],
      stripeColor: 'rgba(122, 87, 48, 0.42)',
      size: 256
    });
    var saturn = createPlanet(9.5, 245, saturnColors, {
      innerRadius: 11.5,
      outerRadius: 22,
      color: 0xeadac0
    }, {
      type: 'striped',
      baseColor: ['#f6efd8', '#d4bb8b', '#9f8452'],
      stripeColor: 'rgba(145, 112, 73, 0.35)',
      size: 256
    });
    var uranus = createPlanet(7, 305, uranusColors, null, { size: 192 });
    var neptune = createPlanet(7, 360, neptuneColors, null, { size: 192 });

    var moonGeometry = new THREE.SphereGeometry(1.5, 30, 30);
    var moonMaterial = new THREE.MeshBasicMaterial({
      map: createGradientTexture(moonColors, { size: 128 })
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
      var width = container.clientWidth || container.parentElement.clientWidth || window.innerWidth;
      var height = container.clientHeight || container.parentElement.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
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