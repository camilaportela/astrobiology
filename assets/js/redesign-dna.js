(function () {
  'use strict';

  function createFresnelMaterial(colorEdge, colorBase) {
    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(colorEdge) },
        color2: { value: new THREE.Color(colorBase) },
        alpha: { value: 0.34 },
        fresnelBias: { value: 0.1 },
        fresnelScale: { value: 1.35 },
        fresnelPower: { value: 1.8 }
      },
      vertexShader: [
        'uniform float fresnelBias;',
        'uniform float fresnelScale;',
        'uniform float fresnelPower;',
        '',
        'varying float vReflectionFactor;',
        '',
        'void main() {',
        '  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
        '  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
        '',
        '  vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );',
        '  vec3 I = worldPosition.xyz - cameraPosition;',
        '',
        '  vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );',
        '',
        '  gl_Position = projectionMatrix * mvPosition;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 color1;',
        'uniform vec3 color2;',
        'uniform float alpha;',
        '',
        'varying float vReflectionFactor;',
        '',
        'void main() {',
        '  gl_FragColor = vec4(mix(color2, color1, vec3(clamp( vReflectionFactor, 0.0, 1.0 ))), alpha);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false
    });
  }

  function initDNA() {
    var stage = document.querySelector('[data-dna-stage]');
    if (!stage || !window.THREE) {
      return;
    }

    var host = stage.querySelector('[data-dna-helix]');
    if (!host) {
      return;
    }

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = null;

    var camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    camera.position.set(0, 0, 25);

    var target = new THREE.Vector3();

    var fresnelMat = createFresnelMaterial(0xb4f1ff, 0x475fbd);
    var fresnelMat2 = createFresnelMaterial(0xf9dbff, 0xc520cb);

    class SinCurve1 extends THREE.Curve {
      constructor(scale) {
        super();
        this.scale = scale === undefined ? 1 : scale;
      }

      getPoint(t, targetPoint) {
        var ty = t * 10;
        var tx = Math.sin(2.5 * Math.PI * t);
        var tz = Math.cos(2.5 * Math.PI * t);
        var point = new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);
        if (targetPoint) {
          targetPoint.copy(point);
        }
        return point;
      }
    }

    var curve1 = new SinCurve1(4.5);

    var cylLength = 1.65;
    var cylGeo = new THREE.CylinderGeometry(0.1, 0.1, cylLength / 2, 16, 1, true);
    var sphereGeo = new THREE.SphereGeometry(0.3, 32, 32);

    class DNA extends THREE.Group {
      constructor(curve, total) {
        super();

        var cylinder = new THREE.Mesh(cylGeo, fresnelMat);
        cylinder.position.y = cylLength / 4;

        var cylinder2 = new THREE.Mesh(cylGeo, fresnelMat2);
        cylinder2.position.y = -cylLength / 4;

        var sphere = new THREE.Mesh(sphereGeo, fresnelMat);
        sphere.position.y = cylLength / 2 + 0.25;

        var sphere2 = new THREE.Mesh(sphereGeo, fresnelMat2);
        sphere2.position.y = -cylLength / 2 - 0.25;

        var barGroup = new THREE.Group();
        barGroup.add(cylinder);
        barGroup.add(cylinder2);
        barGroup.add(sphere);
        barGroup.add(sphere2);

        total = total || 80;

        for (var i = 1; i <= total; i += 1) {
          var bGroup = new THREE.Group();
          var bar = barGroup.clone();
          bar.rotation.z = Math.PI * (i / 10);
          bar.userData.startZ = bar.rotation.z;
          bGroup.add(bar);

          curve.getPoint(i / total, bGroup.position);
          var nextPoint = curve.getPoint((i + 1) / total);
          bGroup.lookAt(nextPoint);

          this.add(bGroup);
        }
      }

      update(playhead) {
        this.children.forEach(function (obj) {
          if (obj.isGroup) {
            var bar = obj.children[0];
            bar.rotation.z = bar.userData.startZ - Math.PI * playhead;
          }
        });
      }
    }

    var dna1 = new DNA(curve1, 95);
    scene.add(dna1);
    dna1.position.set(1, -21, 13);
    dna1.scale.setScalar(0.9);

    var start = performance.now();

    function resize() {
      var width = host.clientWidth || 1;
      var height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function loop() {
      var playhead = ((performance.now() - start) / 30000) % 1;

      dna1.update(playhead * 8);

      camera.position.x = -Math.sin(2 * Math.PI * playhead) * 25;
      camera.position.z = Math.cos(2 * Math.PI * playhead) * 25;
      camera.position.y = Math.sin(4 * Math.PI * playhead) * 5;

      target.x = -Math.sin(2 * Math.PI * playhead) * 10;
      target.z = Math.cos(2 * Math.PI * playhead) * 10;
      camera.lookAt(target);

      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    loop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDNA, { once: true });
  } else {
    initDNA();
  }
})();
