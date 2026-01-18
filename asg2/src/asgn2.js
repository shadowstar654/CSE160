// ==========================================================
// asgn2.js — FULL WORKING FILE
// Turtle with proper hierarchical neck + head
// ==========================================================

let canvas, gl;
let a_Position, u_FragColor, u_ModelMatrix, u_GlobalRotation;

// UI state
let g_globalAngle = 0;
let g_leg1 = 0;
let g_leg2 = 0;
let g_animate = false;

// animation
let g_startTime = performance.now() / 1000;
let g_seconds = 0;

// other legs
let g_fr1 = 0, g_fr2 = 0;
let g_bl1 = 0, g_bl2 = 0;
let g_br1 = 0, g_br2 = 0;

// ==========================================================
// SHADERS
// ==========================================================
const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotation;
void main() {
  gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

// ==========================================================
// MAIN
// ==========================================================
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return;

  gl.enable(gl.DEPTH_TEST);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');

  gl.clearColor(0.92, 0.92, 0.97, 1);

  // UI
  document.getElementById('globalRot').oninput = e => g_globalAngle = +e.target.value;
  document.getElementById('leg1').oninput = e => !g_animate && (g_leg1 = +e.target.value);
  document.getElementById('leg2').oninput = e => !g_animate && (g_leg2 = +e.target.value);
  document.getElementById('animToggle').onclick = () => g_animate = !g_animate;

  requestAnimationFrame(tick);
}

// ==========================================================
function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  if (g_animate) updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

// ==========================================================
function updateAnimationAngles() {
  const a = Math.sin(g_seconds * 2.0);
  const b = Math.sin(g_seconds * 2.0 + Math.PI);

  g_leg1 = 25 * a;
  g_leg2 = 18 * Math.abs(a);

  g_fr1 = 25 * b;
  g_fr2 = 18 * Math.abs(b);

  g_bl1 = 18 * b;
  g_bl2 = 14 * Math.abs(b);

  g_br1 = 18 * a;
  g_br2 = 14 * Math.abs(a);
}

// ==========================================================
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const globalRot = new Matrix4();
  globalRot.rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRot.elements);

  const world = new Matrix4();
  world.scale(0.85, 0.85, 0.85);
  world.translate(0, -0.05, 0);

  drawTurtle(world);
}

// ==========================================================
// RENDER HELPERS
// ==========================================================
function renderCube(color, M) {
  const c = new Cube();
  c.color = color;
  c.matrix.set(M);
  c.render();
}

function renderCylinder(color, M) {
  const c = new Cylinder();
  c.color = color;
  c.matrix.set(M);
  c.render();
}

// ==========================================================
// TURTLE
// ==========================================================
function drawTurtle(world) {
  const shellDark  = [0.40, 0.30, 0.14, 1];
  const shellMid   = [0.52, 0.40, 0.20, 1];
  const rimLight   = [0.70, 0.78, 0.58, 1];

  const bodyGreen  = [0.25, 0.70, 0.25, 1];
  const bodyDark   = [0.18, 0.55, 0.18, 1];
  const claw       = [0.86, 0.86, 0.82, 1];

  // belly
  let M = new Matrix4(world);
  M.translate(0.05, -0.12, 0);
  M.scale(1.10, 0.18, 1.15);
  renderCube(bodyDark, M);

  // shell layers
  M = new Matrix4(world);
  M.translate(0.08, -0.04, 0);
  M.scale(1.35, 0.06, 1.50);
  renderCube(rimLight, M);

  M = new Matrix4(world);
  M.translate(0.08, 0.08, 0);
  M.scale(1.30, 0.28, 1.45);
  renderCube(shellDark, M);

  M = new Matrix4(world);
  M.translate(0.08, 0.30, 0);
  M.scale(1.05, 0.22, 1.20);
  renderCube(shellMid, M);

  // EXTRA shell cap layer (4th layer)
  const shellCap = [0.62, 0.48, 0.26, 1];   // slightly lighter brown
  M = new Matrix4(world);
  M.translate(0.08, 0.46, 0);               // sit on top
  M.scale(0.78, 0.16, 0.90);                // smaller than the mid layer
  renderCube(shellCap, M);

  // head + neck
  drawRealHead(world, bodyGreen);

  // tail
  M = new Matrix4(world);
  M.translate(0.55, -0.12, -0.80);
  M.scale(0.22, 0.10, 0.30);
  renderCube(bodyGreen, M);

  // Front-left (slider-controlled when animation off)
  drawLegChain(world, {
    hip: [-0.42, -0.12,  0.56],
    thighAngle: g_leg1,
    calfAngle:  g_leg2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: true
  });

  // Front-right
  drawLegChain(world, {
    hip: [ 0.58, -0.12,  0.56],
    thighAngle: g_fr1,
    calfAngle:  g_fr2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: true
  });

  // Back-left
  drawLegChain(world, {
    hip: [-0.52, -0.12, -0.60],
    thighAngle: g_bl1,
    calfAngle:  g_bl2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: false
  });

  // Back-right
  drawLegChain(world, {
    hip: [ 0.62, -0.12, -0.60],
    thighAngle: g_br1,
    calfAngle:  g_br2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: false
  });

}

