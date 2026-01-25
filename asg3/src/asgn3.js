// asgn3.js (FULL FILE TOP + WORLD + CAMERA CONTROLS) — uses YOUR Camera.js exactly
// Paste this entire file as-is, then paste your existing turtle code below the marker.
//
// IMPORTANT FIXES:
// 1) DO NOT call main() at the bottom because your HTML already does <body onload="main()">
// 2) This uses Camera.forward/back/left/right and Camera.panMouse/panLeft/panRight (your API)

let canvas, gl;

// GLSL
let a_Position;
let u_FragColor, u_ModelMatrix;
let u_ViewMatrix, u_ProjectionMatrix;

// UI state
let g_globalAngle = 0;

// Mouse look
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

// Poke animation (shift-click)
let g_pokeStart = -1;
let g_pokeT = 0;
let g_pokeMode = 0;

// Turtle joints
let g_leg1 = 0;
let g_leg2 = 0;
let g_animate = false;

// animation timing
let g_startTime = performance.now() / 1000;
let g_seconds = 0;
let g_fr1 = 0, g_fr2 = 0;
let g_bl1 = 0, g_bl2 = 0;
let g_br1 = 0, g_br2 = 0;

// perf HUD
let g_perfEl = null;
let g_lastFrameMS = performance.now();
let g_fpsSMA = 0;
let g_msSMA = 0;

// reusable shapes
let g_cube = null;
let g_cyl = null;
let g_sph = null;
let g_hemi = null;
let g_tri = null;

// camera (YOUR Camera.js)
let g_camera = null;

// --- shaders ---
const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

// ----------------- Controls -----------------
function addMouseControls() {
  canvas.addEventListener('mousedown', (ev) => {
    // shift-click = poke mode toggle
    if (ev.shiftKey) {
      g_pokeMode = (g_pokeMode + 1) % 2;
      g_pokeStart = performance.now() / 1000;
      g_isDragging = false;
      return;
    }

    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });

  canvas.addEventListener('mousemove', (ev) => {
    if (!g_isDragging || !g_camera) return;

    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;

    // YOUR Camera supports yaw-only panMouse
    const sensitivity = 0.20; // tweak if you want
    g_camera.panMouse(dx * sensitivity);

    // (You don't have pitch in your Camera class; that's fine.)
    // dy ignored on purpose.
  });

  window.addEventListener('mouseup', () => {
    g_isDragging = false;
  });

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
  }, { passive: false });
}

function addKeyboardControls() {
  document.addEventListener('keydown', (ev) => {
    if (!g_camera) return;

    const k = ev.key.toLowerCase();

    // WASD
    if (k === 'w') g_camera.forward();
    else if (k === 's') g_camera.back();
    else if (k === 'a') g_camera.left();
    else if (k === 'd') g_camera.right();
    else if (k === 'q') g_camera.panLeft();
    else if (k === 'e') g_camera.panRight();

    // Arrow keys too (per your notes to grader)
    else if (ev.key === 'ArrowUp') g_camera.forward();
    else if (ev.key === 'ArrowDown') g_camera.back();
    else if (ev.key === 'ArrowLeft') g_camera.left();
    else if (ev.key === 'ArrowRight') g_camera.right();
  });
}

