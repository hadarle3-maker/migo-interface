console.log("MIGO FLOW V32 - 30 SECOND CHOICE TIMEOUTS");

const W = 1920;
const H = 1080;
const CAM_W = 640;
const CAM_H = 360;

let cnv;
let videos = {};
let webcam;
let handPose;
let faceMesh;
let hands = [];
let faces = [];
let pronounFont;
let arrowImage;

let currentScene = "logoLoop";
let firstFrameShown = false;
let audioUnlocked = false;

// סאונד חיצוני ל־Voice Scan
let voiceScanSound;
const VOICE_SCAN_SOUND_SRC = "assets/sound/sound_scan.mp3";
const VOICE_SCAN_SOUND_VOLUME = 0.15;

// אחסון הסרטונים הכבדים ב־Cloudflare R2
const R2_VIDEO_BASE_URL =
  "https://pub-7091711678d74f45beef1af5f5ee97ba.r2.dev";

// בשם האובייקט שהועלה ל־R2 יש כרגע רווח בתחילת השם.
// %20 מייצג את הרווח הזה בתוך הכתובת שעובדת בפועל.
const SCENE_08_QA_TO_TERMS_URL =
  R2_VIDEO_BASE_URL +
  "/%20scene_08_qa_to_terms.mp4";

// הסרטון הסופי המשותף לכל ארבע העונות
const MIGO_FINAL_URL =
  R2_VIDEO_BASE_URL +
  "/migo_final.mp4";

// מעברים
let isCrossfading = false;
let activeTransition = null;

const crossfadeDuration = 0.65;
const seasonsIntroCrossfadeDuration = 0.5;
const seasonLoopCrossfadeDuration = 0.5;
const seasonBrowseCrossfadeDuration = 0.35;
const seasonToQaCrossfadeDuration = 0.5;
const qaChoiceCrossfadeDuration = 0.5;
const qaAnswerCrossfadeDuration = 0.5;
const noTermsToMorfCrossfadeDuration = 0.5;
const noTermsReturnCrossfadeDuration = 0.65;
const noTermsReturnDelayMs = 10000;

// לאחר סיום סרטון ה־morph משאירות את הפריים האחרון
// קפוא במשך 2.5 שניות ואז עוברות לסרטון הסופי.
const morfToFinalDelayMs = 2500;
const morfToFinalCrossfadeDuration = 0.65;

// לא מחכות לאירוע ended של סרטון ה־morph, כי בחלק מהדפדפנים
// אלמנט הווידאו עלול להציג שוב את הפריים הראשון ברגע הסיום.
// במקום זאת שומרות פריימים מהחלק האחרון ועוצרות מעט לפני הסוף.
const morfCaptureWindowSeconds = 0.4;
const morfFreezeBeforeEndSeconds = 0.06;

// בסיום הסרטון הסופי חוזרות בצורה חלקה להתחלה.
const finalToLogoCrossfadeDuration = 0.65;

// במסכי הבחירה המרכזיים מחכות לתגובה במשך 30 שניות בלבד.
// אם לא התקבלה בחירה, מאפסות את החוויה וחוזרות ללוגו.
const choiceScreenTimeoutMs = 30000;
const choiceTimeoutReturnCrossfadeDuration = 0.65;

// פתיחת אודיו באמצעות זיהוי פנים
let faceSeenSince = 0;
const faceHoldToUnlockAudio = 250;

// מחוות יד
const openHoldTime = 350;
const closedHoldTime = 250;

let openingGesture = {
  phase: "waitingOpen",
  openSince: 0,
  closedSince: 0,
  lastGestureTime: 0,
  cooldown: 1400,
};

let pronounGesture =
  createChoiceGesture();

let seasonGesture =
  createChoiceGesture();

let arrowGesture =
  createChoiceGesture();

let seasonConfirmGesture =
  createChoiceGesture();

let yesNoGesture =
  createChoiceGesture();

let noTermsOverrideGesture =
  createChoiceGesture();

function createChoiceGesture() {
  return {
    phase: "waitingOpen",
    openSince: 0,
    closedSince: 0,
    targetKey: "",
    lastGestureTime: 0,
    cooldown: 1400,
  };
}

// מחוון יד
let mirrorHandX = true;
let cursorSize = 40;

let handCursor = {
  x: W / 2,
  y: H / 2,
  visible: false,
};

// סדר העונות בדפדוף
const SEASON_ORDER = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

const SEASON_DISPLAY_NAMES = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

// בחירת Yes / No
const yesNoBaseSize = 240;
const yesNoHoverScale = 1.3;
const yesNoTracking = -10;

const yesNoColor = [
  168,
  161,
  225,
  71,
];

const YES_NO_POSITIONS = {
  yes: {
    label: "Yes",
    x: 697.3912,
    y: 227,
  },

  no: {
    label: "No",
    x: 1216.677,
    y: 482,
  },
};

let yesNoHoverScales = {
  yes: 1,
  no: 1,
};

let selectedYesNo = null;

// מצב סרטון ה־No וההמתנה לפני החזרה ללוגו
let noTermsEndedAt = 0;
let noTermsWaitingForReturn = false;

// מצב ההמתנה בין סיום ה־morph לסרטון הסופי
let morfEndedAt = 0;
let morfWaitingForFinal = false;

// שומרות צילום אמיתי של הפריים האחרון של ה־morph.
// כך אין Seek לאחור שעלול להחזיר לרגע את מסך ה־Yes / No.
let morfFreezeCanvas = null;
let morfFreezeReady = false;
let morfFreezeSceneId = null;

// מונע הפעלה כפולה של החזרה להתחלה בסוף הסרטון הסופי.
let migoFinalReturningToStart = false;

// טיימר חוסר פעילות למסכי He / She / They, בחירת ואישור העונה ו־Yes / No.
let choiceTimeoutSceneId = null;
let choiceTimeoutStartedAt = 0;

// העונה שמוצגת כרגע
let currentSeason = null;

// הבחירה הסופית שנשמרת רק בסגירת היד במרכז
let selectedSeason = null;

// העונה שאליה עוברים כרגע בדפדוף
let pendingSeason = null;

// חצים
const arrowBaseWidth = 118;
const arrowBaseHeight = 118;
const arrowHoverScale = 1.3;

const ARROW_POSITIONS = {
  prev: {
    x: 110,
    y: H / 2 - 80,
  },

  next: {
    x: W - 110,
    y: H / 2 - 80,
  },
};

let arrowHoverScales = {
  prev: 1,
  next: 1,
};

// אזור האישור המרכזי
const SEASON_CONFIRM_ZONE = {
  x: W / 2,
  y: H / 2,
  width: 560,
  height: 680,
};

// טקסטים He / She / They
const pronounBaseSize = 240;
const pronounHoverScale = 1.3;
const pronounTracking = -10;

const pronounColor = [
  168,
  161,
  225,
  71,
];

let pronounHoverScales = {
  he: 1,
  she: 1,
  they: 1,
};

// טקסטים של העונות
const seasonBaseSize = 180;
const seasonHoverScale = 1.3;
const seasonTracking = -10;

const seasonColor = [
  168,
  161,
  225,
  71,
];

let seasonHoverScales = {
  summer: 1,
  winter: 1,
  spring: 1,
  autumn: 1,
};

let showPositionDots = false;

// Voice Scan
let voiceLoopEnteredAt = 0;
let voiceElementTriggered = false;
let voiceElementPlaying = false;
let voiceElementActive = false;

let voiceAnsDelayActive = false;
let voiceAnsDelayStartedAt = 0;

const voiceAnsDelayMs = 650;

let mouthPrevRatio = null;
let mouthBaselineRatio = null;
let mouthActivityFrames = 0;
let mouthDebugCounter = 0;

let mouthCalibrationStartedAt = 0;

const mouthCalibrationDuration = 1600;

let mouthCalibrationSamples = [];
let mouthCalibrationDone = false;

const mouthMovementDeltaThreshold =
  0.006;

const mouthOpenAboveBaselineThreshold =
  0.018;

const mouthActivityFramesNeeded = 7;
const voiceDetectionDelay = 500;

