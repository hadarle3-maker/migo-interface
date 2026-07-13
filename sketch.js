console.log("MIGO FLOW V08 - SCENE 02 CHOICE HOVER TEST");

let W = 1920;
let H = 1080;

let CAM_W = 640;
let CAM_H = 360;

let cnv;
let videos = {};

let currentScene = "logoLoop";
let firstFrameShown = false;

// פונט
let pronounFont;

// סאונד
let audioUnlocked = false;

// מעבר
let isCrossfading = false;
let crossfadeDuration = 0.65;
let activeTransition = null;

// מצלמה / ידיים / פנים
let webcam;

let handPose;
let hands = [];

let faceMesh;
let faces = [];

let faceSeenSince = 0;
let faceHoldToUnlockAudio = 250;

// מחוות יד לפתיחה
let gesturePhase = "waitingOpen";
let openSince = 0;
let closedSince = 0;
let openHoldTime = 350;
let closedHoldTime = 250;
let lastHandGestureTime = 0;
let gestureCooldown = 1400;

// מחוון יד / hover
let mirrorHandX = true;

let handCursor = {
  x: W / 2,
  y: H / 2,
  visible: false
};

let cursorSize = 20;

let pronounBaseSize = 240;
let pronounHoverScale = 2;
let pronounTracking = -10;

let pronounColor = [255, 255, 255];

let hoverScales = {
  he: 1,
  she: 1,
  they: 1
};

let showPositionDots = false;

const VIDEO_FILES = {
  logoLoop: {
    src: "assets/videos/logo_loop.mp4",
    volume: 1,
    loop: false,
    customLoop: true,
    startAt: 0.08,
    endTrim: 0.08
  },

  logoToScene01: {
    src: "assets/videos/logo_to_secen_01.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18
  },

  scene01: {
    src: "assets/videos/secen_01.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0.08,
    endTrim: 0.18
  },

  scene02Intro: {
    src: "assets/videos/scene_02.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18
  },

  scene02Background: {
    src: "assets/videos/scene_02_background_mute.mp4",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene02BlobLoop: {
    src: "assets/videos/scene_02_loop.webm",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  }
};

const PRONOUN_POSITIONS = {
  he: {
    label: "He",
    x: 593.5599,
    y: 430
  },

  she: {
    label: "She",
    x: 1389.5729,
    y: 450
  },

  they: {
    label: "They",
    x: 958.8,
    y: 160
  }
};

function preload() {
  handPose = ml5.handPose({ maxHands: 1 });
  faceMesh = ml5.faceMesh({ maxFaces: 1 });

  pronounFont = loadFont("assets/fonts/TheBasics_Corporate-Light.ttf");
}

function setup() {
  let d = min(window.devicePixelRatio || 1, 2);
  pixelDensity(d);

  cnv = createCanvas(W, H);

  document.documentElement.style.margin = "0";
  document.documentElement.style.padding = "0";
  document.documentElement.style.backgroundColor = "black";

  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  document.body.style.backgroundColor = "black";

  cnv.elt.style.visibility = "hidden";

  fitCanvasToWindow();

  loadVideos();
  setupCamera();

  playScene("logoLoop");
}

function draw() {
  background(0);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  updateInteraction();
  checkManualLoop();
  checkAutoTransition();
  drawCurrentScene();
}

/* -----------------------------
   VIDEO LOADING
----------------------------- */

function loadVideos() {
  for (let id in VIDEO_FILES) {
    videos[id] = createVideoElement(id, VIDEO_FILES[id].src);
  }
}

function createVideoElement(id, src) {
  let el = document.createElement("video");

  el.src = src;
  el.loop = false;
  el.muted = true;
  el.volume = 0;
  el.playsInline = true;
  el.preload = "auto";

  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");

  el.addEventListener("loadeddata", function () {
    console.log("VIDEO LOADED:", id, src);
  });

  el.addEventListener("canplay", function () {
    console.log("VIDEO CAN PLAY:", id);
  });

  el.addEventListener("error", function () {
    console.log("VIDEO ERROR:", id, src, el.error);
  });

  el.load();

  return {
    id: id,
    src: src,
    el: el
  };
}

/* -----------------------------
   AUDIO
----------------------------- */

function unlockAudio(reason = "unknown") {
  if (audioUnlocked) return;

  audioUnlocked = true;
  console.log("AUDIO UNLOCKED BY:", reason);

  for (let id in videos) {
    let video = videos[id];

    video.el.muted = false;
    video.el.removeAttribute("muted");

    if (id === currentScene) {
      video.el.volume = VIDEO_FILES[id].volume;
    } else {
      video.el.volume = 0;
    }
  }

  if (videos[currentScene]) {
    videos[currentScene].el.play().catch(function (err) {
      console.log("PLAY AFTER AUDIO UNLOCK FAILED:", currentScene, err);
    });
  }
}

function applyAudioState(id, volumeLevel = null) {
  let video = videos[id];
  if (!video) return;

  if (audioUnlocked) {
    video.el.muted = false;
    video.el.removeAttribute("muted");

    if (volumeLevel !== null) {
      video.el.volume = volumeLevel;
    } else {
      video.el.volume = VIDEO_FILES[id].volume;
    }
  } else {
    video.el.muted = true;
    video.el.volume = 0;
  }
}

/* -----------------------------
   PLAYBACK
----------------------------- */

function playScene(id) {
  if (id === "scene02Choice") {
    currentScene = id;
    isCrossfading = false;
    activeTransition = null;

    stopAllVideos();
    startScene02ChoiceVideos(true);

    if (!firstFrameShown) {
      cnv.elt.style.visibility = "visible";
      firstFrameShown = true;
    }

    return;
  }

  let video = videos[id];

  if (!video) {
    console.log("Missing video:", id);
    return;
  }

  currentScene = id;
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();

  video.el.loop = false;
  applyAudioState(id);

  try {
    video.el.currentTime = VIDEO_FILES[id].startAt || 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("PLAY FAILED:", id, err);
  });
}

