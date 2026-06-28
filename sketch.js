let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let currentScene = "intro";

let isCrossfading = false;
let crossfadeStartTime = 0;
let crossfadeDuration = 0.9;
let crossfadeLead = 0.18;

let handPose;
let faceMesh;
let webcam;
let hands = [];
let faces = [];

let sawOpenHand = false;
let handWasClosed = false;
let lastHandGestureTime = 0;
let gestureCooldown = 1400;

let introSoundUnlocked = false;

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

function preload() {
  handPose = ml5.handPose({ maxHands: 1 });
  faceMesh = ml5.faceMesh({ maxFaces: 1, refineLandmarks: false });
}

function setup() {
  cnv = createCanvas(W, H);
  pixelDensity(1);
  fitCanvasToWindow();

  loadVideos();
  setupCamera();

  playIntroLoop();
}

function draw() {
  background(245);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  updateCameraInteraction();
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
  video.el.volume = volumeLevel;
  video.el.playsInline = true;
  video.el.preload = "auto";

  video.el.setAttribute("muted", "");
  video.el.setAttribute("playsinline", "");
  video.el.setAttribute("webkit-playsinline", "");

  video.el.load();

  return video;
}

function setupCamera() {
  webcam = createCapture({
    video: {
      width: 640,
      height: 360
    },
    audio: false
  });

  webcam.hide();

  handPose.detectStart(webcam, gotHands);
  faceMesh.detectStart(webcam, gotFaces);
}

function gotHands(results) {
  hands = results;
}

function gotFaces(results) {
  faces = results;
}

function updateCameraInteraction() {
  if (currentScene === "intro") {
    detectFaceForSound();
    detectOpenCloseHandToContinue();
  }
}

function detectFaceForSound() {
  if (introSoundUnlocked) return;

  if (faces.length > 0) {
    unlockIntroSound();
  }
}

function unlockIntroSound() {
  let intro = videos.intro.el;

  intro.muted = false;
  intro.volume = videos.intro.volume;

  intro.play()
    .then(function () {
      introSoundUnlocked = true;
    })
    .catch(function (err) {
      console.log("Intro sound unlock blocked:", err);
    });
}

function detectOpenCloseHandToContinue() {
  if (hands.length === 0) return;

  let hand = hands[0];
  let state = getHandOpenCloseState(hand);

  if (state === "open") {
    sawOpenHand = true;
    handWasClosed = false;
  }

  if (
    state === "closed" &&
    sawOpenHand &&
    !handWasClosed &&
    millis() - lastHandGestureTime > gestureCooldown
  ) {
    handWasClosed = true;
    sawOpenHand = false;
    lastHandGestureTime = millis();

    playIntroTo01();
  }
}

function getHandOpenCloseState(hand) {
  let wrist = getHandPoint(hand, 0);

  let indexTip = getHandPoint(hand, 8);
  let indexPip = getHandPoint(hand, 6);

  let middleTip = getHandPoint(hand, 12);
  let middlePip = getHandPoint(hand, 10);

  let ringTip = getHandPoint(hand, 16);
  let ringPip = getHandPoint(hand, 14);

  let pinkyTip = getHandPoint(hand, 20);
  let pinkyPip = getHandPoint(hand, 18);

  if (
    !wrist ||
    !indexTip ||
    !indexPip ||
    !middleTip ||
    !middlePip ||
    !ringTip ||
    !ringPip ||
    !pinkyTip ||
    !pinkyPip
  ) {
    return "unknown";
  }

  let extendedCount = 0;

  if (isFingerExtended(wrist, indexTip, indexPip)) extendedCount++;
  if (isFingerExtended(wrist, middleTip, middlePip)) extendedCount++;
  if (isFingerExtended(wrist, ringTip, ringPip)) extendedCount++;
  if (isFingerExtended(wrist, pinkyTip, pinkyPip)) extendedCount++;

  if (extendedCount >= 3) return "open";
  if (extendedCount <= 1) return "closed";

  return "middle";
}

function isFingerExtended(wrist, tip, pip) {
  let tipDist = dist(wrist.x, wrist.y, tip.x, tip.y);
  let pipDist = dist(wrist.x, wrist.y, pip.x, pip.y);

  return tipDist > pipDist * 1.08;
}

function getHandPoint(hand, index) {
  if (hand.keypoints && hand.keypoints[index]) {
    return hand.keypoints[index];
  }

  if (hand.landmarks && hand.landmarks[index]) {
    return {
      x: hand.landmarks[index][0],
      y: hand.landmarks[index][1]
    };
  }

  return null;
}

function playIntroLoop() {
  currentScene = "intro";
  isCrossfading = false;

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

function playIntroTo01() {
  currentScene = "introTo01";
  isCrossfading = false;

  stopAllVideos();

  let video = videos.introTo01;

  video.el.loop = false;
  video.el.removeAttribute("muted");
  video.el.muted = false;
  video.el.volume = video.volume;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("Play intro_to_01 failed:", err);
  });
}

function checkAutoTransition() {
  if (currentScene !== "introTo01") return;
  if (isCrossfading) return;

  let video = videos.introTo01.el;

  if (!video.duration) return;

  let timeLeft = video.duration - video.currentTime;

  if (timeLeft <= crossfadeDuration + crossfadeLead) {
    startCrossfadeToScene01Hand();
  }
}

function startCrossfadeToScene01Hand() {
  isCrossfading = true;
  crossfadeStartTime = millis();

  let nextVideo = videos.scene01Hand;

  nextVideo.el.loop = false;
  nextVideo.el.removeAttribute("muted");
  nextVideo.el.muted = false;
  nextVideo.el.volume = 0;

  try {
    nextVideo.el.currentTime = 0;
  } catch (e) {}

  nextVideo.el.play().catch(function (err) {
    console.log("Play scene01_hand failed:", err);
  });
}

function finishCrossfadeToScene01Hand() {
  videos.introTo01.el.pause();
  videos.introTo01.el.volume = videos.introTo01.volume;

  videos.scene01Hand.el.removeAttribute("muted");
  videos.scene01Hand.el.muted = false;
  videos.scene01Hand.el.volume = videos.scene01Hand.volume;

  currentScene = "scene01Hand";
  isCrossfading = false;
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
    if (isCrossfading) {
      drawCrossfade("introTo01", "scene01Hand");
    } else {
      drawVideo("introTo01");
    }
  }

  if (currentScene === "scene01Hand") {
    drawVideo("scene01Hand");
  }
}

function drawCrossfade(fromId, toId) {
  let p = (millis() - crossfadeStartTime) / (crossfadeDuration * 1000);
  p = constrain(p, 0, 1);

  let fromVideo = videos[fromId];
  let toVideo = videos[toId];

  fromVideo.el.volume = fromVideo.volume * (1 - p);
  toVideo.el.volume = toVideo.volume * p;

  drawVideo(fromId, 1 - p);
  drawVideo(toId, p);

  if (p >= 1) {
    finishCrossfadeToScene01Hand();
  }
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
