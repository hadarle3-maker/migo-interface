let W = 1920;
let H = 1080;

let cnv;
let videos = {};
let started = false;
let mode = "combo";

let videoFiles = {
  back02: "assets/videos/back_02.mp4",
  blob: "assets/videos/blob_v2.webm",
  intro: "assets/videos/intro.mp4",
  introTo01: "assets/videos/intro_to_01.mp4",
  scene01Hand: "assets/videos/secne01_hand.mp4"
};

function setup() {
  cnv = createCanvas(W, H);
  pixelDensity(1);
  fitCanvasToWindow();

  for (let id in videoFiles) {
    videos[id] = makeVideo(id, videoFiles[id]);
  }

  window.addEventListener("keydown", handleKey);
}

function draw() {
  background(245);

  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";

  drawCurrentMode();
  drawDebug();
}

function makeVideo(id, src) {
  let v = {
    id: id,
    src: src,
    el: document.createElement("video"),
    ready: false,
    error: false,
    status: "loading"
  };

  v.el.src = src;
  v.el.muted = true;
  v.el.loop = true;
  v.el.playsInline = true;
  v.el.preload = "auto";

  v.el.setAttribute("muted", "");
  v.el.setAttribute("playsinline", "");
  v.el.setAttribute("webkit-playsinline", "");

  v.el.addEventListener("loadedmetadata", function () {
    v.ready = true;
    v.status = "metadata";
  });

  v.el.addEventListener("loadeddata", function () {
    v.ready = true;
    v.status = "loaded";
  });

  v.el.addEventListener("canplay", function () {
    v.ready = true;
    v.status = "canplay";
  });

  v.el.addEventListener("playing", function () {
    v.ready = true;
    v.status = "playing";
  });

  v.el.addEventListener("error", function () {
    v.error = true;
    v.status = "ERROR";
    console.log("VIDEO ERROR:", id, src, v.el.error);
  });

  v.el.load();

  return v;
}

function drawCurrentMode() {
  if (!started) {
    drawText("MIGO TEST", W / 2, H / 2 - 40, 64);
    drawText("Click once to start", W / 2, H / 2 + 40, 36);
    return;
  }

  if (mode === "combo") {
    drawVideo(videos.back02, 0, 0, W, H);
    drawVideo(videos.blob, 0, 0, W, H);
  }

  if (mode === "intro") {
    drawVideo(videos.intro, 0, 0, W, H);
  }

  if (mode === "introTo01") {
    drawVideo(videos.introTo01, 0, 0, W, H);
  }

  if (mode === "scene01Hand") {
    drawVideo(videos.scene01Hand, 0, 0, W, H);
  }

  if (mode === "blobOnly") {
    background(30);
    drawVideo(videos.blob, 0, 0, W, H);
  }

  if (mode === "backOnly") {
    drawVideo(videos.back02, 0, 0, W, H);
  }
}

function drawVideo(v, x, y, w, h) {
  if (!v || v.error) return;

  try {
    if (v.el.readyState > 0) {
      drawingContext.drawImage(v.el, x, y, w, h);
    }
  } catch (e) {
    console.log("draw video error:", v.id, e);
  }
}

function mousePressed() {
  startAllVideos();
}

function startAllVideos() {
  started = true;

  for (let id in videos) {
    let v = videos[id];

    v.el.play()
      .then(function () {
        v.status = "playing";
      })
      .catch(function (err) {
        v.status = "play failed";
        console.log("PLAY FAILED:", id, err);
      });
  }
}

function handleKey(e) {
  if (e.key === "1") mode = "intro";
  if (e.key === "2") mode = "introTo01";
  if (e.key === "3") mode = "combo";
  if (e.key === "4") mode = "scene01Hand";
  if (e.key === "5") mode = "blobOnly";
  if (e.key === "6") mode = "backOnly";

  if (e.key === " ") {
    startAllVideos();
  }
}

function drawDebug() {
  push();

  noStroke();
  fill(255, 255, 255, 210);
  rect(24, 24, 560, 245, 18);

  textAlign(LEFT, TOP);
  textSize(24);

  fill(40);
  text("mode: " + mode, 50, 45);
  text("1 intro | 2 transition | 3 combo | 4 hand | 5 blob | 6 back", 50, 80);

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
