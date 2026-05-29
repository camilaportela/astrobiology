(function () {
  'use strict';

  function createFresnelMaterial(colorEdge, colorBase) {
    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(colorEdge) },
        color2: { value: new THREE.Color(colorBase) },
        alpha: { value: 0.75 },
        fresnelBias: { value: 0.1 },
        fresnelScale: { value: 1.0 },
        fresnelPower: { value: 1.3 }
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
      transparent: true
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

    // Tunable parameters for final visual refinement
    var TOTAL_RUNGS = 110; // number of rung groups along the helix
    var CURVE_SCALE = 4.2; // overall size of the helix curve (reduced to shorten vertical extent)
    var DNA_SCALE = 0.38; // final scale applied to the DNA group (small, but visible on the right rail)
    var DNA_POS_Y = -12; // vertical position to keep the helix within the right corridor
    var CYL_HEIGHT = 0.75; // height of the small cylinders (rung halves)
    var SPHERE_OFFSET = 0.25; // offset of the end spheres from the rung center
    var PLAYHEAD_PERIOD_MS = 26000; // base period for one full playhead cycle
    var PLAYHEAD_MULTIPLIER = 8; // playhead multiplier to match rotation rhythm

    var fresnelMat = createFresnelMaterial(0xb4f1ff, 0x475fbd);
    var fresnelMat2 = createFresnelMaterial(0xf9dbff, 0xc520cb);

    var cylGeo = new THREE.CylinderGeometry(0.1, 0.1, CYL_HEIGHT, 16, 1, true);
    var sphGeo = new THREE.SphereGeometry(0.3, 32, 32);

    class SinCurve1 extends THREE.Curve {
      constructor(scale) {
        super();
        this.scale = scale === undefined ? 1 : scale;
      }

      getPoint(t, target) {
        var ty = t * 10;
        var tx = Math.sin(2.5 * Math.PI * t);
        var tz = Math.cos(2.5 * Math.PI * t);
        var point = new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);
        if (target) {
          target.copy(point);
        }
        return point;
      }
    }

    function createRung() {
      var cylinder = new THREE.Mesh(cylGeo, fresnelMat);
      cylinder.position.y = cylGeo.parameters.height / 4;

      var cylinder2 = new THREE.Mesh(cylGeo, fresnelMat2);
      cylinder2.position.y = -cylGeo.parameters.height / 4;

      var sphere = new THREE.Mesh(sphGeo, fresnelMat);
      sphere.position.y = cylGeo.parameters.height / 2 + SPHERE_OFFSET;

      var sphere2 = new THREE.Mesh(sphGeo, fresnelMat2);
      sphere2.position.y = -cylGeo.parameters.height / 2 - SPHERE_OFFSET;

      var barGroup = new THREE.Group();
      barGroup.add(cylinder);
      barGroup.add(cylinder2);
      barGroup.add(sphere);
      barGroup.add(sphere2);
      return barGroup;
    }

    class DNA extends THREE.Group {
      constructor(curve, total) {
        super();

        total = total || TOTAL_RUNGS;

        for (var i = 1; i <= total; i += 1) {
          var bGroup = new THREE.Group();
          var bar = createRung();

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

    var curve1 = new SinCurve1(CURVE_SCALE);
    var dna = new DNA(curve1, TOTAL_RUNGS);
    // posiciona no corredor direito sem encostar no limite externo
    dna.position.set(-3, DNA_POS_Y, 16);
    dna.rotation.y = -0.25;
    dna.scale.setScalar(DNA_SCALE);
    scene.add(dna);

    var start = performance.now();

    function resize() {
      var width = host.clientWidth || 1;
      var height = host.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);

      dna.position.x = -3;
      dna.position.y = DNA_POS_Y;
    }

    function animate() {
      requestAnimationFrame(animate);
      var playhead = ((performance.now() - start) / PLAYHEAD_PERIOD_MS) % 1;
      dna.update(playhead * PLAYHEAD_MULTIPLIER);
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
