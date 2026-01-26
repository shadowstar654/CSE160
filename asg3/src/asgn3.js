/* ===========================
   asg3.js (PART 1/2)
   Globals + helpers + input + save/load + terrain helpers
   =========================== */

let canvas, gl;

// GLSL locations
let a_Position;
let a_UV = null;

let u_FragColor, u_ModelMatrix;
let u_ViewMatrix, u_ProjectionMatrix;
let u_UseFog   = null;
let u_Sampler = null;
let u_UseTexture = null;
let u_UVScale = null;

// textures
let g_dirtTex = null;
let g_sandTex = null;
let g_skyTex = null;
let g_rockTex = null;
let g_waterTex = null;

// UI / state
let g_globalAngle = 0;

// Mouse look / shooting
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_isShooting = false;
let g_lastShotTime = 0;

// Turtle poke/smile
let g_pokeStart = -1;
let g_pokeT = 0;
let g_pokeMode = 0;

let g_smileUntil = 0;
const SMILE_SECS = 0.8;

// Turtle joints
let g_leg1 = 0;
let g_leg2 = 0;
let g_fr1 = 0, g_fr2 = 0;
let g_bl1 = 0, g_bl2 = 0;
let g_br1 = 0, g_br2 = 0;
let g_animate = false;

// Dialogue
let g_dialogueMode = "lore";
let g_dialogueVisible = false;
let g_dialogueIndex = 0;

const g_dialogueLines = [
  "Hello! Welcome to the world of this homie turtle.",
  "He is currently trapped under some rocks and cannot get home.",
  "Use your water gun (CTRL + hold mouse) to get rid of the rocks.",
  "Shoot the gray rocks to free him!",
  "Press SPACE to continue..."
];

// Time / perf HUD
let g_startTime = performance.now() / 1000;
let g_seconds = 0;

let g_perfEl = null;
let g_lastFrameMS = performance.now();
let g_fpsSMA = 0;
let g_msSMA = 0;

let g_rocksEl = null;

// Shapes
let g_cube = null;
let g_cyl = null;
let g_sph = null;
let g_hemi = null;
let g_tri = null;

// Camera
let g_camera = null;

// World / map
const MAP_SIZE = 32;
const CELL_SIZE = 1.0;

let g_map = null;

const WALL_DRAW_DIST = 6;
const WALL_DRAW_DIST2 = WALL_DRAW_DIST * WALL_DRAW_DIST;

// Player physics
const PLAYER_RADIUS = 0.20;
const STEP_MAX = 0.40;
const GRAVITY_DOWN = 0.03;

// Floor baseline (kept for reference / fallback)
const FLOOR_Y = -0.35;
const FLOOR_THICK = 0.02;
const FLOOR_TOP_Y = FLOOR_Y + FLOOR_THICK / 2.0;

// Terrain + controls
let g_terrain = null;
let g_terrainTex = null;

// --- Terrain controls (ADJUST THESE) ---
let g_terrainBase = FLOOR_Y + 0.08; // overall lift of terrain
let g_terrainAmp  = 0.60;           // hills height
let g_terrainFreq = 0.18;           // hills frequency
let g_eyeHeight   = 0.45;           // camera height above ground

function groundYAtWorld(x, z) {
  if (!g_terrain) return FLOOR_TOP_Y;
  // Terrain.heightAt MUST accept (x,z,freq,amp) OR you set g_terrain.freq/amp
  return g_terrainBase + g_terrain.heightAt(x, z, g_terrainFreq, g_terrainAmp);
}
function playerEyeYAt(x, z) {
  return groundYAtWorld(x, z) + g_eyeHeight;
}

// Colors
const WALL_COLOR   = [0.55, 0.40, 0.22, 1.0];
const WALL_EDGE    = [0.45, 0.33, 0.18, 1.0];
const SKY_COLOR    = [0.55, 0.75, 1.0, 1.0];

// Water shots
let g_waterShots = [];
const WATER_RATE = 0.08;
const WATER_SPEED = 10.0;
const WATER_LIFE  = 1.2;
const WATER_SIZE  = 0.14;

const WATER_UP = 2.2;
const WATER_GRAVITY = -9.0;

