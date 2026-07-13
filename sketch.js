console.log("MIGO FLOW V06 - SCENE 02 TEXT POSITION TEST");

let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let currentScene = "logoLoop";
let firstFrameShown = false;

// תמונת בדיקה לסצנה 02
const SCENE02_TEST_IMAGE_SRC = "assets/videos/secen02_back.png";
let scene02TestBg;

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

// מחוות יד
let gesturePhase = "waitingOpen";
let openSince = 0;
let closedSince = 0;
let openHoldTime = 350;
let closedHoldTime = 250;
let lastHandGestureTime = 0;
let gestureCooldown = 1400;

// בדיקת מיקום
let showPositionDots = true;

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
  scene02TestBg = loadImage(SCENE02_TEST_IMAGE_SRC);
}

function setup() {
  cnv = createCanvas(W, H);

  let d = min(window.devicePixelRatio || 1, 2);
  pixelDensity(d);

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
  // סצנה סטטית / בדיקה
  if (id === "scene02TextTest") {
    currentScene = id;
    isCrossfading = false;
    activeTransition = null;
    stopAllVideos();
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

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();

    try {
      videos[id].el.currentTime = VIDEO_FILES[id].startAt || 0;
    } catch (e) {}
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
    checkVideoEndForCrossfade("scene02Intro", "scene02TextTest");
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
    fadeStartTime: millis()
  };

  // אם היעד הוא וידאו — מתחילים אותו לפני הפייד
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

function finishCrossfade() {
  if (!activeTransition) return;

  let fromVideoId = activeTransition.fromVideoId;
  let toSceneId = activeTransition.toSceneId;

  if (videos[fromVideoId]) {
    videos[fromVideoId].el.pause();
    videos[fromVideoId].el.volume = 0;
  }

  currentScene = toSceneId;

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

  if (currentScene === "scene02TextTest") {
    drawScene02TextTest(1);
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

  if (videos[toSceneId]) {
    let toVideo = videos[toSceneId];

    if (toVideo.el.readyState < 2) {
      drawVideo(fromVideoId, 1);
      return;
    }
  }

  let p =
    (millis() - activeTransition.fadeStartTime) /
    (crossfadeDuration * 1000);

  p = constrain(p, 0, 1);

  // בלי נפילה לשחור:
  // הסרטון היוצא נשאר 100%, היעד עולה מעליו.
  drawVideo(fromVideoId, 1);

  if (toSceneId === "scene02TextTest") {
    drawScene02TextTest(p);
  } else {
    drawVideo(toSceneId, p);
  }

  if (audioUnlocked && videos[toSceneId]) {
    fromVideo.el.volume = VIDEO_FILES[fromVideoId].volume * (1 - p);
    videos[toSceneId].el.volume = VIDEO_FILES[toSceneId].volume * p;
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

function drawScene02TextTest(alpha = 1) {
  drawingContext.save();
  drawingContext.globalAlpha = alpha;

  if (scene02TestBg) {
    image(scene02TestBg, 0, 0, W, H);
  } else {
    background(0);
  }

  drawPronounTexts();

  drawingContext.restore();
}

function drawPronounTexts() {
  push();

  textFont(pronounFont);
  textSize(240);
  textAlign(LEFT, CENTER);
  noStroke();
  fill(255, 0, 0);

  drawTrackedCenteredText(
    PRONOUN_POSITIONS.he.label,
    PRONOUN_POSITIONS.he.x,
    PRONOUN_POSITIONS.he.y,
    -40
  );

  drawTrackedCenteredText(
    PRONOUN_POSITIONS.she.label,
    PRONOUN_POSITIONS.she.x,
    PRONOUN_POSITIONS.she.y,
    -40
  );

  drawTrackedCenteredText(
    PRONOUN_POSITIONS.they.label,
    PRONOUN_POSITIONS.they.x,
    PRONOUN_POSITIONS.they.y,
    -40
  );

  if (showPositionDots) {
    drawPositionDot(PRONOUN_POSITIONS.he.x, PRONOUN_POSITIONS.he.y);
    drawPositionDot(PRONOUN_POSITIONS.she.x, PRONOUN_POSITIONS.she.y);
    drawPositionDot(PRONOUN_POSITIONS.they.x, PRONOUN_POSITIONS.they.y);
  }

  pop();
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

  // קיצור לבדיקה: D מדלג ישר למסך בדיקת מיקומים
  if (key === "d" || key === "D") {
    playScene("scene02TextTest");
  }

  // קיצור לבדיקה: S מדליק/מכבה נקודות עוגן
  if (key === "s" || key === "S") {
    showPositionDots = !showPositionDots;
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