// ----------------- Main -----------------
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return;

  gl.enable(gl.DEPTH_TEST);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

  gl.clearColor(0.92, 0.92, 0.97, 1);

  g_perfEl = document.getElementById('perf');

  // reusable shapes
  g_cube = new Cube();
  g_cyl = new Cylinder();
  g_sph = new Sphere();
  g_hemi = new Hemisphere();

  // ---- IMPORTANT: TriangularPrism file name mismatch guard ----
  // Your HTML loads TriangularPrism.js, but your turtle code uses renderTriPrism() with g_tri.
  // Some people name the class TriangularPrism, some name it TriPrism.
  // This makes it work either way.
  if (typeof TriPrism !== 'undefined') g_tri = new TriPrism();
  else if (typeof TriangularPrism !== 'undefined') g_tri = new TriangularPrism();
  else {
    // If this happens, your TriangularPrism.js didn't load or class name differs.
    console.error('Tri prism class not found (TriPrism or TriangularPrism). Check TriangularPrism.js.');
  }

  // camera (YOUR camera)
  g_camera = new Camera();
  g_camera.setPerspective(60, canvas.width / canvas.height, 0.1, 2000);
  g_camera.updateView();

  // UI sliders/buttons
  const rotEl = document.getElementById('globalRot');
  if (rotEl) rotEl.oninput = (e) => (g_globalAngle = +e.target.value);

  const leg1El = document.getElementById('leg1');
  if (leg1El) leg1El.oninput = (e) => !g_animate && (g_leg1 = +e.target.value);

  const leg2El = document.getElementById('leg2');
  if (leg2El) leg2El.oninput = (e) => !g_animate && (g_leg2 = +e.target.value);

  const animOnEl = document.getElementById('animOn');
  if (animOnEl) animOnEl.onclick = () => (g_animate = true);

  const animOffEl = document.getElementById('animOff');
  if (animOffEl) animOffEl.onclick = () => (g_animate = false);

  addMouseControls();
  addKeyboardControls();

  requestAnimationFrame(tick);
}

function tick() {
  const nowMS = performance.now();
  const dtMS = nowMS - g_lastFrameMS;
  g_lastFrameMS = nowMS;

  const fps = 1000.0 / Math.max(dtMS, 0.0001);
  const alpha = 0.08;
  g_fpsSMA = (g_fpsSMA === 0) ? fps : (g_fpsSMA * (1 - alpha) + fps * alpha);
  g_msSMA = (g_msSMA === 0) ? dtMS : (g_msSMA * (1 - alpha) + dtMS * alpha);

  if (g_perfEl) {
    if (!tick._hudLast || nowMS - tick._hudLast > 250) {
      tick._hudLast = nowMS;
      g_perfEl.innerHTML = `FPS: ${g_fpsSMA.toFixed(1)}<br>ms: ${g_msSMA.toFixed(1)}`;
    }
  }

  g_seconds = nowMS / 1000 - g_startTime;

  // poke timing
  if (g_pokeStart >= 0) {
    const t = (nowMS / 1000 - g_pokeStart) / 1.2;
    g_pokeT = Math.min(Math.max(t, 0), 1);
    if (t >= 1) {
      g_pokeStart = -1;
      g_pokeT = 0;
    }
  } else {
    g_pokeT = 0;
  }

  if (g_animate) updateAnimationAngles();

  renderScene();
  requestAnimationFrame(tick);
}

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

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // camera matrices drive everything
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projMat.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMat.elements);

  // World base transform (optional slider rotation around Y)
  const world = new Matrix4();
  world.rotate(g_globalAngle, 0, 1, 0);

  // draw environment
  drawWorld(world);

  // turtle ABOVE ground (so it isn't stuck inside the floor)
  const turtleWorld = new Matrix4(world);
  turtleWorld.translate(0, 0.18, 0);
  turtleWorld.scale(0.70, 0.70, 0.70);
  turtleWorld.translate(-0.10, -0.05, 0);
  drawTurtle(turtleWorld);
}

// ---------- render helpers ----------
function renderCube(color, M) {
  g_cube.color = color;
  g_cube.matrix.set(M);
  g_cube.render();
}

function renderCylinder(color, M, segments = null) {
  if (segments !== null) g_cyl.segments = segments;
  g_cyl.color = color;
  g_cyl.matrix.set(M);
  g_cyl.render();
}

function renderSphere(color, M, sCount = 10, size = 5.7) {
  g_sph.color = color;
  g_sph.sCount = sCount;
  g_sph.size = size;
  g_sph.matrix.set(M);
  g_sph.render();
}

function renderHemisphere(color, M, latBands = 12, lonBands = 30, size = 22.0) {
  g_hemi.color = color;
  g_hemi.latBands = latBands;
  g_hemi.lonBands = lonBands;
  g_hemi.size = size;
  g_hemi.matrix.set(M);
  g_hemi.render();
}

function renderTriPrism(color, M) {
  if (!g_tri) return;
  g_tri.color = color;
  g_tri.matrix.set(M);
  g_tri.render();
}

