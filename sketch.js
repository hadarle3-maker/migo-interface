let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let currentScene = "logoLoop";

let isCrossfading = false;
let crossfadeStartTime = 0;
let crossfadeDuration = 0.9;
let crossfadeLead = 0.18;
let activeTransition = null;

const VIDEO_FILES = {
  logoLoop: {
    src: "assets/videos/logo_loop.mp4",
    volume: 0
  },

  logoToScene01: {
    src: "assets/videos/logo_to_secen_01.mp4",
    volume: 0
  },

  scene01: {
    src: "assets/videos/secen_01.mp4",
    volume: 0
  }
};

function setup() {
  cnv = createCanvas(W, H);
  pixelDensity(1);
  fitCanvasToWindow();

  loadVideos();
  playLogoLoop();
}

function draw() {
  background(0);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  checkAutoTransition();
  drawCurrentScene();
}

function loadVideos() {
  for (let id in VIDEO_FILES) {
    videos[id] = createVideoElement(
      id,
      VIDEO_FILES[id].src,
      VIDEO_FILES[id].volume
    );
  }
}

function createVideoElement(id, src, volumeLevel) {
  let video = {
    id: id,
    src: src,
    volume: volumeLevel,
    el: document.createElement("video")
  };

  video.el.src = src;
  video.el.loop = false;
  video.el.muted = true;
  video.el.volume = 0;
  video.el.playsInline = true;
  video.el.preload = "auto";

  video.el.setAttribute("muted", "");
  video.el.setAttribute("playsinline", "");
  video.el.setAttribute("webkit-playsinline", "");

  video.el.load();

  video.el.addEventListener("error", function () {
    console.log("VIDEO ERROR:", id, src, video.el.error);
  });

  video.el.addEventListener("loadeddata", function () {
    console.log("VIDEO LOADED:", id, src);
  });

  return video;
}

function playLogoLoop() {
  currentScene = "logoLoop";
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();

  let video = videos.logoLoop;

  video.el.loop = true;
  video.el.muted = true;
  video.el.volume = 0;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("Logo loop play failed:", err);
  });
}

function playLogoToScene01() {
  currentScene = "logoToScene01";
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();

  playVideo("logoToScene01", false);
}

function playVideo(id, loopIt) {
  let video = videos[id];

  if (!video) {
    console.log("Missing video:", id);
    return;
  }

  video.el.loop = loopIt;
  video.el.muted = true;
  video.el.volume = 0;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("Play failed:", id, err);
  });
}

function checkAutoTransition() {
  if (isCrossfading) return;

  if (currentScene === "logoToScene01") {
    checkVideoEndForCrossfade(
      "logoToScene01",
      "scene01",
      ["scene01"],
      false,
      "videoToVideo"
    );
  }
}

function checkVideoEndForCrossfade(
  fromVideoId,
  nextScene,
  toVideoIds,
  loopTargets,
  transitionType
) {
  let video = videos[fromVideoId].el;

  if (!video.duration) return;

  let timeLeft = video.duration - video.currentTime;

  if (timeLeft <= crossfadeDuration + crossfadeLead) {
    startAutoCrossfade(
      fromVideoId,
      nextScene,
      toVideoIds,
      loopTargets,
      transitionType
    );
  }
}

function startAutoCrossfade(
  fromVideoId,
  nextScene,
  toVideoIds,
  loopTargets,
  transitionType
) {
  isCrossfading = true;
  crossfadeStartTime = millis();

  activeTransition = {
    type: transitionType,
    fromVideoId: fromVideoId,
    toVideoIds: toVideoIds,
    nextScene: nextScene
  };

  currentScene = nextScene;

  for (let i = 0; i < toVideoIds.length; i++) {
    let id = toVideoIds[i];
    let video = videos[id];

    if (!video) {
      console.log("Missing next video:", id);
      continue;
    }

    video.el.loop = loopTargets;
    video.el.muted = true;
    video.el.volume = 0;

    try {
      video.el.currentTime = 0;
    } catch (e) {}

    video.el.play().catch(function (err) {
      console.log("Play next failed:", id, err);
    });
  }
}

function finishCrossfade() {
  if (!activeTransition) return;

  let fromVideoId = activeTransition.fromVideoId;

  if (fromVideoId && videos[fromVideoId]) {
    videos[fromVideoId].el.pause();
  }

  currentScene = activeTransition.nextScene;

  isCrossfading = false;
  activeTransition = null;
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();

    try {
      videos[id].el.currentTime = 0;
    } catch (e) {}
  }
}

function drawCurrentScene() {
  if (isCrossfading) {
    drawCrossfade();
    return;
  }

  if (currentScene === "logoLoop") {
    drawVideo("logoLoop");
  }

  if (currentScene === "logoToScene01") {
    drawVideo("logoToScene01");
  }

  if (currentScene === "scene01") {
    drawVideo("scene01");
  }
}

function drawCrossfade() {
  if (!activeTransition) return;

  let p = (millis() - crossfadeStartTime) / (crossfadeDuration * 1000);
  p = constrain(p, 0, 1);

  drawVideoToVideoCrossfade(p);

  if (p >= 1) {
    finishCrossfade();
  }
}

function drawVideoToVideoCrossfade(p) {
  let fromVideoId = activeTransition.fromVideoId;
  let toVideoId = activeTransition.toVideoIds[0];

  drawVideo(fromVideoId, 1 - p);
  drawVideo(toVideoId, p);
}

function drawVideo(id, alpha = 1) {
  let video = videos[id];

  if (!video) return;

  if (video.el.readyState > 0) {
    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawingContext.drawImage(video.el, 0, 0, W, H);
    drawingContext.restore();
  }
}

function fitCanvasToWindow() {
  let scale = min(windowWidth / W, windowHeight / H);
  let displayW = W * scale;
  let displayH = H * scale;

  cnv.elt.style.width = displayW + "px";
  cnv.elt.style.height = displayH + "px";
  cnv.elt.style.position = "absolute";
  cnv.elt.style.left = (windowWidth - displayW) / 2 + "px";
  cnv.elt.style.top = (windowHeight - displayH) / 2 + "px";
}

function windowResized() {
  fitCanvasToWindow();
}

function keyPressed() {
  if (key === " " && currentScene === "logoLoop") {
    playLogoToScene01();
  }
}

function mousePressed() {
  if (currentScene === "logoLoop") {
    playLogoToScene01();
  }
}
