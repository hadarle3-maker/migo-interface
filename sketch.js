console.log("MIGO FLOW V13 - VOICE SCAN WITH SOUND");

let W = 1920;
let H = 1080;

let CAM_W = 640;
let CAM_H = 360;

let cnv;
let videos = {};

// סאונד חיצוני ל־Voice Scan
let voiceScanSound;
const VOICE_SCAN_SOUND_SRC = "assets/sound/sound%20scan.wav";

let currentScene = "logoLoop";
let firstFrameShown = false;

// פונט
let pronounFont;

// סאונד כללי
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

// מחוות יד לבחירת He / She / They
let choiceGesturePhase = "waitingOpen";
let choiceOpenSince = 0;
let choiceClosedSince = 0;
let choiceTargetKey = "";
let lastChoiceGestureTime = 0;
let choiceGestureCooldown = 1400;

// מחוון יד / hover
let mirrorHandX = true;

let handCursor = {
  x: W / 2,
  y: H / 2,
  visible: false
};

// גודל מחוון יד
let cursorSize = 40;

// טקסטים
let pronounBaseSize = 240;
let pronounHoverScale = 1.3;
let pronounTracking = -10;

// #A8A1E1 באופסיטי 28%
let pronounColor = [168, 161, 225, 71];

let hoverScales = {
  he: 1,
  she: 1,
  they: 1
};

let showPositionDots = false;

// זיהוי תנועת פה ל־Voice Scan
let voiceLoopEnteredAt = 0;
let voiceElementTriggered = false;
let voiceElementPlaying = false;
let voiceElementActive = false;

let mouthPrevRatio = null;
let mouthActivityFrames = 0;

// רגישות זיהוי פה
let mouthOpenThreshold = 0.055;
let mouthMovementDeltaThreshold = 0.014;
let mouthActivityFramesNeeded = 12;
let voiceDetectionDelay = 2000;

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
  },

  scene02AnsShe: {
    src: "assets/videos/secen_02_ans_she.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene02AnsHe: {
    src: "assets/videos/secen_02_ans_he.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene02AnsThey: {
    src: "assets/videos/secen_02_ans_they.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene03SheToLoveFace: {
    src: "assets/videos/secen_03_she_to_love_face.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene03HeToLoveFace: {
    src: "assets/videos/secen_03_he_to_love_face.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene03TheyToLoveFace: {
    src: "assets/videos/secen_03_they_to_love_face.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene05ScanVoiceOnly: {
    src: "assets/videos/secen_05_scan_voice_only.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene05ScanVoiceBackground: {
    src: "assets/videos/secen_05_scan_voice_background.mp4",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene05ScanVoiceElement: {
    src: "assets/videos/secen_05_scan_voice_element.webm",
    volume: 0,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0
  },

  scene05ScanVoiceBlob: {
    src: "assets/videos/secen_05_scan_voice_blob.webm",
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
    y: 455
  },

  they: {
    label: "They",
    x: 958.8,
    y: 165
  }
};

