let canvas, gl;
let a_Position, u_FragColor, u_ModelMatrix, u_GlobalRotation;

// UI state
let g_globalAngle = 0;

// Mouse rotation (drag)
let g_mouseRotX = 0;
let g_mouseRotY = 0;
let g_isDragging = false;

// Poke animation (shift-click)
let g_pokeStart = -1;
let g_pokeT = 0;
let g_pokeMode = 0;

let g_leg1 = 0;
let g_leg2 = 0;
let g_animate = false;
//animations stuff
let g_startTime = performance.now() / 1000;
let g_seconds = 0;
let g_fr1 = 0, g_fr2 = 0;
let g_bl1 = 0, g_bl2 = 0;
let g_br1 = 0, g_br2 = 0;
let g_perfEl = null;
let g_lastFrameMS = performance.now();
let g_fpsSMA = 0;
let g_msSMA = 0;
let g_cube = null;
let g_cyl = null;
let g_sph = null;
let g_hemi = null;
let g_tri = null;

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

function addMouseControls() {
  function getMouseNorm(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    const nx = (x - 0.5) * 2;
    const ny = (0.5 - y) * 2;
    return { nx, ny };
  }

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.shiftKey) {
      g_pokeMode = (g_pokeMode + 1) % 2;
      g_pokeStart = performance.now() / 1000;
      g_isDragging = false;
      return;
    }

    g_isDragging = true;
    const { nx, ny } = getMouseNorm(ev);
    g_mouseRotY = nx * 180;
    g_mouseRotX = ny * 180;
  });

  canvas.addEventListener('mousemove', (ev) => {
    if (!g_isDragging) return;
    const { nx, ny } = getMouseNorm(ev);
    g_mouseRotY = nx * 180;
    g_mouseRotX = ny * 180;
  });

  window.addEventListener('mouseup', () => {
    g_isDragging = false;
  });
}

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

  g_perfEl = document.getElementById('perf');

  // reusable shapes
  g_cube = new Cube();
  g_cyl = new Cylinder();
  g_sph = new Sphere();
  g_hemi = new Hemisphere();
  g_tri = new TriPrism();

  // UI
  const rotEl = document.getElementById('globalRot');
  if (rotEl) rotEl.oninput = e => g_globalAngle = +e.target.value;

  const leg1El = document.getElementById('leg1');
  if (leg1El) leg1El.oninput = e => !g_animate && (g_leg1 = +e.target.value);

  const leg2El = document.getElementById('leg2');
  if (leg2El) leg2El.oninput = e => !g_animate && (g_leg2 = +e.target.value);

  const animOnEl = document.getElementById('animOn');
  if (animOnEl) animOnEl.onclick = () => { g_animate = true; };

  const animOffEl = document.getElementById('animOff');
  if (animOffEl) animOffEl.onclick = () => { g_animate = false; };

  addMouseControls();
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
  const globalRot = new Matrix4();
  globalRot.rotate(g_mouseRotX, 1, 0, 0);
  globalRot.rotate(g_mouseRotY, 0, 1, 0);
  globalRot.rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRot.elements);
  const world = new Matrix4();
  world.scale(0.70, 0.70, 0.70);
  world.translate(-0.10, -0.05, 0);
  drawTurtle(world);
}
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
  g_tri.color = color;
  g_tri.matrix.set(M);
  g_tri.render();
}
function drawScutePads(world) {
  const padC = [0.36, 0.26, 0.12, 1.0];

  // rotX = tilt forward/back (toward center)
  // rotZ = tilt left/right (toward center)
  function pad(x, y, z, sx, sy, sz, rotX = 0, rotZ = 0, rotY = 0) {
    const M = new Matrix4(world);
    M.translate(x, y, z);

    // Optional yaw so pads can "aim" a bit (usually 0 is fine)
    if (rotY !== 0) M.rotate(rotY, 0, 1, 0);

    // IMPORTANT: tilt inward toward center curvature
    if (rotX !== 0) M.rotate(rotX, 1, 0, 0);
    if (rotZ !== 0) M.rotate(rotZ, 0, 0, 1);

    M.scale(sx, sy, sz);
    renderHemisphere(padC, M, 12, 30, 21.50);
  }

  // Raise slightly above dome to avoid z-fighting
  const y = 0.59;

  // Shell center reference (aim toward this)
  const cx = 0.08;
  const cz = 0.02;

  // CENTER pad (flat)
  pad(cx, y, cz, 0.70, 0.6, 0.70, 0, 0);

  // FRONT pad: tilt DOWN toward center (negative rotX)
  pad(cx, y, cz - 0.5, 0.7, 0.26, 0.7, -25, 0);

  // BACK pad: tilt DOWN toward center (positive rotX)
  pad(cx, y, cz + 0.4, 0.7, 0.26, 0.7,  25, 0);

  // LEFT pad: tilt DOWN toward center (positive rotZ)
  pad(cx - 0.4, y, cz, 0.70, 0.26, 0.70, 0,  25);

  // RIGHT pad: tilt DOWN toward center (negative rotZ)
  pad(cx + 0.45, y, cz, 0.70, 0.26, 0.70, 0, -25);
}


