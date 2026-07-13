console.log("MIGO FLOW V22 - INTERACTIVE SEASONS CHOICE");

const W = 1920;
const H = 1080;
const CAM_W = 640;
const CAM_H = 360;

let cnv;
let videos = {};
let webcam;
let handPose;
let hands = [];
let faceMesh;
let faces = [];
let pronounFont;

let currentScene = "logoLoop";
let firstFrameShown = false;
let audioUnlocked = false;

let voiceScanSound;
const VOICE_SCAN_SOUND_SRC = "assets/sound/sound_scan.mp3";
const VOICE_SCAN_SOUND_VOLUME = 0.15;

let isCrossfading = false;
let crossfadeDuration = 0.65;
let activeTransition = null;

let faceSeenSince = 0;
let faceHoldToUnlockAudio = 250;

let gesturePhase = "waitingOpen";
let openSince = 0;
let closedSince = 0;
let openHoldTime = 350;
let closedHoldTime = 250;
let lastHandGestureTime = 0;
let gestureCooldown = 1400;

let pronounChoiceGesture = {
  phase: "waitingOpen",
  openSince: 0,
  closedSince: 0,
  targetKey: "",
  lastGestureTime: 0,
  cooldown: 1400,
};

let seasonChoiceGesture = {
  phase: "waitingOpen",
  openSince: 0,
  closedSince: 0,
  targetKey: "",
  lastGestureTime: 0,
  cooldown: 1400,
};

let mirrorHandX = true;

let handCursor = {
  x: W / 2,
  y: H / 2,
  visible: false,
};

let cursorSize = 40;
let showPositionDots = false;

let pronounBaseSize = 240;
let pronounHoverScale = 1.3;
let pronounTracking = -10;

// #A8A1E1 באופסיטי 28%
let pronounColor = [168, 161, 225, 71];

let pronounHoverScales = {
  he: 1,
  she: 1,
  they: 1,
};

let seasonBaseSize = 180;
let seasonHoverScale = 1.3;
let seasonTracking = -10;

// בדיוק אותו צבע ואותו אופסיטי כמו He / She / They
let seasonColor = [168, 161, 225, 71];

let seasonHoverScales = {
  summer: 1,
  winter: 1,
  spring: 1,
  autumn: 1,
};

let voiceLoopEnteredAt = 0;
let voiceElementTriggered = false;
let voiceElementPlaying = false;
let voiceElementActive = false;

let voiceAnsDelayActive = false;
let voiceAnsDelayStartedAt = 0;
let voiceAnsDelayMs = 650;

let mouthPrevRatio = null;
let mouthBaselineRatio = null;
let mouthActivityFrames = 0;
let mouthDebugCounter = 0;

let mouthCalibrationStartedAt = 0;
let mouthCalibrationDuration = 1600;
let mouthCalibrationSamples = [];
let mouthCalibrationDone = false;

let mouthMovementDeltaThreshold = 0.006;
let mouthOpenAboveBaselineThreshold = 0.018;
let mouthActivityFramesNeeded = 7;
let voiceDetectionDelay = 500;

