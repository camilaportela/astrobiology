(function () {
  'use strict';

  function initDNA() {
    var stage = document.querySelector('[data-dna-stage]');
    if (!stage || !window.THREE) return;

    var host = stage.querySelector('[data-dna-helix]');
    if (!host) return;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    camera.position.set(0, 0, 120);

    // Fresnel shader material (edge blend)
    var fresnelMat = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0xb4f1ff) },
        color2: { value: new THREE.Color(0x475fbd) },
        alpha: { value: 0.95 },
        fresnelBias: { value: 0.1 },
        fresnelScale: { value: 1.0 },
        fresnelPower: { value: 1.3 }
      },
      vertexShader: `
        uniform float fresnelBias;
        uniform float fresnelScale;
        uniform float fresnelPower;
        varying float vReflectionFactor;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
          vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
          vec3 I = worldPosition.xyz - cameraPosition;
          vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float alpha;
        varying float vReflectionFactor;
        void main() {
          gl_FragColor = vec4(mix(color2, color1, vec3(clamp( vReflectionFactor, 0.0, 1.0 ))), alpha);
        }
      `,
      transparent: true
    });

    var fresnelMat2 = fresnelMat.clone();
    fresnelMat2.uniforms = JSON.parse(JSON.stringify(fresnelMat.uniforms));
    fresnelMat2.uniforms.color1 = { value: new THREE.Color(0xf9dbff) };
    fresnelMat2.uniforms.color2 = { value: new THREE.Color(0xc520cb) };

    // Curve class
    function SinCurve(scale, freq, height) {
      THREE.Curve.call(this);
      this.scale = scale || 1;
      this.freq = freq || 2.5;
      this.height = height || 100;
    }
    SinCurve.prototype = Object.create(THREE.Curve.prototype);
    SinCurve.prototype.constructor = SinCurve;
    SinCurve.prototype.getPoint = function (t, optionalTarget) {
      var ty = (t - 0.5) * this.height;
      var tx = Math.sin(this.freq * Math.PI * 2 * t) * this.scale;
      var tz = Math.cos(this.freq * Math.PI * 2 * t) * this.scale;
      var point = new THREE.Vector3(tx, ty, tz);
      if (optionalTarget) optionalTarget.copy(point);
      return point;
    };

    // Geometries
    var cylGeo = new THREE.CylinderGeometry(0.8, 0.8, 8, 16, 1, true);
    var sphGeo = new THREE.SphereGeometry(1.5, 16, 16);

    function createDNA(total, curve) {
      var group = new THREE.Group();
      for (var i = 0; i < total; i++) {
        var rungGroup = new THREE.Group();

        var topMat = fresnelMat;
        var botMat = fresnelMat2;

        var topCyl = new THREE.Mesh(cylGeo, topMat);
        topCyl.position.y = 2.5;
        var botCyl = new THREE.Mesh(cylGeo, botMat);
        botCyl.position.y = -2.5;

        var topSph = new THREE.Mesh(sphGeo, topMat);
        topSph.position.y = 4.5;
        var botSph = new THREE.Mesh(sphGeo, botMat);
        botSph.position.y = -4.5;

        var bar = new THREE.Group();
        bar.add(topCyl, botCyl, topSph, botSph);
        bar.rotation.z = Math.PI * (i / 10);
        bar.userData = { startZ: bar.rotation.z };

        rungGroup.add(bar);

        curve.getPoint(i / total, rungGroup.position);
        var nextPoint = curve.getPoint((i + 1) / total);
        rungGroup.lookAt(nextPoint);

        group.add(rungGroup);
      }
      return group;
    }

    var curve = new SinCurve(8, 2.6, 160);
    var dna = createDNA(92, curve);
    dna.scale.setScalar(0.85);
    dna.rotation.y = -0.35;
    dna.position.x = 0;
    scene.add(dna);

    var start = performance.now();

    function resize() {
      var w = host.clientWidth || 1;
      var h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function animate() {
      requestAnimationFrame(animate);
      var playhead = ((performance.now() - start) / 30000) % 1;
      dna.children.forEach(function (obj, idx) {
        var bar = obj.children[0];
        bar.rotation.z = bar.userData.startZ - Math.PI * (playhead * 8);
      });
      renderer.render(scene, camera);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDNA, { once: true });
  } else {
    initDNA();
  }
})();