// ---------- simple world ----------
function drawWorld(world) {
    // SKY FIRST
  gl.disable(gl.DEPTH_TEST);
  const skyC = [0.55, 0.75, 1.0, 1.0];
  let S = new Matrix4(world);
  S.scale(1000, 1000, 1000);
  S.scale(-1, 1, 1);
  renderCube(skyC, S);
  gl.enable(gl.DEPTH_TEST);

  // floor
  const floorC = [0.55, 0.85, 0.55, 1];
  let M = new Matrix4(world);
  M.translate(0, -0.35, 0);
  M.scale(20, 0.02, 20);
  renderCube(floorC, M);

  // some blocks
  const rock = [0.55, 0.55, 0.60, 1];
  for (let i = 0; i < 12; i++) {
    let B = new Matrix4(world);
    const x = -3 + (i % 6);
    const z = -2 + Math.floor(i / 6);
    B.translate(x, -0.33, z);
    B.scale(0.6, 0.6, 0.6);
    renderCube(rock, B);
  }

  // goal block
  const goal = [1.0, 0.85, 0.25, 1];
  M = new Matrix4(world);
  M.translate(3, -0.25, -3);
  M.scale(0.8, 0.8, 0.8);
  renderCube(goal, M);
}
 

// Turtle Code
function drawScutePads(world) {
  const padC = [0.36, 0.26, 0.12, 1.0];

  function pad(x, y, z, sx, sy, sz, rotX = 0, rotZ = 0, rotY = 0) {
    const M = new Matrix4(world);
    M.translate(x, y, z);
    if (rotY !== 0) M.rotate(rotY, 0, 1, 0);
    if (rotX !== 0) M.rotate(rotX, 1, 0, 0);
    if (rotZ !== 0) M.rotate(rotZ, 0, 0, 1);
    M.scale(sx, sy, sz);
    renderHemisphere(padC, M, 12, 30, 21.50);
  }

  const y = 0.59;
  const cx = 0.08;
  const cz = 0.02;

  pad(cx, y, cz, 0.70, 0.6, 0.70, 0, 0);
  pad(cx, y, cz - 0.5, 0.7, 0.26, 0.7, -25, 0);
  pad(cx, y, cz + 0.4, 0.7, 0.26, 0.7,  25, 0);
  pad(cx - 0.4, y, cz, 0.70, 0.26, 0.70, 0,  25);
  pad(cx + 0.45, y, cz, 0.70, 0.26, 0.70, 0, -25);
}

function drawTurtle(world) {
  const shellDark = [0.40, 0.30, 0.14, 1];
  const shellMid = [0.52, 0.40, 0.20, 1];
  const rimLight = [0.70, 0.78, 0.58, 1];

  const bodyGreen = [0.25, 0.70, 0.25, 1];
  const bodyDark = [0.18, 0.55, 0.18, 1];
  const claw = [0.86, 0.86, 0.82, 1];

  let M = new Matrix4(world);
  M.translate(0.05, -0.12, 0);
  M.scale(1.10, 0.18, 1.15);
  renderCube(bodyDark, M);

  M = new Matrix4(world);
  M.translate(0.08, 0.02, 0.00);
  M.scale(1.70, 0.10, 1.85);
  M.translate(0, -0.5, 0);
  renderCylinder(rimLight, M, 40);

  M = new Matrix4(world);
  M.translate(0.08, 0.10, 0.00);
  M.scale(1.62, 0.26, 1.75);
  M.translate(0, -0.5, 0);
  renderCylinder(shellDark, M, 40);

  const domeC = [0.62, 0.48, 0.26, 1];
  const domeM = new Matrix4(world);
  domeM.translate(0.08, 0.18, 0.00);
  domeM.scale(1.55, 1.10, 1.65);
  renderHemisphere(domeC, domeM, 12, 30, 21.50);

  const topM = new Matrix4(world);
  topM.translate(0.08, 0.34, 0.00);
  topM.scale(1.10, 0.80, 1.18);
  renderHemisphere(shellMid, topM, 12, 30, 19.0);

  drawScutePads(world);
  drawRealHead(world, bodyGreen);

  M = new Matrix4(world);
  M.translate(0.18, -0.16, -0.98);
  M.rotate(180, 0, 1, 0);
  M.rotate(-10, 1, 0, 0);
  M.scale(0.32, 0.22, 0.45);
  M.translate(-0.5, 0.0, -0.5);
  renderTriPrism(bodyGreen, M);

  drawLegChain(world, {
    hip: [-0.42, -0.12, 0.56],
    thighAngle: g_leg1,
    calfAngle: g_leg2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: true
  });

  drawLegChain(world, {
    hip: [0.58, -0.12, 0.56],
    thighAngle: g_fr1,
    calfAngle: g_fr2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: true
  });

  drawLegChain(world, {
    hip: [-0.52, -0.12, -0.60],
    thighAngle: g_bl1,
    calfAngle: g_bl2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: false
  });

  drawLegChain(world, {
    hip: [0.62, -0.12, -0.60],
    thighAngle: g_br1,
    calfAngle: g_br2,
    bodyColor: bodyGreen,
    clawColor: claw,
    toeForward: false
  });
}

