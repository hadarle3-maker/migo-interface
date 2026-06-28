let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let currentScene = "intro";

let isCrossfading = false;
let crossfadeStartTime = 0;
let crossfadeDuration = 0.9;
let crossfadeLead = 0.18;

let crossfadeFrom = null;
let crossfadeTo = [];

let handPose;
let faceMesh;
let webcam;
let hands = [];
let faces = [];

let gesturePhase = "waitingOpen";
let openSince = 0;
let closedSince = 0;
let openHoldTime = 350;
let closedHoldTime = 250;
let lastHandGestureTime = 0;
let gestureCooldown = 1400;

let introSoundUnlocked = false;

let pronounFont;

let pronounTextSize = 200;
let pronounTracking = -10;

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

  scene02Full: {
    src: "assets/videos/secen02_full.mp4",
    volume: 1
  },

  scene02BackLoop: {
    src: "assets/videos/secen02_back_loop.mp4",
    volume: 1
  },

  scene02BlobLoop: {
    src: "assets/videos/scene02_loop.webm",
    volume: 0
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

const PRONOUN_TEXTS = [
  {
    label: "They",
    x: 1040,
    y: 150
  },
  {
    label: "He",
    x: 615,
    y: 489
  },
  {
    label: "She",
    x: 1375,
    y: 460
  }
];

function preload() {
  handPose = ml5.handPose({ maxHands: 1 });
  faceMesh = ml5.faceMesh({ maxFaces: 1, refineLandmarks: false });

  pronounFont = loadFont("assets/fonts/TheBasics_Corporate-LightItalic.ttf");
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
  if (currentScene !== "intro") return;
  if (isCrossfading) return;

  if (hands.length === 0) {
    gesturePhase = "waitingOpen";
    openSince = 0;
    closedSince = 0;
    return;
  }

  let hand = hands[0];
  let state = getHandOpenCloseState(hand);
  let now = millis();

  if (gesturePhase === "waitingOpen") {
    if (state === "open") {
      if (openSince === 0) {
        openSince = now;
      }

      if (now - openSince > openHoldTime) {
        gesturePhase = "waitingClosed";
        closedSince = 0;
      }
    } else {
      openSince = 0;
    }
  }

  if (gesturePhase === "waitingClosed") {
    if (state === "closed") {
      if (closedSince === 0) {
        closedSince = now;
      }

      if (
        now - closedSince > closedHoldTime &&
        now - lastHandGestureTime > gestureCooldown
      ) {
        lastHandGestureTime = now;

        gesturePhase = "waitingOpen";
        openSince = 0;
        closedSince = 0;

        playIntroTo01();
      }
    } else {
      closedSince = 0;
    }
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

  playVideo("introTo01", false, videos.introTo01.volume);
}

function playVideo(id, loopIt, volumeLevel) {
  let video = videos[id];

  if (!video) return;

  video.el.loop = loopIt;
  video.el.removeAttribute("muted");
  video.el.muted = false;
  video.el.volume = volumeLevel;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("Play failed:", id, err);
  });
}

function checkAutoTransition() {
  if (isCrossfading) return;

  if (currentScene === "introTo01") {
    checkVideoEndForCrossfade(
      "introTo01",
      "scene01Hand",
      ["scene01Hand"],
      false
    );
  }

  if (currentScene === "scene01Hand") {
    checkVideoEndForCrossfade(
      "scene01Hand",
      "scene02Full",
      ["scene02Full"],
      false
    );
  }

  if (currentScene === "scene02Full") {
    checkVideoEndForCrossfade(
      "scene02Full",
      "scene02Loop",
      ["scene02BackLoop", "scene02BlobLoop"],
      true
    );
  }
}

function checkVideoEndForCrossfade(fromVideoId, nextSceneName, toVideoIds, loopTargets) {
  let video = videos[fromVideoId].el;

  if (!video.duration) return;

  let timeLeft = video.duration - video.currentTime;

  if (timeLeft <= crossfadeDuration + crossfadeLead) {
    startCrossfade(fromVideoId, nextSceneName, toVideoIds, loopTargets);
  }
}