// Rocks / win state
let g_smallBlocks = [];
let g_rocksLeft = 0;
let g_turtleGone = false;
let g_savedShown = false;

// PERF: Matrix reuse + rock buckets
let g_tmpM0 = null;
let g_tmpM1 = null;
let g_tmpM2 = null;

let g_rockBuckets = Object.create(null); // "mx,mz" -> blocks
let g_tmpRockList = [];                  // reused list

function ensureTmpMatrices() {
  if (!g_tmpM0) g_tmpM0 = new Matrix4();
  if (!g_tmpM1) g_tmpM1 = new Matrix4();
  if (!g_tmpM2) g_tmpM2 = new Matrix4();
}

function bucketKey(mx, mz) { return mx + "," + mz; }

function rebuildRockBuckets() {
  g_rockBuckets = Object.create(null);
  for (let i = 0; i < g_smallBlocks.length; i++) {
    const b = g_smallBlocks[i];
    const [mx, mz] = worldToMap(b.x, b.z);
    const key = bucketKey(mx, mz);
    let arr = g_rockBuckets[key];
    if (!arr) g_rockBuckets[key] = arr = [];
    arr.push(b);
  }
}

function getNearbyRocks(x, z) {
  g_tmpRockList.length = 0;
  const [mx, mz] = worldToMap(x, z);

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const key = bucketKey(mx + dx, mz + dz);
      const arr = g_rockBuckets[key];
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) g_tmpRockList.push(arr[i]);
    }
  }
  return g_tmpRockList;
}

// Dialogue UI
function showDialogue(text, mode = "lore") {
  const box = document.getElementById("dialogueBox");
  const p = document.getElementById("dialogueText");
  if (!box || !p) return;
  p.innerText = text;
  box.classList.remove("hidden");
  g_dialogueVisible = true;
  g_dialogueMode = mode;
}

function hideDialogue() {
  const box = document.getElementById("dialogueBox");
  if (!box) return;
  box.classList.add("hidden");
  g_dialogueVisible = false;
}

function showWelcome() {
  showDialogue(
    "Welcome to this world!\n" +
    "W/A/S/D: move\n" +
    "Mouse drag: look around\n" +
    "CTRL + hold mouse: shoot water\n" +
    "P: save, O: load, C: clear save\n" +
    "L: open lore\n" +
    "SPACE: continue / close",
    "welcome"
  );
}

function toggleDialogue() {
  if (g_dialogueVisible) hideDialogue();
  else {
    g_dialogueIndex = 0;
    showDialogue(g_dialogueLines[g_dialogueIndex], "lore");
  }
}

function advanceDialogue() {
  if (!g_dialogueVisible) return;
  if (g_dialogueMode !== "lore") return;

  g_dialogueIndex++;
  if (g_dialogueIndex >= g_dialogueLines.length) {
    hideDialogue();
    return;
  }
  showDialogue(g_dialogueLines[g_dialogueIndex], "lore");
}

// Save system
const SAVE_KEY = "turtle_world_save_v1";

function showToast(msg, secs = 0.9) {
  showDialogue(msg, "toast");
  setTimeout(() => {
    if (g_dialogueVisible && g_dialogueMode === "toast") hideDialogue();
  }, secs * 1000);
}

function getGameState() {
  const eye = g_camera?.eye?.elements || [0, 0, 0];
  const at  = g_camera?.at?.elements  || [0, 0, 0];

  return {
    eye: [eye[0], eye[1], eye[2]],
    at:  [at[0],  at[1],  at[2]],
    globalAngle: g_globalAngle,
    turtleGone: g_turtleGone,
    savedShown: g_savedShown,
    smallBlocks: g_smallBlocks.map(b => ({
      x: b.x, z: b.z,
      halfX: b.halfX, halfZ: b.halfZ,
      bottomY: b.bottomY, topY: b.topY
    }))
  };
}