function drawLegChain(world, { hip, thighAngle, calfAngle, bodyColor, clawColor, toeForward }) {
  // hip anchor in world space
  const base = new Matrix4(world);
  base.translate(hip[0], hip[1], hip[2]);

  // THIGH
  let thigh = new Matrix4(base);
  thigh.rotate(thighAngle, 1, 0, 0);
  const thighCoord = new Matrix4(thigh);

  let M = new Matrix4(thigh);
  M.translate(0, -0.10, 0);
  M.scale(0.26, 0.18, 0.28);
  renderCube(bodyColor, M);

  // CALF
  let calf = new Matrix4(thighCoord);
  calf.translate(0, -0.18, 0.05);
  calf.rotate(calfAngle, 1, 0, 0);
  const calfCoord = new Matrix4(calf);

  M = new Matrix4(calf);
  M.translate(0, -0.10, 0);
  M.scale(0.24, 0.18, 0.26);
  renderCube(bodyColor, M);

  // FOOT
  const zPush = toeForward ? 0.20 : 0.11;
  const zTilt = toeForward ? 10 : -6;

  let foot = new Matrix4(calfCoord);
  foot.translate(0.02, -0.16, zPush);
  foot.rotate(zTilt, 1, 0, 0);

  const footCoord = new Matrix4(foot);

  M = new Matrix4(foot);
  M.scale(0.30, 0.09, 0.32);
  renderCube(bodyColor, M);

  drawClaws(footCoord, clawColor, toeForward);
}

function drawClaws(footCoord, clawColor, toeForward) {
  const dz = toeForward ? 0.18 : 0.14;

  const toes = [
    [-0.10, -0.06, dz],
    [ 0.00, -0.06, dz + 0.02],
    [ 0.10, -0.06, dz],
  ];

  for (const [dx, dy, dz2] of toes) {
    const M = new Matrix4(footCoord);
    M.translate(dx, dy, dz2);
    M.scale(0.07, 0.05, 0.09);
    renderCube(clawColor, M);
  }
}
function drawRealHead(world, bodyGreen) {
  const eyeWhite = [1, 1, 1, 1];
  const eyeBlack = [0.05, 0.05, 0.05, 1];
  const blush    = [1.00, 0.60, 0.75, 1];
  const mouthCol = [0.08, 0.08, 0.08, 1];

  // --------------------------------------------
  // HEAD PLACEMENT (the big green block you want)
  // Tune these 3 numbers ONLY if you want to slide head around.
  // --------------------------------------------
  const headX = 0;   // left/right
  const headY = -0.14;   // up/down
  const headZ =  0.78;   // forward/back (toward viewer in your side view)

  // Head size (cube scaled into a block)
  const headSX = 0.62;
  const headSY = 0.42;
  const headSZ = 0.52;

  // --------------------------------------------
  // NECK (cylinder) aimed forward (+Z)
  // --------------------------------------------
  const neck = new Cylinder();
  neck.color = bodyGreen;

  neck.matrix.set(world);
  neck.matrix.translate(headX + 0.18, headY - 0.05, headZ - 0.34); // start under shell lip -> into head
  neck.matrix.rotate(90, 1, 0, 0);                                  // cylinder axis Y -> Z
  neck.matrix.scale(0.18, 0.50, 0.18);                               // thickness + length
  neck.render();

  // --------------------------------------------
  // HEAD BLOCK (this is the face plane)
  // --------------------------------------------
  const headBase = new Matrix4(world);
  headBase.translate(headX, headY, headZ);

  let M = new Matrix4(headBase);
  M.scale(headSX, headSY, headSZ);
  renderCube(bodyGreen, M);

  // --------------------------------------------
  // FACE PLANE: front face of head cube
  // Cube local z goes [0..1] after scale/translate, but our cube is centered-ish depending on Cube.js.
  // Your Cube.js draws from -0.5..+0.5, so after scaling:
  // front face is at +headSZ*0.5 in local.
  // We'll place features slightly OUT past that to avoid embedding.
  // --------------------------------------------
  const FACE_Z = (headSZ * 0.5) + 0.03;   // "just in front of the face"

  // Helpers: place small blocks in HEAD LOCAL space
  function faceBlock(color, fx, fy, fz, sx, sy, sz) {
    const T = new Matrix4(headBase);
    // head cube is centered at (0,0,0) in its local, so we use offsets in that centered space
    T.translate(fx, fy, fz);
    T.scale(sx, sy, sz);
    renderCube(color, T);
  }

  // --------------------------------------------
  // EYES (front-facing)
  // --------------------------------------------
  // Left eye white
  faceBlock(eyeWhite, -0.14,  0.10, FACE_Z, 0.11, 0.11, 0.05);
  // Left pupil
  faceBlock(eyeBlack, -0.12,  0.10, FACE_Z + 0.02, 0.05, 0.05, 0.04);

  // Right eye white
  faceBlock(eyeWhite,  0.14,  0.10, FACE_Z, 0.11, 0.11, 0.05);
  // Right pupil
  faceBlock(eyeBlack,  0.16,  0.10, FACE_Z + 0.02, 0.05, 0.05, 0.04);

  // --------------------------------------------
  // BLUSH (front-facing)
  // --------------------------------------------
  faceBlock(blush, -0.22, -0.02, FACE_Z, 0.10, 0.07, 0.04);
  faceBlock(blush,  0.22, -0.02, FACE_Z, 0.10, 0.07, 0.04);

  // --------------------------------------------
  // MOUTH (front-facing)
  // --------------------------------------------
  faceBlock(mouthCol, 0.02, -0.10, FACE_Z + 0.01, 0.16, 0.03, 0.03);

  // --------------------------------------------
  // SNOUT / NOSE BUMP (optional but helps)
  // --------------------------------------------
  faceBlock(bodyGreen, 0.05, -0.06, FACE_Z + 0.05, 0.26, 0.18, 0.16);
}