function startScene02ChoiceVideos(resetToStart) {
  startLayerLoopVideo("scene02Background", resetToStart);
  startLayerLoopVideo("scene02BlobLoop", resetToStart);
}

function startLayerLoopVideo(id, resetToStart) {
  let video = videos[id];

  if (!video) {
    console.log("Missing layer video:", id);
    return;
  }

  video.el.loop = true;
  applyAudioState(id, 0);

  if (resetToStart) {
    try {
      video.el.currentTime = VIDEO_FILES[id].startAt || 0;
    } catch (e) {}
  }

  video.el.play().catch(function (err) {
    console.log("PLAY LAYER LOOP FAILED:", id, err);
  });
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();
    videos[id].el.loop = false;

    try {
      videos[id].el.currentTime = VIDEO_FILES[id].startAt || 0;
    } catch (e) {}

    videos[id].el.volume = 0;
  }
}

function checkManualLoop() {
  let def = VIDEO_FILES[currentScene];

  if (!def || !def.customLoop) return;

  let video = videos[currentScene].el;

  if (!video.duration) return;

  let loopStart = def.startAt || 0;
  let endTrim = def.endTrim || 0;
  let virtualEnd = video.duration - endTrim;

  if (video.currentTime >= virtualEnd) {
    try {
      video.currentTime = loopStart;
    } catch (e) {}

    video.play().catch(function (err) {
      console.log("MANUAL LOOP PLAY FAILED:", currentScene, err);
    });
  }
}

/* -----------------------------
   CAMERA / ML
----------------------------- */

