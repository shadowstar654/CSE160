// asgn3.js — SOLID WALLS + COLLISION + WATER GUN + DIALOGUE
// IMPORTANT:
// 1) Do NOT call main() at the bottom (HTML already does <body onload="main()">)
// 2) Texture system is supported, but will safely fallback to color if UV/texture not ready

let canvas, gl;

// GLSL locations
let a_Position;
let a_UV = null;

let u_FragColor, u_ModelMatrix;
let u_ViewMatrix, u_ProjectionMatrix;

let u_Sampler = null;
let u_UseTexture = null;
let u_UVScale = null;

// textures
let g_dirtTex = null;
let g_sandTex = null;

// UI state
let g_globalAngle = 0;

// Mouse look
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

// Poke animation (shift-click) — used by turtle face, safe to keep here
let g_pokeStart = -1;
let g_pokeT = 0;
let g_pokeMode = 0;

// Turtle joints (your turtle uses these globals)
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

// rocks HUD
let g_rocksEl = null;

// reusable shapes
let g_cube = null;
let g_cyl = null;
let g_sph = null;
let g_hemi = null;
let g_tri = null;

// camera (YOUR Camera.js)
let g_camera = null;

// --- climb / small-block stepping ---
let g_smallBlocks = [];      // list of climbable blocks (AABB)
let g_defaultEyeY = 0;       // remember camera's normal height

const STEP_MAX = 0.40;
const GRAVITY_DOWN = 0.03;

// ----------------- VOXEL MAP + WALLS -----------------
const MAP_SIZE = 32;
const CELL_SIZE = 1.0;

const FLOOR_Y = -0.35;
const FLOOR_THICK = 0.02;
const FLOOR_TOP_Y = FLOOR_Y + FLOOR_THICK / 2.0;

const WALL_DRAW_DIST = 10;
const WALL_DRAW_DIST2 = WALL_DRAW_DIST * WALL_DRAW_DIST;

let g_map = null;   // heights [z][x]

// collision tuning
const PLAYER_RADIUS = 0.20;

// colors
const WALL_COLOR   = [0.55, 0.40, 0.22, 1.0];
const WALL_EDGE    = [0.45, 0.33, 0.18, 1.0];
const FLOOR_COLOR  = [0.55, 0.85, 0.55, 1.0];
const SKY_COLOR    = [0.55, 0.75, 1.0, 1.0];

// =======================
// WATER GUN (projectiles)
// =======================
let g_waterShots = [];           // {x,y,z, vx,vy,vz, life}
let g_isShooting = false;
let g_lastShotTime = 0;

const WATER_RATE = 0.08;
const WATER_SPEED = 10.0;
const WATER_LIFE  = 1.2;
const WATER_SIZE  = 0.14;
const WATER_COLOR = [0.25, 0.65, 1.0, 1.0];

// =======================
// ROCK COUNTER + WIN STATE
// =======================
let g_rocksLeft = 0;
let g_turtleGone = false;     // when true, stop drawing turtle
let g_savedShown = false;

// =======================
// RETRO DIALOGUE (Lore UI)
// =======================
let g_dialogueVisible = false;
let g_dialogueIndex = 0;

const g_dialogueLines = [
  "Hello! Welcome to the world of this homie turtle.",
  "He is currently trapped under some rocks and cannot get home.",
  "Use your water gun (CTRL + hold mouse) to get rid of the rocks.",
  "Shoot the gray rocks to free him!",
  "Press SPACE to continue..."
];

function showDialogue(text) {
  const box = document.getElementById("dialogueBox");
  const p = document.getElementById("dialogueText");
  if (!box || !p) return;
  p.innerText = text;
  box.classList.remove("hidden");
  g_dialogueVisible = true;
}

function hideDialogue() {
  const box = document.getElementById("dialogueBox");
  if (!box) return;
  box.classList.add("hidden");
  g_dialogueVisible = false;
}