function applyGameState(s) {
  if (!s || !g_camera) return;

  if (Array.isArray(s.eye) && s.eye.length === 3) {
    g_camera.eye.elements[0] = +s.eye[0];
    g_camera.eye.elements[1] = +s.eye[1];
    g_camera.eye.elements[2] = +s.eye[2];
  }
  if (Array.isArray(s.at) && s.at.length === 3) {
    g_camera.at.elements[0] = +s.at[0];
    g_camera.at.elements[1] = +s.at[1];
    g_camera.at.elements[2] = +s.at[2];
  }
  if (typeof s.globalAngle === "number") g_globalAngle = s.globalAngle;

  g_turtleGone = !!s.turtleGone;
  g_savedShown = !!s.savedShown;

  if (Array.isArray(s.smallBlocks)) {
    g_smallBlocks = s.smallBlocks.map(b => ({
      x: +b.x, z: +b.z,
      halfX: +b.halfX, halfZ: +b.halfZ,
      bottomY: +b.bottomY, topY: +b.topY
    }));
  }

  g_rocksLeft = g_smallBlocks.length;
  rebuildRockBuckets();

  g_waterShots = [];
  g_isShooting = false;
  g_lastShotTime = 0;

  g_camera.updateView();
}

function saveGame() {
  try {
    if (!g_camera) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(getGameState()));
    showToast("Saved");
  } catch (e) {
    console.warn("[SAVE] failed", e);
    showToast("Save failed");
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { showToast("No save found"); return false; }
    applyGameState(JSON.parse(raw));
    showToast("Loaded From previous save");
    return true;
  } catch (e) {
    console.warn("[LOAD] failed", e);
    showToast("Load failed");
    return false;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    showToast("Cleared save");
  } catch (e) {
    console.warn("[CLEAR] failed", e);
    showToast("Clear failed");
  }
}

// Shaders
const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

varying vec2 v_UV;
varying float v_Depth;

void main() {
  vec4 viewPos = u_ViewMatrix * u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * viewPos;
  v_UV = a_UV;
  v_Depth = -viewPos.z;
}
`;

const FSHADER_SOURCE = `
precision mediump float;

uniform vec4 u_FragColor;
uniform sampler2D u_Sampler;
uniform int u_UseTexture;
uniform vec2 u_UVScale;

uniform vec3 u_FogColor;
uniform float u_FogNear;
uniform float u_FogFar;
uniform int u_UseFog;

varying vec2 v_UV;
varying float v_Depth;