const VIDEO_FILES = {
  logoLoop: {
    src: "assets/videos/logo_loop.mp4",
    volume: 1,
    loop: false,
    customLoop: true,
    startAt: 0.08,
    endTrim: 0.08,
  },

  logoToScene01: {
    src: "assets/videos/logo_to_secen_01.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene01: {
    src: "assets/videos/secen_01.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0.08,
    endTrim: 0.18,
  },

  scene02Intro: {
    src: "assets/videos/scene_02.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene02Background: {
    src: "assets/videos/scene_02_background_mute.mp4",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene02BlobLoop: {
    src: "assets/videos/scene_02_loop.webm",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene02AnsShe: {
    src: "assets/videos/secen_02_ans_she.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene02AnsHe: {
    src: "assets/videos/secen_02_ans_he.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene02AnsThey: {
    src: "assets/videos/secen_02_ans_they.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene03SheToLoveFace: {
    src: "assets/videos/secen_03_she_to_love_face.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene03HeToLoveFace: {
    src: "assets/videos/secen_03_he_to_love_face.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene03TheyToLoveFace: {
    src: "assets/videos/secen_03_they_to_love_face.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceOnly: {
    src: "assets/videos/secen_05_scan_voice_only.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceBackground: {
    src: "assets/videos/secen_05_scan_voice_background.mp4",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceElement: {
    src: "assets/videos/secen_05_scan_voice_element.webm",
    volume: 0,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceBlob: {
    src: "assets/videos/secen_05_scan_voice_blob.webm",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceAns: {
    src: "assets/videos/secen_05_scan_voice_ans.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SeasonsIntro: {
    src: "assets/videos/scene_06_seasons.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SeasonsBackground: {
    src: "assets/videos/scene_06_seasons_background.mp4",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SeasonsBlobLoop: {
    src: "assets/videos/scene_06_seasons_loop.webm",
    volume: 0,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SummerIn: {
    src: "assets/videos/scene_06_seasons_summer_in.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SummerLoop: {
    src: "assets/videos/secen_06_Seasons_summer_loop.mp4",
    volume: 1,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06WinterIn: {
    src: "assets/videos/scene_06_seasons_winter_in.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06WinterLoop: {
    src: "assets/videos/secen_06_Seasons_winter_loop.mp4",
    volume: 1,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SpringIn: {
    src: "assets/videos/scene_06_seasons_spring_in.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SpringLoop: {
    src: "assets/videos/secen_06_Seasons_spring_loop.mp4",
    volume: 1,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06AutumnIn: {
    src: "assets/videos/scene_06_seasons_autumn_in.mp4",
    volume: 1,
    loop: false,
    customLoop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06AutumnLoop: {
    src: "assets/videos/secen_06_Seasons_Autumn_loop.mp4",
    volume: 1,
    loop: true,
    customLoop: false,
    startAt: 0,
    endTrim: 0,
  },
};

const PRONOUN_POSITIONS = {
  he: {
    label: "He",
    x: 593.5599,
    y: 430,
  },

  she: {
    label: "She",
    x: 1389.5729,
    y: 455,
  },

  they: {
    label: "They",
    x: 958.8,
    y: 165,
  },
};

const SEASON_POSITIONS = {
  summer: {
    label: "Summer",
    x: 1359.4389,
    y: 260,
  },

  winter: {
    label: "Winter",
    x: 1300.677,
    y: 520,
  },

  spring: {
    label: "Spring",
    x: 656.677,
    y: 165,
  },

  autumn: {
    label: "Autumn",
    x: 577.3913,
    y: 407,
  },
};

const PRONOUN_ANSWER_VIDEOS = {
  he: "scene02AnsHe",
  she: "scene02AnsShe",
  they: "scene02AnsThey",
};

const SEASON_IN_VIDEOS = {
  summer: "scene06SummerIn",
  winter: "scene06WinterIn",
  spring: "scene06SpringIn",
  autumn: "scene06AutumnIn",
};

const AUTO_VIDEO_TRANSITIONS = {
  logoToScene01: "scene01",
  scene01: "scene02Intro",
  scene02Intro: "scene02Choice",

  scene02AnsShe: "scene03SheToLoveFace",
  scene02AnsHe: "scene03HeToLoveFace",
  scene02AnsThey: "scene03TheyToLoveFace",

  scene03SheToLoveFace: "scene05ScanVoiceOnly",
  scene03HeToLoveFace: "scene05ScanVoiceOnly",
  scene03TheyToLoveFace: "scene05ScanVoiceOnly",

  scene05ScanVoiceOnly: "scene05VoiceLoop",
  scene05ScanVoiceAns: "scene06SeasonsIntro",

  scene06SeasonsIntro: "scene06SeasonsChoice",

  scene06SummerIn: "scene06SummerLoop",
  scene06WinterIn: "scene06WinterLoop",
  scene06SpringIn: "scene06SpringLoop",
  scene06AutumnIn: "scene06AutumnLoop",
};

function preload() {
  handPose = ml5.handPose({
    maxHands: 1,
  });

  faceMesh = ml5.faceMesh({
    maxFaces: 1,
  });

  pronounFont = loadFont(
    "assets/fonts/TheBasics_Corporate-Light.ttf",
  );
}

function setup() {
  pixelDensity(
    min(
      window.devicePixelRatio || 1,
      2,
    ),
  );

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
    videos[id] = createVideoElement(
      id,
      VIDEO_FILES[id].src,
    );
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
  el.setAttribute(
    "webkit-playsinline",
    "",
  );

  el.addEventListener(
    "loadeddata",
    function () {
      console.log(
        "VIDEO LOADED:",
        id,
        src,
      );
    },
  );

  el.addEventListener(
    "canplay",
    function () {
      console.log(
        "VIDEO CAN PLAY:",
        id,
      );
    },
  );

  el.addEventListener(
    "error",
    function () {
      console.log(
        "VIDEO ERROR:",
        id,
        src,
        el.error,
      );
    },
  );

  el.load();

  return {
    id: id,
    src: src,
    el: el,
  };
}

/* -----------------------------
   SOUND LOADING
----------------------------- */

function loadSounds() {
  voiceScanSound =
    document.createElement("audio");

  voiceScanSound.src =
    VOICE_SCAN_SOUND_SRC;

  voiceScanSound.preload = "auto";
  voiceScanSound.volume =
    VOICE_SCAN_SOUND_VOLUME;

  voiceScanSound.muted = true;

  voiceScanSound.addEventListener(
    "canplaythrough",
    function () {
      console.log(
        "VOICE SCAN SOUND READY:",
        VOICE_SCAN_SOUND_SRC,
      );
    },
  );

  voiceScanSound.addEventListener(
    "error",
    function () {
      console.log(
        "VOICE SCAN SOUND ERROR:",
        VOICE_SCAN_SOUND_SRC,
        voiceScanSound.error,
      );
    },
  );

  voiceScanSound.load();
}

/* -----------------------------
   AUDIO
----------------------------- */

function unlockAudio(
  reason = "unknown",
) {
  if (audioUnlocked) return;

  audioUnlocked = true;

  console.log(
    "AUDIO UNLOCKED BY:",
    reason,
  );

  for (let id in videos) {
    let video = videos[id];

    video.el.muted = false;
    video.el.removeAttribute("muted");

    if (id === currentScene) {
      video.el.volume =
        VIDEO_FILES[id].volume;
    } else {
      video.el.volume = 0;
    }
  }

  if (voiceScanSound) {
    voiceScanSound.muted = false;
    voiceScanSound.volume =
      VOICE_SCAN_SOUND_VOLUME;
  }

  if (videos[currentScene]) {
    videos[currentScene].el
      .play()
      .catch(function (err) {
        console.log(
          "PLAY AFTER AUDIO UNLOCK FAILED:",
          currentScene,
          err,
        );
      });
  }
}

function applyAudioState(
  id,
  volumeLevel = null,
) {
  let video = videos[id];

  if (!video) return;

  if (audioUnlocked) {
    video.el.muted = false;
    video.el.removeAttribute("muted");

    if (volumeLevel !== null) {
      video.el.volume =
        volumeLevel;
    } else {
      video.el.volume =
        VIDEO_FILES[id].volume;
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
    voiceScanSound.volume =
      VOICE_SCAN_SOUND_VOLUME;

    voiceScanSound.muted =
      !audioUnlocked;
  } catch (e) {}

  voiceScanSound
    .play()
    .catch(function (err) {
      console.log(
        "VOICE SCAN SOUND PLAY FAILED:",
        err,
      );
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
  currentScene = id;
  isCrossfading = false;
  activeTransition = null;

  stopAllVideos();
  stopVoiceScanSound();

  if (id === "scene02Choice") {
    resetChoiceGesture(
      pronounChoiceGesture,
    );

    startScene02ChoiceVideos(
      true,
    );

    showCanvas();
    return;
  }

  if (id === "scene05VoiceLoop") {
    startScene05VoiceLoopVideos(
      true,
    );

    showCanvas();
    return;
  }

  if (
    id === "scene06SeasonsChoice"
  ) {
    resetChoiceGesture(
      seasonChoiceGesture,
    );

    startScene06SeasonsChoiceVideos(
      true,
    );

    showCanvas();
    return;
  }

  if (id === "successScreen") {
    showCanvas();
    return;
  }

  let video = videos[id];

  if (!video) {
    console.log(
      "Missing video:",
      id,
    );

    return;
  }

  video.el.loop =
    VIDEO_FILES[id].loop || false;

  applyAudioState(id);

  try {
    video.el.currentTime =
      VIDEO_FILES[id].startAt || 0;
  } catch (e) {}

  video.el
    .play()
    .catch(function (err) {
      console.log(
        "PLAY FAILED:",
        id,
        err,
      );
    });
}

function showCanvas() {
  if (!firstFrameShown) {
    cnv.elt.style.visibility =
      "visible";

    firstFrameShown = true;
  }
}

function startScene02ChoiceVideos(
  resetToStart,
) {
  startLayerLoopVideo(
    "scene02Background",
    resetToStart,
  );

  startLayerLoopVideo(
    "scene02BlobLoop",
    resetToStart,
  );
}

function stopScene02ChoiceVideos() {
  stopSingleVideo(
    "scene02Background",
  );

  stopSingleVideo(
    "scene02BlobLoop",
  );
}

function startScene05VoiceLoopVideos(
  resetToStart,
) {
  startLayerLoopVideo(
    "scene05ScanVoiceBackground",
    resetToStart,
  );

  startLayerLoopVideo(
    "scene05ScanVoiceBlob",
    resetToStart,
  );

  if (resetToStart) {
    stopSingleVideo(
      "scene05ScanVoiceElement",
    );

    resetVoiceScanState();
  }

  voiceLoopEnteredAt = millis();
}

function stopScene05VoiceLoopVideos() {
  stopSingleVideo(
    "scene05ScanVoiceBackground",
  );

  stopSingleVideo(
    "scene05ScanVoiceElement",
  );

  stopSingleVideo(
    "scene05ScanVoiceBlob",
  );

  stopVoiceScanSound();
  resetVoiceScanState();
}

function startScene06SeasonsChoiceVideos(
  resetToStart,
) {
  startLayerLoopVideo(
    "scene06SeasonsBackground",
    resetToStart,
  );

  startLayerLoopVideo(
    "scene06SeasonsBlobLoop",
    resetToStart,
  );
}

function stopScene06SeasonsChoiceVideos() {
  stopSingleVideo(
    "scene06SeasonsBackground",
  );

  stopSingleVideo(
    "scene06SeasonsBlobLoop",
  );
}

function stopSingleVideo(id) {
  if (!videos[id]) return;

  videos[id].el.pause();
  videos[id].el.loop = false;
  videos[id].el.volume = 0;

  try {
    videos[id].el.currentTime =
      VIDEO_FILES[id].startAt || 0;
  } catch (e) {}
}

function startLayerLoopVideo(
  id,
  resetToStart,
) {
  let video = videos[id];

  if (!video) {
    console.log(
      "Missing layer video:",
      id,
    );

    return;
  }

  video.el.loop = true;
  applyAudioState(id, 0);

  if (resetToStart) {
    try {
      video.el.currentTime =
        VIDEO_FILES[id].startAt ||
        0;
    } catch (e) {}
  }

  video.el
    .play()
    .catch(function (err) {
      console.log(
        "PLAY LAYER LOOP FAILED:",
        id,
        err,
      );
    });
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();
    videos[id].el.loop = false;
    videos[id].el.volume = 0;

    try {
      videos[id].el.currentTime =
        VIDEO_FILES[id].startAt ||
        0;
    } catch (e) {}
  }
}

function checkManualLoop() {
  let def =
    VIDEO_FILES[currentScene];

  if (
    !def ||
    !def.customLoop ||
    !videos[currentScene]
  ) {
    return;
  }

  let video =
    videos[currentScene].el;

  if (!video.duration) return;

  let virtualEnd =
    video.duration -
    (def.endTrim || 0);

  if (
    video.currentTime >= virtualEnd
  ) {
    try {
      video.currentTime =
        def.startAt || 0;
    } catch (e) {}

    video
      .play()
      .catch(function (err) {
        console.log(
          "MANUAL LOOP PLAY FAILED:",
          currentScene,
          err,
        );
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
      height: CAM_H,
    },

    audio: false,
  });

  webcam.hide();

  handPose.detectStart(
    webcam,
    function (results) {
      hands = results;
    },
  );

  faceMesh.detectStart(
    webcam,
    function (results) {
      faces = results;
    },
  );
}

/* -----------------------------
   INTERACTION
----------------------------- */

function updateInteraction() {
  detectFaceForSound();
  updateHandCursor();

  if (
    currentScene === "logoLoop" &&
    !isCrossfading
  ) {
    detectOpenCloseHandToContinue();
  }

  if (
    currentScene ===
      "scene02Choice" &&
    !isCrossfading
  ) {
    detectPronounSelection();
  }

  if (
    currentScene ===
      "scene05VoiceLoop" &&
    !isCrossfading
  ) {
    detectMouthMovementForVoiceScan();
  }

  if (
    currentScene ===
      "scene06SeasonsChoice" &&
    !isCrossfading
  ) {
    detectSeasonSelection();
  }
}

function detectFaceForSound() {
  if (audioUnlocked) return;

  if (faces.length > 0) {
    if (faceSeenSince === 0) {
      faceSeenSince = millis();
    }

    if (
      millis() - faceSeenSince >
      faceHoldToUnlockAudio
    ) {
      unlockAudio(
        "face detected",
      );
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

  let p = getHandCenterPoint(
    hands[0],
  );

  if (!p) {
    handCursor.visible = false;
    return;
  }

  let mappedX;

  if (mirrorHandX) {
    mappedX =
      W -
      (p.x / CAM_W) * W;
  } else {
    mappedX =
      (p.x / CAM_W) * W;
  }

  let mappedY =
    (p.y / CAM_H) * H;

  mappedX = constrain(
    mappedX,
    0,
    W,
  );

  mappedY = constrain(
    mappedY,
    0,
    H,
  );

  if (!handCursor.visible) {
    handCursor.x = mappedX;
    handCursor.y = mappedY;
  } else {
    handCursor.x = lerp(
      handCursor.x,
      mappedX,
      0.35,
    );

    handCursor.y = lerp(
      handCursor.y,
      mappedY,
      0.35,
    );
  }

  handCursor.visible = true;
}

function getHandCenterPoint(hand) {
  let indexes = [
    0,
    5,
    9,
    13,
    17,
  ];

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (
    let i = 0;
    i < indexes.length;
    i++
  ) {
    let p = getHandPoint(
      hand,
      indexes[i],
    );

    if (p) {
      sumX += p.x;
      sumY += p.y;
      count++;
    }
  }

  if (count > 0) {
    return {
      x: sumX / count,
      y: sumY / count,
    };
  }

  return getHandPoint(
    hand,
    8,
  );
}

function detectOpenCloseHandToContinue() {
  if (hands.length === 0) {
    gesturePhase =
      "waitingOpen";

    openSince = 0;
    closedSince = 0;

    return;
  }

  let state =
    getHandOpenCloseState(
      hands[0],
    );

  let now = millis();

  if (
    gesturePhase === "waitingOpen"
  ) {
    if (state === "open") {
      if (openSince === 0) {
        openSince = now;
      }

      if (
        now - openSince >
        openHoldTime
      ) {
        gesturePhase =
          "waitingClosed";

        closedSince = 0;
      }
    } else {
      openSince = 0;
    }
  }

  if (
    gesturePhase ===
    "waitingClosed"
  ) {
    if (state === "closed") {
      if (closedSince === 0) {
        closedSince = now;
      }

      if (
        now - closedSince >
          closedHoldTime &&
        now -
          lastHandGestureTime >
          gestureCooldown
      ) {
        lastHandGestureTime =
          now;

        gesturePhase =
          "waitingOpen";

        openSince = 0;
        closedSince = 0;

        playScene(
          "logoToScene01",
        );
      }
    } else {
      closedSince = 0;
    }
  }
}

function detectPronounSelection() {
  updateChoiceGesture(
    pronounChoiceGesture,
    getHoveredPronounKey(),
    selectPronoun,
  );
}

function detectSeasonSelection() {
  updateChoiceGesture(
    seasonChoiceGesture,
    getHoveredSeasonKey(),
    selectSeason,
  );
}

function updateChoiceGesture(
  stateObject,
  hoveredKey,
  onSelect,
) {
  if (
    hands.length === 0 ||
    !handCursor.visible ||
    !hoveredKey
  ) {
    resetChoiceGesture(
      stateObject,
    );

    return;
  }

  let handState =
    getHandOpenCloseState(
      hands[0],
    );

  let now = millis();

  if (
    stateObject.phase ===
    "waitingOpen"
  ) {
    if (handState === "open") {
      if (
        stateObject.openSince ===
          0 ||
        stateObject.targetKey !==
          hoveredKey
      ) {
        stateObject.openSince =
          now;

        stateObject.targetKey =
          hoveredKey;
      }

      if (
        now -
          stateObject.openSince >
        openHoldTime
      ) {
        stateObject.phase =
          "waitingClosed";

        stateObject.closedSince =
          0;
      }
    } else {
      stateObject.openSince = 0;
      stateObject.targetKey =
        hoveredKey;
    }
  }

  if (
    stateObject.phase ===
    "waitingClosed"
  ) {
    if (
      hoveredKey !==
      stateObject.targetKey
    ) {
      resetChoiceGesture(
        stateObject,
      );

      return;
    }

    if (handState === "closed") {
      if (
        stateObject.closedSince ===
        0
      ) {
        stateObject.closedSince =
          now;
      }

      if (
        now -
          stateObject.closedSince >
          closedHoldTime &&
        now -
          stateObject.lastGestureTime >
          stateObject.cooldown
      ) {
        stateObject.lastGestureTime =
          now;

        onSelect(hoveredKey);
      }
    } else {
      stateObject.closedSince = 0;
    }
  }
}

function resetChoiceGesture(
  stateObject,
) {
  stateObject.phase =
    "waitingOpen";

  stateObject.openSince = 0;
  stateObject.closedSince = 0;
  stateObject.targetKey = "";
}

function selectPronoun(keyName) {
  let answerVideoId =
    PRONOUN_ANSWER_VIDEOS[
      keyName
    ];

  if (!answerVideoId) return;

  console.log(
    "PRONOUN SELECTED:",
    keyName,
    "->",
    answerVideoId,
  );

  resetChoiceGesture(
    pronounChoiceGesture,
  );

  startCrossfade(
    "scene02Choice",
    answerVideoId,
  );
}

function selectSeason(keyName) {
  let inVideoId =
    SEASON_IN_VIDEOS[
      keyName
    ];

  if (!inVideoId) return;

  console.log(
    "SEASON SELECTED:",
    keyName,
    "->",
    inVideoId,
  );

  resetChoiceGesture(
    seasonChoiceGesture,
  );

  startCrossfade(
    "scene06SeasonsChoice",
    inVideoId,
  );
}

function getHoveredPronounKey() {
  let keys = [
    "he",
    "she",
    "they",
  ];

  for (
    let i = 0;
    i < keys.length;
    i++
  ) {
    let keyName = keys[i];

    if (
      isCursorOverChoice(
        keyName,
        PRONOUN_POSITIONS,
        pronounBaseSize,
        pronounTracking,
        "scene02Choice",
      )
    ) {
      return keyName;
    }
  }

  return "";
}

function getHoveredSeasonKey() {
  let keys = [
    "summer",
    "winter",
    "spring",
    "autumn",
  ];

  for (
    let i = 0;
    i < keys.length;
    i++
  ) {
    let keyName = keys[i];

    if (
      isCursorOverChoice(
        keyName,
        SEASON_POSITIONS,
        seasonBaseSize,
        seasonTracking,
        "scene06SeasonsChoice",
      )
    ) {
      return keyName;
    }
  }

  return "";
}

/* -----------------------------
   VOICE SCAN
----------------------------- */

function resetVoiceScanState() {
  voiceElementTriggered = false;
  voiceElementPlaying = false;
  voiceElementActive = false;

  voiceAnsDelayActive = false;
  voiceAnsDelayStartedAt = 0;

  mouthPrevRatio = null;
  mouthBaselineRatio = null;
  mouthActivityFrames = 0;
  mouthDebugCounter = 0;

  mouthCalibrationStartedAt = 0;
  mouthCalibrationSamples = [];
  mouthCalibrationDone = false;
}

function detectMouthMovementForVoiceScan() {
  if (voiceElementTriggered) {
    return;
  }

  if (
    millis() -
      voiceLoopEnteredAt <
    voiceDetectionDelay
  ) {
    return;
  }

  if (faces.length === 0) {
    resetMouthCalibration();
    return;
  }

  let ratio =
    getMouthOpenRatio(
      faces[0],
    );

  if (ratio === null) {
    resetMouthCalibration();
    return;
  }

  if (!mouthCalibrationDone) {
    if (
      mouthCalibrationStartedAt ===
      0
    ) {
      mouthCalibrationStartedAt =
        millis();

      mouthCalibrationSamples = [];

      console.log(
        "MOUTH CALIBRATION STARTED",
      );
    }

    mouthCalibrationSamples.push(
      ratio,
    );

    if (
      millis() -
        mouthCalibrationStartedAt >=
      mouthCalibrationDuration
    ) {
      let sum = 0;

      for (
        let i = 0;
        i <
        mouthCalibrationSamples.length;
        i++
      ) {
        sum +=
          mouthCalibrationSamples[i];
      }

      mouthBaselineRatio =
        sum /
        mouthCalibrationSamples.length;

      mouthPrevRatio = ratio;
      mouthActivityFrames = 0;
      mouthCalibrationDone = true;

      console.log(
        "MOUTH CALIBRATION DONE. baseline:",
        mouthBaselineRatio,
      );
    }

    return;
  }

  let movement = abs(
    ratio - mouthPrevRatio,
  );

  let openAboveBaseline =
    ratio - mouthBaselineRatio;

  let mouthLooksActive =
    openAboveBaseline >
      mouthOpenAboveBaselineThreshold &&
    (
      movement >
        mouthMovementDeltaThreshold ||
      openAboveBaseline >
        mouthOpenAboveBaselineThreshold *
          1.6
    );

  if (mouthLooksActive) {
    mouthActivityFrames++;
  } else {
    mouthActivityFrames = max(
      0,
      mouthActivityFrames - 1,
    );

    mouthBaselineRatio = lerp(
      mouthBaselineRatio,
      ratio,
      0.01,
    );
  }

  mouthPrevRatio = ratio;
  mouthDebugCounter++;

  if (
    mouthDebugCounter % 8 === 0
  ) {
    console.log(
      "mouth ratio:",
      ratio.toFixed(4),
      "baseline:",
      mouthBaselineRatio.toFixed(
        4,
      ),
      "above:",
      openAboveBaseline.toFixed(
        4,
      ),
      "movement:",
      movement.toFixed(4),
      "frames:",
      mouthActivityFrames,
    );
  }

  if (
    mouthActivityFrames >=
    mouthActivityFramesNeeded
  ) {
    triggerVoiceScanElement(
      "mouth movement",
    );
  }
}

function resetMouthCalibration() {
  mouthPrevRatio = null;
  mouthBaselineRatio = null;
  mouthActivityFrames = 0;

  mouthCalibrationStartedAt = 0;
  mouthCalibrationSamples = [];
  mouthCalibrationDone = false;
}

function getMouthOpenRatio(face) {
  let upperLip = getFacePoint(
    face,
    13,
  );

  let lowerLip = getFacePoint(
    face,
    14,
  );

  let mouthLeft = getFacePoint(
    face,
    61,
  );

  let mouthRight = getFacePoint(
    face,
    291,
  );

  if (
    !upperLip ||
    !lowerLip ||
    !mouthLeft ||
    !mouthRight
  ) {
    return null;
  }

  let mouthOpen = dist(
    upperLip.x,
    upperLip.y,
    lowerLip.x,
    lowerLip.y,
  );

  let mouthWidth = dist(
    mouthLeft.x,
    mouthLeft.y,
    mouthRight.x,
    mouthRight.y,
  );

  if (mouthWidth <= 0) {
    return null;
  }

  return mouthOpen / mouthWidth;
}

function getFacePoint(
  face,
  index,
) {
  if (
    face.keypoints &&
    face.keypoints[index]
  ) {
    return face.keypoints[index];
  }

  if (
    face.landmarks &&
    face.landmarks[index]
  ) {
    return {
      x: face.landmarks[index][0],
      y: face.landmarks[index][1],
    };
  }

  return null;
}

function triggerVoiceScanElement(
  reason = "unknown",
) {
  if (
    currentScene !==
    "scene05VoiceLoop"
  ) {
    return;
  }

  if (
    isCrossfading ||
    voiceElementTriggered
  ) {
    return;
  }

  let video =
    videos.scene05ScanVoiceElement;

  if (!video) return;

  console.log(
    "VOICE SCAN ELEMENT TRIGGERED BY:",
    reason,
  );

  voiceElementTriggered = true;
  voiceElementPlaying = true;
  voiceElementActive = true;

  voiceAnsDelayActive = false;
  voiceAnsDelayStartedAt = 0;

  video.el.loop = false;
  video.el.muted = true;

  video.el.setAttribute(
    "muted",
    "",
  );

  video.el.volume = 0;

  try {
    video.el.currentTime = 0;
  } catch (e) {}

  playVoiceScanSound();

  video.el
    .play()
    .catch(function (err) {
      console.log(
        "VOICE ELEMENT PLAY FAILED:",
        err,
      );
    });
}

function checkVoiceElementEnd() {
  if (!voiceElementPlaying) {
    return;
  }

  let video =
    videos.scene05ScanVoiceElement;

  if (
    !video ||
    !video.el.duration
  ) {
    return;
  }

  let elementHasEnded =
    video.el.ended ||
    video.el.currentTime >=
      video.el.duration - 0.05;

  if (
    !voiceAnsDelayActive &&
    elementHasEnded
  ) {
    stopVoiceScanSound();

    voiceAnsDelayActive = true;
    voiceAnsDelayStartedAt =
      millis();

    return;
  }

  if (
    voiceAnsDelayActive &&
    millis() -
      voiceAnsDelayStartedAt >=
      voiceAnsDelayMs
  ) {
    voiceElementPlaying = false;
    voiceElementActive = false;

    stopVoiceScanSound();

    startCrossfade(
      "scene05VoiceLoop",
      "scene05ScanVoiceAns",
    );
  }
}

/* -----------------------------
   HAND STATE
----------------------------- */

function getHandOpenCloseState(
  hand,
) {
  let wrist = getHandPoint(
    hand,
    0,
  );

  let fingers = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];

  if (!wrist) {
    return "unknown";
  }

  let extendedCount = 0;

  for (
    let i = 0;
    i < fingers.length;
    i++
  ) {
    let tip = getHandPoint(
      hand,
      fingers[i][0],
    );

    let pip = getHandPoint(
      hand,
      fingers[i][1],
    );

    if (!tip || !pip) {
      return "unknown";
    }

    if (
      isFingerExtended(
        wrist,
        tip,
        pip,
      )
    ) {
      extendedCount++;
    }
  }

  if (extendedCount >= 3) {
    return "open";
  }

  if (extendedCount <= 1) {
    return "closed";
  }

  return "middle";
}

function isFingerExtended(
  wrist,
  tip,
  pip,
) {
  let tipDist = dist(
    wrist.x,
    wrist.y,
    tip.x,
    tip.y,
  );

  let pipDist = dist(
    wrist.x,
    wrist.y,
    pip.x,
    pip.y,
  );

  return (
    tipDist >
    pipDist * 1.08
  );
}

function getHandPoint(
  hand,
  index,
) {
  if (
    hand.keypoints &&
    hand.keypoints[index]
  ) {
    return hand.keypoints[index];
  }

  if (
    hand.landmarks &&
    hand.landmarks[index]
  ) {
    return {
      x: hand.landmarks[index][0],
      y: hand.landmarks[index][1],
    };
  }

  return null;
}

/* -----------------------------
   AUTO TRANSITIONS
----------------------------- */

function checkAutoTransition() {
  if (isCrossfading) return;

  if (
    currentScene ===
    "scene05VoiceLoop"
  ) {
    checkVoiceElementEnd();
    return;
  }

  let targetScene =
    AUTO_VIDEO_TRANSITIONS[
      currentScene
    ];

  if (targetScene) {
    checkVideoEndForCrossfade(
      currentScene,
      targetScene,
    );
  }
}

function checkVideoEndForCrossfade(
  fromSceneId,
  toSceneId,
) {
  if (!videos[fromSceneId]) {
    return;
  }

  let fromVideo =
    videos[fromSceneId].el;

  let fromDefinition =
    VIDEO_FILES[fromSceneId];

  if (!fromVideo.duration) {
    return;
  }

  let virtualEnd =
    fromVideo.duration -
    (fromDefinition.endTrim || 0);

  let timeLeft =
    virtualEnd -
    fromVideo.currentTime;

  if (
    timeLeft <=
    crossfadeDuration
  ) {
    startCrossfade(
      fromSceneId,
      toSceneId,
    );
  }
}

function startCrossfade(
  fromSceneId,
  toSceneId,
) {
  if (isCrossfading) return;

  let validFrom =
    videos[fromSceneId] ||
    [
      "scene02Choice",
      "scene05VoiceLoop",
      "scene06SeasonsChoice",
      "successScreen",
    ].includes(fromSceneId);

  if (!validFrom) {
    console.log(
      "Missing crossfade from scene:",
      fromSceneId,
    );

    return;
  }

  isCrossfading = true;

  activeTransition = {
    fromSceneId: fromSceneId,
    toSceneId: toSceneId,
    fadeStarted: false,
    fadeStartTime: 0,
  };

  prepareTransitionTarget(
    toSceneId,
  );
}

function prepareTransitionTarget(
  toSceneId,
) {
  if (
    toSceneId ===
    "scene02Choice"
  ) {
    startScene02ChoiceVideos(
      true,
    );

    return;
  }

  if (
    toSceneId ===
    "scene05VoiceLoop"
  ) {
    startScene05VoiceLoopVideos(
      true,
    );

    return;
  }

  if (
    toSceneId ===
    "scene06SeasonsChoice"
  ) {
    startScene06SeasonsChoiceVideos(
      true,
    );

    return;
  }

  if (
    toSceneId ===
    "successScreen"
  ) {
    return;
  }

  let video =
    videos[toSceneId];

  if (!video) return;

  video.el.loop =
    VIDEO_FILES[toSceneId].loop ||
    false;

  applyAudioState(
    toSceneId,
    0,
  );

  try {
    video.el.currentTime =
      VIDEO_FILES[toSceneId]
        .startAt || 0;
  } catch (e) {}

  video.el
    .play()
    .catch(function (err) {
      console.log(
        "PLAY NEXT FAILED:",
        toSceneId,
        err,
      );
    });
}

function isTransitionTargetReady(
  toSceneId,
) {
  if (
    toSceneId ===
    "scene02Choice"
  ) {
    return layerVideosReady(
      "scene02Background",
      "scene02BlobLoop",
    );
  }

  if (
    toSceneId ===
    "scene05VoiceLoop"
  ) {
    return layerVideosReady(
      "scene05ScanVoiceBackground",
      "scene05ScanVoiceBlob",
    );
  }

  if (
    toSceneId ===
    "scene06SeasonsChoice"
  ) {
    return layerVideosReady(
      "scene06SeasonsBackground",
      "scene06SeasonsBlobLoop",
    );
  }

  if (
    toSceneId ===
    "successScreen"
  ) {
    return true;
  }

  if (videos[toSceneId]) {
    return (
      videos[toSceneId].el
        .readyState > 0
    );
  }

  return true;
}

function layerVideosReady(
  firstId,
  secondId,
) {
  return (
    videos[firstId] &&
    videos[secondId] &&
    videos[firstId].el
      .readyState > 0 &&
    videos[secondId].el
      .readyState > 0
  );
}

function finishCrossfade() {
  if (!activeTransition) {
    return;
  }

  let fromSceneId =
    activeTransition.fromSceneId;

  let toSceneId =
    activeTransition.toSceneId;

  stopSpecialScene(
    fromSceneId,
  );

  if (videos[fromSceneId]) {
    videos[fromSceneId].el.pause();
    videos[fromSceneId].el.volume =
      0;
  }

  currentScene = toSceneId;

  resumeSpecialScene(
    toSceneId,
  );

  if (videos[toSceneId]) {
    applyAudioState(
      toSceneId,
      VIDEO_FILES[toSceneId]
        .volume,
    );
  }

  isCrossfading = false;
  activeTransition = null;
}

function stopSpecialScene(
  sceneId,
) {
  if (
    sceneId === "scene02Choice"
  ) {
    stopScene02ChoiceVideos();
  }

  if (
    sceneId ===
    "scene05VoiceLoop"
  ) {
    stopScene05VoiceLoopVideos();
  }

  if (
    sceneId ===
    "scene06SeasonsChoice"
  ) {
    stopScene06SeasonsChoiceVideos();
  }
}

function resumeSpecialScene(
  sceneId,
) {
  if (
    sceneId === "scene02Choice"
  ) {
    startScene02ChoiceVideos(
      false,
    );
  }

  if (
    sceneId ===
    "scene05VoiceLoop"
  ) {
    startScene05VoiceLoopVideos(
      false,
    );
  }

  if (
    sceneId ===
    "scene06SeasonsChoice"
  ) {
    startScene06SeasonsChoiceVideos(
      false,
    );
  }
}

/* -----------------------------
   DRAWING
----------------------------- */

function drawCurrentScene() {
  if (isCrossfading) {
    drawCrossfade();
    return;
  }

  drawSceneById(
    currentScene,
    1,
    true,
  );
}

function drawCrossfade() {
  if (!activeTransition) {
    return;
  }

  let fromSceneId =
    activeTransition.fromSceneId;

  let toSceneId =
    activeTransition.toSceneId;

  if (
    !isTransitionTargetReady(
      toSceneId,
    )
  ) {
    drawSceneById(
      fromSceneId,
      1,
      false,
    );

    return;
  }

  if (
    !activeTransition.fadeStarted
  ) {
    activeTransition.fadeStarted =
      true;

    activeTransition.fadeStartTime =
      millis();
  }

  let progress = constrain(
    (
      millis() -
      activeTransition.fadeStartTime
    ) /
      (
        crossfadeDuration *
        1000
      ),
    0,
    1,
  );

  drawSceneById(
    fromSceneId,
    1,
    false,
  );

  drawSceneById(
    toSceneId,
    progress,
    true,
  );

  if (audioUnlocked) {
    if (videos[fromSceneId]) {
      videos[
        fromSceneId
      ].el.volume =
        VIDEO_FILES[
          fromSceneId
        ].volume *
        (1 - progress);
    }

    if (videos[toSceneId]) {
      videos[
        toSceneId
      ].el.volume =
        VIDEO_FILES[
          toSceneId
        ].volume *
        progress;
    }
  }

  if (progress >= 1) {
    finishCrossfade();
  }
}

function drawSceneById(
  sceneId,
  alpha = 1,
  showCursor = true,
) {
  if (
    sceneId ===
    "scene02Choice"
  ) {
    drawChoiceScene(
      "scene02Background",
      drawPronounTexts,
      "scene02BlobLoop",
      alpha,
      showCursor,
    );

    return;
  }

  if (
    sceneId ===
    "scene05VoiceLoop"
  ) {
    drawScene05VoiceLoop(
      alpha,
    );

    return;
  }

  if (
    sceneId ===
    "scene06SeasonsChoice"
  ) {
    drawChoiceScene(
      "scene06SeasonsBackground",
      drawSeasonTexts,
      "scene06SeasonsBlobLoop",
      alpha,
      showCursor,
    );

    return;
  }

  if (
    sceneId ===
    "successScreen"
  ) {
    drawSuccessScreen(
      alpha,
    );

    return;
  }

  drawVideo(
    sceneId,
    alpha,
  );
}

function drawVideo(
  id,
  alpha = 1,
) {
  let video = videos[id];

  if (
    !video ||
    video.el.readyState <= 0
  ) {
    return;
  }

  if (
    !firstFrameShown &&
    id === "logoLoop"
  ) {
    showCanvas();
  }

  drawingContext.save();
  drawingContext.globalAlpha =
    alpha;

  drawingContext.drawImage(
    video.el,
    0,
    0,
    W,
    H,
  );

  drawingContext.restore();
}

function drawChoiceScene(
  backgroundId,
  textFunction,
  blobId,
  alpha,
  showCursor,
) {
  showCanvas();

  drawVideo(
    backgroundId,
    alpha,
  );

  drawingContext.save();
  drawingContext.globalAlpha =
    alpha;

  textFunction();

  drawingContext.restore();

  drawVideo(
    blobId,
    alpha,
  );

  if (showCursor) {
    drawingContext.save();
    drawingContext.globalAlpha =
      alpha;

    drawHandCursor();

    drawingContext.restore();
  }
}

function drawScene05VoiceLoop(
  alpha = 1,
) {
  showCanvas();

  drawVideo(
    "scene05ScanVoiceBackground",
    alpha,
  );

  if (voiceElementActive) {
    drawVideo(
      "scene05ScanVoiceElement",
      alpha,
    );
  }

  drawVideo(
    "scene05ScanVoiceBlob",
    alpha,
  );
}

function drawPronounTexts() {
  drawChoiceTexts(
    [
      "he",
      "she",
      "they",
    ],
    PRONOUN_POSITIONS,
    pronounBaseSize,
    pronounHoverScale,
    pronounHoverScales,
    pronounTracking,
    pronounColor,
    "scene02Choice",
  );

  if (showPositionDots) {
    let keys = [
      "he",
      "she",
      "they",
    ];

    for (
      let i = 0;
      i < keys.length;
      i++
    ) {
      let pos =
        PRONOUN_POSITIONS[
          keys[i]
        ];

      drawPositionDot(
        pos.x,
        pos.y,
      );
    }
  }
}

function drawSeasonTexts() {
  drawChoiceTexts(
    [
      "summer",
      "winter",
      "spring",
      "autumn",
    ],
    SEASON_POSITIONS,
    seasonBaseSize,
    seasonHoverScale,
    seasonHoverScales,
    seasonTracking,
    seasonColor,
    "scene06SeasonsChoice",
  );
}

function drawChoiceTexts(
  keys,
  positions,
  baseSize,
  hoverScale,
  scales,
  tracking,
  colorValue,
  sceneId,
) {
  push();

  if (pronounFont) {
    textFont(pronounFont);
  }

  textAlign(
    LEFT,
    CENTER,
  );

  noStroke();

  fill(
    colorValue[0],
    colorValue[1],
    colorValue[2],
    colorValue[3],
  );

  for (
    let i = 0;
    i < keys.length;
    i++
  ) {
    let keyName = keys[i];
    let pos =
      positions[keyName];

    let hovering =
      isCursorOverChoice(
        keyName,
        positions,
        baseSize,
        tracking,
        sceneId,
      );

    let targetScale =
      hovering
        ? hoverScale
        : 1;

    scales[keyName] = lerp(
      scales[keyName],
      targetScale,
      0.2,
    );

    textSize(
      baseSize *
        scales[keyName],
    );

    drawTrackedCenteredText(
      pos.label,
      pos.x,
      pos.y,
      tracking,
    );
  }

  pop();
}

function isCursorOverChoice(
  keyName,
  positions,
  size,
  tracking,
  sceneId,
) {
  if (
    !handCursor.visible ||
    currentScene !== sceneId
  ) {
    return false;
  }

  let pos =
    positions[keyName];

  if (!pos) return false;

  let bounds =
    getChoiceBounds(
      pos,
      size,
      tracking,
    );

  let paddingX = 90;
  let paddingY = 80;

  return (
    handCursor.x >=
      bounds.left - paddingX &&
    handCursor.x <=
      bounds.right + paddingX &&
    handCursor.y >=
      bounds.top - paddingY &&
    handCursor.y <=
      bounds.bottom + paddingY
  );
}

function getChoiceBounds(
  pos,
  size,
  tracking,
) {
  push();

  if (pronounFont) {
    textFont(pronounFont);
  }

  textSize(size);

  let width =
    getTrackedTextWidth(
      pos.label,
      tracking,
    );

  pop();

  return {
    left:
      pos.x - width / 2,

    right:
      pos.x + width / 2,

    top:
      pos.y - size / 2,

    bottom:
      pos.y + size / 2,
  };
}

function drawTrackedCenteredText(
  textValue,
  centerX,
  centerY,
  tracking,
) {
  let totalWidth =
    getTrackedTextWidth(
      textValue,
      tracking,
    );

  let x =
    centerX -
    totalWidth / 2;

  for (
    let i = 0;
    i < textValue.length;
    i++
  ) {
    let character =
      textValue.charAt(i);

    text(
      character,
      x,
      centerY,
    );

    x +=
      textWidth(character) +
      tracking;
  }
}

function getTrackedTextWidth(
  textValue,
  tracking,
) {
  let total = 0;

  for (
    let i = 0;
    i < textValue.length;
    i++
  ) {
    total += textWidth(
      textValue.charAt(i),
    );

    if (
      i <
      textValue.length - 1
    ) {
      total += tracking;
    }
  }

  return total;
}

function drawHandCursor() {
  let cursorSceneActive =
    currentScene ===
      "scene02Choice" ||
    currentScene ===
      "scene06SeasonsChoice";

  if (
    !cursorSceneActive ||
    !handCursor.visible
  ) {
    return;
  }

  push();

  noStroke();
  fill(255);

  circle(
    handCursor.x,
    handCursor.y,
    cursorSize,
  );

  pop();
}

function drawSuccessScreen(
  alpha = 1,
) {
  drawingContext.save();

  drawingContext.globalAlpha =
    alpha;

  background(255);

  push();

  fill(0);
  noStroke();

  textAlign(
    CENTER,
    CENTER,
  );

  textSize(120);

  text(
    "sucsses",
    W / 2,
    H / 2,
  );

  pop();

  drawingContext.restore();
}

function drawPositionDot(
  x,
  y,
) {
  push();

  stroke(
    255,
    0,
    0,
  );

  strokeWeight(3);

  line(
    x - 18,
    y,
    x + 18,
    y,
  );

  line(
    x,
    y - 18,
    x,
    y + 18,
  );

  noStroke();

  fill(
    255,
    0,
    0,
  );

  circle(
    x,
    y,
    8,
  );

  pop();
}

/* -----------------------------
   CANVAS FIT
----------------------------- */

function fitCanvasToWindow() {
  let scaleAmount = min(
    windowWidth / W,
    windowHeight / H,
  );

  let displayW =
    W * scaleAmount;

  let displayH =
    H * scaleAmount;

  cnv.elt.style.width =
    displayW + "px";

  cnv.elt.style.height =
    displayH + "px";

  cnv.elt.style.position =
    "absolute";

  cnv.elt.style.left =
    (
      windowWidth -
      displayW
    ) /
      2 +
    "px";

  cnv.elt.style.top =
    (
      windowHeight -
      displayH
    ) /
      2 +
    "px";
}

function windowResized() {
  fitCanvasToWindow();
}

/* -----------------------------
   DEBUG
----------------------------- */

function keyPressed() {
  if (
    key === " " &&
    currentScene ===
      "logoLoop"
  ) {
    unlockAudio(
      "space key",
    );

    playScene(
      "logoToScene01",
    );
  }

  if (
    key === "d" ||
    key === "D"
  ) {
    playScene(
      "scene02Choice",
    );
  }

  if (
    key === "s" ||
    key === "S"
  ) {
    showPositionDots =
      !showPositionDots;
  }

  if (
    key === "m" ||
    key === "M"
  ) {
    mirrorHandX =
      !mirrorHandX;

    console.log(
      "mirrorHandX:",
      mirrorHandX,
    );
  }

  if (
    key === "1" &&
    currentScene ===
      "scene02Choice"
  ) {
    selectPronoun("he");
  }

  if (
    key === "2" &&
    currentScene ===
      "scene02Choice"
  ) {
    selectPronoun("she");
  }

  if (
    key === "3" &&
    currentScene ===
      "scene02Choice"
  ) {
    selectPronoun("they");
  }

  if (
    key === "v" ||
    key === "V"
  ) {
    if (!audioUnlocked) {
      unlockAudio(
        "voice scan debug key",
      );
    }

    triggerVoiceScanElement(
      "debug key",
    );
  }

  if (key === "5") {
    playScene(
      "scene05VoiceLoop",
    );
  }

  if (key === "7") {
    playScene(
      "scene05ScanVoiceAns",
    );
  }

  // מתחיל בסרטון העונות ואז עובר למסך הבחירה
  if (key === "6") {
    playScene(
      "scene06SeasonsIntro",
    );
  }

  // בדיקות מהירות של בחירת עונות בלי יד
  if (
    key === "q" &&
    currentScene ===
      "scene06SeasonsChoice"
  ) {
    selectSeason("summer");
  }

  if (
    key === "w" &&
    currentScene ===
      "scene06SeasonsChoice"
  ) {
    selectSeason("winter");
  }

  if (
    key === "e" &&
    currentScene ===
      "scene06SeasonsChoice"
  ) {
    selectSeason("spring");
  }

  if (
    key === "r" &&
    currentScene ===
      "scene06SeasonsChoice"
  ) {
    selectSeason("autumn");
  }
}

function mousePressed() {
  if (!audioUnlocked) {
    unlockAudio(
      "mouse click",
    );
  }

  if (
    currentScene ===
    "logoLoop"
  ) {
    playScene(
      "logoToScene01",
    );
  }
}

function touchStarted() {
  if (!audioUnlocked) {
    unlockAudio("touch");
  }

  if (
    currentScene ===
    "logoLoop"
  ) {
    playScene(
      "logoToScene01",
    );
  }

  return false;
}