function toggleDialogue() {
  if (g_dialogueVisible) {
    hideDialogue();
  } else {
    g_dialogueIndex = 0;
    showDialogue(g_dialogueLines[g_dialogueIndex]);
  }
}

function advanceDialogue() {
  if (!g_dialogueVisible) return;
  g_dialogueIndex++;
  if (g_dialogueIndex >= g_dialogueLines.length) {
    hideDialogue();
    return;
  }
  showDialogue(g_dialogueLines[g_dialogueIndex]);
}

// =======================
// Shaders
// =======================
const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

varying vec2 v_UV;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}
`;

const FSHADER_SOURCE = `
precision mediump float;

uniform vec4 u_FragColor;
uniform sampler2D u_Sampler;
uniform int u_UseTexture;
uniform vec2 u_UVScale;

varying vec2 v_UV;

void main() {
  if (u_UseTexture == 1) {
    gl_FragColor = texture2D(u_Sampler, v_UV * u_UVScale);
  } else {
    gl_FragColor = u_FragColor;
  }
}
`;

// =======================
// Map building
// =======================
function makeEmptyMap(size) {
  const m = [];
  for (let z = 0; z < size; z++) m.push(new Array(size).fill(0));
  return m;
}

function buildMap32() {
  const m = makeEmptyMap(MAP_SIZE);

  // border walls height 4
  for (let i = 0; i < MAP_SIZE; i++) {
    m[0][i] = 4;
    m[MAP_SIZE - 1][i] = 4;
    m[i][0] = 4;
    m[i][MAP_SIZE - 1][i] = 4;
  }

  // internal walls
  for (let z = 6; z < 26; z++) {
    m[z][10] = 3;
    if (z % 3 === 0) m[z][14] = 2;
  }

  // small room
  for (let x = 18; x < 28; x++) {
    m[8][x] = 3;
    m[16][x] = 3;
  }
  for (let z = 8; z < 17; z++) {
    m[z][18] = 3;
    m[z][27] = 3;
  }
  m[12][18] = 0; // door

  return m;
}

// =======================
// Collision helpers
// =======================
function getForwardXZ() {
  const f = new Vector3(g_camera.at.elements);
  f.sub(g_camera.eye);
  f.elements[1] = 0;
  f.normalize();
  return f;
}

function getRightXZ() {
  const f = getForwardXZ();
  const r = Vector3.cross(f, g_camera.up);
  r.elements[1] = 0;
  r.normalize();
  return r;
}

function worldToMap(x, z) {
  const half = MAP_SIZE / 2;
  const mx = Math.floor(x / CELL_SIZE + half);
  const mz = Math.floor(z / CELL_SIZE + half);
  return [mx, mz];
}

function isSolidAtWorld(x, z, y) {
  // walls (voxel map)
  {
    const [mx, mz] = worldToMap(x, z);
    if (mx < 0 || mz < 0 || mx >= MAP_SIZE || mz >= MAP_SIZE) return true;

    const h = g_map[mz][mx];
    if (h > 0) {
      const wallBottom = FLOOR_TOP_Y;
      const wallTop = FLOOR_TOP_Y + h * 1.0;
      if (y >= wallBottom && y <= wallTop) return true;
    }
  }

  // small climbable blocks (gray)
  for (let i = 0; i < g_smallBlocks.length; i++) {
    const b = g_smallBlocks[i];
    if (x >= b.x - b.halfX && x <= b.x + b.halfX &&
        z >= b.z - b.halfZ && z <= b.z + b.halfZ &&
        y >= b.bottomY && y <= b.topY) {
      return true;
    }
  }

  return false;
}

function canStandAt(x, z, y) {
  const R = PLAYER_RADIUS;
  return !(
    isSolidAtWorld(x + R, z + R, y) ||
    isSolidAtWorld(x + R, z - R, y) ||
    isSolidAtWorld(x - R, z + R, y) ||
    isSolidAtWorld(x - R, z - R, y)
  );
}

function tryMove(dx, dz) {
  const nx = g_camera.eye.elements[0] + dx;
  const nz = g_camera.eye.elements[2] + dz;
  const ey = g_camera.eye.elements[1];

  // normal move
  if (canStandAt(nx, nz, ey)) {
    g_camera.eye.elements[0] = nx;
    g_camera.eye.elements[2] = nz;
    g_camera.at.elements[0] += dx;
    g_camera.at.elements[2] += dz;
    g_camera.updateView();
    return;
  }

  // step-up attempt
  const stepY = ey + STEP_MAX;
  if (canStandAt(nx, nz, stepY)) {
    g_camera.eye.elements[0] = nx;
    g_camera.eye.elements[2] = nz;
    g_camera.at.elements[0] += dx;
    g_camera.at.elements[2] += dz;

    g_camera.eye.elements[1] = stepY;
    g_camera.at.elements[1] += STEP_MAX;

    g_camera.updateView();
    return;
  }
}

function moveForward() {
  const f = getForwardXZ();
  const step = g_camera.moveStep || 0.2;
  tryMove(f.elements[0] * step, f.elements[2] * step);
}
function moveBack() {
  const f = getForwardXZ();
  const step = g_camera.moveStep || 0.2;
  tryMove(-f.elements[0] * step, -f.elements[2] * step);
}
function moveLeft() {
  const r = getRightXZ();
  const step = g_camera.moveStep || 0.2;
  tryMove(-r.elements[0] * step, -r.elements[2] * step);
}
function moveRight() {
  const r = getRightXZ();
  const step = g_camera.moveStep || 0.2;
  tryMove(r.elements[0] * step, r.elements[2] * step);
}

// =======================
// Controls
// =======================
function addMouseControls() {
  canvas.addEventListener('mousedown', (ev) => {
    // CTRL + click = shoot
    if (ev.ctrlKey) {
      g_isShooting = true;
      g_isDragging = false;
      return;
    }

    // shift-click = poke mode toggle (turtle face)
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

    const sensitivity = 0.20;
    g_camera.panMouse(dx * sensitivity);
    void dy;
  });

  window.addEventListener('mouseup', () => {
    g_isDragging = false;
    g_isShooting = false;
  });

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
  }, { passive: false });
}

function addKeyboardControls() {
  document.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();

    // lore keys always work
    if (k === 'l') {
      toggleDialogue();
      return;
    }
    if (ev.code === 'Space' && g_dialogueVisible) {
      ev.preventDefault();
      advanceDialogue();
      return;
    }

    if (!g_camera) return;

    if (k === 'w') moveForward();
    else if (k === 's') moveBack();
    else if (k === 'a') moveLeft();
    else if (k === 'd') moveRight();
    else if (k === 'q') g_camera.panLeft();
    else if (k === 'e') g_camera.panRight();

    else if (ev.key === 'ArrowUp') moveForward();
    else if (ev.key === 'ArrowDown') moveBack();
    else if (ev.key === 'ArrowLeft') moveLeft();
    else if (ev.key === 'ArrowRight') moveRight();
  });
}
function cellIsWallAtWorld(x, z) {
  if (!g_map) return false; // safety (in case called too early)
  const [mx, mz] = worldToMap(x, z);
  if (mx < 0 || mz < 0 || mx >= MAP_SIZE || mz >= MAP_SIZE) return true; // outside = blocked
  return g_map[mz][mx] > 0; // any height means there's a wall column there
}

function buildSmallBlocks() {
  const half = 0.30;
  const centerY = -0.33;
  const bottomY = centerY - half;
  const topY = centerY + half;

  const WANT = 10; // ✅ your “2 less rocks”
  const blocks = [];

  // candidate positions (same style as before)
  // we’ll keep scanning forward until we collect WANT safe spots
  let i = 0;
  let attempts = 0;
  const MAX_ATTEMPTS = 200; // safety so we never infinite-loop

  while (blocks.length < WANT && attempts < MAX_ATTEMPTS) {
    const x = -3 + (i % 6);
    const z = -2 + Math.floor(i / 6);

    // don’t place inside walls
    if (!cellIsWallAtWorld(x, z)) {
      blocks.push({
        x, z,
        halfX: half,
        halfZ: half,
        bottomY,
        topY
      });
    }

    i++;
    attempts++;
  }

  return blocks;
}


// =======================
// Texture helpers
// =======================
function isPowerOf2(v) { return (v & (v - 1)) === 0; }

function initTexture(imgSrc, onReady) {
  const tex = gl.createTexture();
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    const pot = isPowerOf2(img.width) && isPowerOf2(img.height);
    if (pot) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    onReady(tex);
  };

  img.onerror = (e) => console.error("[Texture FAIL]", imgSrc, e);
  img.src = imgSrc + "?v=" + Date.now();
}

// =======================
// Water gun logic
// =======================
function spawnWaterShot() {
  if (!g_camera) return;

  const f = getForwardXZ();
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];

  const y = -0.20; // align with rocks

  const sx = ex + f.elements[0] * 0.55;
  const sz = ez + f.elements[2] * 0.55;

  g_waterShots.push({
    x: sx, y: y, z: sz,
    vx: f.elements[0] * WATER_SPEED,
    vy: 0.0,
    vz: f.elements[2] * WATER_SPEED,
    life: WATER_LIFE
  });
}

function pointHitsBlock(px, py, pz, b) {
  return (
    px >= b.x - b.halfX && px <= b.x + b.halfX &&
    pz >= b.z - b.halfZ && pz <= b.z + b.halfZ &&
    py >= b.bottomY     && py <= b.topY
  );
}

function updateWaterShots(dt) {
  // auto-fire while holding ctrl+mouse
  if (g_isShooting) {
    g_lastShotTime += dt;
    while (g_lastShotTime >= WATER_RATE) {
      g_lastShotTime -= WATER_RATE;
      spawnWaterShot();
    }
  } else {
    g_lastShotTime = 0;
  }

  for (let i = g_waterShots.length - 1; i >= 0; i--) {
    const s = g_waterShots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    s.life -= dt;

    if (s.life <= 0) {
      g_waterShots.splice(i, 1);
      continue;
    }

    // collide with rocks
    let hitIndex = -1;
    for (let j = 0; j < g_smallBlocks.length; j++) {
      if (pointHitsBlock(s.x, s.y, s.z, g_smallBlocks[j])) {
        hitIndex = j;
        break;
      }
    }

    if (hitIndex !== -1) {
      g_smallBlocks.splice(hitIndex, 1);
      g_rocksLeft = g_smallBlocks.length;
      g_waterShots.splice(i, 1);

      if (!g_savedShown && g_rocksLeft === 0) {
        g_savedShown = true;
        g_turtleGone = true;
        showDialogue("Congratulations! You've rescued the turtle! Feel free to stay in this world longer or leave.");
      }
    }
  }
}

function drawWaterShots(world) {
  for (let i = 0; i < g_waterShots.length; i++) {
    const s = g_waterShots[i];
    let M = new Matrix4(world);
    M.translate(s.x, s.y, s.z);
    M.scale(WATER_SIZE, WATER_SIZE, WATER_SIZE);
    renderCube(WATER_COLOR, M);
  }
}

// =======================
// Main / Tick / Rendering
// =======================
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return;

  gl.enable(gl.DEPTH_TEST);
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

  u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  u_UseTexture = gl.getUniformLocation(gl.program, 'u_UseTexture');
  u_UVScale = gl.getUniformLocation(gl.program, 'u_UVScale');

  // defaults
  if (u_UseTexture) gl.uniform1i(u_UseTexture, 0);
  if (u_UVScale) gl.uniform2f(u_UVScale, 1.0, 1.0);

  gl.clearColor(0.92, 0.92, 0.97, 1);

  g_perfEl = document.getElementById('perf');
  g_rocksEl = document.getElementById('rocksHUD');

  // shapes
  g_cube = new Cube();
  g_cyl = new Cylinder();
  g_sph = new Sphere();
  g_hemi = new Hemisphere();

  if (typeof TriPrism !== 'undefined') g_tri = new TriPrism();
  else if (typeof TriangularPrism !== 'undefined') g_tri = new TriangularPrism();
  else console.error('Tri prism class not found (TriPrism or TriangularPrism).');

  // build map + blocks
  g_map = buildMap32();
  g_smallBlocks = buildSmallBlocks();
  g_rocksLeft = g_smallBlocks.length;
  g_turtleGone = false;
  g_savedShown = false;

  // load textures (safe fallback if they fail)
  initTexture('mydirt.png', (t) => { g_dirtTex = t; });
  initTexture('sand1.png',  (t) => { g_sandTex = t; });

  // camera
  g_camera = new Camera();
  g_camera.setPerspective(60, canvas.width / canvas.height, 0.1, 2000);
  g_camera.updateView();

  g_defaultEyeY = g_camera.eye.elements[1];

  // UI
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
  const dt = dtMS / 1000.0;

  updateWaterShots(dt);

  // perf smoothing
  const fps = 1000.0 / Math.max(dtMS, 0.0001);
  const alpha = 0.08;
  g_fpsSMA = (g_fpsSMA === 0) ? fps : (g_fpsSMA * (1 - alpha) + fps * alpha);
  g_msSMA = (g_msSMA === 0) ? dtMS : (g_msSMA * (1 - alpha) + dtMS * alpha);

  if (g_perfEl && (!tick._hudLast || nowMS - tick._hudLast > 250)) {
    tick._hudLast = nowMS;
    g_perfEl.innerHTML = `FPS: ${g_fpsSMA.toFixed(1)}<br>ms: ${g_msSMA.toFixed(1)}`;
  }

  if (g_rocksEl && (!tick._rocksLast || nowMS - tick._rocksLast > 120)) {
    tick._rocksLast = nowMS;
    g_rocksEl.innerText = "Rocks left: " + g_rocksLeft;
  }

  g_seconds = nowMS / 1000 - g_startTime;

  // poke timing (turtle face)
  if (g_pokeStart >= 0) {
    const t = (nowMS / 1000 - g_pokeStart) / 1.2;
    g_pokeT = Math.min(Math.max(t, 0), 1);
    if (t >= 1) { g_pokeStart = -1; g_pokeT = 0; }
  } else {
    g_pokeT = 0;
  }

  if (g_animate) updateAnimationAngles();

  // gravity back down toward default eye height when not supported
  if (g_camera) {
    const x = g_camera.eye.elements[0];
    const z = g_camera.eye.elements[2];
    const y = g_camera.eye.elements[1];

    const underY = y - 0.45;
    const supported =
      isSolidAtWorld(x, z, underY) ||
      isSolidAtWorld(x + 0.1, z, underY) ||
      isSolidAtWorld(x - 0.1, z, underY);

    if (!supported && y > g_defaultEyeY) {
      const ny = Math.max(g_defaultEyeY, y - GRAVITY_DOWN);
      const dy = ny - y;
      g_camera.eye.elements[1] = ny;
      g_camera.at.elements[1] += dy;
      g_camera.updateView();
    }
  }

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

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projMat.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMat.elements);

  const world = new Matrix4();
  world.rotate(g_globalAngle, 0, 1, 0);

  drawWorld(world);

  // your turtle draw call stays here, but the FUNCTIONS are below in your turtle section
  if (!g_turtleGone) {
    const turtleWorld = new Matrix4(world);
    turtleWorld.translate(0, 0.18, 0);
    turtleWorld.scale(0.70, 0.70, 0.70);
    turtleWorld.translate(-0.10, -0.05, 0);
    drawTurtle(turtleWorld);
  }
}

// =======================
// Render helpers
// =======================
function renderCube(color, M) {
  // force color mode so textures don't "stick"
  if (u_UseTexture) gl.uniform1i(u_UseTexture, 0);
  if (u_UVScale) gl.uniform2f(u_UVScale, 1.0, 1.0);

  g_cube.color = color;
  g_cube.matrix.set(M);
  g_cube.render();
}

function renderTexturedCube(M, texture, uvScaleX = 1.0, uvScaleY = 1.0) {
  // If UV attribute doesn't exist in Cube.js, or texture not ready, fallback to color.
  if (!texture || !u_UseTexture || !u_UVScale || !u_Sampler || a_UV === null || a_UV < 0) {
    renderCube(WALL_COLOR, M);
    return;
  }

  gl.uniform1i(u_UseTexture, 1);
  gl.uniform2f(u_UVScale, uvScaleX, uvScaleY);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_Sampler, 0);

  g_cube.color = [1, 1, 1, 1];
  g_cube.matrix.set(M);
  g_cube.render();

  // restore defaults
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.uniform1i(u_UseTexture, 0);
  gl.uniform2f(u_UVScale, 1.0, 1.0);
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

// =======================
// World drawing
// =======================
function drawWorld(world) {
  // SKY
  gl.disable(gl.DEPTH_TEST);
  let S = new Matrix4(world);
  S.scale(1000, 1000, 1000);
  S.scale(-1, 1, 1);
  renderCube(SKY_COLOR, S);
  gl.enable(gl.DEPTH_TEST);

  // FLOOR
  let F = new Matrix4(world);
  F.translate(0, FLOOR_Y, 0);
  const floorSize = MAP_SIZE * CELL_SIZE + 2;
  F.scale(floorSize, FLOOR_THICK, floorSize);

  // if sand texture isn't ready, floor falls back to WALL_COLOR (still visible)
  const tiles = 16.0;
  renderTexturedCube(F, g_sandTex, tiles, tiles);

  // WALLS from voxel map
  const half = MAP_SIZE / 2;
  const baseY = FLOOR_TOP_Y + 0.5;

  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];

  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const h = g_map[z][x];
      if (h <= 0) continue;

      const wx = (x - half) * CELL_SIZE;
      const wz = (z - half) * CELL_SIZE;

      const dx = wx - ex;
      const dz = wz - ez;
      if (dx * dx + dz * dz > WALL_DRAW_DIST2) continue;

      for (let y = 0; y < h; y++) {
        const wy = baseY + y * 1.0;

        let W = new Matrix4(world);
        W.translate(wx, wy, wz);
        W.scale(1.0, 1.0, 1.0);
        renderTexturedCube(W, g_dirtTex);

        if (dx * dx + dz * dz < 6 * 6) {
          let Cap = new Matrix4(world);
          Cap.translate(wx, wy + 0.51, wz);
          Cap.scale(1.02, 0.05, 1.02);
          renderCube(WALL_EDGE, Cap);
        }
      }
    }
  }

  // ROCKS (gray)
  const rock = [0.55, 0.55, 0.60, 1];
  for (let i = 0; i < g_smallBlocks.length; i++) {
    const b = g_smallBlocks[i];
    const cy = (b.bottomY + b.topY) * 0.5;

    let B = new Matrix4(world);
    B.translate(b.x, cy, b.z);
    B.scale(b.halfX * 2.0, (b.topY - b.bottomY), b.halfZ * 2.0);
    renderCube(rock, B);
  }

  // WATER SHOTS
  drawWaterShots(world);

  // Goal block (optional)
  const goal = [1.0, 0.85, 0.25, 1];
  let G = new Matrix4(world);
  G.translate(3, -0.25, -3);
  G.scale(0.8, 0.8, 0.8);
  renderCube(goal, G);
}



// =======================
// TURTLE CODE (yours)
// =======================

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