function drawLegChain(world, { hip, thighAngle, calfAngle, bodyColor, clawColor, toeForward }) {
  const base = new Matrix4(world);
  base.translate(hip[0], hip[1], hip[2]);

  let thigh = new Matrix4(base);
  thigh.rotate(thighAngle, 1, 0, 0);
  const thighCoord = new Matrix4(thigh);

  let M = new Matrix4(thigh);
  M.translate(0, -0.10, 0);
  M.scale(0.26, 0.18, 0.28);
  renderCube(bodyColor, M);

  let calf = new Matrix4(thighCoord);
  calf.translate(0, -0.18, 0.05);
  calf.rotate(calfAngle, 1, 0, 0);
  const calfCoord = new Matrix4(calf);

  M = new Matrix4(calf);
  M.translate(0, -0.10, 0);
  M.scale(0.24, 0.18, 0.26);
  renderCube(bodyColor, M);

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
    [0.00, -0.06, dz + 0.02],
    [0.10, -0.06, dz],
  ];

  for (const [dx, dy, dz2] of toes) {
    const M = new Matrix4(footCoord);
    M.translate(dx, dy, dz2);
    M.scale(0.07, 0.05, 0.09);
    renderCube(clawColor, M);
  }
}

function drawRealHead(world, bodyGreen) {
  const eyeW = [1, 1, 1, 1];
  const eyeB = [0, 0, 0, 1];
  const blush = [1, 0.6, 0.75, 1];
  const mouth = [0.08, 0.08, 0.08, 1];
  const tearC = [0.25, 0.55, 1.0, 1];
  const nostrilC = [0.05, 0.05, 0.05, 1];

  const headX = 0.00;
  const headY = -0.16;
  const headZ = 1.05;

  const headSX = 0.72;
  const headSY = 0.48;
  const headSZ = 0.60;

  const neckX = 0.10;
  const neckY = -0.20;
  const neckStartZ = 0.46;
  const neckRad = 0.20;

  const headBackZ = headZ - headSZ * 0.5;
  let neckLen = headBackZ - neckStartZ;
  if (neckLen < 0.05) neckLen = 0.05;

  let M = new Matrix4(world);
  M.translate(neckX, neckY - 0.06, neckStartZ - 0.08);
  M.scale(0.36, 0.26, 0.36);
  renderCube(bodyGreen, M);

  M = new Matrix4(world);
  M.translate(neckX, neckY, neckStartZ);
  M.rotate(90, 1, 0, 0);
  M.scale(neckRad, neckLen, neckRad);
  renderCylinder(bodyGreen, M);

  const headBase = new Matrix4(world);
  headBase.translate(headX, headY, headZ);

  M = new Matrix4(headBase);
  M.scale(headSX, headSY, headSZ);
  renderSphere(bodyGreen, M, 10, 5.7);

  function faceCube(c, x, y, z, sx, sy, sz) {
    const T = new Matrix4(headBase);
    T.translate(x, y, z);
    T.scale(sx, sy, sz);
    renderCube(c, T);
  }

  function faceSphere(c, x, y, z, sx, sy, sz, size = 2.4, detail = 6) {
    const T = new Matrix4(headBase);
    T.translate(x, y, z);
    T.scale(sx, sy, sz);
    renderSphere(c, T, detail, size);
  }

  const faceZ = headSZ * 0.5 + 0.06;

  const poking = (g_pokeStart >= 0);
  const t = g_pokeT;
  const ease = (t < 0.5) ? (2 * t * t) : (1 - Math.pow(-2 * t + 2, 2) / 2);
  const tearY = 0.05 - 0.40 * ease;

  faceCube(blush, -0.24, -0.02, faceZ, 0.11, 0.08, 0.04);
  faceCube(blush, 0.24, -0.02, faceZ, 0.11, 0.08, 0.04);

  function drawNostrils() {
    faceCube(nostrilC, -0.05, 0.02, faceZ + 0.01, 0.035, 0.035, 0.02);
    faceCube(nostrilC, 0.05, 0.02, faceZ + 0.01, 0.035, 0.035, 0.02);
  }

  if (!poking) {
    faceCube(eyeW, -0.16, 0.12, faceZ, 0.12, 0.12, 0.05);
    faceCube(eyeB, -0.14, 0.12, faceZ + 0.02, 0.05, 0.05, 0.04);

    faceCube(eyeW, 0.18, 0.12, faceZ, 0.12, 0.12, 0.05);
    faceCube(eyeB, 0.18, 0.12, faceZ + 0.02, 0.05, 0.05, 0.04);

    faceCube(mouth, 0.02, -0.12, faceZ + 0.01, 0.18, 0.035, 0.03);
    return;
  }

  if (g_pokeMode === 0) {
    let L = new Matrix4(headBase);
    L.translate(-0.17, 0.12, faceZ + 0.02);
    L.rotate(-30, 0, 0, 1);
    L.scale(0.16, 0.03, 0.04);
    renderCube(eyeB, L);

    L = new Matrix4(headBase);
    L.translate(-0.17, 0.08, faceZ + 0.02);
    L.rotate(30, 0, 0, 1);
    L.scale(0.16, 0.03, 0.04);
    renderCube(eyeB, L);

    let R = new Matrix4(headBase);
    R.translate(0.19, 0.12, faceZ + 0.02);
    R.rotate(30, 0, 0, 1);
    R.scale(0.16, 0.03, 0.04);
    renderCube(eyeB, R);

    R = new Matrix4(headBase);
    R.translate(0.19, 0.08, faceZ + 0.02);
    R.rotate(-30, 0, 0, 1);
    R.scale(0.16, 0.03, 0.04);
    renderCube(eyeB, R);

    faceCube(mouth, 0.02, -0.14, faceZ + 0.02, 0.20, 0.04, 0.03);
    faceCube(mouth, -0.10, -0.16, faceZ + 0.02, 0.06, 0.06, 0.03);
    faceCube(mouth, 0.14, -0.16, faceZ + 0.02, 0.06, 0.06, 0.03);

    faceSphere(tearC, -0.20, tearY, faceZ + 0.10, 0.10, 0.14, 0.10, 2.4, 6);
    faceSphere(tearC, 0.20, tearY, faceZ + 0.10, 0.10, 0.14, 0.10, 2.4, 6);
  } else {
    faceCube(eyeB, -0.15, 0.12, faceZ + 0.02, 0.16, 0.03, 0.04);
    faceCube(eyeB, 0.17, 0.12, faceZ + 0.02, 0.16, 0.03, 0.04);

    drawNostrils();

    const open = 0.01 + 0.03 * ease;
    const vx = 0.02;
    const vy = -0.12;
    const vz = faceZ + 0.03;

    const inward = 0.052;
    const down = -0.02;

    let V1 = new Matrix4(headBase);
    V1.translate(vx, vy - open, vz);
    V1.rotate(35, 0, 0, 1);
    V1.translate(inward, down, 0);
    V1.scale(0.12, 0.035, 0.03);
    renderCube(mouth, V1);

    let V2 = new Matrix4(headBase);
    V2.translate(vx, vy - open, vz);
    V2.rotate(-35, 0, 0, 1);
    V2.translate(-inward, down, 0);
    V2.scale(0.12, 0.035, 0.03);
    renderCube(mouth, V2);
  }
}
