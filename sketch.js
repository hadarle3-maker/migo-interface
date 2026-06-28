let W = 1920;
let H = 1080;

let cnv;
let videos = {};

let started = false;
let currentScene = "start";

let videoFiles = {
  back02: {
    src: "assets/videos/back_02.mp4",
    volume: 1
  },
  blob: {
    src: "assets/videos/blob_v2.webm",
    volume: 0
  },
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
  }
};

function setup() {
  cnv = createCanvas(W, H);
  pixelDensity(1);
  fitCanvasToWindow();

  for (let id in videoFiles) {
    videos[id] = makeVideo(id, videoFiles[id].src, videoFiles[id].volume);
  }

  window.addEventListener("keydown", handleKey);
}

function draw() {
  background(245);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  if (!started) {
    drawStartScreen();
    return;
  }

  drawScene();
  drawDebug();
}

function makeVideo(id, src, volumeLevel) {
  let v = {
    id: id,
    src: src,
    volume: volumeLevel,
    el: document.createElement("video"),
    ready: false,
    error: false,
    status: "loading"
  };

  v.el.src = src;
  v.el.loop = false;
  v.el.muted = false;
  v.el.volume = volumeLevel;
  v.el.playsInline = true;
  v.el.preload = "auto";

  v.el.setAttribute("playsinline", "");
  v.el.setAttribute("webkit-playsinline", "");

  v.el.addEventListener("loadeddata", function () {
    v.ready = true;
    v.status = "loaded";
  });

  v.el.addEventListener("canplay", function () {
    v.ready = true;
    v.status = "canplay";
  });

  v.el.addEventListener("playing", function () {
    v.status = "playing";
  });

  v.el.addEventListener("ended", function () {
    v.status = "ended";
  });

  v.el.addEventListener("error", function () {
    v.error = true;
    v.status = "ERROR";
    console.log("VIDEO ERROR:", id, src, v.el.error);
  });

  v.el.load();

  return v;
}

function drawStartScreen() {
  background(245);

  drawText("MIGO TEST", W / 2, H / 2 - 50, 72);
  drawText("Click once to start", W / 2, H / 2 + 40, 38);
}

function mousePressed() {
  if (!started) {
    started = true;
    playScene("intro");
  }
}

function handleKey(e) {
  if (!started) return;

  if (e.key === "1") playScene("intro");
  if (e.key === "2") playScene("introTo01");
  if (e.key === "3") playScene("backBlob");
  if (e.key === "4") playScene("scene01Hand");
  if (e.key === "5") playScene("blobOnly");
  if (e.key === "6") playScene("backOnly");
}

function playScene(sceneName) {
  currentScene = sceneName;
  stopAllVideos();

  if (sceneName === "intro") {
    playVideo("intro", false);
  }

  if (sceneName === "introTo01") {
    playVideo("introTo01", false);
  }

  if (sceneName === "backBlob") {
    playVideo("back02", true);
    playVideo("blob", true);
  }

  if (sceneName === "scene01Hand") {
    playVideo("scene01Hand", false);
  }

  if (sceneName === "blobOnly") {
    playVideo("blob", true);
  }

  if (sceneName === "backOnly") {
    playVideo("back02", true);
  }
}

function playVideo(id, loopIt) {
  let v = videos[id];

  v.el.loop = loopIt;
  v.el.muted = false;
  v.el.volume = v.volume;

  try {
    v.el.currentTime = 0;
  } catch (e) {}

  v.el.play()
    .then(function () {
      v.status = "playing";
    })
    .catch(function (err) {
      v.status = "play failed";
      console.log("PLAY FAILED:", id, err);
    });
}

function stopAllVideos() {
  for (let id in videos) {
    let v = videos[id];

    v.el.pause();

    try {
      v.el.currentTime = 0;
    } catch (e) {}

    v.status = v.ready ? "stopped" : v.status;
  }
}

function drawScene() {
  background(245);

  if (currentScene === "intro") {
    drawVideo("intro", 0, 0, W, H);
  }

  if (currentScene === "introTo01") {
    drawVideo("introTo01", 0, 0, W, H);
  }

  if (currentScene === "backBlob") {
    drawVideo("back02", 0, 0, W, H);
    drawVideo("blob", 0, 0, W, H);
  }

  if (currentScene === "scene01Hand") {
    drawVideo("scene01Hand", 0, 0, W, H);
  }

  if (currentScene === "blobOnly") {
    background(30);
    drawVideo("blob", 0, 0, W, H);
  }

  if (currentScene === "backOnly") {
    drawVideo("back02", 0, 0, W, H);
  }
}

function drawVideo(id, x, y, w, h) {
  let v = videos[id];

  if (!v || v.error) return;

  if (v.el.readyState > 0) {
    drawingContext.drawImage(v.el, x, y, w, h);
  }
}

function drawDebug() {
  push();

  noStroke();
  fill(255, 255, 255, 215);
  rect(24, 24, 590, 245, 18);

  fill(40);
  textAlign(LEFT, TOP);
  textSize(24);
  text("scene: " + currentScene, 50, 45);
  text("1 intro | 2 transition | 3 back+blob | 4 hand | 5 blob | 6 back", 50, 80);

  let y = 120;

  for (let id in videos) {
    let v = videos[id];

    if (v.error || v.status === "play failed") {
      fill(220, 40, 40);
    } else if (v.el.readyState > 0 || v.ready) {
      fill(40, 150, 70);
    } else {
      fill(120);
    }

    text(id + " — " + v.status + " / rs:" + v.el.readyState, 50, y);
    y += 28;
  }

  pop();
}

function drawText(txt, x, y, size) {
  push();
  textAlign(CENTER, CENTER);
  textSize(size);
  fill(60);
  noStroke();
  text(txt, x, y);
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
