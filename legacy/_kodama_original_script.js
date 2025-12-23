var features = {

  // False removes vines from DOM
  vines: true,
  
  // False removes mushrooms from DOM
  shrooms: true,

  // False removes fireflies from DOM
  fireflies: true,
  
  // False removes sunray layer from DOM
  sunrays: false,

  // False removes all elements with a filter from DOM
  // Includes anything blurry, glowy & shadowy
  // Visually nice but costly stuff
  filters: true,
  
  // False removes transparency from the little Kodamas
  transparency: true,
  
  // True allows elements to be animated
  vinesMotion: true,
  shroomsMotion: true,
  textMotion: true,

  // True allows parallaxing mouse interaction
  mouseAction: true,
  
  // Never got implemented – killed darling
  shroomTrip: true,

  init: function() {
    // If touch device, switch off all fanciness
    if (Modernizr.touchevents){
      this.vines = false;
      this.shrooms = false;
      this.fireflies = false;
      this.sunrays = false;
      this.filters = false;
      this.transparency = false;
      this.vinesMotion = false;
      this.shroomsMotion = false;
      this.textMotion = false;
      this.mouseAction = false;
      this.shroomTrip = false;
    }
  }
};

var o = {
  init: function() {
    o.cacheDOM();
    o.bindEvents();
    o.settings();
    o.resetStart();
    o.animate();
  },
  cacheDOM: function() {
    o.svg = document.querySelector("[data-svg=artwork]");
    o.audio = document.querySelector("[data-audio=group]");
    
    o.elements = [
      "sunray"
      ];
    o.lists = [
      "layers",
      "glows",
      "kodamas",
      "kodamaGlows",
      "heads",
      "fireflyGroups",
      "fireflies",
      "vines",
      "shrooms",
      "shroomGroups",
      "texts",
      "textsMobile"
      ];
    o.el = {};
    o.li = {};

    for (var i = 0; i < o.elements.length; i++) { o.el[o.elements[i]] = o.svg.querySelector("[data-kodama=" + o.elements[i] + "]"); }
    for (var j = 0; j < o.lists.length; j++) { o.li[o.lists[j]] = o.svg.querySelectorAll("[data-kodama=" + o.lists[j] + "]"); }

    o.li.offsetLayers = o.svg.querySelectorAll("[data-hax=offsetLayers]");
    o.li.filters = o.svg.querySelectorAll("[filter]");
 
    o.muteButton = document.querySelector("[data-btn=mute]");
    o.replayButton = document.querySelector("[data-btn=replay]");

    o.ambientAudio = o.audio.querySelector("[data-audio=ambient]");
    o.spinAudio1 = o.audio.querySelector("[data-audio=spin1]");
    o.spinAudio2 = o.audio.querySelector("[data-audio=spin2]");
    o.spinAudio3 = o.audio.querySelector("[data-audio=spin3]");
  },
  settings: function() {
    features.init();
    // Parallax settings
    o.vw = 0;
    o.vh = 0;
    o.layerObj = [];
    o.resize();
    o.mouse = { x: o.vw/2, y: o.vh/2 };
    o.acceleration = { val: 0 };
    
    // other stuff
    o.isMute = false;
    o.tl = null;
    TweenMax.set(o.li.kodamas[0], { scale: 0.8, transformOrigin: "bottom center" });
    o.kodamaTransparency = 0.65;

    // Set transparency of glowy blob things
    var opacity = [0.65, 0.75, 0.75, 0.45, 0.6, 0.65, 0.75, 1 ];
    for (var i = 0; i < o.li.glows.length; i++) {
      TweenMax.set(o.li.glows[i], { autoAlpha: opacity[i] });
    }
  },
  bindEvents: function() {
    o.muteButton.addEventListener("click", o.toggleAudio);
    o.replayButton.addEventListener("click", o.replay);
    window.addEventListener("resize", o.resize);
  },
  resetStart: function() {
    o.killTls();
    o.resetStartPosLayers();
    o.resetExtras();
  },
  animate: function() {
    o.initExtras();
    o.revealScene();
    o.playMusic();
    o.playTimeline();
  },
  toggleAudio: function() {
    if (o.ambientAudio.volume === 0) {
      o.ambientAudio.volume = 0.1;
      o.spinAudio1.volume = 1;
      o.spinAudio2.volume = 1;
      o.spinAudio3.volume = 1;
      o.isMute = false;
    } else {
      o.ambientAudio.volume = 0;
      o.spinAudio1.volume = 0;
      o.spinAudio2.volume = 0;
      o.spinAudio3.volume = 0;
      o.isMute = true;
    }
  },
  replay: function() {
    o.resetStart();
    o.animate();
  },
  killTls: function() {
    if (o.tl !== null) {
      o.tl.kill();  
    }
  },
  resetStartPosLayers: function() {
    TweenMax.set(o.li.layers[0], { y: -0 });
    TweenMax.set(o.li.layers[1], { y: -50 });
    TweenMax.set(o.li.layers[2], { y: -100 });
    TweenMax.set(o.li.layers[3], { y: -200 });
    TweenMax.set(o.li.layers[4], { y: -300 });
    TweenMax.set(o.li.layers[5], { y: -300 });
    TweenMax.set(o.li.layers[6], { y: -400 });
    TweenMax.set(o.li.layers[7], { y: -500 });

    TweenMax.set(o.li.offsetLayers, { x: -50 });
  },
  resetExtras: function() {
    // Reset acceleration value
    TweenMax.set(o.acceleration, { val: 0 });
    // Hide elements
    TweenMax.set([o.svg, o.li.kodamas, o.li.texts, o.li.textsMobile, o.el.sunray], { autoAlpha: 0 });
  },
  revealScene: function() {
    TweenMax.to(o.svg, 1, { autoAlpha: 1 });
  },
  playTimeline: function() {
    o.tl = o.getTimeline();
    o.tl.play();
  },
  playMusic: function() {
    if (o.isMute) {
      o.ambientAudio.volume = 0;
    } else {
      o.ambientAudio.volume = 0.1;  
    }
    o.ambientAudio.currentTime = 0;
    o.ambientAudio.play();
  },
  initExtras: function() {
    // Call if false
    if (!features.vines) { o.removeVines(); }
    if (!features.shrooms) { o.removeShrooms(); }
    if (!features.fireflies) { o.removeFireflies(); } else { o.playFireflies(); }
    if (!features.sunrays) { o.removeSunrays(); } //else { o.playSunrays(); }
    if (!features.filters) { o.removeFilters(); }
    if (!features.transparency) { o.removeTransparency(); }
    if (!features.mouseAction) { o.playIntro(); }
    
    // Call if true
    if (features.vinesMotion) { o.playVines(); }
    if (features.shroomsMotion) { o.playShrooms(); }
    if (features.textMotion) { o.playText(); }
    if (features.mouseAction) { o.bindParallax(); }
    if (features.shroomTrip) { o.bindShrooms(); }
  },
  getTimeline: function() {
    var tl = new TimelineMax({ paused: true });

    tl
      .add("revealKodamas")
      .to(o.li.kodamas[0], 3, { autoAlpha: o.kodamaTransparency, ease: Power3.easeOut}, 7)
      .to(o.li.kodamas[1], 3, { autoAlpha: o.kodamaTransparency, ease: Power3.easeOut}, 9.5)
      .to(o.li.kodamas[2], 3, { autoAlpha: o.kodamaTransparency, ease: Power3.easeOut}, 10.5)

      .add("revealTitle")
      .to(o.li.texts[0], 3, { autoAlpha: 1, ease: Power3.easeOut}, 11.3)
      .to(o.li.texts[1], 3, { autoAlpha: 0.7, ease: Power3.easeOut}, 12.2)
      .to(o.el.sunray, 3, { autoAlpha: 0.2 }, 10)

      .add("spinHeads")
      .add("spin1")
      .to(o.li.heads[0], 2, {rotation: 90, transformOrigin: "center center"}, "spin1")
      .to(o.li.heads[0], 2, {rotation: 0, ease: Elastic.easeOut.config(1.5, 0.1), transformOrigin: "center center"}, "spin1 =+2")
      .call(o.playSFX, [o.spinAudio1], this, "spin1")
      .add("spin2", "spin1 =+2")
      .to(o.li.heads[1], 2, {rotation: 90, transformOrigin: "center center"}, "spin2")
      .to(o.li.heads[1], 2, {rotation: 0, ease: Elastic.easeOut.config(1.5, 0.1), transformOrigin: "center center"}, "spin2 =+2")
      .call(o.playSFX, [o.spinAudio2], this, "spin2")
      .add("spin3", "spin1 =+2.3")
      .to(o.li.heads[2], 2, {rotation: 90, transformOrigin: "center center"}, "spin3")
      .to(o.li.heads[2], 2, {rotation: 0, ease: Elastic.easeOut.config(1.5, 0.1), transformOrigin: "center center"}, "spin3 =+2")
      .call(o.playSFX, [o.spinAudio3], this, "spin3")
      ;

    return tl;
  },
  playSFX: function(audio) {
    if (o.isMute) {
      audio.volume = 0;  
    }
    audio.currentTime = 0;
    audio.play(); 
  },
  removeVines: function() {
    if(o.li.shroomGroups[0].parentNode) {
      for (var i = 0; i < o.li.vines.length; i++) {
        o.li.vines[i].parentNode.removeChild(o.li.vines[i]);
      }
    }
  },
  playVines: function() {
    for (var i = 0; i < o.li.vines.length; i++) {
      o.swingVine(i);
    }
  },
  swingVine: function(i) {
    var duration = random(3,5);
    var rotation = random(-5,5);

    TweenMax.to(o.li.vines[i], duration, {
      rotation: rotation,
      transformOrigin: "top center",
      ease: Power1.easeInOut,
      onComplete: o.swingVine,
      onCompleteParams: [i]
    });
  },
  removeShrooms: function() {
    if(o.li.shroomGroups[0].parentNode) {
      for (var i = 0; i < o.li.shroomGroups.length; i++) {
        o.li.shroomGroups[i].parentNode.removeChild(o.li.shroomGroups[i]);
      }
    }
  },
  playShrooms: function() {
    for (var i = 0; i < o.li.shrooms.length; i++) {
      o.pulseShroom(i);
    }
  },
  pulseShroom: function(i) {
    var duration = random(0.5,1);
    var scale = random(1.1,1.3);
    var delay = random(1,4);

    TweenMax.to(o.li.shrooms[i], duration, {
      scale: scale,
      transformOrigin: "center center",
      ease: SlowMo.ease.config(0.1, 0.1, true),
      delay: delay,
      onComplete: o.pulseShroom,
      onCompleteParams: [i]
    });
  },
  bindShrooms: function() {
    for (var i = 0; i < o.li.shroomGroups.length; i++) {
      o.li.shroomGroups[i].addEventListener("click", o.eatShroom);
    }
  },
  eatShroom: function() {

    console.log("Trippy colors, unproportional scale, reverse movement");
  },
  removeFireflies: function() {
    if(o.li.fireflyGroups[0].parentNode) {
      for (var i = 0; i < o.li.fireflyGroups.length; i++) {
        o.li.fireflyGroups[i].parentNode.removeChild(o.li.fireflyGroups[i]);
      }
    }
  },
  playFireflies: function() {
    TweenMax.set(o.li.fireflyGroups, { autoAlpha: 1 });
    for (var i = 0; i < o.li.fireflyGroups.length; i++) {
      o.newFireflyGroupPos(i);
    }

    for (var j = 0; j < o.li.fireflies.length; j++) {
      o.newFireflyPos(j);
    }
  },
  newFireflyGroupPos: function(i) {

    var duration = random(1,5);
    var rotation = random(0,360);
    var scale = random(0.5,1);
    var x = [random(1250,1350), random(1050,1150)];
    var y = [random(25,100), random(325,400)];

    TweenMax.to(
      o.li.fireflyGroups[i], 
      duration, {
        rotation: rotation[i],
        scale: scale,
        x: x[i],
        y: y[i],
        ease: Power1.easeInOut,
        onComplete: o.newFireflyGroupPos,
        onCompleteParams: [i]
      }
    );
  },
  newFireflyPos: function(i) {

    var duration = random(5,7);
    var x = [
      random(-45,45),
      random(-45,45),
      random(-45,45),
      random(-45,45),
      random(-45,45)
      ];
  
    TweenMax.to(o.li.fireflies[i], duration, {
      bezier: { curviness:1, values: [
        { x: x[0], y: x[1] },
        { x: x[1], y: x[2] },
        { x: x[2], y: x[3] },
        { x: x[3], y: x[4] },
        { x: x[4], y: x[0] }
      ]},
      scale: random(0.2,1.3),
      autoAlpha: random(0.7,1),
      ease: Linear.easeNone,
      onComplete: o.newFireflyPos,
      onCompleteParams: [i]
    });
  },
  removeSunrays: function() {
    if(o.el.sunray.parentNode) {
      o.el.sunray.parentNode.removeChild(o.el.sunray);
    }
  },
  removeFilters: function() {
    if(o.li.filters[0].parentNode) {
      for (var i = 0; i < o.li.filters.length; i++) {
        o.li.filters[i].parentNode.removeChild(o.li.filters[i]);
      }
    }
  },
  removeTransparency: function() {

    o.kodamaTransparency = 1;
  },
  playText: function() {
    TweenMax.to(o.li.texts[0], 6, { y: 20, ease: Power1.easeInOut, repeat: -1, yoyo: true });
    TweenMax.to(o.li.texts[1], 6, { y: 20, ease: Power1.easeInOut, repeat: -1, yoyo: true, delay: 1.8 });
  },
  playIntro: function() {

    TweenMax.to(o.li.layers, 9, { y: 50, ease: Back.easeOut });
  },
  resize: function() {
    o.vw = window.innerWidth;
    o.vh = window.innerHeight;
  },
  bindParallax: function() {
    o.svg.addEventListener("mousemove", o.updateMouseObj);
    o.svg.addEventListener("touchmove", o.updateMouseObj);
    
    TweenMax.to(o.acceleration, 10, { val: 0.05, ease: Linear.easeNone });
    
    for (var i = 0; i < o.li.layers.length; i++) {
      o.linkLayer(i);
    }
  },
  linkLayer: function(i) {
    var offset = 20*i;
    
    o.layerObj[i] = {
      pos: o.li.layers[i]._gsTransform,
      x: 0,
      xMin: offset,
      xMax: -offset,
      y: 0,
      yMin: offset,
      yMax: -offset
    };
    
    TweenMax.to(o.li.layers[i], 1000, { x: 0, y: 0, repeat: -1, ease: Linear.easeNone,
      modifiers: {
        x: function() {
          o.layerObj[i].x = map(o.mouse.x, 0, o.vw, o.layerObj[i].xMin, o.layerObj[i].xMax);
          return o.layerObj[i].pos.x + ( o.layerObj[i].x - o.layerObj[i].pos.x ) * o.acceleration.val;
        },
        y: function() {
          o.layerObj[i].y = map(o.mouse.y, 0, o.vw, o.layerObj[i].yMin, o.layerObj[i].yMax);
          return o.layerObj[i].pos.y + ( o.layerObj[i].y - o.layerObj[i].pos.y ) * o.acceleration.val;
        }
      }
    });
  },
  updateMouseObj: function(e) {
    if (e.targetTouches && e.targetTouches[0]) {
      e.preventDefault();
      o.mouse.x = e.targetTouches[0].clientX;
      o.mouse.y = e.targetTouches[0].clientY;           
    } else {
      o.mouse.x = e.clientX;
      o.mouse.y = e.clientY;
    }
  }
};

window.addEventListener("load", o.init);




function random(min, max) {
  if (max === null) { max = min; min = 0; }
  return Math.random() * (max - min) + min;
}

function map(value, sourceMin, sourceMax, destinationMin, destinationMax) {
  return destinationMin + (destinationMax - destinationMin) * ((value - sourceMin) / (sourceMax - sourceMin)) || 0;
}