void main() {
  vec4 base;
  if (u_UseTexture == 1) {
    base = texture2D(u_Sampler, v_UV * u_UVScale);
  } else {
    base = u_FragColor;
  }

  vec3 finalColor = base.rgb;

  if (u_UseFog == 1) {
    float fogT = clamp(
      (v_Depth - u_FogNear) / (u_FogFar - u_FogNear),
      0.0,
      1.0
    );
    finalColor = mix(base.rgb, u_FogColor, fogT);
  }

  gl_FragColor = vec4(finalColor, base.a);
}
`;



// Map helpers
function makeEmptyMap(size) {
  const m = [];
  for (let z = 0; z < size; z++) m.push(new Array(size).fill(0));
  return m;
}

function buildMap32() {
  const m = makeEmptyMap(MAP_SIZE);

  for (let i = 0; i < MAP_SIZE; i++) {
    m[0][i] = 4;
    m[MAP_SIZE - 1][i] = 4;
    m[i][0] = 4;
    m[i][MAP_SIZE - 1] = 4;
  }

  for (let z = 6; z < 26; z++) {
    m[z][10] = 3;
    if (z % 3 === 0) m[z][14] = 2;
  }

  for (let x = 18; x < 28; x++) {
    m[8][x] = 3;
    m[16][x] = 3;
  }
  for (let z = 8; z < 17; z++) {
    m[z][18] = 3;
    m[z][27] = 3;
  }
  m[12][18] = 0;

  return m;
}

function worldToMap(x, z) {
  const half = MAP_SIZE / 2;
  const mx = Math.floor(x / CELL_SIZE + half);
  const mz = Math.floor(z / CELL_SIZE + half);
  return [mx, mz];
}
// ===== Minecraft-style block edit (STABLE) =====

// How far ahead we raycast (in cells) to find the first wall column
const EDIT_RAY_MAX = 4.0;   // try 2.2 or 3.2
const EDIT_RAY_STEP = 0.15; // smaller = more accurate, slightly more work
const EDIT_PLACE_MIN = 2.4; // blocks away (try 2.0–3.0)


function getFrontCellStable(findNonEmpty = false) {
  if (!g_camera || !g_map) return null;

  const f = getForwardXZ();
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];

  // removing can start close, placing should start farther away
  const start = findNonEmpty ? 0.60 : EDIT_PLACE_MIN;

  let last = null;

  for (let t = start; t <= EDIT_RAY_MAX; t += EDIT_RAY_STEP) {
    const px = ex + f.elements[0] * t;
    const pz = ez + f.elements[2] * t;

    const [mx, mz] = worldToMap(px, pz);

    if (mx < 1 || mz < 1 || mx >= MAP_SIZE - 1 || mz >= MAP_SIZE - 1) continue;
    if (last && last.mx === mx && last.mz === mz) continue;

    const cell = { mx, mz };
    last = cell;

    if (!findNonEmpty) {
      return cell;               // placing: first valid cell, but starting farther away
    } else {
      if (g_map[mz][mx] > 0) return cell; // removing: first non-empty
    }
  }

  return findNonEmpty ? null : last;
}

function removeBlockInFront() {
  const c = getFrontCellStable(true); // true => find first non-empty column
  if (!c) return;
  g_map[c.mz][c.mx] = Math.max(0, g_map[c.mz][c.mx] - 1);
}
function addBlockInFront() {
  const c = getFrontCellStable(false); // false => first valid cell in front (uses EDIT_PLACE_MIN)
  if (!c) return;
  g_map[c.mz][c.mx] = Math.min(4, g_map[c.mz][c.mx] + 1);
}


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
function renderCylinder(color, M, segments = null) {
  if (!g_cyl) return;
  if (segments !== null) g_cyl.segments = segments;
  g_cyl.color = color;
  g_cyl.matrix.set(M);
  g_cyl.render();
}

function renderSphere(color, M, sCount = 10, size = 5.7) {
  if (!g_sph) return;
  g_sph.color = color;
  g_sph.sCount = sCount;
  g_sph.size = size;
  g_sph.matrix.set(M);
  g_sph.render();
}

function renderHemisphere(color, M, latBands = 12, lonBands = 30, size = 22.0) {
  if (!g_hemi) return;
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

function isSolidAtWorld(x, z, y) {
  // walls
  {
    const [mx, mz] = worldToMap(x, z);
    if (mx < 0 || mz < 0 || mx >= MAP_SIZE || mz >= MAP_SIZE) return true;

    const h = g_map[mz][mx];
    if (h > 0) {
      const wx = (mx - MAP_SIZE / 2) * CELL_SIZE;
      const wz = (mz - MAP_SIZE / 2) * CELL_SIZE;
      const wallBottom = groundYAtWorld(wx, wz);
      const wallTop = wallBottom + h * 1.0;
      if (y >= wallBottom && y <= wallTop) return true;
    }
  }

  // rocks
  const rocks = getNearbyRocks(x, z);
  for (let i = 0; i < rocks.length; i++) {
    const b = rocks[i];
    if (x >= b.x - b.halfX && x <= b.x + b.halfX &&
        z >= b.z - b.halfZ && z <= b.z + b.halfZ &&
        y >= b.bottomY     && y <= b.topY) {
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

  if (canStandAt(nx, nz, ey)) {
    g_camera.eye.elements[0] = nx;
    g_camera.eye.elements[2] = nz;
    g_camera.at.elements[0] += dx;
    g_camera.at.elements[2] += dz;
    g_camera.updateView();
    return;
  }

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

// Input
function addMouseControls() {
  canvas.addEventListener('mousedown', (ev) => {
    if (ev.ctrlKey) {
      g_isShooting = true;
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
    const dy = ev.clientX - g_lastMouseY;

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

  canvas.addEventListener('wheel', (ev) => ev.preventDefault(), { passive: false });
}

function addKeyboardControls() {
  document.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();

    if (k === 'l') { toggleDialogue(); return; }

    if (ev.code === 'Space' && g_dialogueVisible) {
      ev.preventDefault();
      if (g_dialogueMode === "lore") advanceDialogue();
      else hideDialogue();
      return;
    }

    if (k === 'p') { saveGame(); return; }
    if (k === 'o') { loadGame(); return; }
    if (k === 'c') { clearSave(); return; }

    if (!g_camera) return;

    if (k === 'w') moveForward();
    else if (k === 's') moveBack();
    else if (k === 'a') moveLeft();
    else if (k === 'd') moveRight();
    else if (k === 'q') g_camera.panRight();
    else if (k === 'e') g_camera.panLeft();
    else if (ev.key === 'ArrowUp') moveForward();
    else if (ev.key === 'ArrowDown') moveBack();
    else if (ev.key === 'ArrowLeft') moveLeft();
    else if (ev.key === 'ArrowRight') moveRight();
    else if (k === 'f') removeBlockInFront();
    else if (k === 'r') addBlockInFront();


  });
}
/* ===========================
   asg3.js (PART 2/2)
   Texture init + water shots + main/tick + rendering + world draw
   =========================== */

function cellIsWallAtWorld(x, z) {
  if (!g_map) return false;
  const [mx, mz] = worldToMap(x, z);
  if (mx < 0 || mz < 0 || mx >= MAP_SIZE || mz >= MAP_SIZE) return true;
  return g_map[mz][mx] > 0;
}

function buildSmallBlocks() {
  const half = 0.18;
  const blocks = [];
  const WANT = 10;

  let i = 0, attempts = 0;
  const MAX_ATTEMPTS = 200;

  while (blocks.length < WANT && attempts < MAX_ATTEMPTS) {
    const x = -3 + (i % 6);
    const z = -2 + Math.floor(i / 6);

    if (!cellIsWallAtWorld(x, z)) {
      const bottomY = groundYAtWorld(x, z);
      const topY = bottomY + half * 2.0;
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

// Water shots
function spawnWaterShot() {
  if (!g_camera) return;

  const f = getForwardXZ();
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];

  const sx = ex + f.elements[0] * 0.55;
  const sz = ez + f.elements[2] * 0.55;
  const sy = g_camera.eye.elements[1] - 0.15;

  g_waterShots.push({
    x: sx, y: sy, z: sz,
    vx: f.elements[0] * WATER_SPEED,
    vy: WATER_UP,
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

    s.vy += WATER_GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;

    s.life -= dt;
    if (s.life <= 0) { g_waterShots.splice(i, 1); continue; }

    const ground = groundYAtWorld(s.x, s.z);
    if (s.y <= ground + 0.02) { g_waterShots.splice(i, 1); continue; }

    const near = getNearbyRocks(s.x, s.z);

    let hitBlock = null;
    for (let j = 0; j < near.length; j++) {
      if (pointHitsBlock(s.x, s.y, s.z, near[j])) { hitBlock = near[j]; break; }
    }

    if (hitBlock) {
      const idx = g_smallBlocks.indexOf(hitBlock);
      if (idx !== -1) g_smallBlocks.splice(idx, 1);
      rebuildRockBuckets();

      g_rocksLeft = g_smallBlocks.length;
      g_smileUntil = g_seconds + SMILE_SECS;

      g_waterShots.splice(i, 1);

      if (!g_savedShown && g_rocksLeft === 0) {
        g_savedShown = true;
        g_turtleGone = true;
        showDialogue(
          "Congratulations! You've rescued the turtle! Feel free to stay in this world longer or leave.",
          "win"
        );
      }
    }
  }
}

function drawWaterShots(world) {
  ensureTmpMatrices();
  const M = g_tmpM0;

  for (let i = 0; i < g_waterShots.length; i++) {
    const s = g_waterShots[i];
    M.set(world);
    M.translate(s.x, s.y, s.z);
    M.scale(WATER_SIZE, WATER_SIZE, WATER_SIZE);
    renderTexturedCube(M, g_waterTex, 1.0, 1.0);
  }
}

// ===== Main / Tick =====
function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
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

  if (u_UseTexture) gl.uniform1i(u_UseTexture, 0);
  if (u_UVScale) gl.uniform2f(u_UVScale, 1.0, 1.0);

  gl.clearColor(SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2], 1.0);
  const u_FogColor = gl.getUniformLocation(gl.program, 'u_FogColor');
  const u_FogNear  = gl.getUniformLocation(gl.program, 'u_FogNear');
  const u_FogFar   = gl.getUniformLocation(gl.program, 'u_FogFar');
  u_UseFog   = gl.getUniformLocation(gl.program, 'u_UseFog');


  // Match your sky:
  gl.uniform3f(u_FogColor, SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2]);

  // Tune these:
  gl.uniform1f(u_FogNear, 8.0);
  gl.uniform1f(u_FogFar,  22.0);

  g_perfEl = document.getElementById('perf');
  g_rocksEl = document.getElementById('rocksHUD');

  g_cube = new Cube();
  g_cyl = new Cylinder();
  g_sph = new Sphere();
  g_hemi = new Hemisphere();

  if (typeof TriPrism !== 'undefined') g_tri = new TriPrism();
  else if (typeof TriangularPrism !== 'undefined') g_tri = new TriangularPrism();

  g_map = buildMap32();

  // Terrain
  g_terrain = new Terrain(140, MAP_SIZE * CELL_SIZE + 6);
  // IMPORTANT: Terrain.js should read these OR support heightAt(x,z,freq,amp)
  g_terrain.base = g_terrainBase;
  g_terrain.amp  = g_terrainAmp;
  g_terrain.freq = g_terrainFreq;
  g_terrain.init(gl);

  g_smallBlocks = buildSmallBlocks();
  g_rocksLeft = g_smallBlocks.length;
  ensureTmpMatrices();
  rebuildRockBuckets();

  g_turtleGone = false;
  g_savedShown = false;

  initTexture('mydirt.png', (t) => { g_dirtTex = t; });
  initTexture('sand1.png', (t) => { g_sandTex = t; g_terrainTex = t; });
  initTexture('sky4.png',  (t) => { g_skyTex  = t; });
  initTexture('rock.png',  (t) => { g_rockTex = t; });
  initTexture('water.png', (t) => { g_waterTex = t; });

  g_camera = new Camera();
  g_camera.setPerspective(50, canvas.width / canvas.height, 0.1, 2000);

  // Place camera on terrain
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];
  const ey = playerEyeYAt(ex, ez);

  g_camera.eye.elements[1] = ey;
  g_camera.at.elements[1]  = ey;
  g_camera.updateView();

  addMouseControls();
  addKeyboardControls();
  showWelcome();
  requestAnimationFrame(tick);
}

function tick() {
  const nowMS = performance.now();
  const dtMS = nowMS - g_lastFrameMS;
  g_lastFrameMS = nowMS;
  const dt = dtMS / 1000.0;

  updateWaterShots(dt);

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
  g_pokeMode = (g_seconds < g_smileUntil) ? 1 : 0;

  if (g_pokeStart >= 0) {
    const t = (nowMS / 1000 - g_pokeStart) / 1.2;
    g_pokeT = Math.min(Math.max(t, 0), 1);
    if (t >= 1) { g_pokeStart = -1; g_pokeT = 0; }
  } else {
    g_pokeT = 0;
  }

  if (g_animate) updateAnimationAngles();

  // Gravity / snapping to terrain
  if (g_camera) {
    const x = g_camera.eye.elements[0];
    const z = g_camera.eye.elements[2];

    const targetEyeY = playerEyeYAt(x, z);
    const y = g_camera.eye.elements[1];

    if (y > targetEyeY) {
      const ny = Math.max(targetEyeY, y - GRAVITY_DOWN);
      const dy = ny - y;
      g_camera.eye.elements[1] = ny;
      g_camera.at.elements[1] += dy;
      g_camera.updateView();
    } else if (y < targetEyeY) {
      const ny = Math.min(targetEyeY, y + STEP_MAX);
      const dy = ny - y;
      g_camera.eye.elements[1] = ny;
      g_camera.at.elements[1] += dy;
      g_camera.updateView();
    }
  }

  renderScene();
  requestAnimationFrame(tick);
}

// Animation (kept as-is)
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

// ===== Rendering helpers =====
function renderCube(color, M) {
  if (u_UseTexture) gl.uniform1i(u_UseTexture, 0);
  if (u_UVScale) gl.uniform2f(u_UVScale, 1.0, 1.0);

  g_cube.color = color;
  g_cube.matrix.set(M);
  g_cube.render();
}

function renderTexturedCube(M, texture, uvScaleX = 1.0, uvScaleY = 1.0) {
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

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.uniform1i(u_UseTexture, 0);
  gl.uniform2f(u_UVScale, 1.0, 1.0);
}

// ===== Scene render =====
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projMat.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMat.elements);

  const world = new Matrix4();
  world.rotate(g_globalAngle, 0, 1, 0);

  drawWorld(world);

  if (!g_turtleGone) {
    // Put turtle on terrain near origin
    const ty = groundYAtWorld(0, 0) + 0.20;

    const turtleWorld = new Matrix4(world);
    turtleWorld.translate(0, ty, 0);
    turtleWorld.scale(0.35, 0.35, 0.35);
    turtleWorld.translate(-0.15, -0.05, 0);
    drawTurtle(turtleWorld);
  }
}

// ===== World draw =====
function drawWorld(world) {
  ensureTmpMatrices();
  const S = g_tmpM0;
  const M = g_tmpM1;
  const M2 = g_tmpM2;

  gl.disable(gl.DEPTH_TEST);
  gl.uniform1i(u_UseFog, 0); 

  // Sky
  S.set(world);
  S.translate(g_camera.eye.elements[0], 0, g_camera.eye.elements[2]);
  S.scale(80, 80, 80);
  if (g_skyTex) renderTexturedCube(S, g_skyTex, 1.0, 1.0);
  else renderCube(SKY_COLOR, S);

  gl.enable(gl.DEPTH_TEST);
  gl.uniform1i(u_UseFog, 1);
  // Terrain
  if (g_terrain) {
    g_terrain.render(gl, world, g_terrainTex || g_sandTex);
  } else {
    S.set(world);
    S.translate(0, FLOOR_Y, 0);
    const floorSize = MAP_SIZE * CELL_SIZE + 2;
    S.scale(floorSize, FLOOR_THICK, floorSize);
    renderTexturedCube(S, g_sandTex, 16.0, 16.0);
  }

  const half = MAP_SIZE / 2;
  const ex = g_camera.eye.elements[0];
  const ez = g_camera.eye.elements[2];

  // Walls
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const h = g_map[z][x];
      if (h <= 0) continue;

      const wx = (x - half) * CELL_SIZE;
      const wz = (z - half) * CELL_SIZE;

      const dx = wx - ex;
      const dz = wz - ez;
      const d2 = dx * dx + dz * dz;
      if (d2 > WALL_DRAW_DIST2) continue;

      for (let y = 0; y < h; y++) {
        const groundY = groundYAtWorld(wx, wz);
        const wy = groundY + 0.5 + y * 1.0;

        M.set(world);
        M.translate(wx, wy, wz);
        renderTexturedCube(M, g_dirtTex);

        if (d2 < 36) {
          M2.set(world);
          M2.translate(wx, wy + 0.51, wz);
          M2.scale(1.02, 0.05, 1.02);
          renderCube(WALL_EDGE, M2);
        }
      }
    }
  }

  // Rocks
  for (let i = 0; i < g_smallBlocks.length; i++) {
    const b = g_smallBlocks[i];
    const cy = (b.bottomY + b.topY) * 0.5;

    M.set(world);
    M.translate(b.x, cy, b.z);
    M.scale(b.halfX * 2.0, (b.topY - b.bottomY), b.halfZ * 2.0);
    renderTexturedCube(M, g_rockTex, 1.0, 1.0);
  }

  // Water shots
  drawWaterShots(world);
}

//My previous turtle code

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

  const poking = true;
  
  const t = g_pokeT;
  const ease = (t < 0.5) ? (2 * t * t) : (1 - Math.pow(-2 * t + 2, 2) / 2);
  const tearY = 0.05 - 0.40 * ease;

  faceCube(blush, -0.24, -0.02, faceZ, 0.11, 0.08, 0.04);
  faceCube(blush, 0.24, -0.02, faceZ, 0.11, 0.08, 0.04);

  function drawNostrils() {
    faceCube(nostrilC, -0.05, 0.02, faceZ + 0.01, 0.035, 0.035, 0.02);
    faceCube(nostrilC, 0.05, 0.02, faceZ + 0.01, 0.035, 0.035, 0.02);
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