// ~~ My Turtle ~~
function drawTurtle(world) {
  const shellDark = [0.40, 0.30, 0.14, 1];
  const shellMid = [0.52, 0.40, 0.20, 1];
  const rimLight = [0.70, 0.78, 0.58, 1];

  const bodyGreen = [0.25, 0.70, 0.25, 1];
  const bodyDark = [0.18, 0.55, 0.18, 1];
  const claw = [0.86, 0.86, 0.82, 1];

  // belly
  let M = new Matrix4(world);
  M.translate(0.05, -0.12, 0);
  M.scale(1.10, 0.18, 1.15);
  renderCube(bodyDark, M);

  // rim band
  M = new Matrix4(world);
  M.translate(0.08, 0.02, 0.00);
  M.scale(1.70, 0.10, 1.85);
  M.translate(0, -0.5, 0);
  renderCylinder(rimLight, M, 40);

  // skirt
  M = new Matrix4(world);
  M.translate(0.08, 0.10, 0.00);
  M.scale(1.62, 0.26, 1.75);
  M.translate(0, -0.5, 0);
  renderCylinder(shellDark, M, 40);

  // main dome hemisphere
  const domeC = [0.62, 0.48, 0.26, 1];
  const domeM = new Matrix4(world);
  domeM.translate(0.08, 0.18, 0.00);
  domeM.scale(1.55, 1.10, 1.65);
  renderHemisphere(domeC, domeM, 12, 30, 21.50);

  // top highlight hemisphere
  const topM = new Matrix4(world);
  topM.translate(0.08, 0.34, 0.00);
  topM.scale(1.10, 0.80, 1.18);
  renderHemisphere(shellMid, topM, 12, 30, 19.0);

  // NEW: paw-print hemispheres on top of shell
  drawScutePads(world);

  // head + neck
  drawRealHead(world, bodyGreen);

  // tail (triangular prism)
  M = new Matrix4(world);
  M.translate(0.18, -0.16, -0.98);
  M.rotate(180, 0, 1, 0);
  M.rotate(-10, 1, 0, 0);
  M.scale(0.32, 0.22, 0.45);
  M.translate(-0.5, 0.0, -0.5);
  renderTriPrism(bodyGreen, M);

  // legs
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

  // neck base block
  let M = new Matrix4(world);
  M.translate(neckX, neckY - 0.06, neckStartZ - 0.08);
  M.scale(0.36, 0.26, 0.36);
  renderCube(bodyGreen, M);

  // neck cylinder
  M = new Matrix4(world);
  M.translate(neckX, neckY, neckStartZ);
  M.rotate(90, 1, 0, 0);
  M.scale(neckRad, neckLen, neckRad);
  renderCylinder(bodyGreen, M);

  // head sphere
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
    // normal eyes
    faceCube(eyeW, -0.16, 0.12, faceZ, 0.12, 0.12, 0.05);
    faceCube(eyeB, -0.14, 0.12, faceZ + 0.02, 0.05, 0.05, 0.04);

    faceCube(eyeW, 0.18, 0.12, faceZ, 0.12, 0.12, 0.05);
    faceCube(eyeB, 0.18, 0.12, faceZ + 0.02, 0.05, 0.05, 0.04);

    // mouth
    faceCube(mouth, 0.02, -0.12, faceZ + 0.01, 0.18, 0.035, 0.03);
    return;
  }

  if (g_pokeMode === 0) {
    // CRY eyes (X-ish)
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

    // cry mouth
    faceCube(mouth, 0.02, -0.14, faceZ + 0.02, 0.20, 0.04, 0.03);
    faceCube(mouth, -0.10, -0.16, faceZ + 0.02, 0.06, 0.06, 0.03);
    faceCube(mouth, 0.14, -0.16, faceZ + 0.02, 0.06, 0.06, 0.03);

    // tears
    faceSphere(tearC, -0.20, tearY, faceZ + 0.10, 0.10, 0.14, 0.10, 2.4, 6);
    faceSphere(tearC, 0.20, tearY, faceZ + 0.10, 0.10, 0.14, 0.10, 2.4, 6);
  } else {
    // goofy straight eyes
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
