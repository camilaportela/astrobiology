(function () {
  'use strict';

  function hasThree() {
    return typeof window !== 'undefined' && window.THREE && typeof window.THREE.Scene === 'function';
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function createEl(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'text') el.textContent = String(attrs[k]);
        else el.setAttribute(k, String(attrs[k]));
      });
    }
    return el;
  }

  class MicroscopeInstance {
    constructor(host, options) {
      this.host = host;
      this.options = options || {};
      this._raf = 0;
      this._ro = null;
      this._disposed = false;

      this._ui = null;
      this._uiEls = null;

      this._init();
    }

    _init() {
      if (!hasThree()) throw new Error('THREE não disponível');
      const THREE = window.THREE;

      // Orbit simples (sem OrbitControls) para não depender de arquivos externos.
      const orbit = {
        enabled: true,
        target: new THREE.Vector3(0, 2.5, 0),
        radius: 8.0,
        minRadius: 3.5,
        maxRadius: 18.0,
        // Angulação inicial (pode ser sobrescrita via options)
        theta: (typeof this.options.initialTheta === 'number') ? this.options.initialTheta : (Math.PI * 0.75), // around Y
        phi: (typeof this.options.initialPhi === 'number') ? this.options.initialPhi : (Math.PI * 0.35),       // from top
        dragging: false,
        panning: false,
        lastX: 0,
        lastY: 0,
      };

      // Tap/click detection (para menu: permitir drag para girar e tap para iniciar)
      const tap = {
        active: false,
        startX: 0,
        startY: 0,
        moved: false,
        pointerId: null,
      };

      // host styling hooks
      this.host.classList.add('microscope-host');

      // DOM structure
      const wrap = createEl('div', 'microscope-wrap');
      const canvasWrap = createEl('div', 'microscope-canvas');
      wrap.appendChild(canvasWrap);

      let overlay = null;
      let statusText = null;
      let uiPanel = null;

      if (this.options.showUI) {
        overlay = createEl('div', 'microscope-eyepiece-overlay', { 'aria-hidden': 'true' });
        statusText = createEl('div', 'microscope-status', { id: '', text: 'View: Orbit Mode' });
        uiPanel = this._buildUIPanel();
        wrap.appendChild(overlay);
        wrap.appendChild(statusText);
        wrap.appendChild(uiPanel);
      }

      // Clear host and attach
      while (this.host.firstChild) this.host.removeChild(this.host.firstChild);
      this.host.appendChild(wrap);

      // --- Three.js setup ---
      const scene = new THREE.Scene();
      // Sem fundo: canvas transparente para aparecer apenas o objeto 3D.
      scene.background = null;

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const orbitPos = new THREE.Vector3(4, 5, 6);
      camera.position.copy(orbitPos);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      try { renderer.setClearColor(0x000000, 0); } catch (e) {}
      // Evita scroll/gestos do navegador durante a interação.
      try { renderer.domElement.style.touchAction = 'none'; } catch (e) {}
      canvasWrap.appendChild(renderer.domElement);

      // Orbit inicial aproximado do original
      orbit.radius = orbitPos.distanceTo(orbit.target);
      // Se o usuário não forneceu ângulos, derivar do orbitPos.
      if (!(typeof this.options.initialTheta === 'number')) {
        orbit.theta = Math.atan2((orbitPos.x - orbit.target.x), (orbitPos.z - orbit.target.z));
      }
      if (!(typeof this.options.initialPhi === 'number')) {
        const dy = orbitPos.y - orbit.target.y;
        orbit.phi = Math.acos(clamp(dy / orbit.radius, -1, 1));
      }

      function applyOrbitToCamera() {
        const sinPhi = Math.sin(orbit.phi);
        const x = orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta);
        const z = orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta);
        const y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
        camera.position.set(x, y, z);
        camera.lookAt(orbit.target);
      }
      applyOrbitToCamera();

      function setOrbitRadius(nextRadius) {
        orbit.radius = clamp(nextRadius, orbit.minRadius, orbit.maxRadius);
        applyOrbitToCamera();
      }

      // Interação de órbita (drag) — apenas em modo orbit
      const onPointerDown = (ev) => {
        if (this._disposed) return;
        if (!orbit.enabled) return;

        // Pan: Shift+arrastar (ou botão direito/middle). Rotação: arrastar normal.
        const isPanGesture = !!ev.shiftKey || ev.button === 2 || ev.button === 1 || ev.buttons === 2 || ev.buttons === 4;
        orbit.panning = isPanGesture;

        tap.active = !orbit.panning;
        tap.pointerId = tap.active ? ev.pointerId : null;
        tap.startX = ev.clientX;
        tap.startY = ev.clientY;
        tap.moved = false;

        orbit.dragging = true;
        orbit.lastX = ev.clientX;
        orbit.lastY = ev.clientY;
        try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) {}
      };
      const onPointerMove = (ev) => {
        if (this._disposed) return;
        if (!orbit.enabled || !orbit.dragging) return;
        const dx = ev.clientX - orbit.lastX;
        const dy2 = ev.clientY - orbit.lastY;
        orbit.lastX = ev.clientX;
        orbit.lastY = ev.clientY;

        if (tap.active && tap.pointerId === ev.pointerId) {
          const mdx = ev.clientX - tap.startX;
          const mdy = ev.clientY - tap.startY;
          if (!tap.moved && (Math.abs(mdx) > 6 || Math.abs(mdy) > 6)) tap.moved = true;
        }

        if (orbit.panning) {
          // Pan no plano da câmera (move o target) — permite “subir/descer” o objeto no viewport.
          const panSpeed = orbit.radius * 0.002;
          const right = new THREE.Vector3();
          const up = new THREE.Vector3();
          camera.getWorldDirection(up); // forward
          right.crossVectors(up, camera.up).normalize();
          up.copy(camera.up).normalize();
          orbit.target.addScaledVector(right, -dx * panSpeed);
          orbit.target.addScaledVector(up, dy2 * panSpeed);
          applyOrbitToCamera();
        } else {
          orbit.theta -= dx * 0.006;
          orbit.phi = clamp(orbit.phi + dy2 * 0.006, 0.05, Math.PI - 0.05);
          applyOrbitToCamera();
        }
      };
      const onPointerUp = (ev) => {
        if (this._disposed) return;
        orbit.dragging = false;
        orbit.panning = false;

        if (tap.active && tap.pointerId === ev.pointerId) {
          const shouldTap = !tap.moved;
          tap.active = false;
          tap.pointerId = null;
          if (shouldTap && typeof this.options.onTap === 'function') {
            try { this.options.onTap(); } catch (e) {}
          }
        }

        try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) {}
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
      renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
      renderer.domElement.addEventListener('pointerup', onPointerUp, { passive: true });
      renderer.domElement.addEventListener('pointercancel', onPointerUp, { passive: true });

      // Permite botão direito para pan sem abrir menu do navegador.
      const onContextMenu = (ev) => {
        try { ev.preventDefault(); } catch (e) {}
      };
      renderer.domElement.addEventListener('contextmenu', onContextMenu, { passive: false });

      // Zoom (mouse wheel). Em touch, o usuário ainda pode girar; zoom fica opcional.
      const onWheel = (ev) => {
        if (this._disposed) return;
        if (!orbit.enabled) return;
        // deltaY > 0: zoom out
        const delta = clamp(ev.deltaY, -120, 120);
        const factor = 1 + (delta / 600);
        setOrbitRadius(orbit.radius * factor);
      };
      renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

      // --- Materials ---
      // Textura da amostra
      // - Base (folha PNG “recortada” em cima da lâmina): preferencialmente /assets/leaf-specimen.png
      //   (fallback automático para o nome atual que apareceu no seu explorer)
      const LEAF_SPECIMEN_URLS = ['assets/leaf-specimen.png', 'assets/assetsleaf-specimen.png'];

      const matBody = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.4, metalness: 0.5 });
      const matChrome = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.1, metalness: 0.95 });
      const matStage = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      const matSlide = new THREE.MeshPhysicalMaterial({ color: 0xddeeff, transmission: 0.9, transparent: true, opacity: 0.4, roughness: 0.05 });
      const matSpecimen = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide
      });

      const matVein = new THREE.MeshStandardMaterial({ color: 0xcfe8d6, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide });

      // Guardar estado original da folha para restaurar ao sair do modo lente
      const specimenBase = {
        color: matSpecimen.color.clone(),
        roughness: matSpecimen.roughness,
        metalness: matSpecimen.metalness,
        emissive: matSpecimen.emissive ? matSpecimen.emissive.clone() : new THREE.Color(0x000000),
        emissiveIntensity: matSpecimen.emissiveIntensity || 0,
      };

      let _leafSpecimenTexture = null; // imagem base da folha (modo normal)
      let _leafSpecimenRequested = false;
      // Importante: `state` é declarado mais abaixo neste arquivo.
      // Não podemos referenciá-lo aqui (antes da inicialização), então usamos este flag.
      let _isEyepieceMode = false;

      function _decorateTexture(tex) {
        if (!tex) return;
        try {
          if (THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
          } else if (THREE.sRGBEncoding) {
            tex.encoding = THREE.sRGBEncoding;
          }
        } catch (e) {}
        try {
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(1, 1);
          tex.anisotropy = 4;
        } catch (e) {}
        try { tex.needsUpdate = true; } catch (e) {}
      }

      function ensureLeafSpecimenTexture() {
        if (_leafSpecimenTexture || _leafSpecimenRequested) return;
        _leafSpecimenRequested = true;
        try {
          const loader = new THREE.TextureLoader();
          const urls = Array.isArray(LEAF_SPECIMEN_URLS) ? LEAF_SPECIMEN_URLS.slice(0) : [];
          const tried = urls.slice(0);
          const tryNext = () => {
            const nextUrl = urls.shift();
            if (!nextUrl) {
              _leafSpecimenTexture = null;
              try {
                console.warn('[Microscope3D] Falha ao carregar textura base da folha. Tentativas:', tried);
              } catch (e) {}
              return;
            }
            loader.load(
              nextUrl,
              (tex) => {
                _leafSpecimenTexture = tex;
                _decorateTexture(tex);
                // aplicar imediatamente no modo normal, se ainda não estiver em modo lente
                try {
                  if (!_isEyepieceMode) {
                    matSpecimen.map = _leafSpecimenTexture;
                    matSpecimen.alphaMap = _leafSpecimenTexture;
                    matSpecimen.transparent = true;
                    matSpecimen.alphaTest = 0.25;
                    matSpecimen.depthWrite = true;
                    matSpecimen.needsUpdate = true;
                  }
                } catch (e) {}
              },
              undefined,
              () => {
                // tenta o próximo caminho
                tryNext();
              }
            );
          };
          tryNext();
        } catch (e) {
          _leafSpecimenTexture = null;
        }
      }

      function setSpecimenLensTexture(enabled) {
        try {
          _isEyepieceMode = !!enabled;
          // Em ambos os modos (normal e pela lente), usar sempre a textura base da folha.
          ensureLeafSpecimenTexture();
          if (_leafSpecimenTexture) {
            matSpecimen.map = _leafSpecimenTexture;
            matSpecimen.alphaMap = _leafSpecimenTexture;
            matSpecimen.transparent = true;
            matSpecimen.alphaTest = 0.25;
            matSpecimen.depthWrite = true;
          } else {
            matSpecimen.map = null;
            matSpecimen.alphaMap = null;
            matSpecimen.transparent = false;
            matSpecimen.alphaTest = 0;
          }
          try { matSpecimen.color.copy(specimenBase.color); } catch (e) {}
          try { matSpecimen.roughness = specimenBase.roughness; } catch (e) {}
          try { matSpecimen.metalness = specimenBase.metalness; } catch (e) {}
          try { matSpecimen.emissive.copy(specimenBase.emissive); matSpecimen.emissiveIntensity = specimenBase.emissiveIntensity; } catch (e) {}
          try { matSpecimen.needsUpdate = true; } catch (e) {}
        } catch (e) {}
      }

      function createLeafSpecimen() {
        const g = new THREE.Group();
        g.name = 'specimen';

        // Amostra como um “adesivo” plano em cima da lâmina
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.55, 1, 1), matSpecimen);
        plane.castShadow = true;
        plane.receiveShadow = true;

        // deitar em cima da lâmina: plano XZ (normal em Y)
        plane.rotation.x = -Math.PI / 2;
        // leve rotação no plano
        plane.rotation.z = 0.25;

        g.add(plane);

        // Carrega/aplica a folha base imediatamente (modo normal)
        ensureLeafSpecimenTexture();
        if (_leafSpecimenTexture) {
          matSpecimen.map = _leafSpecimenTexture;
          matSpecimen.alphaMap = _leafSpecimenTexture;
          matSpecimen.transparent = true;
          matSpecimen.alphaTest = 0.25;
          matSpecimen.depthWrite = true;
          matSpecimen.needsUpdate = true;
        }

        return g;
      }

      const microscope = new THREE.Group();
      scene.add(microscope);

      // --- Base & Lower Arm ---
      const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 4), matBody);
      base.position.y = 0.2;
      base.receiveShadow = true;
      base.castShadow = true;
      microscope.add(base);

      const armGroup = new THREE.Group();
      microscope.add(armGroup);

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3.0, 16), matBody);
      pillar.position.set(0, 1.7, -1.2);
      pillar.rotation.x = -0.1;
      armGroup.add(pillar);

      const upperArmGeo = new THREE.BoxGeometry(0.8, 2.5, 1.0);
      const upperArm = new THREE.Mesh(upperArmGeo, matBody);
      upperArm.position.set(0, 3.2, -0.8);
      upperArm.rotation.x = 0.4;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      const connectorGeo = new THREE.BoxGeometry(0.7, 0.6, 1.5);
      const connector = new THREE.Mesh(connectorGeo, matBody);
      connector.position.set(0, 4.2, 0.1);
      connector.rotation.x = 0.1;
      armGroup.add(connector);

      // --- Head assembly ---
      const opticsGroup = new THREE.Group();
      microscope.add(opticsGroup);

      const bodyBlock = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.8), matBody);
      bodyBlock.position.set(0, 4.0, 0.8);
      bodyBlock.rotation.x = 0.1;
      opticsGroup.add(bodyBlock);

      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), matChrome);
      turret.position.set(0, 3.4, 0.8);
      turret.castShadow = true;
      opticsGroup.add(turret);

      const objGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 16);
      const obj1 = new THREE.Mesh(objGeo, matChrome);
      obj1.position.set(0, -0.35, 0.25);
      obj1.rotation.x = 0.1;
      turret.add(obj1);

      const obj2 = new THREE.Mesh(objGeo, matChrome);
      obj2.position.set(0.25, -0.35, -0.2);
      obj2.rotation.x = -0.1;
      obj2.rotation.z = -0.2;
      turret.add(obj2);

      const obj3 = new THREE.Mesh(objGeo, matChrome);
      obj3.position.set(-0.25, -0.35, -0.2);
      obj3.rotation.x = -0.1;
      obj3.rotation.z = 0.2;
      turret.add(obj3);

      const eyepieceBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), matBody);
      eyepieceBase.position.set(0, 4.6, 0.9);
      // Inclinação das oculares: apontar na direção oposta, um pouco mais inclinado.
      eyepieceBase.rotation.x = 0.7;
      opticsGroup.add(eyepieceBase);

      const eyeL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 16), matBody);
      eyeL.position.set(-0.18, 0.5, 0);
      eyepieceBase.add(eyeL);
      eyeL.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), matChrome).translateY(0.5));

      const eyeR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 16), matBody);
      eyeR.position.set(0.18, 0.5, 0);
      eyepieceBase.add(eyeR);
      eyeR.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), matChrome).translateY(0.5));

      // --- Stage & mechanics ---
      const stageGroup = new THREE.Group();
      stageGroup.position.set(0, 1.9, 0.8);
      microscope.add(stageGroup);

      const stagePlate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 2.4), matStage);
      stagePlate.receiveShadow = true;
      stageGroup.add(stagePlate);

      const knobL = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 32), matChrome);
      knobL.rotation.z = Math.PI / 2;
      knobL.position.set(-0.6, 2.0, -1.2);
      armGroup.add(knobL);

      const knobR = knobL.clone();
      knobR.position.set(0.6, 2.0, -1.2);
      armGroup.add(knobR);

      const slideGroup = new THREE.Group();
      stageGroup.add(slideGroup);

      const slideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.6), matSlide);
      slideGlass.position.y = 0.085;
      slideGlass.castShadow = true;
      slideGroup.add(slideGlass);

      const specimen = createLeafSpecimen();
      // Topo da lâmina: y = 0.085 + (0.02 / 2) = 0.095
      // Coloca levemente acima para evitar z-fighting.
      specimen.position.y = 0.102;
      slideGroup.add(specimen);

      // --- Environment ---
      // Removido: chão/mesa. Mantemos apenas o microscópio na cena.

      // Auto-enquadramento: evita cortar topo/base em telas com aspect ratio diferente.
      // Calcula um target e um raio que garantem que o objeto caiba no viewport.
      const frameToObject = () => {
        if (this._disposed) return;
        try {
          const box = new THREE.Box3().setFromObject(microscope);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          if (!isFinite(size.x) || size.x <= 0) return;

          const basePadding = (typeof this.options.framePadding === 'number') ? this.options.framePadding : 1.25;
          const centerBiasY = (typeof this.options.centerBiasY === 'number') ? this.options.centerBiasY : 0;

          // Quando deslocamos o "centro" (bias), aumenta o risco de cortar uma das bordas.
          // Então aumentamos o padding efetivo proporcionalmente ao bias.
          const biasPad = 1 + Math.min(0.75, Math.abs(centerBiasY) * 1.2);
          const padding = basePadding * biasPad;

          // “Centro visual”: muitos modelos parecem baixos se usarmos o centro geométrico.
          // centerBiasY é proporcional à altura do objeto.
          orbit.target.set(center.x, center.y + (size.y * centerBiasY), center.z);

          const halfFovY = THREE.Math.degToRad(camera.fov * 0.5);
          const fitHeightDistance = (size.y * 0.5) / Math.tan(halfFovY);
          const fitWidthDistance = (size.x * 0.5) / (Math.tan(halfFovY) * camera.aspect);
          const distance = Math.max(fitHeightDistance, fitWidthDistance);

          // padding para sobrar espaço e não cortar nas bordas
          const padded = distance * padding;
          orbit.minRadius = Math.max(2.5, padded * 0.5);
          orbit.maxRadius = Math.max(orbit.minRadius + 1, padded * 3.0);
          setOrbitRadius(padded);

          camera.near = Math.max(0.05, padded / 100);
          camera.far = Math.max(80, padded * 10);
          camera.updateProjectionMatrix();
        } catch (e) {}
      };

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(5, 10, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Luz da lâmina: branca
      const lamp = new THREE.SpotLight(0xffffff, 8);
      lamp.position.set(0, 0.4, 0.8);
      lamp.target = stagePlate;
      lamp.angle = 0.6;
      lamp.penumbra = 0.4;
      lamp.castShadow = true;
      scene.add(lamp);

      // --- State ---
      const state = {
        orbitPos,
        isEyepieceMode: false,
        lightOn: true,
      };

      // UI bindings
      if (this.options.showUI) {
        this._uiEls.statusText = statusText;
        this._uiEls.statusText.textContent = 'Visão: Modo órbita';
        this._uiEls.btnView.addEventListener('click', (e) => {
          e.preventDefault();
          this._toggleEyepiece({ camera, orbit, applyOrbitToCamera, opticsGroup, armGroup, overlay, state, setSpecimenLensTexture });
        });

        this._uiEls.btnLight.addEventListener('click', (e) => {
          e.preventDefault();
          state.lightOn = !state.lightOn;
          lamp.intensity = state.lightOn ? 8 : 0;
          this._uiEls.btnLight.classList.toggle('active', state.lightOn);
          this._uiEls.btnLight.textContent = state.lightOn ? 'Luz: ON' : 'Luz: OFF';
        });
      }

      // Resize observer
      const resize = () => {
        if (this._disposed) return;
        const rect = this.host.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(clamp(window.devicePixelRatio || 1, 1, 2));
        renderer.setSize(w, h, false);

        // Re-enquadrar quando o viewport muda.
        if (!state.isEyepieceMode) frameToObject();
      };

      try {
        this._ro = new ResizeObserver(() => resize());
        this._ro.observe(this.host);
      } catch (e) {
        window.addEventListener('resize', resize, { passive: true });
        this._fallbackResizeHandler = resize;
      }

      resize();

      // Mark ready (hide fallback image if any)
      try {
        this.host.classList.add('microscope-ready');
        const card = this.host.closest('.menu-card');
        if (card) card.classList.add('microscope-ready');
      } catch (e) {}

      const animate = () => {
        if (this._disposed) return;
        this._raf = requestAnimationFrame(animate);

        // Apply UI-driven transforms
        let focusVal = 0.5;
        let xVal = 0;
        let yVal = 0;
        if (this.options.showUI) {
          focusVal = parseFloat(this._uiEls.focus.value);
          xVal = parseFloat(this._uiEls.x.value);
          yVal = parseFloat(this._uiEls.y.value);
        }

        stageGroup.position.y = 1.9 + (focusVal * 0.1);
        slideGroup.position.x = xVal;
        slideGroup.position.z = yVal;

        if (state.isEyepieceMode) {
          const dist = Math.abs(focusVal);
          renderer.domElement.style.filter = 'blur(' + (dist * 10) + 'px)';
        } else {
          renderer.domElement.style.filter = '';
          // câmera já é atualizada no drag; garantir lookAt em frames sem drag
          applyOrbitToCamera();
        }

        renderer.render(scene, camera);
      };

      animate();

      // Store references for dispose
      this._three = { THREE, scene, camera, renderer, lamp };
      this._orbitCleanup = () => {
        try { renderer.domElement.removeEventListener('pointerdown', onPointerDown); } catch (e) {}
        try { renderer.domElement.removeEventListener('pointermove', onPointerMove); } catch (e) {}
        try { renderer.domElement.removeEventListener('pointerup', onPointerUp); } catch (e) {}
        try { renderer.domElement.removeEventListener('pointercancel', onPointerUp); } catch (e) {}
        try { renderer.domElement.removeEventListener('wheel', onWheel); } catch (e) {}
        try { renderer.domElement.removeEventListener('contextmenu', onContextMenu); } catch (e) {}
      };
      this._groups = { opticsGroup, armGroup };
      this._state = state;
    }

    _buildUIPanel() {
      const panel = createEl('div', 'microscope-ui');

      const title = createEl('div', 'microscope-ui-title', { text: 'Controles do microscópio' });
      panel.appendChild(title);

      const btnView = createEl('button', 'microscope-btn microscope-btn-primary', { type: 'button' });
      btnView.textContent = 'Observar pela ocular';
      panel.appendChild(btnView);

      const focusGroup = createEl('div', 'microscope-control');
      focusGroup.appendChild(createEl('label', 'microscope-label', { text: 'Foco' }));
      const focus = createEl('input', 'microscope-range', { type: 'range', min: '-2', max: '2', step: '0.01', value: '0.5' });
      focusGroup.appendChild(focus);
      panel.appendChild(focusGroup);

      const xGroup = createEl('div', 'microscope-control');
      xGroup.appendChild(createEl('label', 'microscope-label', { text: 'X' }));
      const x = createEl('input', 'microscope-range', { type: 'range', min: '-0.4', max: '0.4', step: '0.001', value: '0' });
      xGroup.appendChild(x);
      panel.appendChild(xGroup);

      const yGroup = createEl('div', 'microscope-control');
      yGroup.appendChild(createEl('label', 'microscope-label', { text: 'Y' }));
      const y = createEl('input', 'microscope-range', { type: 'range', min: '-0.4', max: '0.4', step: '0.001', value: '0' });
      yGroup.appendChild(y);
      panel.appendChild(yGroup);

      const btnLight = createEl('button', 'microscope-btn microscope-btn-toggle active', { type: 'button' });
      btnLight.textContent = 'Luz: ON';
      panel.appendChild(btnLight);

      this._uiEls = {
        btnView,
        focus,
        x,
        y,
        btnLight,
        statusText: null,
      };

      return panel;
    }

    _toggleEyepiece(ctx) {
      const { camera, orbit, applyOrbitToCamera, opticsGroup, armGroup, overlay, state } = ctx;

      state.isEyepieceMode = !state.isEyepieceMode;

      if (state.isEyepieceMode) {
        // No modo "pela ocular", não exibir balões do assistente.
        try { document.body.classList.add('microscope-eyepiece-mode'); } catch (e) {}
        try {
          if (window.__anadixBalloon && typeof window.__anadixBalloon.hide === 'function') {
            window.__anadixBalloon.hide();
          }
        } catch (e) {}
        try { if (ctx && typeof ctx.setSpecimenLensTexture === 'function') ctx.setSpecimenLensTexture(true); } catch (e) {}
        camera.position.set(0, 4.5, 0.8);
        camera.lookAt(0, 0, 0.8);
        camera.fov = 15;
        camera.updateProjectionMatrix();

        if (orbit) orbit.enabled = false;
        opticsGroup.visible = false;
        armGroup.visible = false;

        this._uiEls.btnView.textContent = 'Sair da ocular';
        this._uiEls.btnView.classList.add('active');

        if (overlay) overlay.style.opacity = '1';
        const status = this.host.querySelector('.microscope-status');
        if (status) status.textContent = 'Visão: Pela ocular (ampliado)';
      } else {
        try { document.body.classList.remove('microscope-eyepiece-mode'); } catch (e) {}
        try { if (ctx && typeof ctx.setSpecimenLensTexture === 'function') ctx.setSpecimenLensTexture(false); } catch (e) {}
        camera.fov = 45;
        camera.updateProjectionMatrix();
        // volta para órbita
        if (orbit) orbit.enabled = true;
        try { applyOrbitToCamera(); } catch (e) {}
        opticsGroup.visible = true;
        armGroup.visible = true;

        this._uiEls.btnView.textContent = 'Observar pela ocular';
        this._uiEls.btnView.classList.remove('active');

        if (overlay) overlay.style.opacity = '0';
        const status = this.host.querySelector('.microscope-status');
        if (status) status.textContent = 'Visão: Modo órbita';
      }
    }

    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      try { document.body.classList.remove('microscope-eyepiece-mode'); } catch (e) {}
      try { cancelAnimationFrame(this._raf); } catch (e) {}
      try { if (this._ro) this._ro.disconnect(); } catch (e) {}
      try {
        if (this._fallbackResizeHandler) {
          window.removeEventListener('resize', this._fallbackResizeHandler);
        }
      } catch (e) {}

      try { if (this._orbitCleanup) this._orbitCleanup(); } catch (e) {}

      try {
        if (this._three && this._three.renderer) {
          this._three.renderer.dispose();
          const c = this._three.renderer.domElement;
          if (c && c.parentNode) c.parentNode.removeChild(c);
        }
      } catch (e) {}

      // Leave DOM cleanup to the caller (rendering logic usually replaces it)
      try { this.host.classList.remove('microscope-ready'); } catch (e) {}
    }
  }

  const instances = new Set();

  function mount(host, options) {
    if (!host) return null;
    try {
      if (host.__microscopeInstance) {
        try { host.__microscopeInstance.dispose(); } catch (e) {}
        try { instances.delete(host.__microscopeInstance); } catch (e) {}
        host.__microscopeInstance = null;
      }
    } catch (e) {}

    if (!hasThree()) return null;

    const inst = new MicroscopeInstance(host, options || {});
    host.__microscopeInstance = inst;
    instances.add(inst);
    return inst;
  }

  function disposeAll() {
    Array.from(instances).forEach((inst) => {
      try { inst.dispose(); } catch (e) {}
      try { instances.delete(inst); } catch (e) {}
    });
  }

  function initMenuMicroscope() {
    const host = document.getElementById('menuMicroscopeHost');
    if (!host) return;
    if (!hasThree()) return;

    // Menu: arrastar gira; toque/clique sem arrastar inicia a prática.
    let armed = true;
    const trigger = () => {
      if (!armed) return;
      armed = false;
      try {
        if (host.__microscopeInstance) {
          host.__microscopeInstance.dispose();
          instances.delete(host.__microscopeInstance);
          host.__microscopeInstance = null;
        }
      } catch (e) {}

      try {
        if (typeof window.startMode === 'function') {
          window.startMode('pratica');
        }
      } catch (e) {}
    };

    // Preset para iniciar como no screenshot: menor e mais "embaixo" no viewport.
    mount(host, {
      showUI: false,
      onTap: trigger,
      framePadding: 3.20,
      // Valor positivo empurra o objeto para baixo no viewport.
      // Para subir/centralizar, usamos um bias negativo.
      centerBiasY: -0.22,
      initialPhi: 1.25,
      initialTheta: 2.55,
    });
  }

  // Expose API for script.js
  window.Microscope3D = {
    mount,
    disposeAll,
  };

  document.addEventListener('DOMContentLoaded', () => {
    try { initMenuMicroscope(); } catch (e) {}
  });
})();