function startCrossfade(fromVideoId, nextSceneName, toVideoIds, loopTargets) {
  isCrossfading = true;
  crossfadeStartTime = millis();

  crossfadeFrom = fromVideoId;
  crossfadeTo = toVideoIds;

  currentScene = nextSceneName;

  for (let i = 0; i < toVideoIds.length; i++) {
    let id = toVideoIds[i];
    let video = videos[id];

    video.el.loop = loopTargets;
    video.el.removeAttribute("muted");
    video.el.muted = false;
    video.el.volume = 0;

    try {
      video.el.currentTime = 0;
    } catch (e) {}

    video.el.play().catch(function (err) {
      console.log("Play failed:", id, err);
    });
  }
}

function finishCrossfade() {
  if (crossfadeFrom && videos[crossfadeFrom]) {
    videos[crossfadeFrom].el.pause();
    videos[crossfadeFrom].el.volume = videos[crossfadeFrom].volume;
  }

  for (let i = 0; i < crossfadeTo.length; i++) {
    let id = crossfadeTo[i];

    if (videos[id]) {
      videos[id].el.volume = videos[id].volume;
    }
  }

  if (
    crossfadeTo.length === 2 &&
    crossfadeTo[0] === "scene02BackLoop" &&
    crossfadeTo[1] === "scene02BlobLoop"
  ) {
    currentScene = "scene02Loop";
  }

  isCrossfading = false;
  crossfadeFrom = null;
  crossfadeTo = [];
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();

    try {
      videos[id].el.currentTime = 0;
    } catch (e) {}

    videos[id].el.volume = videos[id].volume;
  }
}

function drawCurrentScene() {
  if (isCrossfading) {
    drawCrossfade();
    return;
  }

  if (currentScene === "intro") {
    drawVideo("intro");
  }

  if (currentScene === "introTo01") {
    drawVideo("introTo01");
  }

  if (currentScene === "scene01Hand") {
    drawVideo("scene01Hand");
  }

  if (currentScene === "scene02Full") {
    drawVideo("scene02Full");
  }

  if (currentScene === "scene02Loop") {
    drawVideo("scene02BackLoop");
    drawPronounTexts();
    drawVideo("scene02BlobLoop");
  }
}

function drawCrossfade() {
  let p = (millis() - crossfadeStartTime) / (crossfadeDuration * 1000);
  p = constrain(p, 0, 1);

  if (crossfadeFrom && videos[crossfadeFrom]) {
    videos[crossfadeFrom].el.volume = videos[crossfadeFrom].volume * (1 - p);
    drawVideo(crossfadeFrom, 1 - p);
  }

  if (isCrossfadingToScene02Loop()) {
    videos.scene02BackLoop.el.volume = videos.scene02BackLoop.volume * p;
    videos.scene02BlobLoop.el.volume = videos.scene02BlobLoop.volume * p;

    drawVideo("scene02BackLoop", p);
    drawPronounTexts(p);
    drawVideo("scene02BlobLoop", p);
  } else {
    for (let i = 0; i < crossfadeTo.length; i++) {
      let id = crossfadeTo[i];

      if (videos[id]) {
        videos[id].el.volume = videos[id].volume * p;
        drawVideo(id, p);
      }
    }
  }

  if (p >= 1) {
    finishCrossfade();
  }
}

function isCrossfadingToScene02Loop() {
  return (
    crossfadeTo.length === 2 &&
    crossfadeTo[0] === "scene02BackLoop" &&
    crossfadeTo[1] === "scene02BlobLoop"
  );
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

function drawPronounTexts(alpha = 1) {
  push();

  textFont(pronounFont);
  textSize(pronounTextSize);
  fill(255, 255 * alpha);
  noStroke();

  for (let i = 0; i < PRONOUN_TEXTS.length; i++) {
    let item = PRONOUN_TEXTS[i];

    drawTrackedText(item.label, item.x, item.y, pronounTracking, alpha);
  }

  pop();
}

function drawTrackedText(txt, x, y, tracking, alpha = 1) {
  push();

  textFont(pronounFont);
  textSize(pronounTextSize);
  textAlign(LEFT, CENTER);
  fill(255, 255 * alpha);
  noStroke();

  let totalWidth = 0;

  for (let i = 0; i < txt.length; i++) {
    totalWidth += textWidth(txt[i]);

    if (i < txt.length - 1) {
      totalWidth += tracking;
    }
  }

  let cursorX = x - totalWidth / 2;

  for (let i = 0; i < txt.length; i++) {
    text(txt[i], cursorX, y);
    cursorX += textWidth(txt[i]) + tracking;
  }

  pop();
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
