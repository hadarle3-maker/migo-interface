console.log("MIGO CLEAN FLOW V02");

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

// סאונד
let audioUnlocked = false;

// מצלמה / ידיים
let handPose;
let webcam;
let hands = [];

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
    loop: true
  },

  logoToScene01: {
    src: "assets/videos/logo_to_secen_01.mp4",
    volume: 1,
    loop: false
  },

  scene01: {
    src: "assets/videos/secen_01.mp4",
    volume: 1,
    loop: false
  }
};

function preload() {
  handPose = ml5.handPose({ maxHands: 1 });
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

function unlockAudio() {
  if (audioUnlocked) return;

  audioUnlocked = true;

  for (let id in videos) {
    let video = videos[id];
    let volumeLevel = VIDEO_FILES[id].volume;

    video.el.muted = false;
    video.el.removeAttribute("muted");
    video.el.volume = volumeLevel;
  }

  console.log("AUDIO UNLOCKED");
}

function applyAudioState(id) {
  let video = videos[id];

  if (!video) return;

  if (audioUnlocked) {
    video.el.muted = false;
    video.el.removeAttribute("muted");
    video.el.volume = VIDEO_FILES[id].volume;
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
    video.el.currentTime = 0;
  } catch (e) {}

  video.el.play().catch(function (err) {
    console.log("PLAY FAILED:", id, err);
  });
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();

    try {
      videos[id].el.currentTime = 0;
    } catch (e) {}
  }
}

/* -----------------------------
   CAMERA / HANDS
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
}

function gotHands(results) {
  hands = results;
}

function updateInteraction() {
  if (currentScene === "logoLoop" && !isCrossfading) {
    detectOpenCloseHandToContinue();
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

        // הערה חשובה:
        // סגירת יד לא תמיד נחשבת בדפדפן כאינטראקציה אמיתית לפתיחת סאונד.
        // לכן לבדיקת סאונד בטוחה — להשתמש ברווח / קליק.
        unlockAudio();
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

  isCrossfading = true;
  crossfadeStartTime = millis();

  activeTransition = {
    fromVideoId: fromVideoId,
    toVideoId: toVideoId
  };

  let toVideo = videos[toVideoId];

  if (!toVideo) {
    console.log("Missing next video:", toVideoId);
    return;
  }

  toVideo.el.loop = VIDEO_FILES[toVideoId].loop;
  applyAudioState(toVideoId);

  try {
    toVideo.el.currentTime = 0;
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
  }

  currentScene = toVideoId;

  if (videos[toVideoId]) {
    applyAudioState(toVideoId);
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

  let p = (millis() - crossfadeStartTime) / (crossfadeDuration * 1000);
  p = constrain(p, 0, 1);

  let fromVideoId = activeTransition.fromVideoId;
  let toVideoId = activeTransition.toVideoId;

  if (audioUnlocked) {
    if (videos[fromVideoId]) {
      videos[fromVideoId].el.volume = VIDEO_FILES[fromVideoId].volume * (1 - p);
    }

    if (videos[toVideoId]) {
      videos[toVideoId].el.volume = VIDEO_FILES[toVideoId].volume * p;
    }
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
  } else {
    drawLoadingText(id);
  }
}

function drawLoadingText(id) {
  push();
  fill(255);
  textSize(38);
  textAlign(CENTER, CENTER);
  text("Loading " + id + "...", W / 2, H / 2);
  pop();
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
   DEBUG / USER INTERACTION
----------------------------- */

// רווח: פותח סאונד ומדמה סגירת יד
function keyPressed() {
  if (key === " " && currentScene === "logoLoop") {
    unlockAudio();
    playScene("logoToScene01", false);
  }
}

// קליק: פותח סאונד ומדמה סגירת יד
function mousePressed() {
  if (currentScene === "logoLoop") {
    unlockAudio();
    playScene("logoToScene01", false);
  }
}

// לטאבלט / טאץ'
function touchStarted() {
  if (currentScene === "logoLoop") {
    unlockAudio();
    playScene("logoToScene01", false);
  }

  return false;
}