const PRONOUN_ANSWER_VIDEOS = {
  he: "scene02AnsHe",
  she: "scene02AnsShe",
  they: "scene02AnsThey"
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
  loadSounds();
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
   SOUND LOADING
----------------------------- */

function loadSounds() {
  voiceScanSound = document.createElement("audio");

  voiceScanSound.src = VOICE_SCAN_SOUND_SRC;
  voiceScanSound.preload = "auto";
  voiceScanSound.volume = 1;
  voiceScanSound.muted = true;

  voiceScanSound.addEventListener("canplaythrough", function () {
    console.log("VOICE SCAN SOUND READY:", VOICE_SCAN_SOUND_SRC);
  });

  voiceScanSound.addEventListener("error", function () {
    console.log(
      "VOICE SCAN SOUND ERROR:",
      VOICE_SCAN_SOUND_SRC,
      voiceScanSound.error
    );
  });

  voiceScanSound.load();
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

  if (voiceScanSound) {
    voiceScanSound.muted = false;
    voiceScanSound.volume = 1;
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

function playVoiceScanSound() {
  if (!voiceScanSound) return;

  try {
    voiceScanSound.pause();
    voiceScanSound.currentTime = 0;
    voiceScanSound.volume = 1;
    voiceScanSound.muted = !audioUnlocked;
  } catch (e) {}

  voiceScanSound.play().catch(function (err) {
    console.log("VOICE SCAN SOUND PLAY FAILED:", err);
  });
}

function stopVoiceScanSound() {
  if (!voiceScanSound) return;

  try {
    voiceScanSound.pause();
    voiceScanSound.currentTime = 0;
  } catch (e) {}
}

/* -----------------------------
   PLAYBACK
----------------------------- */

function playScene(id) {
  if (id === "scene02Choice") {
    currentScene = id;
    isCrossfading = false;
    activeTransition = null;

    resetChoiceGesture();
    stopAllVideos();
    stopVoiceScanSound();
    startScene02ChoiceVideos(true);

    if (!firstFrameShown) {
      cnv.elt.style.visibility = "visible";
      firstFrameShown = true;
    }

    return;
  }

  if (id === "scene05VoiceLoop") {
    currentScene = id;
    isCrossfading = false;
    activeTransition = null;

    stopAllVideos();
    stopVoiceScanSound();
    startScene05VoiceLoopVideos(true);

    if (!firstFrameShown) {
      cnv.elt.style.visibility = "visible";
      firstFrameShown = true;
    }

    return;
  }

  if (id === "successScreen") {
    currentScene = id;
    isCrossfading = false;
    activeTransition = null;

    stopAllVideos();
    stopVoiceScanSound();

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
  stopVoiceScanSound();

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

function stopScene02ChoiceVideos() {
  stopSingleVideo("scene02Background");
  stopSingleVideo("scene02BlobLoop");
}

function startScene05VoiceLoopVideos(resetToStart) {
  startLayerLoopVideo("scene05ScanVoiceBackground", resetToStart);
  startLayerLoopVideo("scene05ScanVoiceBlob", resetToStart);

  if (resetToStart) {
    stopSingleVideo("scene05ScanVoiceElement");
    resetVoiceScanState();
  }

  voiceLoopEnteredAt = millis();
}

function stopScene05VoiceLoopVideos() {
  stopSingleVideo("scene05ScanVoiceBackground");
  stopSingleVideo("scene05ScanVoiceElement");
  stopSingleVideo("scene05ScanVoiceBlob");
  stopVoiceScanSound();
  resetVoiceScanState();
}

function stopSingleVideo(id) {
  if (!videos[id]) return;

  videos[id].el.pause();
  videos[id].el.loop = false;
  videos[id].el.volume = 0;

  try {
    videos[id].el.currentTime = VIDEO_FILES[id].startAt || 0;
  } catch (e) {}
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

  if (currentScene === "scene02Choice" && !isCrossfading) {
    detectPronounSelection();
  }

  if (currentScene === "scene05VoiceLoop" && !isCrossfading) {
    detectMouthMovementForVoiceScan();
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

function detectPronounSelection() {
  if (hands.length === 0 || !handCursor.visible) {
    resetChoiceGesture();
    return;
  }

  let hoveredKey = getHoveredPronounKey();

  if (!hoveredKey) {
    resetChoiceGesture();
    return;
  }

  let hand = hands[0];
  let state = getHandOpenCloseState(hand);
  let now = millis();

  if (choiceGesturePhase === "waitingOpen") {
    if (state === "open") {
      if (choiceOpenSince === 0 || choiceTargetKey !== hoveredKey) {
        choiceOpenSince = now;
        choiceTargetKey = hoveredKey;
      }

      if (now - choiceOpenSince > openHoldTime) {
        choiceGesturePhase = "waitingClosed";
        choiceClosedSince = 0;
      }
    } else {
      choiceOpenSince = 0;
      choiceTargetKey = hoveredKey;
    }
  }

  if (choiceGesturePhase === "waitingClosed") {
    if (hoveredKey !== choiceTargetKey) {
      resetChoiceGesture();
      return;
    }

    if (state === "closed") {
      if (choiceClosedSince === 0) {
        choiceClosedSince = now;
      }

      if (
        now - choiceClosedSince > closedHoldTime &&
        now - lastChoiceGestureTime > choiceGestureCooldown
      ) {
        lastChoiceGestureTime = now;
        selectPronoun(hoveredKey);
      }
    } else {
      choiceClosedSince = 0;
    }
  }
}

function resetChoiceGesture() {
  choiceGesturePhase = "waitingOpen";
  choiceOpenSince = 0;
  choiceClosedSince = 0;
  choiceTargetKey = "";
}

function selectPronoun(keyName) {
  let answerVideoId = PRONOUN_ANSWER_VIDEOS[keyName];

  if (!answerVideoId) {
    console.log("Missing answer for:", keyName);
    return;
  }

  console.log("PRONOUN SELECTED:", keyName, "->", answerVideoId);

  resetChoiceGesture();
  startCrossfade("scene02Choice", answerVideoId);
}

function getHoveredPronounKey() {
  if (isCursorOverPronoun("he")) return "he";
  if (isCursorOverPronoun("she")) return "she";
  if (isCursorOverPronoun("they")) return "they";

  return "";
}

/* -----------------------------
   VOICE SCAN BY MOUTH MOVEMENT
----------------------------- */

function resetVoiceScanState() {
  voiceElementTriggered = false;
  voiceElementPlaying = false;
  voiceElementActive = false;

  mouthPrevRatio = null;
  mouthActivityFrames = 0;
}

function detectMouthMovementForVoiceScan() {
  // אם האלמנט כבר הופעל — לא מפעילים שוב
  if (voiceElementTriggered) return;

  // מחכים קצת אחרי הכניסה למסך כדי שלא יופעל ישר
  if (millis() - voiceLoopEnteredAt < voiceDetectionDelay) return;

  // אם אין פנים — מאפסים
  if (faces.length === 0) {
    mouthPrevRatio = null;
    mouthActivityFrames = 0;
    return;
  }

  let face = faces[0];
  let ratio = getMouthOpenRatio(face);

  // אם לא הצלחנו לקרוא את הפה — מאפסים
  if (ratio === null) {
    mouthPrevRatio = null;
    mouthActivityFrames = 0;
    return;
  }

  // בפריים הראשון רק שומרים ערך, לא מפעילים כלום
  if (mouthPrevRatio === null) {
    mouthPrevRatio = ratio;
    mouthActivityFrames = 0;
    return;
  }

  // בודקים רק שינוי בין פריים לפריים
  // לא מפעילים לפי זה שהפה "פתוח", אלא רק לפי תנועה
  let movement = abs(ratio - mouthPrevRatio);

  let mouthLooksActive =
    movement > mouthMovementDeltaThreshold;

  if (mouthLooksActive) {
    mouthActivityFrames++;
  } else {
    mouthActivityFrames = max(0, mouthActivityFrames - 1);
  }

  mouthPrevRatio = ratio;

  // לוג זמני לבדיקה — אפשר למחוק אחר כך
  console.log(
    "mouth ratio:",
    ratio,
    "movement:",
    movement,
    "frames:",
    mouthActivityFrames
  );

  // רק אחרי כמה פריימים של תנועה אמיתית מפעילים
  if (mouthActivityFrames >= mouthActivityFramesNeeded) {
    triggerVoiceScanElement("mouth movement");
  }
}

function getMouthOpenRatio(face) {
  let upperLip = getFacePoint(face, 13);
  let lowerLip = getFacePoint(face, 14);
  let mouthLeft = getFacePoint(face, 61);
  let mouthRight = getFacePoint(face, 291);

  if (!upperLip || !lowerLip || !mouthLeft || !mouthRight) {
    return null;
  }

  let mouthOpen = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  let mouthWidth = dist(mouthLeft.x, mouthLeft.y, mouthRight.x, mouthRight.y);

  if (mouthWidth <= 0) return null;

  return mouthOpen / mouthWidth;
}

function getFacePoint(face, index) {
  if (face.keypoints && face.keypoints[index]) {
    return face.keypoints[index];
  }

  if (face.landmarks && face.landmarks[index]) {
    return {
      x: face.landmarks[index][0],
      y: face.landmarks[index][1]
    };
  }

  return null;
}

function triggerVoiceScanElement(reason = "unknown") {
  if (currentScene !== "scene05VoiceLoop") return;
  if (isCrossfading) return;
  if (voiceElementTriggered) return;

  let video = videos.scene05ScanVoiceElement;

  if (!video) {
    console.log("Missing voice scan element video");
    return;
  }

  console.log("VOICE SCAN ELEMENT TRIGGERED BY:", reason);

  voiceElementTriggered = true;
  voiceElementPlaying = true;
  voiceElementActive = true;

  video.el.loop = false;
  applyAudioState("scene05ScanVoiceElement", 0);

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  playVoiceScanSound();

  video.el.play().catch(function (err) {
    console.log("VOICE ELEMENT PLAY FAILED:", err);
  });
}

function checkVoiceElementEnd() {
  if (!voiceElementPlaying) return;

  let video = videos.scene05ScanVoiceElement;
  if (!video || !video.el.duration) return;

  let timeLeft = video.el.duration - video.el.currentTime;

  if (timeLeft <= crossfadeDuration) {
    voiceElementPlaying = false;
    startCrossfade("scene05VoiceLoop", "successScreen");
  }
}

/* -----------------------------
   HAND STATE
----------------------------- */

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

  if (currentScene === "scene02AnsShe") {
    checkVideoEndForCrossfade("scene02AnsShe", "scene03SheToLoveFace");
  }

  if (currentScene === "scene02AnsHe") {
    checkVideoEndForCrossfade("scene02AnsHe", "scene03HeToLoveFace");
  }

  if (currentScene === "scene02AnsThey") {
    checkVideoEndForCrossfade("scene02AnsThey", "scene03TheyToLoveFace");
  }

  if (currentScene === "scene03SheToLoveFace") {
    checkVideoEndForCrossfade("scene03SheToLoveFace", "scene05ScanVoiceOnly");
  }

  if (currentScene === "scene03HeToLoveFace") {
    checkVideoEndForCrossfade("scene03HeToLoveFace", "scene05ScanVoiceOnly");
  }

  if (currentScene === "scene03TheyToLoveFace") {
    checkVideoEndForCrossfade("scene03TheyToLoveFace", "scene05ScanVoiceOnly");
  }

  if (currentScene === "scene05ScanVoiceOnly") {
    checkVideoEndForCrossfade("scene05ScanVoiceOnly", "scene05VoiceLoop");
  }

  if (currentScene === "scene05VoiceLoop") {
    checkVoiceElementEnd();
  }
}

function checkVideoEndForCrossfade(fromSceneId, toSceneId) {
  if (!videos[fromSceneId]) return;

  let fromVideo = videos[fromSceneId].el;
  let fromDef = VIDEO_FILES[fromSceneId];

  if (!fromVideo.duration) return;

  let endTrim = fromDef.endTrim || 0;
  let virtualEnd = fromVideo.duration - endTrim;
  let timeLeft = virtualEnd - fromVideo.currentTime;

  if (timeLeft <= crossfadeDuration) {
    startCrossfade(fromSceneId, toSceneId);
  }
}

function startCrossfade(fromSceneId, toSceneId) {
  if (isCrossfading) return;

  let fromIsLayerScene =
    fromSceneId === "scene02Choice" ||
    fromSceneId === "scene05VoiceLoop" ||
    fromSceneId === "successScreen";

  let fromIsVideo = !!videos[fromSceneId];

  if (!fromIsLayerScene && !fromIsVideo) {
    console.log("Missing crossfade from scene:", fromSceneId);
    return;
  }

  isCrossfading = true;

  activeTransition = {
    fromSceneId: fromSceneId,
    toSceneId: toSceneId,
    fadeStarted: false,
    fadeStartTime: 0
  };

  if (toSceneId === "scene02Choice") {
    startScene02ChoiceVideos(true);
    return;
  }

  if (toSceneId === "scene05VoiceLoop") {
    startScene05VoiceLoopVideos(true);
    return;
  }

  if (toSceneId === "successScreen") {
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

  if (toSceneId === "scene05VoiceLoop") {
    return (
      videos.scene05ScanVoiceBackground &&
      videos.scene05ScanVoiceBlob &&
      videos.scene05ScanVoiceBackground.el.readyState > 0 &&
      videos.scene05ScanVoiceBlob.el.readyState > 0
    );
  }

  if (toSceneId === "successScreen") {
    return true;
  }

  if (videos[toSceneId]) {
    return videos[toSceneId].el.readyState > 0;
  }

  return true;
}

function finishCrossfade() {
  if (!activeTransition) return;

  let fromSceneId = activeTransition.fromSceneId;
  let toSceneId = activeTransition.toSceneId;

  if (fromSceneId === "scene02Choice") {
    stopScene02ChoiceVideos();
  }

  if (fromSceneId === "scene05VoiceLoop") {
    stopScene05VoiceLoopVideos();
  }

  if (videos[fromSceneId]) {
    videos[fromSceneId].el.pause();
    videos[fromSceneId].el.volume = 0;
  }

  currentScene = toSceneId;

  if (toSceneId === "scene02Choice") {
    startScene02ChoiceVideos(false);
  }

  if (toSceneId === "scene05VoiceLoop") {
    startScene05VoiceLoopVideos(false);
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
    drawScene02Choice(1, true);
    return;
  }

  if (currentScene === "scene05VoiceLoop") {
    drawScene05VoiceLoop(1);
    return;
  }

  if (currentScene === "successScreen") {
    drawSuccessScreen(1);
    return;
  }

  drawVideo(currentScene, 1);
}

function drawCrossfade() {
  if (!activeTransition) return;

  let fromSceneId = activeTransition.fromSceneId;
  let toSceneId = activeTransition.toSceneId;

  if (!isTransitionTargetReady(toSceneId)) {
    drawSceneById(fromSceneId, 1, false);
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

  // הסצנה היוצאת נשארת מלאה, והיעד עולה מעליה.
  // זה מונע נפילה לשחור.
  drawSceneById(fromSceneId, 1, false);
  drawSceneById(toSceneId, p, true);

  if (audioUnlocked) {
    if (videos[fromSceneId]) {
      videos[fromSceneId].el.volume = VIDEO_FILES[fromSceneId].volume * (1 - p);
    }

    if (videos[toSceneId]) {
      videos[toSceneId].el.volume = VIDEO_FILES[toSceneId].volume * p;
    }
  }

  if (p >= 1) {
    finishCrossfade();
  }
}

function drawSceneById(sceneId, alpha = 1, showCursor = true) {
  if (sceneId === "scene02Choice") {
    drawScene02Choice(alpha, showCursor);
    return;
  }

  if (sceneId === "scene05VoiceLoop") {
    drawScene05VoiceLoop(alpha);
    return;
  }

  if (sceneId === "successScreen") {
    drawSuccessScreen(alpha);
    return;
  }

  drawVideo(sceneId, alpha);
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

function drawScene02Choice(alpha = 1, showCursor = true) {
  if (!firstFrameShown) {
    cnv.elt.style.visibility = "visible";
    firstFrameShown = true;
  }

  // שכבת רקע
  drawVideo("scene02Background", alpha);

  // טקסטים בין שתי שכבות הווידאו
  drawingContext.save();
  drawingContext.globalAlpha = alpha;
  drawPronounTexts();
  drawingContext.restore();

  // הבלוב מעל הטקסטים
  drawVideo("scene02BlobLoop", alpha);

  // מחוון יד מעל הכול
  if (showCursor) {
    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawHandCursor();
    drawingContext.restore();
  }
}

function drawScene05VoiceLoop(alpha = 1) {
  if (!firstFrameShown) {
    cnv.elt.style.visibility = "visible";
    firstFrameShown = true;
  }

  // שכבה 1 — רקע
  drawVideo("scene05ScanVoiceBackground", alpha);

  // שכבה 2 — אלמנט שמופעל רק אחרי תנועת פה
  if (voiceElementActive) {
    drawVideo("scene05ScanVoiceElement", alpha);
  }

  // שכבה 3 — בלוב
  drawVideo("scene05ScanVoiceBlob", alpha);
}

function drawSuccessScreen(alpha = 1) {
  drawingContext.save();
  drawingContext.globalAlpha = alpha;

  background(255);

  push();
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(120);
  text("sucsses", W / 2, H / 2);
  pop();

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

  fill(
    pronounColor[0],
    pronounColor[1],
    pronounColor[2],
    pronounColor[3]
  );

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

  // בדיקות מהירות לבחירה בלי יד
  if (key === "1" && currentScene === "scene02Choice") {
    selectPronoun("he");
  }

  if (key === "2" && currentScene === "scene02Choice") {
    selectPronoun("she");
  }

  if (key === "3" && currentScene === "scene02Choice") {
    selectPronoun("they");
  }

  // V מדמה דיבור במסך Voice Scan
  if (key === "v" || key === "V") {
    triggerVoiceScanElement("debug key");
  }

  // קיצור בדיקה למסך הלופ של Voice Scan
  if (key === "5") {
    playScene("scene05VoiceLoop");
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
