let W = 1920;
let H = 1080;

let s, ox, oy;

let back02;
let blob;
let intro;
let introTo01;
let scene01Hand;

let started = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  back02 = createVideo("assets/videos/back_02.mp4");
  blob = createVideo("assets/videos/blob.webm");
  intro = createVideo("assets/videos/intro.mp4");
  introTo01 = createVideo("assets/videos/intro_to_01.mp4");
  scene01Hand = createVideo("assets/videos/scene01_hand.mp4");

  setupVideo(back02);
  setupVideo(blob);
  setupVideo(intro);
  setupVideo(introTo01);
  setupVideo(scene01Hand);
}

function draw() {
  background(20);

  updateStage();

  push();
  translate(ox, oy);
  scale(s);

  drawStage();

  pop();
}

function setupVideo(v) {
  v.hide();
  v.volume(0);
  v.elt.muted = true;
  v.elt.playsInline = true;
  v.elt.setAttribute("muted", "");
  v.elt.setAttribute("playsinline", "");
  v.elt.setAttribute("webkit-playsinline", "");
}

function drawStage() {
  background(245);

  if (started) {
    image(back02, 0, 0, W, H);
    image(blob, 0, 0, W, H);
  } else {
    drawText("MIGO TEST", W / 2, H / 2 - 40, 64);
    drawText("Click once to start", W / 2, H / 2 + 40, 36);
  }
}

function mousePressed() {
  started = true;

  back02.loop();
  blob.loop();
  intro.stop();
  introTo01.stop();
  scene01Hand.stop();
}

function keyPressed() {
  if (key === "1") {
    playOnly(intro);
  }

  if (key === "2") {
    playOnly(introTo01);
  }

  if (key === "3") {
    started = true;
    back02.loop();
    blob.loop();
  }

  if (key === "4") {
    playOnly(scene01Hand);
  }
}

function playOnly(v) {
  started = true;

  back02.stop();
  blob.stop();
  intro.stop();
  introTo01.stop();
  scene01Hand.stop();

  v.loop();
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

function updateStage() {
  s = min(width / W, height / H);
  ox = (width - W * s) / 2;
  oy = (height - H * s) / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