function setupCamera() {
  webcam = createCapture({
    video: {
      width: CAM_W,
      height: CAM_H
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

/* -----------------------------
   INTERACTION
----------------------------- */

function updateInteraction() {
  detectFaceForSound();
  updateHandCursor();

  if (currentScene === "logoLoop" && !isCrossfading) {
    detectOpenCloseHandToContinue();
  }
}

function detectFaceForSound() {
  if (audioUnlocked) return;

  if (faces.length > 0) {
    if (faceSeenSince === 0) {
      faceSeenSince = millis();
    }

    if (millis() - faceSeenSince > faceHoldToUnlockAudio) {
      unlockAudio("face detected");
    }
  } else {
    faceSeenSince = 0;
  }
}

function updateHandCursor() {
  if (hands.length === 0) {
    handCursor.visible = false;
    return;
  }

  let hand = hands[0];
  let p = getHandCenterPoint(hand);

  if (!p) {
    handCursor.visible = false;
    return;
  }

  let mappedX;

  if (mirrorHandX) {
    mappedX = W - (p.x / CAM_W) * W;
  } else {
    mappedX = (p.x / CAM_W) * W;
  }

  let mappedY = (p.y / CAM_H) * H;

  mappedX = constrain(mappedX, 0, W);
  mappedY = constrain(mappedY, 0, H);

  if (!handCursor.visible) {
    handCursor.x = mappedX;
    handCursor.y = mappedY;
  } else {
    handCursor.x = lerp(handCursor.x, mappedX, 0.35);
    handCursor.y = lerp(handCursor.y, mappedY, 0.35);
  }

  handCursor.visible = true;
}

function getHandCenterPoint(hand) {
  let indexes = [0, 5, 9, 13, 17];
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let i = 0; i < indexes.length; i++) {
    let p = getHandPoint(hand, indexes[i]);

    if (p) {
      sumX += p.x;
      sumY += p.y;
      count++;
    }
  }

  if (count > 0) {
    return {
      x: sumX / count,
      y: sumY / count
    };
  }

  return getHandPoint(hand, 8);
}

function detectOpenCloseHandToContinue() {
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
      if (openSince === 0) openSince = now;

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
      if (closedSince === 0) closedSince = now;

      if (
        now - closedSince > closedHoldTime &&
        now - lastHandGestureTime > gestureCooldown
      ) {
        lastHandGestureTime = now;

        gesturePhase = "waitingOpen";
        openSince = 0;
        closedSince = 0;

        playScene("logoToScene01");
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

/* -----------------------------
   AUTO TRANSITIONS
----------------------------- */

function checkAutoTransition() {
  if (isCrossfading) return;

  if (currentScene === "logoToScene01") {
    checkVideoEndForCrossfade("logoToScene01", "scene01");
  }

  if (currentScene === "scene01") {
    checkVideoEndForCrossfade("scene01", "scene02Intro");
  }

  if (currentScene === "scene02Intro") {
    checkVideoEndForCrossfade("scene02Intro", "scene02Choice");
  }
}

function checkVideoEndForCrossfade(fromVideoId, toSceneId) {
  let fromVideo = videos[fromVideoId].el;
  let fromDef = VIDEO_FILES[fromVideoId];

  if (!fromVideo.duration) return;

  let endTrim = fromDef.endTrim || 0;
  let virtualEnd = fromVideo.duration - endTrim;
  let timeLeft = virtualEnd - fromVideo.currentTime;

  if (timeLeft <= crossfadeDuration) {
    startCrossfade(fromVideoId, toSceneId);
  }
}

function startCrossfade(fromVideoId, toSceneId) {
  if (isCrossfading) return;

  let fromVideo = videos[fromVideoId];

  if (!fromVideo) {
    console.log("Missing crossfade from video:", fromVideoId);
    return;
  }

  isCrossfading = true;

  activeTransition = {
    fromVideoId: fromVideoId,
    toSceneId: toSceneId,
    fadeStarted: false,
    fadeStartTime: 0
  };

  if (toSceneId === "scene02Choice") {
    startScene02ChoiceVideos(true);
    return;
  }

  if (videos[toSceneId]) {
    let toVideo = videos[toSceneId];

    toVideo.el.loop = false;
    applyAudioState(toSceneId, 0);

    try {
      toVideo.el.currentTime = VIDEO_FILES[toSceneId].startAt || 0;
    } catch (e) {}

    toVideo.el.play().catch(function (err) {
      console.log("PLAY NEXT FAILED:", toSceneId, err);
    });
  }
}

function isTransitionTargetReady(toSceneId) {
  if (toSceneId === "scene02Choice") {
    return (
      videos.scene02Background &&
      videos.scene02BlobLoop &&
      videos.scene02Background.el.readyState > 0 &&
      videos.scene02BlobLoop.el.readyState > 0
    );
  }

  if (videos[toSceneId]) {
    return videos[toSceneId].el.readyState > 0;
  }

  return true;
}

function finishCrossfade() {
  if (!activeTransition) return;

  let fromVideoId = activeTransition.fromVideoId;
  let toSceneId = activeTransition.toSceneId;

  if (videos[fromVideoId]) {
    videos[fromVideoId].el.pause();
    videos[fromVideoId].el.volume = 0;
  }

  currentScene = toSceneId;

  if (toSceneId === "scene02Choice") {
    startScene02ChoiceVideos(false);
  }

  if (videos[toSceneId]) {
    applyAudioState(toSceneId, VIDEO_FILES[toSceneId].volume);
  }

  isCrossfading = false;
  activeTransition = null;
}

/* -----------------------------
   DRAWING
----------------------------- */

function drawCurrentScene() {
  if (isCrossfading) {
    drawCrossfade();
    return;
  }

  if (currentScene === "scene02Choice") {
    drawScene02Choice(1);
    return;
  }

  drawVideo(currentScene, 1);
}

function drawCrossfade() {
  if (!activeTransition) return;

  let fromVideoId = activeTransition.fromVideoId;
  let toSceneId = activeTransition.toSceneId;

  let fromVideo = videos[fromVideoId];

  if (!fromVideo) return;

  if (!isTransitionTargetReady(toSceneId)) {
    drawVideo(fromVideoId, 1);
    return;
  }

  if (!activeTransition.fadeStarted) {
    activeTransition.fadeStarted = true;
    activeTransition.fadeStartTime = millis();
  }

  let p =
    (millis() - activeTransition.fadeStartTime) /
    (crossfadeDuration * 1000);

  p = constrain(p, 0, 1);

  drawVideo(fromVideoId, 1);

  if (toSceneId === "scene02Choice") {
    drawScene02Choice(p);
  } else {
    drawVideo(toSceneId, p);
  }

  if (audioUnlocked) {
    fromVideo.el.volume = VIDEO_FILES[fromVideoId].volume * (1 - p);

    if (videos[toSceneId]) {
      videos[toSceneId].el.volume = VIDEO_FILES[toSceneId].volume * p;
    }
  }

  if (p >= 1) {
    finishCrossfade();
  }
}

function drawVideo(id, alpha = 1) {
  let video = videos[id];

  if (!video) return;

  if (video.el.readyState > 0) {
    if (!firstFrameShown && id === "logoLoop") {
      cnv.elt.style.visibility = "visible";
      firstFrameShown = true;
    }

    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawingContext.drawImage(video.el, 0, 0, W, H);
    drawingContext.restore();
  }
}

function drawScene02Choice(alpha = 1) {
  if (!firstFrameShown) {
    cnv.elt.style.visibility = "visible";
    firstFrameShown = true;
  }

  drawingContext.save();
  drawingContext.globalAlpha = alpha;

  drawVideo("scene02Background", 1);
  drawPronounTexts();
  drawVideo("scene02BlobLoop", 1);
  drawHandCursor();

  drawingContext.restore();
}

function drawPronounTexts() {
  push();

  if (pronounFont) {
    textFont(pronounFont);
  }

  textAlign(LEFT, CENTER);
  noStroke();

  drawPronounWord("he");
  drawPronounWord("she");
  drawPronounWord("they");

  if (showPositionDots) {
    drawPositionDot(PRONOUN_POSITIONS.he.x, PRONOUN_POSITIONS.he.y);
    drawPositionDot(PRONOUN_POSITIONS.she.x, PRONOUN_POSITIONS.she.y);
    drawPositionDot(PRONOUN_POSITIONS.they.x, PRONOUN_POSITIONS.they.y);
  }

  pop();
}

function drawPronounWord(keyName) {
  let pos = PRONOUN_POSITIONS[keyName];

  if (!pos) return;

  let hovering = isCursorOverPronoun(keyName);
  let targetScale = hovering ? pronounHoverScale : 1;

  hoverScales[keyName] = lerp(hoverScales[keyName], targetScale, 0.2);

  let currentSize = pronounBaseSize * hoverScales[keyName];

  textSize(currentSize);
  fill(pronounColor[0], pronounColor[1], pronounColor[2]);

  drawTrackedCenteredText(
    pos.label,
    pos.x,
    pos.y,
    pronounTracking
  );
}

function isCursorOverPronoun(keyName) {
  if (!handCursor.visible) return false;
  if (currentScene !== "scene02Choice") return false;

  let pos = PRONOUN_POSITIONS[keyName];

  if (!pos) return false;

  let bounds = getPronounBounds(keyName, pronounBaseSize, pronounTracking);

  let paddingX = 90;
  let paddingY = 80;

  return (
    handCursor.x >= bounds.left - paddingX &&
    handCursor.x <= bounds.right + paddingX &&
    handCursor.y >= bounds.top - paddingY &&
    handCursor.y <= bounds.bottom + paddingY
  );
}

function getPronounBounds(keyName, size, tracking) {
  let pos = PRONOUN_POSITIONS[keyName];

  push();

  if (pronounFont) {
    textFont(pronounFont);
  }

  textSize(size);

  let w = getTrackedTextWidth(pos.label, tracking);
  let h = size;

  pop();

  return {
    left: pos.x - w / 2,
    right: pos.x + w / 2,
    top: pos.y - h / 2,
    bottom: pos.y + h / 2
  };
}

function drawTrackedCenteredText(txt, centerX, centerY, tracking) {
  let totalW = getTrackedTextWidth(txt, tracking);
  let x = centerX - totalW / 2;

  for (let i = 0; i < txt.length; i++) {
    let ch = txt.charAt(i);
    text(ch, x, centerY);
    x += textWidth(ch) + tracking;
  }
}

function getTrackedTextWidth(txt, tracking) {
  let total = 0;

  for (let i = 0; i < txt.length; i++) {
    total += textWidth(txt.charAt(i));

    if (i < txt.length - 1) {
      total += tracking;
    }
  }

  return total;
}

function drawHandCursor() {
  if (currentScene !== "scene02Choice") return;
  if (!handCursor.visible) return;

  push();
  noStroke();
  fill(255);
  circle(handCursor.x, handCursor.y, cursorSize);
  pop();
}

function drawPositionDot(x, y) {
  push();
  stroke(255, 0, 0);
  strokeWeight(3);
  line(x - 18, y, x + 18, y);
  line(x, y - 18, x, y + 18);
  noStroke();
  fill(255, 0, 0);
  circle(x, y, 8);
  pop();
}

/* -----------------------------
   CANVAS FIT — CONTAIN
----------------------------- */

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

/* -----------------------------
   DEBUG
----------------------------- */

function keyPressed() {
  if (key === " " && currentScene === "logoLoop") {
    unlockAudio("space key");
    playScene("logoToScene01");
  }

  // D מדלג ישר למסך הבחירה
  if (key === "d" || key === "D") {
    playScene("scene02Choice");
  }

  // S מדליק/מכבה נקודות עוגן
  if (key === "s" || key === "S") {
    showPositionDots = !showPositionDots;
  }

  // M הופך את כיוון היד אם המחוון זז הפוך
  if (key === "m" || key === "M") {
    mirrorHandX = !mirrorHandX;
    console.log("mirrorHandX:", mirrorHandX);
  }
}

function mousePressed() {
  if (!audioUnlocked) {
    unlockAudio("mouse click");
  }

  if (currentScene === "logoLoop") {
    playScene("logoToScene01");
  }
}

function touchStarted() {
  if (!audioUnlocked) {
    unlockAudio("touch");
  }

  if (currentScene === "logoLoop") {
    playScene("logoToScene01");
  }

  return false;
}
