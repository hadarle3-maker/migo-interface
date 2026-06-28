let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let currentScene = "intro";

const VIDEO_FILES = {
  intro: {
    src: "assets/videos/intro.mp4",
    volume: 1
  },

  introTo01: {
    src: "assets/videos/intro_to_01.mp4",
    volume: 1
  },

  scene01Hand: {
    src: "assets/videos/secne01_hand.mp4",
    volume: 1
  },

  back02: {
    src: "assets/videos/back_02.mp4",
    volume: 1
  },

  blob: {
    src: "assets/videos/blob_v2.webm",
    volume: 0
  }
};

function setup() {
  cnv = createCanvas(W, H);
  pixelDensity(1);
  fitCanvasToWindow();

  loadVideos();

  window.addEventListener("keydown", handleKey);

  playIntroLoop();
}

function draw() {
  background(245);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

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
  video.el.volume = volumeLevel;
  video.el.playsInline = true;
  video.el.preload = "auto";

  video.el.setAttribute("muted", "");
  video.el.setAttribute("playsinline", "");
  video.el.setAttribute("webkit-playsinline", "");

  video.el.addEventListener("ended", function () {
    onVideoEnded(id);
  });

  video.el.load();

  return video;
}

function playIntroLoop() {
  currentScene = "intro";
  stopAllVideos();

  let intro = videos.intro;

  intro.el.loop = true;
  intro.el.muted = true;
  intro.el.volume = 0;

  try {
    intro.el.currentTime = 0;
  } catch (e) {}

  intro.el.play().catch(function (err) {
    console.log("Intro autoplay failed:", err);
  });
}

function handleKey(e) {
  if (e.key === "Enter") {
    playIntroTo01();
  }
}

function playIntroTo01() {
  currentScene = "introTo01";
  stopAllVideos();

  let video = videos.introTo01;

  video.el.loop = false;
  video.el.muted = false;
  video.el.volume = video.volume;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("Play intro_to_01 failed:", err);
  });
}

function playScene01Hand() {
  currentScene = "scene01Hand";
  stopAllVideos();

  let video = videos.scene01Hand;

  video.el.loop = false;
  video.el.muted = false;
  video.el.volume = video.volume;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("Play scene01_hand failed:", err);
  });
}

function onVideoEnded(videoId) {
  if (currentScene === "introTo01" && videoId === "introTo01") {
    playScene01Hand();
  }
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
  if (currentScene === "intro") {
    drawVideo("intro");
  }

  if (currentScene === "introTo01") {
    drawVideo("introTo01");
  }

  if (currentScene === "scene01Hand") {
    drawVideo("scene01Hand");
  }
}

function drawVideo(id) {
  let video = videos[id];

  if (!video) return;

  if (video.el.readyState > 0) {
    drawingContext.drawImage(video.el, 0, 0, W, H);
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
