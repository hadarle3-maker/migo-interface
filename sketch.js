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
    volume: 1
  },

  logoToScene01: {
    src: "assets/videos/logo_to_secen_01.mp4",
    volume: 1
  },

  scene01: {
    src: "assets/videos/secen_01.mp4",
    volume: 1
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

  playLogoLoop();
}

function draw() {
  background(0);

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
  video.el.volume = 0;
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
}

function gotHands(results) {
  hands = results;
}

function updateCameraInteraction() {
  if (currentScene === "logoLoop") {
    detectOpenCloseHandToContinue();
  }
}

function detectOpenCloseHandToContinue() {
  if (currentScene !== "logoLoop") return;
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

        playLogoToScene01();
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

function playLogoLoop() {
  currentScene = "logoLoop";
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();

  let logo = videos.logoLoop;

  logo.el.loop = true;
  logo.el.muted = true;
  logo.el.volume = 0;

  try {
    logo.el.currentTime = 0;
  } catch (e) {}

  logo.el.play().catch(function (err) {
    console.log("Logo loop autoplay failed:", err);
  });
}

function playLogoToScene01() {
  currentScene = "logoToScene01";
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();

  playVideo("logoToScene01", false, videos.logoToScene01.volume);
}

function playVideo(id, loopIt, volumeLevel) {
  let video = videos[id];

  if (!video) {
    console.log("Missing video:", id);
    return;
  }

  video.el.loop = loopIt;

  // כרגע נשאיר סאונד פעיל אם הדפדפן מאפשר.
  // אם יש חסימת סאונד, נתקן בשלב הבא.
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
  if (!activeTransition) return;

  if (activeTransition.type === "videoToVideo") {
    let fromVideoId = activeTransition.fromVideoId;

    if (fromVideoId && videos[fromVideoId]) {
      videos[fromVideoId].el.pause();
      videos[fromVideoId].el.volume = videos[fromVideoId].volume;
    }

    for (let i = 0; i < activeTransition.toVideoIds.length; i++) {
      let id = activeTransition.toVideoIds[i];

      if (videos[id]) {
        videos[id].el.volume = videos[id].volume;
      }
    }

    currentScene = activeTransition.nextScene;
  }

  isCrossfading = false;
  activeTransition = null;
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

  if (activeTransition.type === "videoToVideo") {
    drawVideoToVideoCrossfade(p);
  }

  if (p >= 1) {
    finishCrossfade();
  }
}

function drawVideoToVideoCrossfade(p) {
  let fromVideoId = activeTransition.fromVideoId;
  let toVideoId = activeTransition.toVideoIds[0];

  videos[fromVideoId].el.volume = videos[fromVideoId].volume * (1 - p);
  videos[toVideoId].el.volume = videos[toVideoId].volume * p;

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

// בדיקת מעבר בלי מצלמה:
// אפשר ללחוץ על רווח כדי לדמות סגירת יד.
function keyPressed() {
  if (key === " " && currentScene === "logoLoop") {
    playLogoToScene01();
  }
}