const VIDEO_FILES = {
  logoLoop: {
    src:
      "assets/videos/logo_loop.mp4",
    volume: 1,
    loop: false,
    customLoop: true,
    startAt: 0.08,
    endTrim: 0.08,
  },

  logoToScene01: {
    src:
      "assets/videos/logo_to_secen_01.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene01: {
    src:
      "assets/videos/secen_01.mp4",
    volume: 1,
    loop: false,
    startAt: 0.08,
    endTrim: 0.18,
  },

  scene02Intro: {
    src:
      "assets/videos/scene_02.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene02Background: {
    src:
      "assets/videos/scene_02_background_mute.mp4",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene02BlobLoop: {
    src:
      "assets/videos/scene_02_loop.webm",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene02AnsShe: {
    src:
      "assets/videos/secen_02_ans_she.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene02AnsHe: {
    src:
      "assets/videos/secen_02_ans_he.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene02AnsThey: {
    src:
      "assets/videos/secen_02_ans_they.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene03SheToLoveFace: {
    src:
      "assets/videos/secen_03_she_to_love_face.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene03HeToLoveFace: {
    src:
      "assets/videos/secen_03_he_to_love_face.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene03TheyToLoveFace: {
    src:
      "assets/videos/secen_03_they_to_love_face.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceOnly: {
    src:
      "assets/videos/secen_05_scan_voice_only.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceBackground: {
    src:
      "assets/videos/secen_05_scan_voice_background.mp4",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceElement: {
    src:
      "assets/videos/secen_05_scan_voice_element.webm",
    volume: 0,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceBlob: {
    src:
      "assets/videos/secen_05_scan_voice_blob.webm",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene05ScanVoiceAns: {
    src:
      "assets/videos/secen_05_scan_voice_ans.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SeasonsIntro: {
    src:
      "assets/videos/scene_06_seasons.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SeasonsBackground: {
    src:
      "assets/videos/scene_06_seasons_background.mp4",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene06SeasonsBlobLoop: {
    src:
      "assets/videos/scene_06_seasons_loop.webm",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene06SummerIn: {
    src:
      "assets/videos/scene_06_seasons_summer_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06WinterIn: {
    src:
      "assets/videos/scene_06_seasons_winter_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SpringIn: {
    src:
      "assets/videos/scene_06_seasons_spring_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06AutumnIn: {
    src:
      "assets/videos/scene_06_seasons_autumn_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0.18,
  },

  scene06SpringLoop: {
    src:
      "assets/videos/secen_06_Seasons_spring_loop.mp4",
    volume: 0.5,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene06SummerLoop: {
    src:
      "assets/videos/secen_06_Seasons_summer_loop.mp4",
    volume: 1,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene06AutumnLoop: {
    src:
      "assets/videos/secen_06_Seasons_Autumn_loop.mp4",
    volume: 1,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene06WinterLoop: {
    src:
      "assets/videos/secen_06_Seasons_winter_loop.mp4",
    volume: 1,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene06SpringFadeIn: {
    src:
      "assets/videos/secen_06_Seasons_spring_fade_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SummerFadeIn: {
    src:
      "assets/videos/secen_06_Seasons_summer_fade_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06AutumnFadeIn: {
    src:
      "assets/videos/secen_06_Seasons_Autumn_fade_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06WinterFadeIn: {
    src:
      "assets/videos/secen_06_Seasons_winter_fade_in.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SpringFadeOut: {
    src:
      "assets/videos/secen_06_Seasons_spring_fade_out.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06SummerFadeOut: {
    src:
      "assets/videos/secen_06_Seasons_summer_fade_out.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06AutumnFadeOut: {
    src:
      "assets/videos/secen_06_Seasons_Autumn_fade_out.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene06WinterFadeOut: {
    src:
      "assets/videos/secen_06_Seasons_winter_fade_out.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene07AutumnToQa: {
    src:
      "assets/videos/scene_07_autumn_to_qa.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene07SpringToQa: {
    src:
      "assets/videos/scene_07_spring_to_qa.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene07SummerToQa: {
    src:
      "assets/videos/scene_07_summer_to_qa.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene07WinterToQa: {
    src:
      "assets/videos/scene_07_winter_to_qa.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
  },

  scene07QaBackground: {
    src:
      "assets/videos/secen_07_qa_background.mp4",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  scene07QaLoop: {
    src:
      "assets/videos/scene_07_seasons_loop_new.webm",
    volume: 0,
    loop: true,
    startAt: 0,
    endTrim: 0,
  },

  // סרטוני ה־morph הסופיים לפי העונה שנשמרה
  scene08AutumnMorf: {
    src:
      "assets/videos/scene_08_autumn_morf.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
    preload: "none",
  },

  scene08SpringMorf: {
    src:
      "assets/videos/scene_08_spring_morf.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
    preload: "none",
  },

  scene08SummerMorf: {
    src:
      "assets/videos/scene_08_summer_morf.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
    preload: "none",
  },

  scene08WinterMorf: {
    src:
      "assets/videos/scene_08_winter_morf.mp4",
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
    preload: "none",
  },

  // הסרטון שמופעל כאשר נבחר No
  scene08QaToTerms: {
    src:
      SCENE_08_QA_TO_TERMS_URL,
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
    preload: "none",
  },

  // הסרטון הסופי המשותף לכל ארבע העונות
  migoFinal: {
    src:
      MIGO_FINAL_URL,
    volume: 1,
    loop: false,
    startAt: 0,
    endTrim: 0,
    preload: "none",
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
    x: 1355,
    y: 255,
  },

  winter: {
    label: "Winter",
    x: 1295,
    y: 515,
  },

  spring: {
    label: "Spring",
    x: 651,
    y: 160,
  },

  autumn: {
    label: "Autumn",
    x: 572,
    y: 402,
  },
};

const PRONOUN_ANSWER_VIDEOS = {
  he: "scene02AnsHe",
  she: "scene02AnsShe",
  they: "scene02AnsThey",
};

const SEASON_IN_VIDEOS = {
  spring: "scene06SpringIn",
  summer: "scene06SummerIn",
  autumn: "scene06AutumnIn",
  winter: "scene06WinterIn",
};

const SEASON_LOOP_VIDEOS = {
  spring: "scene06SpringLoop",
  summer: "scene06SummerLoop",
  autumn: "scene06AutumnLoop",
  winter: "scene06WinterLoop",
};

const SEASON_FADE_IN_VIDEOS = {
  spring:
    "scene06SpringFadeIn",

  summer:
    "scene06SummerFadeIn",

  autumn:
    "scene06AutumnFadeIn",

  winter:
    "scene06WinterFadeIn",
};

const SEASON_FADE_OUT_VIDEOS = {
  spring:
    "scene06SpringFadeOut",

  summer:
    "scene06SummerFadeOut",

  autumn:
    "scene06AutumnFadeOut",

  winter:
    "scene06WinterFadeOut",
};

const SEASON_LOOP_TO_KEY = {
  scene06SpringLoop:
    "spring",

  scene06SummerLoop:
    "summer",

  scene06AutumnLoop:
    "autumn",

  scene06WinterLoop:
    "winter",
};

const SEASON_FADE_OUT_TO_KEY = {
  scene06SpringFadeOut:
    "spring",

  scene06SummerFadeOut:
    "summer",

  scene06AutumnFadeOut:
    "autumn",

  scene06WinterFadeOut:
    "winter",
};

const SEASON_TO_QA_VIDEOS = {
  spring:
    "scene07SpringToQa",

  summer:
    "scene07SummerToQa",

  autumn:
    "scene07AutumnToQa",

  winter:
    "scene07WinterToQa",
};

const SEASON_TO_MORF_VIDEOS = {
  spring:
    "scene08SpringMorf",

  summer:
    "scene08SummerMorf",

  autumn:
    "scene08AutumnMorf",

  winter:
    "scene08WinterMorf",
};

const AUTO_TRANSITIONS = {
  logoToScene01: {
    to: "scene01",
  },

  scene01: {
    to: "scene02Intro",
  },

  scene02Intro: {
    to: "scene02Choice",
  },

  scene02AnsShe: {
    to:
      "scene03SheToLoveFace",
  },

  scene02AnsHe: {
    to:
      "scene03HeToLoveFace",
  },

  scene02AnsThey: {
    to:
      "scene03TheyToLoveFace",
  },

  scene03SheToLoveFace: {
    to:
      "scene05ScanVoiceOnly",
  },

  scene03HeToLoveFace: {
    to:
      "scene05ScanVoiceOnly",
  },

  scene03TheyToLoveFace: {
    to:
      "scene05ScanVoiceOnly",
  },

  scene05ScanVoiceOnly: {
    to:
      "scene05VoiceLoop",
  },

  scene05ScanVoiceAns: {
    to:
      "scene06SeasonsIntro",
  },

  scene06SeasonsIntro: {
    to:
      "scene06SeasonsChoice",

    duration:
      seasonsIntroCrossfadeDuration,
  },

  scene06SpringIn: {
    to:
      "scene06SpringLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06SummerIn: {
    to:
      "scene06SummerLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06AutumnIn: {
    to:
      "scene06AutumnLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06WinterIn: {
    to:
      "scene06WinterLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06SpringFadeIn: {
    to:
      "scene06SpringLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06SummerFadeIn: {
    to:
      "scene06SummerLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06AutumnFadeIn: {
    to:
      "scene06AutumnLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene06WinterFadeIn: {
    to:
      "scene06WinterLoop",

    duration:
      seasonLoopCrossfadeDuration,
  },

  scene07SpringToQa: {
    to:
      "scene07YesNoChoice",

    duration:
      qaChoiceCrossfadeDuration,
  },

  scene07SummerToQa: {
    to:
      "scene07YesNoChoice",

    duration:
      qaChoiceCrossfadeDuration,
  },

  scene07AutumnToQa: {
    to:
      "scene07YesNoChoice",

    duration:
      qaChoiceCrossfadeDuration,
  },

  scene07WinterToQa: {
    to:
      "scene07YesNoChoice",

    duration:
      qaChoiceCrossfadeDuration,
  },
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

  arrowImage = loadImage(
    "assets/videos/arrow.png",
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

  // Canvas פנימי ששומר את הפריים האחרון של סרטון ה־morph.
  morfFreezeCanvas =
    document.createElement(
      "canvas",
    );

  morfFreezeCanvas.width = W;
  morfFreezeCanvas.height = H;

  document.documentElement
    .style.margin = "0";

  document.documentElement
    .style.padding = "0";

  document.documentElement
    .style.backgroundColor =
      "black";

  document.body.style.margin =
    "0";

  document.body.style.padding =
    "0";

  document.body.style.overflow =
    "hidden";

  document.body.style
    .backgroundColor = "black";

  cnv.elt.style.visibility =
    "hidden";

  fitCanvasToWindow();
  loadVideos();
  loadSounds();
  setupCamera();

  playScene("logoLoop");
}

function draw() {
  background(0);

  drawingContext
    .imageSmoothingEnabled =
      true;

  drawingContext
    .imageSmoothingQuality =
      "high";

  updateInteraction();
  checkManualLoop();
  checkAutoTransition();
  drawCurrentScene();
}

/* -----------------------------
   VIDEO / SOUND LOADING
----------------------------- */

function loadVideos() {
  for (
    let id in VIDEO_FILES
  ) {
    videos[id] =
      createVideoElement(
        id,
        VIDEO_FILES[id].src,
      );
  }
}

function createVideoElement(
  id,
  src,
) {
  let el =
    document.createElement(
      "video",
    );

  let definition =
    VIDEO_FILES[id];

  // חייב להיקבע לפני src כדי שסרטון מ־R2
  // יוכל להיצייר בבטחה על ה־canvas.
  if (
    /^https?:\/\//i.test(src)
  ) {
    el.crossOrigin =
      "anonymous";
  }

  el.src = src;
  el.loop = false;
  el.muted = true;
  el.volume = 0;
  el.playsInline = true;

  // הסרטונים הרגילים נטענים מראש.
  // סרטוני Scene 08 מסומנים כ־none וייטענו רק בזמן הנכון.
  el.preload =
    definition.preload ||
    "auto";

  el.setAttribute(
    "muted",
    "",
  );

  el.setAttribute(
    "playsinline",
    "",
  );

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

  let loadRequested =
    el.preload !== "none";

  if (loadRequested) {
    el.load();
  }

  return {
    id,
    src,
    el,
    loadRequested,
  };
}

function requestVideoPreload(id) {
  let video = videos[id];

  if (!video) {
    console.log(
      "CANNOT PRELOAD MISSING VIDEO:",
      id,
    );

    return;
  }

  if (
    video.loadRequested ||
    video.el.readyState >= 2
  ) {
    return;
  }

  console.log(
    "STARTING SMART PRELOAD:",
    id,
  );

  video.loadRequested = true;
  video.el.preload = "auto";
  video.el.load();
}

function preloadFinalChoiceVideos() {
  // תמיד טוענות מראש את מסלול No.
  requestVideoPreload(
    "scene08QaToTerms",
  );

  // מתוך ארבעת סרטוני ה־morph נטען רק
  // את הסרטון של העונה שנשמרה בפועל.
  let selectedMorfVideo =
    SEASON_TO_MORF_VIDEOS[
      selectedSeason
    ];

  if (selectedMorfVideo) {
    requestVideoPreload(
      selectedMorfVideo,
    );
  }
}

function loadSounds() {
  voiceScanSound =
    document.createElement(
      "audio",
    );

  voiceScanSound.src =
    VOICE_SCAN_SOUND_SRC;

  voiceScanSound.preload =
    "auto";

  voiceScanSound.volume =
    VOICE_SCAN_SOUND_VOLUME;

  voiceScanSound.muted =
    true;

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
    videos[id].el.muted =
      false;

    videos[
      id
    ].el.removeAttribute(
      "muted",
    );

    videos[id].el.volume =
      id === currentScene
        ? VIDEO_FILES[id]
            .volume
        : 0;
  }

  if (voiceScanSound) {
    voiceScanSound.muted =
      false;

    voiceScanSound.volume =
      VOICE_SCAN_SOUND_VOLUME;
  }

  if (videos[currentScene]) {
    videos[
      currentScene
    ].el
      .play()
      .catch(
        function (err) {
          console.log(
            "PLAY AFTER AUDIO UNLOCK FAILED:",
            currentScene,
            err,
          );
        },
      );
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

    video.el.removeAttribute(
      "muted",
    );

    video.el.volume =
      volumeLevel !== null
        ? volumeLevel
        : VIDEO_FILES[id]
            .volume;
  } else {
    video.el.muted = true;
    video.el.volume = 0;
  }
}

function playVoiceScanSound() {
  if (!voiceScanSound) return;

  try {
    voiceScanSound.pause();

    voiceScanSound.currentTime =
      0;

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

    voiceScanSound.currentTime =
      0;
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

  if (isSpecialScene(id)) {
    resetSceneGesture(id);

    startSpecialScene(
      id,
      true,
    );

    updateChoiceTimeoutForScene(
      id,
    );

    showCanvas();

    return;
  }

  updateChoiceTimeoutForScene(
    id,
  );

  let video = videos[id];

  if (!video) {
    console.log(
      "Missing video:",
      id,
    );

    return;
  }

  startVideo(
    id,
    true,
    VIDEO_FILES[id].volume,
  );
}

function startVideo(
  id,
  resetToStart,
  volumeLevel,
) {
  let video = videos[id];

  if (!video) return;

  // סרטון כבד עם preload: none מתחיל להיטען
  // רק כשבאמת מתקרבים אליו או מפעילים אותו.
  requestVideoPreload(id);

  video.el.loop =
    VIDEO_FILES[id].loop ||
    false;

  applyAudioState(
    id,
    volumeLevel,
  );

  if (resetToStart) {
    try {
      video.el.currentTime =
        VIDEO_FILES[id]
          .startAt || 0;
    } catch (e) {}
  }

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

function isSpecialScene(id) {
  return (
    id ===
      "scene02Choice" ||
    id ===
      "scene05VoiceLoop" ||
    id ===
      "scene06SeasonsChoice" ||
    id ===
      "scene07YesNoChoice" ||
    id ===
      "successScreen"
  );
}

function resetSceneGesture(id) {
  if (
    id === "scene02Choice"
  ) {
    resetChoiceGesture(
      pronounGesture,
    );
  }

  if (
    id ===
    "scene06SeasonsChoice"
  ) {
    resetChoiceGesture(
      seasonGesture,
    );
  }

  if (
    id ===
    "scene07YesNoChoice"
  ) {
    resetChoiceGesture(
      yesNoGesture,
    );
  }
}

function startSpecialScene(
  id,
  resetToStart,
) {
  if (
    id === "scene02Choice"
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

  if (
    id === "scene05VoiceLoop"
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

    voiceLoopEnteredAt =
      millis();
  }

  if (
    id ===
    "scene06SeasonsChoice"
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

  if (
    id ===
    "scene07YesNoChoice"
  ) {
    startLayerLoopVideo(
      "scene07QaBackground",
      resetToStart,
    );

    startLayerLoopVideo(
      "scene07QaLoop",
      resetToStart,
    );

    if (resetToStart) {
      selectedYesNo = null;

      resetChoiceGesture(
        yesNoGesture,
      );
    }
  }
}

function stopSpecialScene(id) {
  if (
    id === "scene02Choice"
  ) {
    stopSingleVideo(
      "scene02Background",
    );

    stopSingleVideo(
      "scene02BlobLoop",
    );
  }

  if (
    id === "scene05VoiceLoop"
  ) {
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

  if (
    id ===
    "scene06SeasonsChoice"
  ) {
    stopSingleVideo(
      "scene06SeasonsBackground",
    );

    stopSingleVideo(
      "scene06SeasonsBlobLoop",
    );
  }

  if (
    id ===
    "scene07YesNoChoice"
  ) {
    stopSingleVideo(
      "scene07QaBackground",
    );

    stopSingleVideo(
      "scene07QaLoop",
    );
  }
}

function startLayerLoopVideo(
  id,
  resetToStart,
) {
  startVideo(
    id,
    resetToStart,
    0,
  );
}

function stopSingleVideo(id) {
  if (!videos[id]) return;

  videos[id].el.pause();

  videos[id].el.loop =
    false;

  videos[id].el.volume = 0;

  try {
    videos[
      id
    ].el.currentTime =
      VIDEO_FILES[id]
        .startAt || 0;
  } catch (e) {}
}

function stopAllVideos() {
  for (let id in videos) {
    videos[id].el.pause();

    videos[id].el.loop =
      false;

    videos[id].el.volume = 0;

    try {
      videos[
        id
      ].el.currentTime =
        VIDEO_FILES[id]
          .startAt || 0;
    } catch (e) {}
  }
}

function checkManualLoop() {
  let def =
    VIDEO_FILES[currentScene];

  let video =
    videos[currentScene];

  if (
    !def ||
    !video ||
    !def.customLoop ||
    !video.el.duration
  ) {
    return;
  }

  let virtualEnd =
    video.el.duration -
    (def.endTrim || 0);

  if (
    video.el.currentTime >=
    virtualEnd
  ) {
    try {
      video.el.currentTime =
        def.startAt || 0;
    } catch (e) {}

    video.el
      .play()
      .catch(
        function (err) {
          console.log(
            "MANUAL LOOP PLAY FAILED:",
            currentScene,
            err,
          );
        },
      );
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
    currentScene ===
      "logoLoop" &&
    !isCrossfading
  ) {
    detectOpenCloseHandToContinue();
  }

  if (
    currentScene ===
      "scene02Choice" &&
    !isCrossfading
  ) {
    detectChoiceSelection(
      pronounGesture,
      getHoveredPronounKey(),
      selectPronoun,
    );
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
    detectChoiceSelection(
      seasonGesture,
      getHoveredSeasonKey(),
      selectSeason,
    );
  }

  if (
    isSeasonLoopScene(
      currentScene,
    ) &&
    !isCrossfading
  ) {
    detectChoiceSelection(
      arrowGesture,
      getHoveredArrowKey(),
      navigateSeason,
    );

    detectChoiceSelection(
      seasonConfirmGesture,
      getSeasonConfirmKey(),
      confirmCurrentSeason,
    );
  }

  if (
    currentScene ===
      "scene07YesNoChoice" &&
    !isCrossfading
  ) {
    detectChoiceSelection(
      yesNoGesture,
      getHoveredYesNoKey(),
      selectYesNoAnswer,
    );
  }

  // לאורך סרטון ה־No:
  // פותחים שוב את היד ואז סוגרים כדי לעבור למסלול Yes
  if (
    currentScene ===
      "scene08QaToTerms" &&
    !isCrossfading &&
    !noTermsWaitingForReturn
  ) {
    detectChoiceSelection(
      noTermsOverrideGesture,
      handCursor.visible
        ? "overrideToYes"
        : "",
      switchNoToSelectedMorf,
    );
  }
}

function detectFaceForSound() {
  if (audioUnlocked) return;

  if (faces.length > 0) {
    if (faceSeenSince === 0) {
      faceSeenSince = millis();
    }

    if (
      millis() -
        faceSeenSince >
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
    handCursor.visible =
      false;

    return;
  }

  let point =
    getHandCenterPoint(
      hands[0],
    );

  if (!point) {
    handCursor.visible =
      false;

    return;
  }

  let mappedX =
    mirrorHandX
      ? W -
        (point.x / CAM_W) *
          W
      : (point.x / CAM_W) *
        W;

  let mappedY =
    (point.y / CAM_H) * H;

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

function getHandCenterPoint(
  hand,
) {
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
    let index of indexes
  ) {
    let point =
      getHandPoint(
        hand,
        index,
      );

    if (point) {
      sumX += point.x;
      sumY += point.y;
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
    resetOpeningGesture();

    return;
  }

  let handState =
    getHandOpenCloseState(
      hands[0],
    );

  let now = millis();

  if (
    openingGesture.phase ===
    "waitingOpen"
  ) {
    if (handState === "open") {
      if (
        openingGesture.openSince ===
        0
      ) {
        openingGesture.openSince =
          now;
      }

      if (
        now -
          openingGesture.openSince >
        openHoldTime
      ) {
        openingGesture.phase =
          "waitingClosed";

        openingGesture.closedSince =
          0;
      }
    } else {
      openingGesture.openSince =
        0;
    }
  }

  if (
    openingGesture.phase ===
    "waitingClosed"
  ) {
    if (
      handState === "closed"
    ) {
      if (
        openingGesture.closedSince ===
        0
      ) {
        openingGesture.closedSince =
          now;
      }

      if (
        now -
          openingGesture.closedSince >
          closedHoldTime &&
        now -
          openingGesture.lastGestureTime >
          openingGesture.cooldown
      ) {
        openingGesture.lastGestureTime =
          now;

        resetOpeningGesture();

        playScene(
          "logoToScene01",
        );
      }
    } else {
      openingGesture.closedSince =
        0;
    }
  }
}

function resetOpeningGesture() {
  openingGesture.phase =
    "waitingOpen";

  openingGesture.openSince = 0;

  openingGesture.closedSince =
    0;
}

function detectChoiceSelection(
  gesture,
  hoveredKey,
  onSelect,
) {
  if (
    hands.length === 0 ||
    !handCursor.visible ||
    !hoveredKey
  ) {
    resetChoiceGesture(
      gesture,
    );

    return;
  }

  let handState =
    getHandOpenCloseState(
      hands[0],
    );

  let now = millis();

  if (
    gesture.phase ===
    "waitingOpen"
  ) {
    if (handState === "open") {
      if (
        gesture.openSince ===
          0 ||
        gesture.targetKey !==
          hoveredKey
      ) {
        gesture.openSince =
          now;

        gesture.targetKey =
          hoveredKey;
      }

      if (
        now -
          gesture.openSince >
        openHoldTime
      ) {
        gesture.phase =
          "waitingClosed";

        gesture.closedSince = 0;
      }
    } else {
      gesture.openSince = 0;

      gesture.targetKey =
        hoveredKey;
    }
  }

  if (
    gesture.phase ===
    "waitingClosed"
  ) {
    if (
      hoveredKey !==
      gesture.targetKey
    ) {
      resetChoiceGesture(
        gesture,
      );

      return;
    }

    if (
      handState === "closed"
    ) {
      if (
        gesture.closedSince ===
        0
      ) {
        gesture.closedSince =
          now;
      }

      if (
        now -
          gesture.closedSince >
          closedHoldTime &&
        now -
          gesture.lastGestureTime >
          gesture.cooldown
      ) {
        gesture.lastGestureTime =
          now;

        onSelect(hoveredKey);
      }
    } else {
      gesture.closedSince = 0;
    }
  }
}

function resetChoiceGesture(
  gesture,
) {
  gesture.phase =
    "waitingOpen";

  gesture.openSince = 0;
  gesture.closedSince = 0;
  gesture.targetKey = "";
}

function selectPronoun(
  keyName,
) {
  let target =
    PRONOUN_ANSWER_VIDEOS[
      keyName
    ];

  if (!target) return;

  resetChoiceGesture(
    pronounGesture,
  );

  startCrossfade(
    "scene02Choice",
    target,
  );
}

function selectSeason(
  keyName,
) {
  let target =
    SEASON_IN_VIDEOS[
      keyName
    ];

  if (!target) return;

  currentSeason = keyName;
  selectedSeason = null;
  pendingSeason = null;

  resetChoiceGesture(
    seasonGesture,
  );

  resetChoiceGesture(
    arrowGesture,
  );

  resetChoiceGesture(
    seasonConfirmGesture,
  );

  startCrossfade(
    "scene06SeasonsChoice",
    target,
  );
}

function isSeasonLoopScene(
  sceneId,
) {
  return !!SEASON_LOOP_TO_KEY[
    sceneId
  ];
}

function navigateSeason(
  direction,
) {
  if (
    !currentSeason ||
    pendingSeason ||
    !isSeasonLoopScene(
      currentScene,
    )
  ) {
    return;
  }

  let currentIndex =
    SEASON_ORDER.indexOf(
      currentSeason,
    );

  if (currentIndex < 0) return;

  let step =
    direction === "next"
      ? 1
      : -1;

  let nextIndex =
    (
      currentIndex +
      step +
      SEASON_ORDER.length
    ) %
    SEASON_ORDER.length;

  pendingSeason =
    SEASON_ORDER[nextIndex];

  let fadeOutVideo =
    SEASON_FADE_OUT_VIDEOS[
      currentSeason
    ];

  if (!fadeOutVideo) {
    pendingSeason = null;

    return;
  }

  resetChoiceGesture(
    arrowGesture,
  );

  resetChoiceGesture(
    seasonConfirmGesture,
  );

  console.log(
    "SEASON BROWSE:",
    currentSeason,
    "->",
    pendingSeason,
  );

  startCrossfade(
    currentScene,
    fadeOutVideo,
    seasonBrowseCrossfadeDuration,
  );
}

function confirmCurrentSeason() {
  if (
    !currentSeason ||
    !isSeasonLoopScene(
      currentScene,
    )
  ) {
    return;
  }

  selectedSeason =
    currentSeason;

  window.selectedSeason =
    selectedSeason;

  console.log(
    "FINAL SEASON SELECTED:",
    selectedSeason,
  );

  // בזמן שסרטון המעבר ל־QA מתנגן, מתחילות
  // ברקע לטעון רק את שני המסלולים האפשריים:
  // סרטון No וסרטון ה־morph של העונה שנבחרה.
  preloadFinalChoiceVideos();

  resetChoiceGesture(
    arrowGesture,
  );

  resetChoiceGesture(
    seasonConfirmGesture,
  );

  let targetVideo =
    SEASON_TO_QA_VIDEOS[
      selectedSeason
    ];

  if (!targetVideo) {
    console.log(
      "MISSING QA VIDEO FOR SEASON:",
      selectedSeason,
    );

    return;
  }

  startCrossfade(
    currentScene,
    targetVideo,
    seasonToQaCrossfadeDuration,
  );
}

function getHoveredYesNoKey() {
  for (
    let key of [
      "yes",
      "no",
    ]
  ) {
    if (
      isCursorOverChoice(
        key,
        YES_NO_POSITIONS,
        yesNoBaseSize,
        yesNoTracking,
        "scene07YesNoChoice",
      )
    ) {
      return key;
    }
  }

  return "";
}

function selectYesNoAnswer(
  answerKey,
) {
  selectedYesNo = answerKey;

  window.selectedYesNo =
    selectedYesNo;

  console.log(
    "YES / NO ANSWER SELECTED:",
    selectedYesNo,
  );

  resetChoiceGesture(
    yesNoGesture,
  );

  if (answerKey === "yes") {
    playSelectedSeasonMorf(
      "scene07YesNoChoice",
      qaAnswerCrossfadeDuration,
      "yes choice",
    );

    return;
  }

  if (answerKey === "no") {
    resetNoTermsState();

    startCrossfade(
      "scene07YesNoChoice",
      "scene08QaToTerms",
      qaAnswerCrossfadeDuration,
    );
  }
}

function getSelectedSeasonMorfVideo() {
  if (!selectedSeason) {
    console.log(
      "NO FINAL SEASON SAVED FOR MORPH",
    );

    return null;
  }

  let targetVideo =
    SEASON_TO_MORF_VIDEOS[
      selectedSeason
    ];

  if (!targetVideo) {
    console.log(
      "MISSING MORPH VIDEO FOR SEASON:",
      selectedSeason,
    );

    return null;
  }

  return targetVideo;
}

function playSelectedSeasonMorf(
  fromSceneId,
  transitionDuration =
    qaAnswerCrossfadeDuration,
  reason = "unknown",
) {
  let targetVideo =
    getSelectedSeasonMorfVideo();

  if (!targetVideo) return;

  console.log(
    "PLAYING SELECTED SEASON MORPH:",
    selectedSeason,
    "reason:",
    reason,
  );

  // הסרטון הסופי כבד ונמצא ב־R2, לכן מתחילות
  // לטעון אותו בזמן שה־morph מתנגן.
  requestVideoPreload(
    "migoFinal",
  );

  resetMorfToFinalState();

  startCrossfade(
    fromSceneId,
    targetVideo,
    transitionDuration,
  );
}

function switchNoToSelectedMorf() {
  if (
    currentScene !==
      "scene08QaToTerms" ||
    isCrossfading
  ) {
    return;
  }

  selectedYesNo = "yes";

  window.selectedYesNo =
    "yes";

  resetChoiceGesture(
    noTermsOverrideGesture,
  );

  noTermsEndedAt = 0;

  noTermsWaitingForReturn =
    false;

  playSelectedSeasonMorf(
    "scene08QaToTerms",
    noTermsToMorfCrossfadeDuration,
    "hand closed during No video",
  );
}

function resetNoTermsState() {
  noTermsEndedAt = 0;

  noTermsWaitingForReturn =
    false;

  resetChoiceGesture(
    noTermsOverrideGesture,
  );
}

function checkNoTermsFlow() {
  let video =
    videos.scene08QaToTerms;

  if (
    !video ||
    !video.el.duration
  ) {
    return;
  }

  let videoEnded =
    video.el.ended ||
    video.el.currentTime >=
      video.el.duration -
        0.05;

  if (
    !noTermsWaitingForReturn &&
    videoEnded
  ) {
    noTermsWaitingForReturn =
      true;

    noTermsEndedAt = millis();

    // משאירים את הפריים האחרון קפוא בזמן ההמתנה
    video.el.pause();

    try {
      video.el.currentTime =
        max(
          0,
          video.el.duration -
            0.03,
        );
    } catch (e) {}

    console.log(
      "NO VIDEO ENDED. RETURNING TO LOGO IN 10 SECONDS.",
    );

    return;
  }

  if (
    noTermsWaitingForReturn &&
    millis() -
      noTermsEndedAt >=
      noTermsReturnDelayMs
  ) {
    resetExperienceValues();

    startCrossfade(
      "scene08QaToTerms",
      "logoLoop",
      noTermsReturnCrossfadeDuration,
    );
  }
}

function isFinalMorfScene(
  sceneId,
) {
  return (
    sceneId ===
      "scene08SpringMorf" ||
    sceneId ===
      "scene08SummerMorf" ||
    sceneId ===
      "scene08AutumnMorf" ||
    sceneId ===
      "scene08WinterMorf"
  );
}

function resetMorfToFinalState() {
  morfEndedAt = 0;
  morfWaitingForFinal = false;
  morfFreezeReady = false;
  morfFreezeSceneId = null;

  if (morfFreezeCanvas) {
    let ctx =
      morfFreezeCanvas.getContext(
        "2d",
      );

    ctx.clearRect(
      0,
      0,
      W,
      H,
    );
  }
}

function captureMorfFreezeFrame(
  sceneId,
  videoElement,
) {
  if (
    !morfFreezeCanvas ||
    !videoElement
  ) {
    return false;
  }

  try {
    let ctx =
      morfFreezeCanvas.getContext(
        "2d",
      );

    ctx.clearRect(
      0,
      0,
      W,
      H,
    );

    ctx.drawImage(
      videoElement,
      0,
      0,
      W,
      H,
    );

    morfFreezeReady = true;
    morfFreezeSceneId =
      sceneId;

    console.log(
      "MORPH LAST FRAME CAPTURED:",
      sceneId,
    );

    return true;
  } catch (err) {
    console.log(
      "MORPH FRAME CAPTURE FAILED:",
      err,
    );

    morfFreezeReady = false;
    morfFreezeSceneId =
      null;

    return false;
  }
}

function drawFrozenMorfFrame(
  alpha = 1,
) {
  if (
    !morfFreezeCanvas ||
    !morfFreezeReady
  ) {
    return;
  }

  drawingContext.save();

  drawingContext.globalAlpha =
    alpha;

  drawingContext.drawImage(
    morfFreezeCanvas,
    0,
    0,
    W,
    H,
  );

  drawingContext.restore();
}

function checkMorfToFinalFlow() {
  if (
    !isFinalMorfScene(
      currentScene,
    )
  ) {
    return;
  }

  let morfVideo =
    videos[currentScene];

  if (
    !morfVideo ||
    !morfVideo.el.duration
  ) {
    return;
  }

  // ברגע שכבר הקפאנו את סוף המורף, רק סופרות 2.5 שניות
  // ואז עוברות ישירות לסרטון הסופי.
  if (morfWaitingForFinal) {
    if (
      millis() -
        morfEndedAt >=
        morfToFinalDelayMs
    ) {
      startCrossfade(
        currentScene,
        "migoFinal",
        morfToFinalCrossfadeDuration,
      );
    }

    return;
  }

  let duration =
    morfVideo.el.duration;

  let currentTime =
    morfVideo.el.currentTime;

  let timeLeft =
    duration - currentTime;

  let morfEnded =
    morfVideo.el.ended;

  // שומרות באופן רציף את הפריים התקין האחרון במהלך החלק
  // האחרון של הסרטון. הצילום עדיין לא מוצג כל עוד הסרטון מנגן.
  if (
    !morfEnded &&
    timeLeft > 0 &&
    timeLeft <=
      morfCaptureWindowSeconds
  ) {
    captureMorfFreezeFrame(
      currentScene,
      morfVideo.el,
    );
  }

  // עוצרות מעט לפני שהדפדפן מגיע ל־ended.
  // כך הוא לעולם לא מקבל הזדמנות להציג שוב את הפריים הראשון
  // של קובץ ה־morph, שבו נמצא מסך ה־Yes / No.
  let shouldFreezeNow =
    morfEnded ||
    timeLeft <=
      morfFreezeBeforeEndSeconds;

  if (!shouldFreezeNow) {
    return;
  }

  // במקרה שהגענו לסוף בקפיצה ולא נשמר עדיין פריים,
  // מנסות לצלם את הפריים הנוכחי. בדרך כלל כבר קיים צילום תקין
  // מחלון ה־0.4 שניות שלפני הסיום.
  if (
    !morfFreezeReady &&
    !morfEnded
  ) {
    captureMorfFreezeFrame(
      currentScene,
      morfVideo.el,
    );
  }

  morfVideo.el.pause();

  // משתיקות את אלמנט הווידאו עצמו בזמן שהצילום הקפוא מוצג.
  morfVideo.el.volume = 0;

  morfWaitingForFinal = true;
  morfEndedAt = millis();

  console.log(
    "MORPH FROZEN BEFORE ENDED. PLAYING MIGO FINAL IN 2.5 SECONDS.",
    "timeLeft:",
    timeLeft,
  );
}

function resetMigoFinalState() {
  migoFinalReturningToStart =
    false;
}

function checkMigoFinalFlow() {
  if (
    currentScene !==
      "migoFinal" ||
    migoFinalReturningToStart
  ) {
    return;
  }

  let finalVideo =
    videos.migoFinal;

  if (
    !finalVideo ||
    !finalVideo.el.duration
  ) {
    return;
  }

  let finalEnded =
    finalVideo.el.ended ||
    finalVideo.el.currentTime >=
      finalVideo.el.duration -
        0.05;

  if (!finalEnded) {
    return;
  }

  migoFinalReturningToStart =
    true;

  // משאירות את הפריים האחרון במקום בזמן המעבר ללוגו.
  finalVideo.el.pause();

  console.log(
    "MIGO FINAL ENDED. RETURNING TO START.",
  );

  resetExperienceValues();

  startCrossfade(
    "migoFinal",
    "logoLoop",
    finalToLogoCrossfadeDuration,
  );
}

function resetExperienceValues() {
  currentSeason = null;
  selectedSeason = null;
  pendingSeason = null;
  selectedYesNo = null;

  window.selectedSeason =
    null;

  window.selectedYesNo = null;

  resetOpeningGesture();

  openingGesture.lastGestureTime =
    0;

  resetChoiceGesture(
    pronounGesture,
  );

  resetChoiceGesture(
    seasonGesture,
  );

  resetChoiceGesture(
    arrowGesture,
  );

  resetChoiceGesture(
    seasonConfirmGesture,
  );

  resetChoiceGesture(
    yesNoGesture,
  );

  resetNoTermsState();
  resetMorfToFinalState();
  resetMigoFinalState();
  clearChoiceScreenTimeout();
}

function getHoveredArrowKey() {
  if (
    !handCursor.visible ||
    !isSeasonLoopScene(
      currentScene,
    )
  ) {
    return "";
  }

  if (
    isCursorOverArrow("prev")
  ) {
    return "prev";
  }

  if (
    isCursorOverArrow("next")
  ) {
    return "next";
  }

  return "";
}

function getSeasonConfirmKey() {
  if (
    !handCursor.visible ||
    !isSeasonLoopScene(
      currentScene,
    )
  ) {
    return "";
  }

  let left =
    SEASON_CONFIRM_ZONE.x -
    SEASON_CONFIRM_ZONE.width /
      2;

  let right =
    SEASON_CONFIRM_ZONE.x +
    SEASON_CONFIRM_ZONE.width /
      2;

  let top =
    SEASON_CONFIRM_ZONE.y -
    SEASON_CONFIRM_ZONE.height /
      2;

  let bottom =
    SEASON_CONFIRM_ZONE.y +
    SEASON_CONFIRM_ZONE.height /
      2;

  let inside =
    handCursor.x >= left &&
    handCursor.x <= right &&
    handCursor.y >= top &&
    handCursor.y <= bottom;

  return inside
    ? "confirm"
    : "";
}

function getHoveredPronounKey() {
  for (
    let key of [
      "he",
      "she",
      "they",
    ]
  ) {
    if (
      isCursorOverChoice(
        key,
        PRONOUN_POSITIONS,
        pronounBaseSize,
        pronounTracking,
        "scene02Choice",
      )
    ) {
      return key;
    }
  }

  return "";
}

function getHoveredSeasonKey() {
  for (
    let key of [
      "summer",
      "winter",
      "spring",
      "autumn",
    ]
  ) {
    if (
      isCursorOverChoice(
        key,
        SEASON_POSITIONS,
        seasonBaseSize,
        seasonTracking,
        "scene06SeasonsChoice",
      )
    ) {
      return key;
    }
  }

  return "";
}

/* -----------------------------
   VOICE SCAN
----------------------------- */

function resetVoiceScanState() {
  voiceElementTriggered =
    false;

  voiceElementPlaying =
    false;

  voiceElementActive = false;

  voiceAnsDelayActive =
    false;

  voiceAnsDelayStartedAt = 0;

  resetMouthCalibration();

  mouthDebugCounter = 0;
}

function resetMouthCalibration() {
  mouthPrevRatio = null;

  mouthBaselineRatio = null;

  mouthActivityFrames = 0;

  mouthCalibrationStartedAt =
    0;

  mouthCalibrationSamples = [];

  mouthCalibrationDone =
    false;
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

      mouthCalibrationSamples =
        [];

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
      let sum =
        mouthCalibrationSamples.reduce(
          function (
            total,
            value,
          ) {
            return (
              total + value
            );
          },
          0,
        );

      mouthBaselineRatio =
        sum /
        mouthCalibrationSamples.length;

      mouthPrevRatio = ratio;

      mouthActivityFrames = 0;

      mouthCalibrationDone =
        true;

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
    ratio -
    mouthBaselineRatio;

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
    mouthDebugCounter %
      8 ===
    0
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

function getMouthOpenRatio(
  face,
) {
  let upperLip =
    getFacePoint(face, 13);

  let lowerLip =
    getFacePoint(face, 14);

  let mouthLeft =
    getFacePoint(face, 61);

  let mouthRight =
    getFacePoint(face, 291);

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

  return (
    mouthOpen / mouthWidth
  );
}

function getFacePoint(
  face,
  index,
) {
  if (
    face.keypoints &&
    face.keypoints[index]
  ) {
    return face.keypoints[
      index
    ];
  }

  if (
    face.landmarks &&
    face.landmarks[index]
  ) {
    return {
      x:
        face.landmarks[
          index
        ][0],

      y:
        face.landmarks[
          index
        ][1],
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
    videos
      .scene05ScanVoiceElement;

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
    videos
      .scene05ScanVoiceElement;

  if (
    !video ||
    !video.el.duration
  ) {
    return;
  }

  let elementHasEnded =
    video.el.ended ||
    video.el.currentTime >=
      video.el.duration -
        0.05;

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
    voiceElementPlaying =
      false;

    voiceElementActive =
      false;

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
  let wrist =
    getHandPoint(hand, 0);

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
    let pair of fingers
  ) {
    let tip =
      getHandPoint(
        hand,
        pair[0],
      );

    let pip =
      getHandPoint(
        hand,
        pair[1],
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
    return hand.keypoints[
      index
    ];
  }

  if (
    hand.landmarks &&
    hand.landmarks[index]
  ) {
    return {
      x:
        hand.landmarks[
          index
        ][0],

      y:
        hand.landmarks[
          index
        ][1],
    };
  }

  return null;
}

/* -----------------------------
   CHOICE SCREEN TIMEOUT
----------------------------- */

function isTimedChoiceScene(
  sceneId,
) {
  return (
    sceneId ===
      "scene02Choice" ||
    sceneId ===
      "scene06SeasonsChoice" ||
    isSeasonLoopScene(
      sceneId,
    ) ||
    sceneId ===
      "scene07YesNoChoice"
  );
}

function clearChoiceScreenTimeout() {
  choiceTimeoutSceneId = null;
  choiceTimeoutStartedAt = 0;
}

function updateChoiceTimeoutForScene(
  sceneId,
) {
  if (
    !isTimedChoiceScene(
      sceneId,
    )
  ) {
    clearChoiceScreenTimeout();

    return;
  }

  choiceTimeoutSceneId =
    sceneId;

  choiceTimeoutStartedAt =
    millis();

  console.log(
    "CHOICE TIMEOUT STARTED:",
    sceneId,
    "30 seconds",
  );
}

function checkChoiceScreenTimeout() {
  if (
    !isTimedChoiceScene(
      currentScene,
    )
  ) {
    return false;
  }

  // גיבוי למקרה שנכנסנו למסך דרך קיצור בדיקה.
  if (
    choiceTimeoutSceneId !==
      currentScene ||
    choiceTimeoutStartedAt ===
      0
  ) {
    updateChoiceTimeoutForScene(
      currentScene,
    );

    return false;
  }

  if (
    millis() -
      choiceTimeoutStartedAt <
      choiceScreenTimeoutMs
  ) {
    return false;
  }

  let timedOutScene =
    currentScene;

  console.log(
    "CHOICE SCREEN TIMED OUT. RETURNING TO LOGO:",
    timedOutScene,
  );

  // מאפסות את כל הבחירות והמחוות לפני החזרה להתחלה.
  resetExperienceValues();

  startCrossfade(
    timedOutScene,
    "logoLoop",
    choiceTimeoutReturnCrossfadeDuration,
  );

  return true;
}

/* -----------------------------
   AUTO TRANSITIONS / CROSSFADE
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

  if (
    currentScene ===
    "scene08QaToTerms"
  ) {
    checkNoTermsFlow();

    return;
  }

  if (
    isFinalMorfScene(
      currentScene,
    )
  ) {
    checkMorfToFinalFlow();

    return;
  }

  if (
    currentScene ===
    "migoFinal"
  ) {
    checkMigoFinalFlow();

    return;
  }

  if (
    SEASON_FADE_OUT_TO_KEY[
      currentScene
    ] &&
    pendingSeason
  ) {
    let nextFadeIn =
      SEASON_FADE_IN_VIDEOS[
        pendingSeason
      ];

    if (nextFadeIn) {
      checkVideoEndForCrossfade(
        currentScene,
        nextFadeIn,
        seasonBrowseCrossfadeDuration,
      );
    }

    return;
  }

  let transition =
    AUTO_TRANSITIONS[
      currentScene
    ];

  if (!transition) return;

  checkVideoEndForCrossfade(
    currentScene,
    transition.to,
    transition.duration ||
      crossfadeDuration,
  );
}

function checkVideoEndForCrossfade(
  fromSceneId,
  toSceneId,
  transitionDuration =
    crossfadeDuration,
) {
  let fromVideo =
    videos[fromSceneId];

  let fromDef =
    VIDEO_FILES[fromSceneId];

  if (
    !fromVideo ||
    !fromDef ||
    !fromVideo.el.duration
  ) {
    return;
  }

  let virtualEnd =
    fromVideo.el.duration -
    (fromDef.endTrim || 0);

  let timeLeft =
    virtualEnd -
    fromVideo.el.currentTime;

  if (
    timeLeft <=
    transitionDuration
  ) {
    startCrossfade(
      fromSceneId,
      toSceneId,
      transitionDuration,
    );
  }
}

function startCrossfade(
  fromSceneId,
  toSceneId,
  transitionDuration =
    crossfadeDuration,
) {
  if (isCrossfading) return;

  if (
    isTimedChoiceScene(
      fromSceneId,
    )
  ) {
    clearChoiceScreenTimeout();
  }

  if (
    !videos[fromSceneId] &&
    !isSpecialScene(
      fromSceneId,
    )
  ) {
    console.log(
      "Missing crossfade from scene:",
      fromSceneId,
    );

    return;
  }

  isCrossfading = true;

  activeTransition = {
    fromSceneId,
    toSceneId,

    duration:
      transitionDuration,

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
    isSpecialScene(toSceneId)
  ) {
    resetSceneGesture(
      toSceneId,
    );

    startSpecialScene(
      toSceneId,
      true,
    );

    return;
  }

  if (videos[toSceneId]) {
    startVideo(
      toSceneId,
      true,
      0,
    );
  }
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
    "scene07YesNoChoice"
  ) {
    return layerVideosReady(
      "scene07QaBackground",
      "scene07QaLoop",
    );
  }

  if (
    toSceneId ===
    "successScreen"
  ) {
    return true;
  }

  if (videos[toSceneId]) {
    // לסרטונים כבדים שמסומנים preload: none מחכות
    // לפחות לפריים אחד זמין לפני תחילת המעבר.
    let requiredReadyState =
      VIDEO_FILES[toSceneId]
        .preload === "none"
        ? 2
        : 1;

    return (
      videos[
        toSceneId
      ].el.readyState >=
      requiredReadyState
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
    activeTransition
      .fromSceneId;

  let toSceneId =
    activeTransition.toSceneId;

  stopSpecialScene(
    fromSceneId,
  );

  if (videos[fromSceneId]) {
    videos[
      fromSceneId
    ].el.pause();

    videos[
      fromSceneId
    ].el.volume = 0;
  }

  currentScene = toSceneId;

  updateChoiceTimeoutForScene(
    currentScene,
  );

  if (
    isFinalMorfScene(
      currentScene,
    )
  ) {
    resetMorfToFinalState();

    // גיבוי: גם אם נכנסנו ל־morph דרך קיצור בדיקה,
    // הסרטון הסופי מתחיל להיטען מיד.
    requestVideoPreload(
      "migoFinal",
    );
  }

  if (
    isFinalMorfScene(
      fromSceneId,
    )
  ) {
    resetMorfToFinalState();
  }

  if (
    currentScene ===
    "migoFinal"
  ) {
    resetMigoFinalState();
  }

  if (
    fromSceneId ===
    "migoFinal"
  ) {
    resetMigoFinalState();
  }

  let arrivedSeason =
    SEASON_LOOP_TO_KEY[
      toSceneId
    ];

  if (arrivedSeason) {
    currentSeason =
      arrivedSeason;

    if (
      pendingSeason ===
      arrivedSeason
    ) {
      pendingSeason = null;
    }

    resetChoiceGesture(
      arrowGesture,
    );

    resetChoiceGesture(
      seasonConfirmGesture,
    );
  }

  if (
    currentScene ===
    "scene07YesNoChoice"
  ) {
    resetChoiceGesture(
      yesNoGesture,
    );
  }

  if (
    currentScene ===
    "scene08QaToTerms"
  ) {
    resetNoTermsState();
  }

  if (
    fromSceneId ===
    "scene08QaToTerms"
  ) {
    resetNoTermsState();
  }

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
    activeTransition
      .fromSceneId;

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
    !activeTransition
      .fadeStarted
  ) {
    activeTransition
      .fadeStarted = true;

    activeTransition
      .fadeStartTime = millis();
  }

  let progress = constrain(
    (
      millis() -
      activeTransition
        .fadeStartTime
    ) /
      (
        activeTransition.duration *
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
    drawVoiceLoop(alpha);

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
    isSeasonLoopScene(sceneId)
  ) {
    drawSeasonBrowseScene(
      sceneId,
      alpha,
      showCursor,
    );

    return;
  }

  if (
    sceneId ===
    "scene07YesNoChoice"
  ) {
    drawYesNoChoiceScene(
      alpha,
      showCursor,
    );

    return;
  }

  if (
    sceneId ===
    "successScreen"
  ) {
    drawSuccessScreen(alpha);

    return;
  }

  // בזמן ההמתנה ואורך המעבר לסרטון הסופי,
  // מציירות צילום קפוא של סוף ה־morph.
  // כך לעולם לא רואים שוב את תחילת סרטון ה־morph
  // או את מסך ה־Yes / No.
  if (
    isFinalMorfScene(
      sceneId,
    ) &&
    morfFreezeReady &&
    morfFreezeSceneId ===
      sceneId &&
    (
      morfWaitingForFinal ||
      (
        isCrossfading &&
        activeTransition &&
        activeTransition.fromSceneId ===
          sceneId &&
        activeTransition.toSceneId ===
          "migoFinal"
      )
    )
  ) {
    drawFrozenMorfFrame(
      alpha,
    );

    return;
  }

  drawVideo(sceneId, alpha);
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

  drawVideo(blobId, alpha);

  if (showCursor) {
    drawingContext.save();

    drawingContext.globalAlpha =
      alpha;

    drawHandCursor();

    drawingContext.restore();
  }
}

function drawVoiceLoop(
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
    for (
      let key of [
        "he",
        "she",
        "they",
      ]
    ) {
      drawPositionDot(
        PRONOUN_POSITIONS[key]
          .x,

        PRONOUN_POSITIONS[key]
          .y,
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

  textAlign(LEFT, CENTER);

  noStroke();

  fill(
    colorValue[0],
    colorValue[1],
    colorValue[2],
    colorValue[3],
  );

  for (
    let keyName of keys
  ) {
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
      bounds.left -
        paddingX &&
    handCursor.x <=
      bounds.right +
        paddingX &&
    handCursor.y >=
      bounds.top -
        paddingY &&
    handCursor.y <=
      bounds.bottom +
        paddingY
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
  let activeScene =
    currentScene ===
      "scene02Choice" ||
    currentScene ===
      "scene06SeasonsChoice" ||
    currentScene ===
      "scene07YesNoChoice" ||
    isSeasonLoopScene(
      currentScene,
    );

  if (
    !activeScene ||
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

function drawSeasonBrowseScene(
  sceneId,
  alpha = 1,
  showControls = true,
) {
  showCanvas();

  drawVideo(
    sceneId,
    alpha,
  );

  if (
    showControls &&
    !isCrossfading &&
    currentScene === sceneId
  ) {
    drawingContext.save();

    drawingContext.globalAlpha =
      alpha;

    drawSeasonArrows();

    drawHandCursor();

    drawingContext.restore();
  }
}

function drawSeasonArrows() {
  if (!arrowImage) return;

  drawSeasonArrow(
    "prev",
    true,
  );

  drawSeasonArrow(
    "next",
    false,
  );
}

function drawSeasonArrow(
  keyName,
  flipX,
) {
  let pos =
    ARROW_POSITIONS[
      keyName
    ];

  if (!pos) return;

  let hovering =
    isCursorOverArrow(
      keyName,
    );

  let targetScale =
    hovering
      ? arrowHoverScale
      : 1;

  arrowHoverScales[
    keyName
  ] = lerp(
    arrowHoverScales[
      keyName
    ],
    targetScale,
    0.2,
  );

  push();

  imageMode(CENTER);

  translate(pos.x, pos.y);

  let scaleAmount =
    arrowHoverScales[
      keyName
    ];

  scale(
    flipX
      ? -scaleAmount
      : scaleAmount,

    scaleAmount,
  );

  image(
    arrowImage,
    0,
    0,
    arrowBaseWidth,
    arrowBaseHeight,
  );

  pop();
}

function isCursorOverArrow(
  keyName,
) {
  if (
    !handCursor.visible ||
    !isSeasonLoopScene(
      currentScene,
    )
  ) {
    return false;
  }

  let pos =
    ARROW_POSITIONS[
      keyName
    ];

  if (!pos) return false;

  let padding = 35;

  return (
    handCursor.x >=
      pos.x -
        arrowBaseWidth / 2 -
        padding &&
    handCursor.x <=
      pos.x +
        arrowBaseWidth / 2 +
        padding &&
    handCursor.y >=
      pos.y -
        arrowBaseHeight / 2 -
        padding &&
    handCursor.y <=
      pos.y +
        arrowBaseHeight / 2 +
        padding
  );
}

function drawYesNoChoiceScene(
  alpha = 1,
  showCursor = true,
) {
  showCanvas();

  // שכבה 1: רקע
  drawVideo(
    "scene07QaBackground",
    alpha,
  );

  // שכבה 2: טקסטים
  drawingContext.save();

  drawingContext.globalAlpha =
    alpha;

  drawYesNoTexts();

  drawingContext.restore();

  // שכבה 3: הלופ השקוף
  drawVideo(
    "scene07QaLoop",
    alpha,
  );

  // שכבה 4: מחוון היד
  if (showCursor) {
    drawingContext.save();

    drawingContext.globalAlpha =
      alpha;

    drawHandCursor();

    drawingContext.restore();
  }
}

function drawYesNoTexts() {
  drawChoiceTexts(
    [
      "yes",
      "no",
    ],
    YES_NO_POSITIONS,
    yesNoBaseSize,
    yesNoHoverScale,
    yesNoHoverScales,
    yesNoTracking,
    yesNoColor,
    "scene07YesNoChoice",
  );
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

  textAlign(CENTER, CENTER);

  if (pronounFont) {
    textFont(pronounFont);
  }

  textSize(70);

  text(
    "Your final season is",
    W / 2,
    H / 2 - 80,
  );

  textSize(150);

  let seasonName =
    selectedSeason
      ? SEASON_DISPLAY_NAMES[
          selectedSeason
        ]
      : "No season selected";

  text(
    seasonName,
    W / 2,
    H / 2 + 70,
  );

  pop();

  drawingContext.restore();
}

function drawPositionDot(
  x,
  y,
) {
  push();

  stroke(255, 0, 0);

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

  fill(255, 0, 0);

  circle(x, y, 8);

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
    unlockAudio("space key");

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

if (key === "3") {
  playScene(
    "scene02Choice",
  );
}

  if (key === "4") {
  playScene(
    "scene03SheToLoveFace",
  );
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

  if (key === "6") {
    playScene(
      "scene06SeasonsIntro",
    );
  }

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

  if (
    keyCode === LEFT_ARROW &&
    isSeasonLoopScene(
      currentScene,
    )
  ) {
    navigateSeason("prev");
  }

  if (
    keyCode ===
      RIGHT_ARROW &&
    isSeasonLoopScene(
      currentScene,
    )
  ) {
    navigateSeason("next");
  }

  if (
    keyCode === ENTER &&
    isSeasonLoopScene(
      currentScene,
    )
  ) {
    confirmCurrentSeason();
  }

  // מעבר ישיר למסך Yes / No
  // לצורך בדיקה, אם אין בחירה שמורה מוגדרת Spring
  if (key === "8") {
    if (!selectedSeason) {
      selectedSeason =
        "spring";

      currentSeason = "spring";

      window.selectedSeason =
        selectedSeason;

      console.log(
        "DEBUG SEASON SET TO SPRING",
      );
    }

    preloadFinalChoiceVideos();

    playScene(
      "scene07YesNoChoice",
    );
  }

  if (
    key === "y" &&
    currentScene ===
      "scene07YesNoChoice"
  ) {
    selectYesNoAnswer("yes");
  }

  if (
    key === "n" &&
    currentScene ===
      "scene07YesNoChoice"
  ) {
    selectYesNoAnswer("no");
  }

  // מעבר ישיר לסרטון No
  if (key === "9") {
    if (!selectedSeason) {
      selectedSeason =
        "spring";

      currentSeason = "spring";

      window.selectedSeason =
        selectedSeason;
    }

    resetNoTermsState();

    playScene(
      "scene08QaToTerms",
    );
  }

  // X מדמה סגירת יד במהלך סרטון No
  if (
    (
      key === "x" ||
      key === "X"
    ) &&
    currentScene ===
      "scene08QaToTerms"
  ) {
    switchNoToSelectedMorf();
  }

  // מעבר ישיר לסרטון הסופי לצורך בדיקה
  if (key === "0") {
    requestVideoPreload(
      "migoFinal",
    );

    playScene(
      "migoFinal",
    );
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
