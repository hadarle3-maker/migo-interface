console.log("MIGO CLEAN FLOW V03 - FACE AUDIO + REAL CROSSFADE");

let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let currentScene = "logoLoop";

// סאונד
let audioUnlocked = false;

// קרוס פייד
let isCrossfading = false;
let crossfadeDuration = 0.9;
let crossfadeLead = 0.65;
let activeTransition = null;

// מצלמה / ידיים / פנים
let webcam;

let handPose;
let hands = [];

let faceMesh;
let faces = [];

let faceSeenSince = 0;
let faceHoldToUnlockAudio = 250;

let gesturePhase = "waitingOpen";
let openSince = 0;
let closedSince = 0;
let openHoldTime = 350;
let closedHoldTime = 250;
let lastHandGestureTime = 0;
let gestureCooldown = 1400;

const VIDEO_FILES = {
  logoLoop: {
    src: "assets/videos/logo_loop.mp4",
    volume: 1,
    loop: true,
    startAt: 0
  },

  logoToScene01: {
    src: "assets/videos/logo_to_secen_01.mp4",
    volume: 1,
    loop: false,
    startAt: 0
  },

  scene01: {
    src: "assets/videos/secen_01.mp4",
    volume: 1,
    loop: false,
    startAt: 0
  }
};

function preload() {
  handPose = ml5.handPose({ maxHands: 1 });
  faceMesh = ml5.faceMesh({ maxFaces: 1 });
}

function setup() {
  cnv = createCanvas(W, H);
  pixelDensity(1);
  fitCanvasToWindow();

  loadVideos();
  setupCamera();

  playScene("logoLoop", true);
}

function draw() {
  background(0);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  updateInteraction();
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

function playScene(id, loopIt = false) {
  let video = videos[id];

  if (!video) {
    console.log("Missing video:", id);
    return;
  }

  currentScene = id;
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();

  video.el.loop = loopIt;
  applyAudioState(id);

  try {
    video.el.currentTime = VIDEO_FILES[id].startAt || 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("PLAY FAILED:", id, err);
  });
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();

    try {
      videos[id].currentTime = 0;
    } catch (e) {}
  }
}

/* -----------------------------
   CAMERA / ML
----------------------------- */

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

/* -----------------------------
   INTERACTION
----------------------------- */

function updateInteraction() {
  detectFaceForSound();

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

        playScene("logoToScene01", false);
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
}

function checkVideoEndForCrossfade(fromVideoId, toVideoId) {
  let video = videos[fromVideoId].el;

  if (!video.duration) return;

  let timeLeft = video.duration - video.currentTime;

  if (timeLeft <= crossfadeDuration + crossfadeLead) {
    startCrossfade(fromVideoId, toVideoId);
  }
}

function startCrossfade(fromVideoId, toVideoId) {
  if (isCrossfading) return;

  let fromVideo = videos[fromVideoId];
  let toVideo = videos[toVideoId];

  if (!fromVideo || !toVideo) {
    console.log("Missing crossfade video:", fromVideoId, toVideoId);
    return;
  }

  isCrossfading = true;

  activeTransition = {
    fromVideoId: fromVideoId,
    toVideoId: toVideoId,
    fadeStarted: false,
    fadeStartTime: 0
  };

  toVideo.el.loop = VIDEO_FILES[toVideoId].loop;
  applyAudioState(toVideoId, 0);

  try {
    toVideo.el.currentTime = VIDEO_FILES[toVideoId].startAt || 0;
  } catch (e) {}

  toVideo.el.play().catch(function (err) {
    console.log("PLAY NEXT FAILED:", toVideoId, err);
  });
}

function finishCrossfade() {
  if (!activeTransition) return;

  let fromVideoId = activeTransition.fromVideoId;
  let toVideoId = activeTransition.toVideoId;

  if (videos[fromVideoId]) {
    videos[fromVideoId].el.pause();
    videos[fromVideoId].el.volume = 0;
  }

  if (videos[toVideoId]) {
    currentScene = toVideoId;
    applyAudioState(toVideoId, VIDEO_FILES[toVideoId].volume);
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

  drawVideo(currentScene, 1);
}

function drawCrossfade() {
  if (!activeTransition) return;

  let fromVideoId = activeTransition.fromVideoId;
  let toVideoId = activeTransition.toVideoId;

  let fromVideo = videos[fromVideoId];
  let toVideo = videos[toVideoId];

  if (!fromVideo || !toVideo) return;

  // כל עוד הסרטון הבא עוד לא באמת מוכן,
  // ממשיכים להציג את הסרטון הנוכחי ב-100%.
  // זה מונע פייד לשחור.
  if (toVideo.el.readyState < 2) {
    drawVideo(fromVideoId, 1);
    return;
  }

  if (!activeTransition.fadeStarted) {
    activeTransition.fadeStarted = true;
    activeTransition.fadeStartTime = millis();
  }

  let p = (millis() - activeTransition.fadeStartTime) / (crossfadeDuration * 1000);
  p = constrain(p, 0, 1);

  if (audioUnlocked) {
    fromVideo.el.volume = VIDEO_FILES[fromVideoId].volume * (1 - p);
    toVideo.el.volume = VIDEO_FILES[toVideoId].volume * p;
  }

  drawVideo(fromVideoId, 1 - p);
  drawVideo(toVideoId, p);

  if (p >= 1) {
    finishCrossfade();
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

/* -----------------------------
   CANVAS FIT
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

// רווח לבדיקה מהירה במקום סגירת יד
function keyPressed() {
  if (key === " " && currentScene === "logoLoop") {
    unlockAudio("space key");
    playScene("logoToScene01", false);
  }
}

// קליק לבדיקה מהירה וגם לפתיחת סאונד אם הדפדפן חוסם
function mousePressed() {
  if (!audioUnlocked) {
    unlockAudio("mouse click");
  }

  if (currentScene === "logoLoop") {
    playScene("logoToScene01", false);
  }
}

function touchStarted() {
  if (!audioUnlocked) {
    unlockAudio("touch");
  }

  if (currentScene === "logoLoop") {
    playScene("logoToScene01", false);
  }

  return false;
}
