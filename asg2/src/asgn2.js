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

  // const world = new Matrix4();
  // world.scale(0.85, 0.85, 0.85);
  // world.translate(0, -0.05, 0);
  const world = new Matrix4();
  world.scale(0.70, 0.70, 0.70);   // smaller turtle
  world.translate(-0.10, -0.05, 0); // nudge left + keep same height


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
function renderSphere(color, M) {
  const s = new Sphere();
  s.color = color;
  s.matrix.set(M);
  s.render();
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
  const eyeW = [1,1,1,1];
  const eyeB = [0,0,0,1];
  const blush = [1,0.6,0.75,1];
  const mouth = [0.08,0.08,0.08,1];

  // --- HEAD placement ---
  const headX = 0.00;
  const headY = -0.16;
  const headZ = 1.05;     // forward, but safe now that turtle is scaled down

  // --- HEAD size ---
  const headSX = 0.72;
  const headSY = 0.48;
  const headSZ = 0.60;

  // --- NECK settings ---
  const neckX = 0.10;
  const neckY = -0.20;     // lower so visible under rim
  const neckStartZ = 0.46; // start near shell front
  const neckRad = 0.20;

  // compute neckLen so it ends exactly at head back face
  const headBackZ = headZ - headSZ * 0.5;
  const neckLen = headBackZ - neckStartZ;

  // neck base block to hide seam
  let M = new Matrix4(world);
  M.translate(neckX, neckY - 0.06, neckStartZ - 0.08);
  M.scale(0.36, 0.26, 0.36);
  renderCube(bodyGreen, M);

  // cylinder neck (Y axis -> Z axis)
  const neck = new Cylinder();
  neck.color = bodyGreen;
  neck.matrix.set(world);
  neck.matrix.translate(neckX, neckY, neckStartZ);
  neck.matrix.rotate(90, 1, 0, 0);
  neck.matrix.scale(neckRad, neckLen, neckRad);
  neck.render();

  // head block
  const headBase = new Matrix4(world);
  headBase.translate(headX, headY, headZ);

  // M = new Matrix4(headBase);
  // M.scale(headSX, headSY, headSZ);
  // renderCube(bodyGreen, M);
  const headSphere = new Sphere();
  headSphere.color = bodyGreen;
  headSphere.sCount = 12;
  headSphere.size = 5.7; // this is now sane
  headSphere.matrix.set(headBase);
  headSphere.matrix.scale(headSX, headSY, headSZ);
  headSphere.render();

  // helper for face features
  function face(c, x, y, z, sx, sy, sz) {
    const T = new Matrix4(headBase);
    T.translate(x, y, z);
    T.scale(sx, sy, sz);
    renderCube(c, T);
  }

  const faceZ = headSZ * 0.5 + 0.03;

  // eyes
  face(eyeW, -0.16,  0.12, faceZ,        0.12, 0.12, 0.05);
  face(eyeB, -0.14,  0.12, faceZ + 0.02, 0.05, 0.05, 0.04);

  face(eyeW,  0.18,  0.12, faceZ,        0.12, 0.12, 0.05);
  face(eyeB,  0.18,  0.12, faceZ + 0.02, 0.05, 0.05, 0.04);

  // blush
  face(blush, -0.24, -0.02, faceZ, 0.11, 0.08, 0.04);
  face(blush,  0.24, -0.02, faceZ, 0.11, 0.08, 0.04);

  // mouth
  face(mouth, 0.02, -0.12, faceZ + 0.01, 0.18, 0.035, 0.03);
}

