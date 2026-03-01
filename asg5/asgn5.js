import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

const canvas = document.querySelector("#c");
const overlay = document.querySelector("#overlay");
const startBtn = document.querySelector("#startBtn");
let introActive = true;
let introHasRun = false;

const style = document.createElement("style");
style.textContent = `
  :root { --paper:#c9b28a; --ink:#2b1b10; --blood:#7a0b0b; --boss:#c20c0c; --player:#27d7ff; }

  /* Blink curtain */
  #blinkCurtain{ position:fixed; inset:0; pointer-events:none; z-index:9998; opacity:0; }
  #blinkCurtain .top, #blinkCurtain .bottom{
    position:absolute; left:0; width:100%; height:50%; background:#000;
  }
  #blinkCurtain .top{ top:0; transform:translateY(-100%); }
  #blinkCurtain .bottom{ top:50%; transform:translateY(100%); }
  #blinkCurtain.blinkIn{ opacity:1; }

  @keyframes closeTop{ from{transform:translateY(-100%)} to{transform:translateY(0%)} }
  @keyframes closeBottom{ from{transform:translateY(100%)} to{transform:translateY(0%)} }
  @keyframes openTop{ from{transform:translateY(0%)} to{transform:translateY(-100%)} }
  @keyframes openBottom{ from{transform:translateY(0%)} to{transform:translateY(100%)} }

  /* Story panel */
  #storyPanel{
    position:fixed; inset:0; display:none; z-index:9999;
    align-items:center; justify-content:center;
    background:rgba(0,0,0,0.55); backdrop-filter: blur(2px);
  }
  #storyPaper{
    position:relative;
    width:min(860px, calc(100vw - 40px));
    max-height:min(560px, calc(100vh - 80px));
    overflow:auto;
    padding:28px 28px 24px 28px;
    border-radius:14px;
    color:var(--ink);
    background:
      radial-gradient(1200px 600px at 30% 10%, rgba(255,255,255,0.35), rgba(255,255,255,0.0)),
      linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.05)),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 2px, rgba(255,255,255,0.0) 6px, rgba(255,255,255,0.0) 12px),
      linear-gradient(180deg, #d8c49b, var(--paper));
    box-shadow: 0 18px 60px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(40,20,10,0.25);
    transform: translateZ(0);
    animation: paperFloat 2.8s ease-in-out infinite;
    font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
  }
  @keyframes paperFloat{ 0%,100%{transform:translateY(0px) rotate(-0.15deg)} 50%{transform:translateY(-6px) rotate(0.15deg)} }
  #storyTitle{ font-size:22px; letter-spacing:0.6px; margin:0 0 10px 0; }
  #storyText{ font-size:16px; line-height:1.6; white-space:pre-wrap; }
  .bloodInk{
    color:#1f120a;
    text-shadow: 0 0 1px rgba(0,0,0,0.35),
                 0 0 8px rgba(122,11,11,0.20),
                 0 2px 0 rgba(122,11,11,0.35),
                 0 4px 0 rgba(122,11,11,0.20);
    animation: bloodPulse 2.2s ease-in-out infinite;
  }
  @keyframes bloodPulse{ 0%,100%{filter:drop-shadow(0 0 0 rgba(122,11,11,0))} 50%{filter:drop-shadow(0 6px 8px rgba(122,11,11,0.25))} }
  #storyHint{ margin-top:14px; font-size:13px; opacity:0.75; user-select:none; }
  #storyPaper::after{
    content:""; position:absolute; right:18px; top:18px; width:44px; height:44px;
    background: linear-gradient(135deg, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.00) 55%, rgba(0,0,0,0.12) 56%, rgba(255,255,255,0.25) 100%);
    border-radius:6px; opacity:0.6; pointer-events:none;
  }

  /* X close button (used for boss tutorial freeze prompt) */
  #storyCloseX{
    position:absolute; right:14px; top:12px;
    width:34px; height:34px;
    border-radius:10px;
    border:1px solid rgba(0,0,0,0.25);
    background: rgba(255,255,255,0.70);
    cursor:pointer;
    font-weight:900;
    display:none;
  }
  #storyCloseX:hover{ filter:brightness(1.05); }

  /* HUD: Task bar */
  #taskHud{
    position:fixed; left:18px; top:18px; z-index:9997;
    width:min(380px, calc(100vw - 36px));
    padding:12px 12px 10px 12px;
    border-radius:12px;
    background: rgba(20, 12, 8, 0.52);
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    color: rgba(255,255,255,0.92);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    backdrop-filter: blur(2px);
  }
  #taskHud .title{ font-size:12px; opacity:0.75; letter-spacing:0.6px; text-transform:uppercase; }
  #taskHud .task{ margin-top:6px; font-size:14px; line-height:1.35; white-space:pre-wrap; }
  #taskHud.hidden{ display:none; }

  /* Interaction prompts */
  #pickupPrompt, #talkPrompt{
    position:fixed; left:50%; top:62%;
    transform:translate(-50%,-50%);
    z-index:9997;
    padding:10px 12px;
    border-radius:12px;
    background: rgba(0,0,0,0.55);
    color: rgba(255,255,255,0.95);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    font-size:14px;
    display:none;
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  }

  /* Dialogue bubble */
  #dialogueBox{
    position: fixed;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    z-index: 9999;
    width: min(900px, calc(100vw - 40px));
    padding: 14px 16px 12px 16px;
    border-radius: 12px;
    background: rgba(255,255,255,0.92);
    border: 2px solid rgba(0,0,0,0.65);
    color: #111;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 14px;
    line-height: 1.45;
    letter-spacing: 0.2px;
    display: none;
    box-shadow: 0 14px 50px rgba(0,0,0,0.35);
  }
  #dialogueName{ font-weight: 800; margin-bottom: 6px; opacity: 0.95; }
  #dialogueText{ white-space: pre-wrap; }
  #dialogueHint{ margin-top: 8px; opacity: 0.75; font-size: 12px; user-select: none; }

  /* Hearts row */
  #dialogueHearts{
    position:absolute; right:14px; top:12px;
    font-size: 14px; letter-spacing: 4px; user-select:none;
  }
  .heart{ color:#c00000; text-shadow: 0 1px 0 rgba(0,0,0,0.2); }
  .heart.dead{ color:#000; opacity:0.9; }

  /* Darkening stages */
  #dialogueBox.stage1{
    background: rgba(240,240,240,0.92);
    border-color: rgba(0,0,0,0.75);
    color:#1b0b0b;
  }
  #dialogueBox.stage1 #dialogueText{ color:#3a0a0a; }
  #dialogueBox.stage2{
    background: rgba(30,18,18,0.92);
    border-color: rgba(255,255,255,0.65);
    color:#ffefef;
    box-shadow: 0 18px 70px rgba(0,0,0,0.65);
  }
  #dialogueBox.stage2 #dialogueText{ color:#ff9a9a; }
  #dialogueBox.stage3{
    background: rgba(0,0,0,0.92);
    border-color: rgba(255,255,255,0.55);
    color:#ffd7d7;
    box-shadow: 0 18px 80px rgba(0,0,0,0.8);
  }
  #dialogueBox.stage3 #dialogueText{ color:#ff4d4d; }

  /* Boss HUD */
  #bossHud{
    position:fixed;
    left:50%;
    top:18px;
    transform:translateX(-50%);
    z-index:9997;
    width:min(780px, calc(100vw - 40px));
    display:none;
    gap:10px;
    align-items:center;
    justify-content:space-between;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  }
  .barWrap{
    flex:1;
    background: rgba(0,0,0,0.45);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 12px;
    padding: 8px 10px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.25);
    backdrop-filter: blur(2px);
  }
  .barLabel{
    font-size:12px;
    opacity:0.9;
    margin-bottom:6px;
    letter-spacing:0.5px;
    text-transform:uppercase;
    color: rgba(255,255,255,0.92);
    display:flex;
    justify-content:space-between;
    gap:10px;
  }
  .barTrack{
    height:14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.14);
    overflow:hidden;
  }
  .barFill{
    height:100%;
    width:100%;
    border-radius: 999px;
  }
  #bossFill{ background: linear-gradient(90deg, #ff3a3a, var(--boss)); }
  #playerFill{ background: linear-gradient(90deg, #9ff3ff, var(--player)); }

  /* Held item UI (big cube on left) */
  #heldItem{
    position:fixed;
    left:18px;
    bottom:22px;
    z-index:9997;
    width:160px;
    height:160px;
    border-radius:16px;
    display:none;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 18px 60px rgba(0,0,0,0.35);
    backdrop-filter: blur(2px);
    overflow:hidden;
  }
  #heldItem .tag{
    position:absolute;
    left:10px;
    top:10px;
    font-size:11px;
    color: rgba(255,255,255,0.92);
    padding:6px 8px;
    border-radius: 10px;
    background: rgba(0,0,0,0.45);
    border: 1px solid rgba(255,255,255,0.14);
  }
  #heldItem .cube{
    position:absolute;
    left:50%;
    top:50%;
    width:86px;
    height:86px;
    transform: translate(-50%,-50%) rotate(18deg);
    border-radius:14px;
    background:
      radial-gradient(60px 60px at 30% 25%, rgba(255,255,255,0.65), rgba(255,255,255,0.10)),
      linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0.15)),
      linear-gradient(180deg, rgba(120,255,220,0.95), rgba(40,190,255,0.75));
    box-shadow: 0 12px 40px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.15);
    animation: heldFloat 1.6s ease-in-out infinite;
  }
  @keyframes heldFloat{
    0%,100%{ transform: translate(-50%,-50%) rotate(18deg) translateY(0px); }
    50%{ transform: translate(-50%,-50%) rotate(18deg) translateY(-6px); }
  }

  /* Save/Load hint (bottom-left) */
  #saveHud{
    position:fixed;
    left:18px;
    bottom:195px; /* sits above heldItem */
    z-index:9997;
    padding:10px 12px;
    border-radius:12px;
    background: rgba(20, 12, 8, 0.52);
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    color: rgba(255,255,255,0.92);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    font-size: 13px;
    letter-spacing: 0.2px;
    line-height: 1.35;
    backdrop-filter: blur(2px);
    user-select:none;
    white-space:pre;
  }
  #saveHud b{ color:#ffffff; }
`;
document.head.appendChild(style);

// Build DOM
const blinkCurtain = document.createElement("div");
blinkCurtain.id = "blinkCurtain";
blinkCurtain.innerHTML = `<div class="top"></div><div class="bottom"></div>`;
document.body.appendChild(blinkCurtain);

const storyPanel = document.createElement("div");
storyPanel.id = "storyPanel";
storyPanel.innerHTML = `
  <div id="storyPaper">
    <button id="storyCloseX">✕</button>
    <h2 id="storyTitle">DEBRIEF</h2>
    <div id="storyText" class="bloodInk"></div>
    <div id="storyHint">Press <b>Enter</b> to continue.</div>

    <div style="margin-top:14px; display:flex; gap:10px; justify-content:flex-end;">

  <button id="restartBtn" style="
    display:none;
    padding:10px 12px;
    border-radius:10px;
    border:1px solid rgba(0,0,0,0.35);
    background: rgba(255,255,255,0.75);
    color:#1b0b0b;
    font-weight:700;
    cursor:pointer;
  ">Try out other endings</button>
  </div>
`;
document.body.appendChild(storyPanel);

const taskHud = document.createElement("div");
taskHud.id = "taskHud";
taskHud.innerHTML = `
  <div class="title">Current Task</div>
  <div class="task" id="taskText"></div>
`;
document.body.appendChild(taskHud);

const pickupPrompt = document.createElement("div");
pickupPrompt.id = "pickupPrompt";
pickupPrompt.textContent = "Pick up? (F)";
document.body.appendChild(pickupPrompt);

const talkPrompt = document.createElement("div");
talkPrompt.id = "talkPrompt";
talkPrompt.textContent = "Talk to Paimon? (F)";
document.body.appendChild(talkPrompt);

const dialogueBox = document.createElement("div");
dialogueBox.id = "dialogueBox";
dialogueBox.innerHTML = `
  <div id="dialogueHearts"></div>
  <div id="dialogueName">Paimon</div>
  <div id="dialogueText"></div>
  <div id="dialogueHint"></div>
`;
document.body.appendChild(dialogueBox);

// Boss HUD
const bossHud = document.createElement("div");
bossHud.id = "bossHud";
bossHud.innerHTML = `
  <div class="barWrap">
    <div class="barLabel">
      <span>Boss HP</span>
      <span id="bossHpText">100 / 100</span>
    </div>
    <div class="barTrack"><div class="barFill" id="bossFill"></div></div>
  </div>
  <div style="width:10px;"></div>
  <div class="barWrap">
    <div class="barLabel">
      <span>Your HP</span>
      <span id="playerHpText">100 / 100</span>
    </div>
    <div class="barTrack"><div class="barFill" id="playerFill"></div></div>
  </div>
`;
document.body.appendChild(bossHud);

const heldItem = document.createElement("div");
heldItem.id = "heldItem";
heldItem.innerHTML = `<div class="tag">LIGHT PARTICLE</div><div class="cube"></div>`;
document.body.appendChild(heldItem);

// Save/Load HUD prompt (bottom-left)
const saveHud = document.createElement("div");
saveHud.id = "saveHud";
saveHud.innerHTML = `Save: <b>Ctrl + S</b>\nLoad From Last Save: <b>L</b>`;
document.body.appendChild(saveHud);

const storyTextEl = storyPanel.querySelector("#storyText");
const restartBtn = storyPanel.querySelector("#restartBtn");
const storyCloseX = storyPanel.querySelector("#storyCloseX");
const taskTextEl = taskHud.querySelector("#taskText");
const dialogueTextEl = dialogueBox.querySelector("#dialogueText");
const dialogueHintEl = dialogueBox.querySelector("#dialogueHint");
const heartsEl = dialogueBox.querySelector("#dialogueHearts");

// Boss HUD nodes
const bossFill = bossHud.querySelector("#bossFill");
const bossHpText = bossHud.querySelector("#bossHpText");
const playerFill = bossHud.querySelector("#playerFill");
const playerHpText = bossHud.querySelector("#playerHpText");

// Rules + story
const RULE_LINES = [
  "1. Do not let Paimon realize that you do not belong to this specific world.",
  "2. Do not let Paimon realize that she is not Paimon.",
  "3. Do not make Paimon angry at you in any way.",
  "4. Find the key to escape this world, don't let Paimon know about it.",
  "5. One of these rules is a lie. You might need to find it to survive.",
  "6. Act like everything is normal. You are normal.....Paimon is normal....This world is...",
];

const STORY_TEXT = [
  "ANONYMOUS", "",
  "Hello, you probably don't remember what happened, but I can tell you right now that your heart has stopped...",
  "",
  "The last thing you probably remember is the glow of a screen and a world that felt more real than your own.",
  "",
  "Now you wake to stone, fog, and a sky that refuses to belong to any timeline.",
  "A familiar voice will find you soon. Smile when it speaks.",
  "",
  "Rules:",
  ...RULE_LINES,
  "",
  "If you want to live, you will play along.",
].join("\n");

const CONGRATS_TEXT = [
  "CONGRATULATIONS ✦",
  "",
  "You found the key.",
  "And you didn’t lose yourself to the fog.",
  "",
  "A tiny warmth returns to your chest.",
  "Like a lantern someone left on… just for you.",
  "",
  "“You did really good, traveler…”",
  "“Maybe you can finally go home now.”",
].join("\n");

const AUTHORS_NOTE_TEXT = [
  "AUTHOR'S NOTE",
  "",
  "Thank you for playing my little world.",
  "I have always wanted to make a small fangame of the game that I have been playing for 6 years. This honestly seemed like the perfect time.",
  "", "There is honestly still a lot of polishing for me to do for this game, and I wanted to add more fancy elements in the game like making it similar to Granny or The Evil Nun", 
  "I haven't actually found a clear time to do so unfortunately...",
  "There are other endings to uncover. In total I have made 3 endings for this game: Good, Normal, and Bad. Try getting all of them! ",
  "I've worked extremely hard on this assignment, and I'm pretty sure that I have done everything I was supposed to do...",
  "",
  "Try answering differently next time. ♡",
].join("\n");

const NORMAL_ENDING_TEXT = [
  "NORMAL ENDING",
  "",
  "You have purified the evil spirit and she has vanished.",
  "Will she return to haunt you?",
  "Or will she...?",
].join("\n");

const BOSS_INTRO_TEXT = [
  "BOSS PHASE:",
  "",
  "She isn't Paimon anymore.",
  "She will chase you.",
  "",
  "The Anemo God Venti has blessed you with Anemo powers.",
  "",
  "How to fight back:",
  "• CLICK and HOLD to shoot Anemo at the boss.",
  "• Your shots will arc through the air, try aiming slightly upward.",
  "",
  "Win: Boss HP reaches 0.",
  "Lose: Your HP reaches 0 (each hit is 10 damage).",
].join("\n");

let endingStage = 0; // 0 none, 1 congrats/normal/bad, 2 author note, 3 finished
let gameplayLocked = false;

// HUD state
let hudTaskLine = "";
let hudRulesVisible = false;
let hudTalkObjective = false;

function renderHud() {
  const parts = [];
  if (hudTaskLine) parts.push(hudTaskLine);

  const obj = [];
  if (hudTalkObjective) obj.push("• Have a conversation with Paimon.");
  if (obj.length) {
    parts.push("");
    parts.push("Objectives:");
    parts.push(...obj);
  }

  if (hudRulesVisible) {
    parts.push("");
    parts.push("Rules:");
    parts.push(...RULE_LINES);
  }
  taskTextEl.textContent = parts.join("\n");
}
function setTask(text) {
  hudTaskLine = text;
  renderHud();
}
function showRulesInHud(on) {
  hudRulesVisible = on;
  renderHud();
}
function showTalkObjective(on) {
  hudTalkObjective = on;
  renderHud();
}

// Blink helpers
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function blinkOnce(closeMs, holdMs, openMs) {
  blinkCurtain.classList.add("blinkIn");
  const top = blinkCurtain.querySelector(".top");
  const bottom = blinkCurtain.querySelector(".bottom");

  top.style.animation = `closeTop ${closeMs}ms ease-in forwards`;
  bottom.style.animation = `closeBottom ${closeMs}ms ease-in forwards`;
  await sleep(closeMs + 40);
  await sleep(holdMs);

  top.style.animation = `openTop ${openMs}ms ease-out forwards`;
  bottom.style.animation = `openBottom ${openMs}ms ease-out forwards`;
  await sleep(openMs + 40);

  blinkCurtain.classList.remove("blinkIn");
  top.style.animation = "";
  bottom.style.animation = "";
}
async function playHumanBlinks() {
  await blinkOnce(220, 90, 260);
  await sleep(90);
  await blinkOnce(170, 65, 210);
  await sleep(70);
  await blinkOnce(120, 45, 160);
}

// Typewriter (story)
let typing = false;
async function typeStory(text) {
  if (typing) return;
  typing = true;
  storyTextEl.textContent = "";
  const speed = 16;
  for (let i = 0; i < text.length; i++) {
    storyTextEl.textContent += text[i];
    if (i % 28 === 0) {
      storyTextEl.style.transform = `translate(${(Math.random() - 0.5) * 0.8}px, ${(Math.random() - 0.5) * 0.8}px)`;
    }
    await sleep(speed);
  }
  storyTextEl.style.transform = "translate(0px, 0px)";
  typing = false;
}

function openStoryPanel(
  textToType,
  { showCloseX = false, hintHTML = 'Press <b>Enter</b> to continue.' } = {}
) {
  storyPanel.style.display = "flex";
  storyCloseX.style.display = showCloseX ? "inline-block" : "none";
  restartBtn.style.display = "none";

  const hintEl = storyPanel.querySelector("#storyHint");
  hintEl.innerHTML = hintHTML;

  typeStory(textToType);
}

function closeStoryPanel() {
  storyPanel.style.display = "none";
  storyCloseX.style.display = "none";

  restartBtn.style.display = "none";
}

// =====================================================
// DIALOGUE (Enter to advance) + Choice Conversation (1/2)
// =====================================================
let dialogueActive = false;
let dialogueQueue = [];
let dialogueTyping = false;
let _currentDialogueText = "";

let convoActive = false;
let convoIndex = 0;
let hearts = 3;
const PERSONAL_OS_LINES = [
  "Where... am I?",
  "Who am I again?",
  "This place feels familiar...",
  "Is that... a note?",
  "I should pick that up.",
].join("\n");

let wakeWobbleActive = false;
let wakeWobbleStart = 0;
let wakeWobbleDur = 1100; // ms
let wakeWobbleAmp = 0.055; // radians (~3 degrees)
let wakeRollAmp = 0.025;   // radians

function startWakeWobble(nowMs) {
  wakeWobbleActive = true;
  wakeWobbleStart = nowMs;
}

function applyWakeWobble(nowMs) {
  if (!wakeWobbleActive) return;

  const t = (nowMs - wakeWobbleStart) / wakeWobbleDur;
  if (t >= 1) {
    wakeWobbleActive = false;
    camera.rotation.z = 0; // reset roll
    return;
  }

  // ease out
  const ease = 1 - Math.pow(t, 2);
  const shake = Math.sin(t * Math.PI * 6) * wakeWobbleAmp * ease;
  const roll  = Math.sin(t * Math.PI * 4 + 0.8) * wakeRollAmp * ease;
  camera.rotation.z = roll;

  controls.getObject().position.y += Math.sin(t * Math.PI * 5) * 0.004 * ease;
}
const CONVO = [
  {
    q: "Hehe traveler, remember when we first met each other?",
    a: ["Ohh, yes, you fished me up.  (1)", "Ohhh, yes, I remember, I fished you up.  (2)"],
    correct: 1,
    wrongReply: "Huh...? That doesn't sound right...",
  },
  {
    q: "heyy now can you say what is paimon to you?",
    a: ["Emergency food.  (1)", "Best friend.  (2)"],
    correct: 2,
    wrongReply: "Paimon... is NOT emergency food!!",
  },
  {
    q: "Say traveler, who am I again?",
    a: ["You're Paimon.  (1)", "You're my family that I've gone to so many places with already.  (2)"],
    correct: 2,
    wrongReply: "No... I'm not Paimon.",
  },
];

function updateDialogueStyle() {
  dialogueBox.classList.remove("stage1", "stage2", "stage3");
  const lost = 3 - hearts;
  if (lost === 1) dialogueBox.classList.add("stage1");
  else if (lost === 2) dialogueBox.classList.add("stage2");
  else if (lost >= 3) dialogueBox.classList.add("stage3");

  heartsEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "heart" + (i >= hearts ? " dead" : "");
    s.textContent = "♥";
    heartsEl.appendChild(s);
  }
}
function setDialogueName(name) {
  const el = document.getElementById("dialogueName");
  if (el) el.textContent = name;
}

function openDialogueText(text, hint = "Press Enter to continue.") {
  dialogueActive = true;
  convoActive = false;
  dialogueBox.style.display = "block";
  dialogueTextEl.textContent = "";
  _currentDialogueText = text;
  dialogueHintEl.innerHTML = hint;

  introActive = true;

  const speed = 12;
  dialogueTyping = true;
  (async () => {
    for (let i = 0; i < text.length; i++) {
      if (!dialogueTyping) break;
      dialogueTextEl.textContent += text[i];
      await sleep(speed);
    }
    dialogueTextEl.textContent = _currentDialogueText;
    dialogueTyping = false;
  })();
}

function closeDialogue() {
  dialogueBox.style.display = "none";
  dialogueActive = false;
  dialogueTyping = false;
  introActive = false;
}

function speak(text) {
  dialogueQueue.push(text);
  setDialogueName("Paimon");
  if (!dialogueActive) openDialogueText(dialogueQueue.shift());
}

function openConvoStep() {
  convoActive = true;
  dialogueActive = true;
  dialogueTyping = false;
  dialogueBox.style.display = "block";
  introActive = true;

  updateDialogueStyle();

  const step = CONVO[convoIndex];
  dialogueTextEl.textContent = [step.q, "", step.a[0], step.a[1]].join("\n");
  dialogueHintEl.innerHTML = `Press <b>1</b> or <b>2</b> to answer.`;
}

// =====================================================
// ENDINGS
// =====================================================
let badEndingTriggered = false;


let keySpawned = false;
let keyRoot = null;
let keyCollected = false;
let lookedKey = false;

// Boss ending states (new)
let normalEndingTriggered = false;

function beginGoodEndingFinale() {
  gameplayLocked = true;
  introActive = true;

  endingStage = 1;
  restartBtn.style.display = "none";
  openStoryPanel(CONGRATS_TEXT);

  if (controls.isLocked) controls.unlock();
}

function beginNormalEndingFinale() {
  normalEndingTriggered = true;
  gameplayLocked = true;
  introActive = true;

  endingStage = 1;
  restartBtn.style.display = "none";
  openStoryPanel(NORMAL_ENDING_TEXT);

  if (controls.isLocked) controls.unlock();
}

function beginBadEndingFinale(text = "BAD ENDING\n\nThe air turns cold.\nYour vision blurs… and the world eats your light.") {
  badEndingTriggered = true;
  gameplayLocked = true;
  introActive = true;

  endingStage = 1;
  restartBtn.style.display = "none";
  openStoryPanel(text);

  if (controls.isLocked) controls.unlock();
}
function spawnKeyReplacePaimon() {
  if (keySpawned) return;
  keySpawned = true;

  // remove paimon from scene + stop AI
  if (paimon) {
    scene.remove(paimon);
    paimon = null;
  }
  PAIMON.talkReady = false;
  PAIMON.state = "AT_STATUE";

  const loader = new GLTFLoader();
  const keyUrl = new URL("./assets/models/key.glb", import.meta.url).href;

  loader.load(
    keyUrl,
    (gltf) => {
      const keyObj = gltf.scene;

      // move key to where paimon WAS (statue area)
      // fallback if paimon got removed already
      const spawnPos = PAIMON.targetPos?.clone?.() ?? new THREE.Vector3(0, 2.2, 18);
      keyObj.position.copy(spawnPos);

      // ground sit + lift a bit
      const gY = groundHeightAt(keyObj.position.x, keyObj.position.z);
      keyObj.position.y = gY + 2.2;

      // BIGGER so you can see it easily
      keyObj.scale.setScalar(4.0);

      // rotate a bit so it's visible
      keyObj.rotation.y = Math.PI * 0.25;

      keyObj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      scene.add(keyObj);
      spinMeshes.push({ mesh: keyObj, ry: 1.2, rx: 0.15, bob: true, phase: 0.5 });

      keyRoot = keyObj;
      keyCollected = false;
    },
    undefined,
    (err) => {
      console.warn("key.glb failed to load. Using fallback key mesh.", err);

      const fallbackKey = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.35, 18, 36),
        new THREE.MeshStandardMaterial({ color: 0xffd36b, roughness: 0.35, metalness: 0.6 })
      );

      const spawnPos = PAIMON.targetPos?.clone?.() ?? new THREE.Vector3(0, 2.2, 18);
      fallbackKey.position.copy(spawnPos);
      const gY = groundHeightAt(fallbackKey.position.x, fallbackKey.position.z);
      fallbackKey.position.y = gY + 2.4;

      scene.add(fallbackKey);
      spinMeshes.push({ mesh: fallbackKey, ry: 1.2, rx: 0.15, bob: true, phase: 0.5 });

      keyRoot = fallbackKey;
      keyCollected = false;
    }
  );
}

function playerNearKey(dist = 4.0) {
  if (!keyRoot || keyCollected) return false;
  const p = controls.getObject().position;
  return p.distanceTo(keyRoot.position) < dist;
}

function endConversationSuccess() {
  convoActive = false;
  dialogueActive = true;
  setDialogueName("Paimon");
  openDialogueText(
    "You know...I've known from the start that you're not traveler, and I'm also...not Paimon.\n" +
      "I'm just a creation of the man who wants to kill you.\n" +
      "But you know...the more time I spent with you, the more I felt like you were traveler.\n" +
      "Even though I'm not Paimon, I have inherited all the feelings she holds for traveler, and in the same way, I think I feel the same for you.",
      "Please go on now, here is the key...",
    "Press <b>Enter</b> to continue."
  );

  setTimeout(() => {
    showTalkObjective(false);
    setTask("GOOD ENDING: Take the key (F).");
    spawnKeyReplacePaimon();
  }, 380);
}

// =====================================================
// Story panel Enter behavior + dialogue/convo keys
// =====================================================
window.addEventListener("keydown", (e) => {
  if (e.code === "Enter") {
    if (storyPanel.style.display === "flex") {
    // If this panel is the boss tutorial, Enter should NOT advance endings.
    // (Boss tutorial closes with X only.)
    if (bossActive && bossTutorialShowing) return;

    // Ending flow pages
    if (endingStage === 1) {
      // Page 1 -> Page 2 (Author's Note)
      endingStage = 2;
      openStoryPanel(AUTHORS_NOTE_TEXT);
      return;
    }

    if (endingStage === 2) {
      // Page 2 -> Page 3 (final page with buttons)
      endingStage = 3;

      restartBtn.style.display = "inline-block";

      // Keep the Author's Note text visible; just reveal buttons
      // (No need to re-open panel, but safe if you want consistent typing behavior.)
      return;
    }

    // Non-ending story panels (paper, etc.) or after finishing
    closeStoryPanel();
    introActive = false;
    return;
  }

    if (dialogueBox.style.display === "block" && dialogueActive && !convoActive) {
      if (dialogueTyping) {
        dialogueTyping = false;
        dialogueTextEl.textContent = _currentDialogueText;
        return;
      }
      if (dialogueQueue.length > 0) {
        setDialogueName("Paimon");
        openDialogueText(dialogueQueue.shift());
      } else {
        closeDialogue();
      }
      return;
    }
  }

  // Conversation answers
  if (convoActive && (e.code === "Digit1" || e.code === "Digit2")) {
    const chosen = e.code === "Digit1" ? 1 : 2;
    const step = CONVO[convoIndex];

    if (chosen !== step.correct) {
      hearts = Math.max(0, hearts - 1);
      updateDialogueStyle();

      dialogueTextEl.textContent =
        step.q + "\n\n" + step.a[0] + "\n" + step.a[1] + "\n\n" + ">> " + step.wrongReply;

      if (hearts <= 0) {
        startBossPhaseFromConversation();
        return;
      }
    }

    convoIndex++;
    if (convoIndex >= CONVO.length) endConversationSuccess();
    else openConvoStep();
  }
});

// Close X (boss tutorial)
storyCloseX.addEventListener("click", () => {
  if (storyPanel.style.display !== "flex") return;

  // Only used for boss tutorial freeze prompt:
  if (bossActive && bossTutorialShowing) {
    closeStoryPanel();
    bossTutorialShowing = false;
    introActive = false;
    // keep controls locked (player keeps moving)
    return;
  }
});
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const cubeLoader = new THREE.CubeTextureLoader();
scene.background = cubeLoader.load([
  "./assets/skybox/px.jpg",
  "./assets/skybox/nx.jpg",
  "./assets/skybox/py.jpg",
  "./assets/skybox/ny.jpg",
  "./assets/skybox/pz.jpg",
  "./assets/skybox/nz.jpg",
]);

const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1800);

const controls = new PointerLockControls(camera, document.body);
startBtn.addEventListener("click", () => controls.lock());

function resizeRendererToDisplaySize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const needResize = canvas.width !== w || canvas.height !== h;
  if (needResize) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

// =====================================================
// Movement + collision
// =====================================================
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

function movePlayer(dt) {
  const speed = 7.0;
  const obj = controls.getObject();

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const step = speed * dt;
  if (keys.has("KeyW")) obj.position.addScaledVector(forward, step);
  if (keys.has("KeyS")) obj.position.addScaledVector(forward, -step);
  if (keys.has("KeyA")) obj.position.addScaledVector(right, -step);
  if (keys.has("KeyD")) obj.position.addScaledVector(right, step);
}

// =====================================================
// Gravity + ground height (includes stairs)
// =====================================================
const EYE_HEIGHT = 2.0;
const GRAVITY = 22.0;
let vY = 0;
let onGround = false;

const STAIRS = {
  startZ: 84,
  endZ: 10.0,
  steps: 16,
  stepHeight: 0.33,
  halfWidthX: 13.0,
  zPad: 2.5,
};

function groundHeightAt(x, z) {
  let h = 0;

  const dx = x - 0;
  const dz = z - 0;
  const r = Math.sqrt(dx * dx + dz * dz);
  const PLATFORM_RADIUS = 18.0;
  const PLATFORM_TOP_Y = 2.2;
  if (r <= PLATFORM_RADIUS) h = Math.max(h, PLATFORM_TOP_Y);

  const onStairs =
    z <= (STAIRS.startZ + STAIRS.zPad) &&
    z >= (STAIRS.endZ - 8.0) &&
    Math.abs(x) <= STAIRS.halfWidthX;

  if (onStairs) {
    const t = THREE.MathUtils.clamp((STAIRS.startZ - z) / (STAIRS.startZ - STAIRS.endZ), 0, 1);
    const idx = Math.floor(t * STAIRS.steps);
    h = idx * STAIRS.stepHeight;
  }
  return h;
}

function applyGravityAndGround(dt) {
  const obj = controls.getObject();
  vY -= GRAVITY * dt;
  obj.position.y += vY * dt;

  const groundY = groundHeightAt(obj.position.x, obj.position.z) + EYE_HEIGHT;
  if (obj.position.y <= groundY) {
    obj.position.y = groundY;
    vY = 0;
    onGround = true;
  } else onGround = false;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && controls.isLocked && !introActive && !dialogueActive && !bossTutorialShowing) {
    if (onGround) {
      vY = 8.5;
      onGround = false;
    }
  }
});

const PLAYER_RADIUS = 0.45;
const colliders = [];
const _tmpBox = new THREE.Box3();

function registerCollider(mesh) {
  colliders.push(mesh);
}

function pointInsideAnyColliderXZ(p) {
  const yPad = 0.9;
  for (const m of colliders) {
    m.updateWorldMatrix(true, false);
    _tmpBox.setFromObject(m).expandByScalar(PLAYER_RADIUS);
    if (p.y < _tmpBox.min.y - yPad) continue;
    if (p.y > _tmpBox.max.y + yPad) continue;

    if (p.x >= _tmpBox.min.x && p.x <= _tmpBox.max.x && p.z >= _tmpBox.min.z && p.z <= _tmpBox.max.z) {
      return true;
    }
  }
  return false;
}

function resolveCollisionsAxisSeparated(prevPos) {
  const obj = controls.getObject();
  const p = obj.position;
  if (!pointInsideAnyColliderXZ(p)) return;

  const saveX = p.x;
  p.x = prevPos.x;
  if (!pointInsideAnyColliderXZ(p)) return;

  p.x = saveX;
  const saveZ = p.z;
  p.z = prevPos.z;
  if (!pointInsideAnyColliderXZ(p)) return;

  p.x = prevPos.x;
  p.z = prevPos.z;

  const nudge = new THREE.Vector3(p.x - prevPos.x, 0, p.z - prevPos.z);
  if (nudge.lengthSq() < 1e-10) {
    p.x += (Math.random() - 0.5) * 0.02;
    p.z += (Math.random() - 0.5) * 0.02;
  } else {
    nudge.normalize().multiplyScalar(0.03);
    p.add(nudge);
  }
}

// =====================================================
// Textures
// =====================================================
const texLoader = new THREE.TextureLoader();

const wallTex = texLoader.load("./assets/textures/concrete.jpg");
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(72, 72);
wallTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
wallTex.colorSpace = THREE.SRGBColorSpace;

const brickTex = texLoader.load("./assets/textures/brick.jpg");
brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
brickTex.repeat.set(2, 2);
brickTex.colorSpace = THREE.SRGBColorSpace;

const flowerTex = texLoader.load("./assets/textures/flower.jpg");
flowerTex.wrapS = flowerTex.wrapT = THREE.RepeatWrapping;
flowerTex.repeat.set(1, 1);
flowerTex.colorSpace = THREE.SRGBColorSpace;

// =====================================================
// Lighting
// =====================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.22));
const hemi = new THREE.HemisphereLight(0xbfdcff, 0x2b1b10, 0.30);
scene.add(hemi);

const directional = new THREE.DirectionalLight(0xffffff, 0.55);
directional.position.set(50, 50, 35);
directional.castShadow = true;
directional.shadow.mapSize.set(2048, 2048);
directional.shadow.camera.near = 1;
directional.shadow.camera.far = 620;
directional.shadow.camera.left = -200;
directional.shadow.camera.right = 200;
directional.shadow.camera.top = 200;
directional.shadow.camera.bottom = -200;
scene.add(directional);

const orbitLight = new THREE.PointLight(0xffcc88, 1.15, 680);
orbitLight.castShadow = true;
orbitLight.shadow.mapSize.set(1024, 1024);
scene.add(orbitLight);

const orbitMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 16, 12),
  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 })
);
scene.add(orbitMarker);

const spot = new THREE.SpotLight(0xffffff, 1.2, 680, Math.PI / 7, 0.25, 1);
spot.position.set(0, 38, 10);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
scene.add(spot);
scene.add(spot.target);

const rectFill = new THREE.RectAreaLight(0xffffff, 2.2, 18, 10);
rectFill.position.set(-14, 10, 10);
rectFill.lookAt(0, 9, 0);
scene.add(rectFill);

// Helpers toggle (H)
let helpersVisible = false;
const helpers = [
  new THREE.DirectionalLightHelper(directional, 3),
  new THREE.SpotLightHelper(spot),
  new THREE.PointLightHelper(orbitLight, 1.2),
  new THREE.HemisphereLightHelper(hemi, 5),
];
function setHelpersVisible(on) {
  helpersVisible = on;
  for (const h of helpers) on ? scene.add(h) : scene.remove(h);
}
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyH") setHelpersVisible(!helpersVisible);
});

// =====================================================
// World building helpers + geometry
// =====================================================
const spinMeshes = []; // ONLY decor (non-collider) goes here

function makeBlock(w, h, d, x, y, z, register = true) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.0 })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  if (register) registerCollider(m);
  return m;
}

function makeTower(x, z, height = 26, radius = 4.6) {
  const towerMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.0 });
  const t = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 36), towerMat);
  t.position.set(x, height / 2, z);
  t.castShadow = true;
  t.receiveShadow = true;
  scene.add(t);
  registerCollider(t);

  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    makeBlock(
      1.05, 1.4, 1.05,
      x + Math.cos(ang) * (radius - 0.35),
      height + 0.7,
      z + Math.sin(ang) * (radius - 0.35),
      true
    );
  }
}

function makePlanter(x, z, scale = 1) {
  const g = new THREE.Group();

  const bucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85 * scale, 1.0 * scale, 0.8 * scale, 24),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.0 })
  );
  bucket.position.set(0, 0.4 * scale, 0);
  bucket.castShadow = true;
  bucket.receiveShadow = true;
  g.add(bucket);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72 * scale, 0.72 * scale, 0.12 * scale, 18),
    new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness: 1.0, metalness: 0.0 })
  );
  soil.position.set(0, 0.76 * scale, 0);
  g.add(soil);

  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(0.75 * scale, 18, 14),
    new THREE.MeshStandardMaterial({ map: flowerTex, roughness: 0.9, metalness: 0.0 })
  );
  bush.position.set(0, 1.15 * scale, 0);
  bush.castShadow = true;
  bush.receiveShadow = true;
  g.add(bush);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  scene.add(g);

  registerCollider(bucket);
  return g;
}

function scatterPlantersRing(radius, count) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = radius + (Math.random() - 0.5) * 3.6;
    makePlanter(Math.cos(a) * r, Math.sin(a) * r, 0.85 + Math.random() * 0.75);
  }
}
function scatterPlantersRect(minX, maxX, minZ, maxZ, count) {
  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.lerp(minX, maxX, Math.random());
    const z = THREE.MathUtils.lerp(minZ, maxZ, Math.random());
    makePlanter(x, z, 0.75 + Math.random() * 0.9);
  }
}

function makeArch(x, y, z, width, height, depth, register = true) {
  makeBlock(depth, height, depth, x - width / 2, y + height / 2, z, register);
  makeBlock(depth, height, depth, x + width / 2, y + height / 2, z, register);
  makeBlock(width + depth, depth, depth, x, y + height + depth / 2, z, register);

  const deco = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.86, depth * 0.55, depth * 0.55),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0.0 })
  );
  deco.position.set(x, y + height + depth * 0.65, z);
  deco.castShadow = true;
  deco.receiveShadow = true;
  scene.add(deco);
  if (register) registerCollider(deco);
}

// =====================================================
// Scale + Gate coordinates
// =====================================================
const HALF = 220;
const GATE_Z = HALF;
const GATE_OPENING = 16.0;
camera.position.set(0, EYE_HEIGHT, GATE_Z + 34);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(980, 980),
  new THREE.MeshStandardMaterial({ map: wallTex, roughness: 1.0, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Perimeter walls
function makePerimeterWalls() {
  const wallH = 14;
  const wallT = 3.0;

  makeBlock(HALF * 2, wallH, wallT, 0, wallH / 2, -HALF, true);

  const gap = GATE_OPENING + 10.0;
  const sideLen = HALF - gap / 2;
  makeBlock(sideLen, wallH, wallT, -(gap / 2 + sideLen / 2), wallH / 2, HALF, true);
  makeBlock(sideLen, wallH, wallT, +(gap / 2 + sideLen / 2), wallH / 2, HALF, true);

  makeBlock(wallT, wallH, HALF * 2, -HALF, wallH / 2, 0, true);
  makeBlock(wallT, wallH, HALF * 2, HALF, wallH / 2, 0, true);

  makeBlock(2.8, 12, 220, -70, 6, 40, true);
  makeBlock(2.8, 12, 220, 70, 6, 40, true);

  for (let i = -3; i <= 3; i++) {
    makeArch(-70, 0.0, 40 + i * 30, 9.0, 10.0, 2.0, true);
    makeArch(70, 0.0, 40 + i * 30, 9.0, 10.0, 2.0, true);
  }
}
makePerimeterWalls();

// Grand gate
const gateTorchL = new THREE.PointLight(0xffaa66, 0.95, 140);
gateTorchL.position.set(-9.0, 9.0, GATE_Z - 3.0);
scene.add(gateTorchL);

const gateTorchR = new THREE.PointLight(0xffaa66, 0.95, 140);
gateTorchR.position.set(9.0, 9.0, GATE_Z - 3.0);
scene.add(gateTorchR);

function makeGrandGate() {
  makeBlock(8, 28, 5, -18, 14, GATE_Z, true);
  makeBlock(8, 28, 5, 18, 14, GATE_Z, true);

  makeBlock(9.4, 3.2, 5.8, -18, 28.6, GATE_Z, true);
  makeBlock(9.4, 3.2, 5.8, 18, 28.6, GATE_Z, true);

  makeArch(0, 0.0, GATE_Z, GATE_OPENING, 18.0, 3.6, true);

  makeBlock(3.0, 14, 110, -28, 7, GATE_Z - 60, true);
  makeBlock(3.0, 14, 110, 28, 7, GATE_Z - 60, true);

  makeTower(-40, GATE_Z, 28, 4.8);
  makeTower(40, GATE_Z, 28, 4.8);

  for (let i = -4; i <= 4; i++) makePlanter(i * 4.4, GATE_Z - 16, 1.1);
}
makeGrandGate();

// Temple core
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(18, 18, 2.2, 96),
  new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0.0 })
);
platform.position.set(0, 1.1, 0);
platform.castShadow = true;
platform.receiveShadow = true;
scene.add(platform);
registerCollider(platform);

for (let i = 0; i < 16; i++) {
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.55, 4.0),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.0 })
  );
  step.position.set(0, 0.28 + i * 0.33, 84 - i * 4.6);
  step.castShadow = true;
  step.receiveShadow = true;
  scene.add(step);
  registerCollider(step);
}

for (let i = 0; i < 44; i++) {
  const angle = (i / 44) * Math.PI * 2;
  const radius = 42;
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 10.5, 34),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0.0 })
  );
  pillar.position.set(Math.cos(angle) * radius, 5.25, Math.sin(angle) * radius);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);
  registerCollider(pillar);
}

scatterPlantersRing(34, 30);
scatterPlantersRing(48, 26);
scatterPlantersRing(62, 22);
scatterPlantersRect(-85, 85, GATE_Z - 170, GATE_Z - 20, 80);

// Interior decor
function addInteriorDecor() {
  const matA = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85, metalness: 0.0 });
  const matB = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.0 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0x88ffcc,
    emissive: 0x44ffbb,
    emissiveIntensity: 1.2,
    roughness: 0.25,
    metalness: 0.0,
  });

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 70;
    makeArch(Math.cos(a) * r, 0, Math.sin(a) * r, 10.5, 12.0, 2.6, true);
  }

  makeBlock(70, 12, 3.0, 0, 6, -78, true);
  makeBlock(3.0, 12, 70, -35, 6, -44, true);
  makeBlock(3.0, 12, 70, 35, 6, -44, true);
  makeArch(0, 0, -78, 18, 10.0, 2.6, true);

  for (let i = -3; i <= 3; i++) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 1.3, 40), matA);
    base.position.set(i * 10, 0.65, -28);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);
    registerCollider(base);

    const top = new THREE.Mesh(new THREE.SphereGeometry(1.0, 18, 14), matB);
    top.position.set(i * 10, 2.2, -28);
    top.castShadow = true;
    top.receiveShadow = true;
    scene.add(top);
    spinMeshes.push({ mesh: top, ry: 0.9, rx: 0.2 });
  }

  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), glow);
    c.position.set(-24 + i * 8, 8 + (i % 2) * 1.5, -10 - (i % 3) * 6);
    c.castShadow = true;
    c.receiveShadow = true;
    scene.add(c);
    spinMeshes.push({
      mesh: c,
      ry: 1.4 + Math.random(),
      rx: 0.5 + Math.random() * 0.4,
      bob: true,
      phase: Math.random() * Math.PI * 2,
    });
  }
}
addInteriorDecor();
//statue
function buildVentiStatueDetailed() {
  const g = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.82, metalness: 0.0 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x88ffcc,
    emissive: 0x44ffbb,
    emissiveIntensity: 1.25,
    roughness: 0.35,
    metalness: 0.0,
  });

  const baseA = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.5, 1.5, 80), stoneMat);
  baseA.position.set(0, 0.75, 0);
  g.add(baseA);

  const baseB = new THREE.Mesh(new THREE.CylinderGeometry(8.7, 9.3, 1.1, 72), stoneMat);
  baseB.position.set(0, 1.85, 0);
  g.add(baseB);

  const baseC = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.0, 0.95, 64), stoneMat);
  baseC.position.set(0, 2.8, 0);
  g.add(baseC);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.3, 0.18, 18, 96), glowMat);
  ring.position.set(0, 3.35, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  spinMeshes.push({ mesh: ring, ry: 0.7, rx: 0.0 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.8, 6.2, 44), stoneMat);
  torso.position.set(0, 7.3, 0);
  g.add(torso);

  const robeOuter = new THREE.Mesh(new THREE.ConeGeometry(5.2, 10.2, 64), stoneMat);
  robeOuter.position.set(0, 6.1, 0);
  g.add(robeOuter);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.24, 18, 70), stoneMat);
  belt.position.set(0, 8.3, 0);
  belt.rotation.x = Math.PI / 2;
  g.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.6, 40, 30), stoneMat);
  head.position.set(0, 11.0, 0);
  g.add(head);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 26, 18), glowMat);
  orb.position.set(0, 13.6, 0);
  g.add(orb);
  spinMeshes.push({ mesh: orb, ry: 1.2, rx: 0.4, bob: true, phase: 1.2 });

  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.18, 16, 86), glowMat);
  halo.position.set(0, 13.9, 0);
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  spinMeshes.push({ mesh: halo, ry: 0.9, rx: 0.0 });

  g.position.set(0, 1.8, 0);
  scene.add(g);

  registerCollider(baseA);
  registerCollider(baseB);
  registerCollider(baseC);
  registerCollider(robeOuter);
  registerCollider(torso);

  return g;
}

const guardianStatue = buildVentiStatueDetailed();
spot.target.position.set(0, 10, 0);

let ventiModel = null;

function placeVentiOnStatue(root) {
  guardianStatue.updateWorldMatrix(true, true);
  const statueBox = new THREE.Box3().setFromObject(guardianStatue);
  const statueTopY = statueBox.max.y;

  const statueCenter = new THREE.Vector3();
  statueBox.getCenter(statueCenter);

  root.updateWorldMatrix(true, true);
  const ventiBox = new THREE.Box3().setFromObject(root);
  const ventiSize = new THREE.Vector3();
  ventiBox.getSize(ventiSize);

  const TARGET_VENTI_HEIGHT = 7.2;
  const scale = ventiSize.y > 0 ? TARGET_VENTI_HEIGHT / ventiSize.y : 1.0;
  root.scale.setScalar(scale);

  root.updateWorldMatrix(true, true);
  const ventiBox2 = new THREE.Box3().setFromObject(root);

  const bottomY = ventiBox2.min.y;
  const Y_OFFSET = 0.06;
  const desiredY = statueTopY + Y_OFFSET;
  const deltaY = desiredY - bottomY;

  root.position.set(statueCenter.x, 0, statueCenter.z);
  root.position.y += deltaY;
  root.rotation.y = 0;
}

const ventiLoader = new GLTFLoader();
ventiLoader.load(
  "./assets/models/venti.glb",
  (gltf) => {
    ventiModel = gltf.scene;
    ventiModel.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    placeVentiOnStatue(ventiModel);
    scene.add(ventiModel);
    spinMeshes.push({ mesh: ventiModel, ry: 0.15, rx: 0.0 });
  },
  undefined,
  (err) => console.warn("venti.glb failed to load.", err)
);

// =====================================================
// Clouds
// =====================================================
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);
const clouds = [];
const cloudMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.15,
});

function addCloudRing(y, radius, count, size) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.SphereGeometry(size * (0.85 + Math.random() * 0.5), 18, 14), cloudMat);
    const r = radius + (Math.random() - 0.5) * 10;

    const basePos = new THREE.Vector3(Math.cos(ang) * r, y + (Math.random() - 0.5) * 3, Math.sin(ang) * r);
    s.position.copy(basePos);

    const puff = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 16, 12), cloudMat);
    puff.position.set(size * 0.55, size * 0.18, 0);
    s.add(puff);

    s.userData.base = basePos.clone();
    s.userData.spin = {
      x: (Math.random() * 1.2 + 0.6) * (Math.random() < 0.5 ? -1 : 1),
      y: (Math.random() * 1.6 + 0.8) * (Math.random() < 0.5 ? -1 : 1),
      z: (Math.random() * 0.8 + 0.3) * (Math.random() < 0.5 ? -1 : 1),
    };
    s.userData.wobble = {
      amp: 0.8 + Math.random() * 0.9,
      spd: 0.6 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    };

    cloudGroup.add(s);
    clouds.push(s);
  }
}
addCloudRing(150, 180, 18, 5.0);
addCloudRing(178, 220, 14, 6.2);

// =====================================================
// PICKUP SYSTEM (paper)
// =====================================================
const pickables = [];
const raycaster = new THREE.Raycaster();
const _rayDir = new THREE.Vector3();
let lookedPickable = null;

function setPickupPrompt(on) {
  pickupPrompt.style.display = on ? "block" : "none";
}
function setTalkPrompt(on) {
  talkPrompt.style.display = on ? "block" : "none";
}

function sitOnGround(obj, groundY = 0.06) {
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y += groundY - box.min.y;
}

function placeInFrontOfPlayer(obj, forwardDist = 2.2, groundY = 0.06) {
  const player = controls.getObject();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const spawnPos = player.position.clone().add(forward.multiplyScalar(forwardDist));
  obj.position.copy(spawnPos);
  sitOnGround(obj, groundY);
}

const itemLoader = new GLTFLoader();
itemLoader.load(
  "./assets/models/paper.glb",
  (gltf) => {
    const paperObj = gltf.scene;

    const box = new THREE.Box3().setFromObject(paperObj);
    const size = new THREE.Vector3();
    box.getSize(size);

    const TARGET_MAX_DIM = 0.9;
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? TARGET_MAX_DIM / maxDim : 1;
    paperObj.scale.setScalar(s);

    paperObj.updateWorldMatrix(true, true);
    const box2 = new THREE.Box3().setFromObject(paperObj);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    paperObj.position.sub(center2);

    paperObj.rotation.x = -Math.PI / 2;
    paperObj.rotation.z = (Math.random() - 0.5) * 0.35;

    placeInFrontOfPlayer(paperObj, 2.2, 0.06);

    paperObj.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    scene.add(paperObj);

    pickables.push({ root: paperObj, content: STORY_TEXT, collected: false });
  },
  undefined,
  (err) => console.warn("paper.glb failed to load.", err)
);

// =====================================================
// PAIMON
// =====================================================
function yawFaceTarget(obj, targetPos) {
  const dir = targetPos.clone().sub(obj.position);
  dir.y = 0;
  if (dir.lengthSq() < 1e-6) return;
  obj.rotation.x = 0;
  obj.rotation.z = 0;
  obj.rotation.y = Math.atan2(dir.x, dir.z);
}

let paimon = null;
let darkPaimon = null;

const PAIMON = {
  state: "GATE_WAIT",
  baseY: 2.2,
  targetPos: new THREE.Vector3(0, 2.2, 18), // default key spawn fallback
  speed: 4.3,
  arrivalEps: 0.15,

  introStepDist: 70.0,
  triggerStartDialogue: 6.0,
  triggerNearPaimon: 3.6,

  gateSpoken: false,
  statueSpoken: false,
  _introTargetSet: false,

  talkReady: false,
  hoverHeight: 2.2,
};

function setPaimonTarget(v3) {
  PAIMON.targetPos.copy(v3);
}

function updatePaimon(dt, tMs) {
  if (!paimon) return;

  const moving = PAIMON.state === "INTRO_MOVING" || PAIMON.state === "TO_STATUE";
  const bobSpeed = moving ? 0.0065 : 0.0025;
  const bobAmp = moving ? 0.25 : 0.35;

  const gY = groundHeightAt(paimon.position.x, paimon.position.z);
  PAIMON.baseY = gY + PAIMON.hoverHeight;
  paimon.position.y = PAIMON.baseY + Math.sin(tMs * bobSpeed) * bobAmp;

  const playerPos = controls.getObject().position;

  if (PAIMON.state === "AT_STATUE") {
    yawFaceTarget(paimon, playerPos);
    return;
  }

  if (PAIMON.state === "GATE_WAIT") {
    yawFaceTarget(paimon, playerPos);

    if (controls.isLocked) {
      const d = playerPos.distanceTo(paimon.position);
      if (d < PAIMON.triggerStartDialogue && !PAIMON.gateSpoken && !dialogueActive && storyPanel.style.display !== "flex") {
        PAIMON.gateSpoken = true;
        speak(
          "Hiyo Traveler! ...Paimon is glad you're awake.\n" +
            "Didn't we agree to go visit the Venti Statue today? Why did you fall asleep? Gosh you sleepy head.\n" +
            "This is the temple of the Anemo God, Venti! Legends say that he will bless everyone that has the power of anemo within themselves. I wonder what that means..."
        );
        PAIMON.state = "INTRO_MOVING";
        PAIMON._introTargetSet = false;
        setTask("Follow Paimon through the gate.");
      }
    }
    return;
  }

  if (PAIMON.state === "WAIT_FOR_PLAYER") {
    yawFaceTarget(paimon, playerPos);

    if (controls.isLocked) {
      const d = playerPos.distanceTo(paimon.position);
      if (d < PAIMON.triggerNearPaimon) {
        const statuePos = guardianStatue.position.clone();
        const toPlayer = playerPos.clone().sub(statuePos);
        toPlayer.y = 0;
        if (toPlayer.lengthSq() < 1e-6) toPlayer.set(0, 0, 1);
        toPlayer.normalize();

        const stopPoint = statuePos.clone().add(toPlayer.multiplyScalar(10.0));
        stopPoint.y = PAIMON.baseY;

        setPaimonTarget(stopPoint);
        PAIMON.state = "TO_STATUE";
      }
    }
    return;
  }

  if (PAIMON.state === "INTRO_MOVING") {
    if (!PAIMON._introTargetSet) {
      PAIMON._introTargetSet = true;
      const tgt = paimon.position.clone();
      tgt.z -= PAIMON.introStepDist;
      tgt.y = PAIMON.baseY;
      setPaimonTarget(tgt);
    }

    const dir = PAIMON.targetPos.clone().sub(paimon.position);
    dir.y = 0;

    if (dir.length() <= PAIMON.arrivalEps) {
      PAIMON.state = "WAIT_FOR_PLAYER";
      PAIMON._introTargetSet = false;
      setTask("Get closer to Paimon.");
      return;
    }

    yawFaceTarget(paimon, PAIMON.targetPos);
    dir.normalize();
    paimon.position.addScaledVector(dir, PAIMON.speed * dt);
    return;
  }

  if (PAIMON.state === "TO_STATUE") {
    const dir = PAIMON.targetPos.clone().sub(paimon.position);
    dir.y = 0;

    if (dir.length() <= PAIMON.arrivalEps) {
      PAIMON.state = "AT_STATUE";
      if (!PAIMON.statueSpoken) {
        PAIMON.statueSpoken = true;
        speak("Look! That's the Venti Statue! Omg, it seems so much more grand up close :D");
        showTalkObjective(true);
        setTask("Next: Have a conversation with Paimon.");
        PAIMON.talkReady = true;
      }
      return;
    }

    yawFaceTarget(paimon, PAIMON.targetPos);
    dir.normalize();
    paimon.position.addScaledVector(dir, PAIMON.speed * dt);
    return;
  }
}

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  "./assets/models/model.glb",
  (gltf) => {
    paimon = gltf.scene;
    paimon.position.set(0, 2.2, GATE_Z - 2);
    paimon.scale.set(2, 2, 2);
    paimon.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    scene.add(paimon);

    PAIMON.baseY = paimon.position.y;
    PAIMON.state = "GATE_WAIT";
    yawFaceTarget(paimon, controls.getObject().position);
  },
  undefined,
  (err) => console.warn("model.glb failed to load.", err)
);

function swapToDarkPaimon(onLoaded) {
  const loader = new GLTFLoader();
  loader.load(
    "./assets/models/dark_paimon.glb",
    (gltf) => {
      darkPaimon = gltf.scene;

      if (paimon) {
        darkPaimon.position.copy(paimon.position);
        darkPaimon.rotation.copy(paimon.rotation);
        darkPaimon.scale.copy(paimon.scale);
      } else {
        darkPaimon.position.set(0, 2.2, 20);
        darkPaimon.scale.set(2, 2, 2);
      }

      darkPaimon.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      if (paimon) scene.remove(paimon);
      paimon = darkPaimon;
      scene.add(paimon);

      PAIMON.state = "AT_STATUE";
      PAIMON.talkReady = false;

      if (typeof onLoaded === "function") onLoaded();
    },
    undefined,
    (err) => {
      console.warn("dark_paimon.glb failed to load.", err);
      if (typeof onLoaded === "function") onLoaded();
    }
  );
}

// Talk interaction
function playerNearPaimon(dist) {
  if (!paimon) return false;
  const p = controls.getObject().position;
  return p.distanceTo(paimon.position) < dist;
}

function beginConversation() {
  if (badEndingTriggered) return;
  if (convoActive) return;

  convoIndex = 0;
  hearts = 3;
  updateDialogueStyle();
  openConvoStep();
}

// =====================================================
// BOSS FIGHT SYSTEM
// =====================================================
let bossActive = false;
let bossTutorialShowing = false;

const BOSS = {
  maxHP: 120,
  hp: 120,
  speed: 3.0,
  hitDamage: 10,
  hitRange: 2.25,
  hitCooldown: 0.85,
  lastHitT: 0,
  frozen: false,
  vanishT: 0,
};

const PLAYER = {
  maxHP: 100,
  hp: 100,
};

function setBossHudVisible(on) {
  bossHud.style.display = on ? "flex" : "none";
}
function updateBossHud() {
  const bPct = THREE.MathUtils.clamp(BOSS.hp / BOSS.maxHP, 0, 1);
  bossFill.style.width = `${(bPct * 100).toFixed(1)}%`;
  bossHpText.textContent = `${Math.max(0, Math.floor(BOSS.hp))} / ${BOSS.maxHP}`;

  const pPct = THREE.MathUtils.clamp(PLAYER.hp / PLAYER.maxHP, 0, 1);
  playerFill.style.width = `${(pPct * 100).toFixed(1)}%`;
  playerHpText.textContent = `${Math.max(0, Math.floor(PLAYER.hp))} / ${PLAYER.maxHP}`;
}

function setHeldItem(on) {
  heldItem.style.display = on ? "block" : "none";
}

// Light particles (floating cubes)
const lightParticles = []; // { mesh, respawnPos, taken }
let heldParticle = false;
let lookedParticle = null;

function spawnLightParticleAt(pos) {
  const g = new THREE.BoxGeometry(1.25, 1.25, 1.25);
  const m = new THREE.MeshStandardMaterial({
    color: 0x86fff0,
    emissive: 0x38ffd2,
    emissiveIntensity: 1.2,
    roughness: 0.25,
    metalness: 0.0,
    transparent: true,
    opacity: 0.95,
  });
  const cube = new THREE.Mesh(g, m);
  cube.position.copy(pos);
  cube.castShadow = true;
  cube.receiveShadow = false;

  scene.add(cube);
  // spin + bob as decor
  spinMeshes.push({ mesh: cube, ry: 1.5, rx: 0.7, bob: true, phase: Math.random() * Math.PI * 2 });

  const entry = { mesh: cube, respawnPos: pos.clone(), taken: false };
  lightParticles.push(entry);
  return entry;
}

// Put them at back of temple
function createLightParticleField() {
  // “back” = negative Z in your scene (temple interior is around z -78, so go deeper)
  const baseZ = -140;
  const baseY = 10.5;
  const spanX = 54;
  const rows = 2;
  const cols = 6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -spanX / 2 + (c / (cols - 1)) * spanX + (Math.random() - 0.5) * 2.2;
      const z = baseZ - r * 12 + (Math.random() - 0.5) * 2.2;
      const y = baseY + (Math.random() - 0.5) * 1.2;
      spawnLightParticleAt(new THREE.Vector3(x, y, z));
    }
  }
}
createLightParticleField();

function playerNearLightParticle(entry, dist = 4.8) {
  if (!entry || entry.taken || !entry.mesh) return false;

  const p = controls.getObject().position;
  const m = entry.mesh.position;

  // XZ-only distance so height doesn't block pickups
  const dx = p.x - m.x;
  const dz = p.z - m.z;
  return (dx * dx + dz * dz) < (dist * dist);
}

function takeLightParticle(entry) {
  if (!entry || entry.taken) return;
  entry.taken = true;

  if (entry.mesh) {
    scene.remove(entry.mesh);
    entry.mesh = null;
  }

  heldParticle = true;
  setHeldItem(true);

  // respawn after a short delay
  setTimeout(() => {
    // recreate mesh
    const newEntry = spawnLightParticleAt(entry.respawnPos.clone());
    // copy state back into the same entry object
    entry.mesh = newEntry.mesh;
    entry.taken = false;
  }, 1100);
}

// Projectiles thrown by player
const projectiles = []; // { mesh, vel, life }

const _tmpV3 = new THREE.Vector3();
const _tmpV3b = new THREE.Vector3();

// =====================================================
// ANEMO SHOOTING (click + hold) — parabolic green shots
// =====================================================
let anemoShooting = false;

const ANEMO = {
  fireCooldown: 0.10,   // seconds between shots while holding
  lastShotT: 0,         // ms
  speed: 18.5,
  upBoost: 5.0,         // makes it arc upward first
  gravity: 14.0,        // projectile gravity (separate from player)
  spread: 0.012,        // slight inaccuracy
  life: 2.2,
  damage: 6,
  hitRadius: 2.1,
};

function shootAnemoShot(nowMs) {
  if (!controls.isLocked) return;
  if (introActive || dialogueActive || storyPanel.style.display === "flex" || bossTutorialShowing) return;
  if (!bossActive) return;
  if (!paimon || BOSS.frozen) return;

  // cooldown
  if ((nowMs - ANEMO.lastShotT) < ANEMO.fireCooldown * 1000) return;
  ANEMO.lastShotT = nowMs;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.normalize();

  // small random spread
  forward.x += (Math.random() - 0.5) * ANEMO.spread;
  forward.y += (Math.random() - 0.5) * ANEMO.spread;
  forward.z += (Math.random() - 0.5) * ANEMO.spread;
  forward.normalize();

  const start = camera.position.clone().addScaledVector(forward, 1.2);

  // green "anemo-like" projectile
  const proj = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x66ff99,
      emissive: 0x22ff77,
      emissiveIntensity: 1.6,
      roughness: 0.15,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
    })
  );
  proj.position.copy(start);
  proj.castShadow = true;
  scene.add(proj);

  const vel = forward.multiplyScalar(ANEMO.speed);
  vel.y += ANEMO.upBoost; // parabolic arc starter

  projectiles.push({ mesh: proj, vel: vel.clone(), life: ANEMO.life });
}

// Hold-to-shoot
window.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // left click only
  anemoShooting = true;
});
window.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  anemoShooting = false;
});
window.addEventListener("blur", () => {
  anemoShooting = false;
});

function damageBoss(amount) {
  if (!bossActive || BOSS.frozen) return;
  BOSS.hp = Math.max(0, BOSS.hp - amount);
  updateBossHud();

  if (BOSS.hp <= 0) {
    defeatBoss();
  }
}

function damagePlayer(amount) {
  if (!bossActive || BOSS.frozen) return;
  PLAYER.hp = Math.max(0, PLAYER.hp - amount);
  updateBossHud();

  if (PLAYER.hp <= 0) {
    endBossFight(false);
  }
}

function showBossTutorialPrompt() {
  bossTutorialShowing = true;
  introActive = true;
  openStoryPanel(BOSS_INTRO_TEXT, { showCloseX: true, hintHTML: "Close with <b>✕</b> to begin the fight." });
}

function startBossPhaseFromConversation() {
  // Shut down convo UI instantly
  convoActive = false;
  dialogueActive = false;
  dialogueBox.style.display = "none";
  dialogueQueue = [];
  dialogueTyping = false;

  // Transform paimon -> dark paimon, then start fight
  swapToDarkPaimon(() => {
    startBossFight();
  });
}

function startBossFight() {
  if (bossActive) return;
  bossActive = true;
  BOSS.frozen = false;
  normalEndingTriggered = false;
  badEndingTriggered = false;

  // initialize HP
  BOSS.hp = BOSS.maxHP;
  PLAYER.hp = PLAYER.maxHP;
  updateBossHud();
  setBossHudVisible(true);

  setTask("BOSS PHASE: Click and hold to shoot Anemo at the boss.");

  showTalkObjective(false);
  PAIMON.talkReady = false;

  bossTutorialShowing = true;
  showBossTutorialPrompt();
}

function endBossFight(victory) {
  bossActive = false;
  BOSS.frozen = true;
  setBossHudVisible(false);
  heldParticle = false;
  setHeldItem(false);

  // Remove any projectiles
  for (const p of projectiles) {
    if (p.mesh) scene.remove(p.mesh);
  }
  projectiles.length = 0;

  if (!victory) {
    setTask("BAD ENDING.");
    beginBadEndingFinale("BAD ENDING\n\nShe caught you.\nYour light goes out.");
    return;
  }

  setTask("NORMAL ENDING.");
  beginNormalEndingFinale();
}

function defeatBoss() {
  if (!bossActive) return;
  BOSS.frozen = true;

  // Boss scream prompt
  speak("AHHH, GAHHH");

  // Freeze boss in place, then vanish
  setTimeout(() => {
    if (paimon) {
      scene.remove(paimon);
      paimon = null;
    }
    endBossFight(true);
  }, 900);
}

// Boss chasing + hitting player
function updateBossAI(dt, t) {
  if (!bossActive) return;
  if (!paimon) return;
  if (BOSS.frozen) return;
  if (introActive || dialogueActive || storyPanel.style.display === "flex" || bossTutorialShowing) return;

  // Chase player
  const playerPos = controls.getObject().position;
  const bossPos = paimon.position;

  _tmpV3.copy(playerPos).sub(bossPos);
  _tmpV3.y = 0;
  const dist = _tmpV3.length();

  // face player
  yawFaceTarget(paimon, playerPos);

  // move
  if (dist > 0.05) {
    _tmpV3.normalize();
    paimon.position.addScaledVector(_tmpV3, BOSS.speed * dt);
  }

  // attack if close enough (cooldown)
  if (dist < BOSS.hitRange) {
    if (t - BOSS.lastHitT > BOSS.hitCooldown * 1000) {
      BOSS.lastHitT = t;
      damagePlayer(BOSS.hitDamage);
    }
  }
}
function updateProjectiles(dt) {
  if (projectiles.length === 0) return;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.mesh) {
      projectiles.splice(i, 1);
      continue;
    }

    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // parabolic motion
    p.vel.y -= ANEMO.gravity * dt;
    p.mesh.position.addScaledVector(p.vel, dt);

    // collide with boss
    if (bossActive && paimon && !BOSS.frozen) {
      const d = p.mesh.position.distanceTo(paimon.position);
      if (d < ANEMO.hitRadius) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        damageBoss(ANEMO.damage);
        continue;
      }
    }
  }
}

function softResetToBeginning() {
  badEndingTriggered = false;
  normalEndingTriggered = false;
  gameplayLocked = false;
  endingStage = 0;

  // boss reset
  bossActive = false;
  bossTutorialShowing = false;
  BOSS.frozen = false;
  BOSS.hp = BOSS.maxHP;
  PLAYER.hp = PLAYER.maxHP;
  setBossHudVisible(false);
  updateBossHud();

  restartBtn.style.display = "none";
  closeStoryPanel();
  closeDialogue();
  setPickupPrompt(false);
  setTalkPrompt(false);

  showRulesInHud(false);
  showTalkObjective(false);
  setTask("Find the instructions to this world.");

  convoActive = false;
  convoIndex = 0;
  hearts = 3;
  updateDialogueStyle();

  // remove key if exists
  if (keyRoot) scene.remove(keyRoot);
  keyRoot = null;
  keySpawned = false;
  keyCollected = false;
  lookedKey = false;

  // clear held + projectiles
  heldParticle = false;
  setHeldItem(false);
  for (const pr of projectiles) {
    if (pr.mesh) scene.remove(pr.mesh);
  }
  projectiles.length = 0;

  // move player back
  const obj = controls.getObject();
  obj.position.set(0, EYE_HEIGHT, GATE_Z + 34);
  vY = 0;
  onGround = true;

  // remove paimon (any version) + respawn normal paimon
  if (paimon) scene.remove(paimon);
  paimon = null;

  PAIMON.state = "GATE_WAIT";
  PAIMON.gateSpoken = false;
  PAIMON.statueSpoken = false;
  PAIMON._introTargetSet = false;
  PAIMON.talkReady = false;

  gltfLoader.load(
    "./assets/models/model.glb",
    (gltf) => {
      paimon = gltf.scene;
      paimon.position.set(0, 2.2, GATE_Z - 2);
      paimon.scale.set(2, 2, 2);
      paimon.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(paimon);
      PAIMON.baseY = paimon.position.y;
      yawFaceTarget(paimon, controls.getObject().position);
    },
    undefined,
    (err) => console.warn("Model reload failed.", err)
  );

  overlay.style.display = "grid";
  introHasRun = false;
  introActive = true;
}
restartBtn.addEventListener("click", () => softResetToBeginning());


// =====================================================
// Keydown interactions (F) + boss particle pickup
// =====================================================
window.addEventListener("keydown", (e) => {
  // Key pickup (F) — ONLY if key is present
  if (e.code === "KeyF" && lookedKey && controls.isLocked && !introActive && !dialogueActive && !bossTutorialShowing) {
    keyCollected = true;
    lookedKey = false;
    setPickupPrompt(false);

    if (keyRoot) {
      scene.remove(keyRoot);
      keyRoot = null;
    }
    beginGoodEndingFinale();
    return;
  }


  // Paper pickup (F)
  if (e.code === "KeyF" && lookedPickable && controls.isLocked && !introActive && !dialogueActive && !bossTutorialShowing) {
    lookedPickable.collected = true;
    if (lookedPickable.root) scene.remove(lookedPickable.root);
    setPickupPrompt(false);

    introActive = true;
    openStoryPanel(lookedPickable.content);

    showRulesInHud(true);
    setTask("Next: Find Paimon at the gate and follow her inside.");
    return;
  }

  // Talk to Paimon (F)
  if (
    e.code === "KeyF" &&
    controls.isLocked &&
    !introActive &&
    !dialogueActive &&
    !bossTutorialShowing &&
    PAIMON.talkReady &&
    playerNearPaimon(4.0)
  ) {
    setTalkPrompt(false);
    beginConversation();
    return;
  }
});

// Controls lock/unlock
controls.addEventListener("lock", async () => {
  overlay.style.display = "none";

  if (!introHasRun) {
    introHasRun = true;
    introActive = true;

    showRulesInHud(false);
    showTalkObjective(false);
    setTask("Find the instructions to this world.");

    await playHumanBlinks();
    await sleep(180);

    // little dizzy head wobble / shake
    startWakeWobble(performance.now());
    await sleep(220);
    setDialogueName("...");
    // Personal OS: guide them to the note
    openDialogueText(PERSONAL_OS_LINES, "Press <b>Enter</b> to continue.");
    setTask("Find the note and pick it up (F).");

    // When they close the OS dialogue, normal movement resumes (your closeDialogue sets introActive=false)
  }
});
controls.addEventListener("unlock", () => {
  overlay.style.display = "grid";
});

// =====================================================
// Pickup raycast (paper) + key proximity + light particle proximity
// =====================================================
function updatePickupRaycast() {
  lookedPickable = null;
  lookedKey = false;
  lookedParticle = null;

  if (!controls.isLocked || introActive || dialogueActive || storyPanel.style.display === "flex" || bossTutorialShowing) {
    setPickupPrompt(false);
    return;
  }

  // KEY prompt (white prompt)
  if (keyRoot && !keyCollected && playerNearKey(5.0)) {
    lookedKey = true;
    pickupPrompt.textContent = "Take the key? (F)";
    pickupPrompt.style.background = "rgba(255,255,255,0.85)";
    pickupPrompt.style.color = "#111";
    setPickupPrompt(true);
    return;
  } else {
    pickupPrompt.style.background = "rgba(0,0,0,0.55)";
    pickupPrompt.style.color = "rgba(255,255,255,0.95)";
  }

 

  // Paper raycast pickup
  camera.getWorldDirection(_rayDir);
  raycaster.set(camera.position, _rayDir);

  const testMeshes = [];
  for (const p of pickables) {
    if (p.collected) continue;
    if (!p.root) continue;
    p.root.traverse((obj) => {
      if (obj.isMesh) testMeshes.push(obj);
    });
  }

  const hits = raycaster.intersectObjects(testMeshes, true);
  if (hits.length > 0) {
    const hitObj = hits[0].object;
    for (const p of pickables) {
      if (p.collected || !p.root) continue;
      let found = false;
      p.root.traverse((obj) => {
        if (obj === hitObj) found = true;
      });
      if (found) {
        lookedPickable = p;
        break;
      }
    }
  }

  pickupPrompt.textContent = lookedPickable ? "Pick up? (F)" : "";
  setPickupPrompt(!!lookedPickable);
}

// =====================================================
// BOSS PROMPT CLOSE LOGIC (after X, unfreeze)
// =====================================================
function updateBossPromptFreezeState() {
  if (!bossActive) return;
  if (!bossTutorialShowing) return;

  if (storyPanel.style.display !== "flex") {
    bossTutorialShowing = false;
    introActive = false;
  }
}

const SAVE_KEY = "teyvat_save_v2"; // bump version so old bad saves don't confuse things



function hasSave() {
  try {
    const v = localStorage.getItem(SAVE_KEY);
    if (!v) return false;
    JSON.parse(v); // validate
    return true;
  } catch {
    return false;
  }
}

function toast(msg) {
  // lightweight toast using pickupPrompt styling
  pickupPrompt.textContent = msg;
  pickupPrompt.style.display = "block";
  pickupPrompt.style.background = "rgba(0,0,0,0.70)";
  pickupPrompt.style.color = "rgba(255,255,255,0.95)";
  setTimeout(() => {
    if (!lookedPickable && !lookedKey && !lookedParticle) pickupPrompt.style.display = "none";
  }, 900);
}

function vecToArr(v) {
  return [v.x, v.y, v.z];
}
function arrToVec(a, fallback = new THREE.Vector3()) {
  if (!a || a.length !== 3) return fallback.clone();
  return new THREE.Vector3(a[0], a[1], a[2]);
}

function getPaperState() {
  const p = pickables[0];
  if (!p) return { exists: false, collected: true };
  if (p.collected || !p.root) return { exists: true, collected: true };
  return {
    exists: true,
    collected: false,
    pos: vecToArr(p.root.position),
    rot: [p.root.rotation.x, p.root.rotation.y, p.root.rotation.z],
    scl: vecToArr(p.root.scale),
  };
}

function applyPaperState(state) {
  const p = pickables[0];
  if (!p) return;

  // remove current if any
  if (p.root) scene.remove(p.root);

  p.collected = !!state?.collected;

  if (p.collected) {
    p.root = null;
    return;
  }

  // Reload paper model if needed
  const loader = new GLTFLoader();
  loader.load(
    "./assets/models/paper.glb",
    (gltf) => {
      const paperObj = gltf.scene;

      // original scaling logic
      const box = new THREE.Box3().setFromObject(paperObj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const TARGET_MAX_DIM = 0.9;
      const maxDim = Math.max(size.x, size.y, size.z);
      const s = maxDim > 0 ? TARGET_MAX_DIM / maxDim : 1;
      paperObj.scale.setScalar(s);

      paperObj.updateWorldMatrix(true, true);
      const box2 = new THREE.Box3().setFromObject(paperObj);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);
      paperObj.position.sub(center2);

      paperObj.rotation.x = -Math.PI / 2;
      paperObj.rotation.z = (Math.random() - 0.5) * 0.35;

      if (state?.pos) paperObj.position.copy(arrToVec(state.pos));
      else placeInFrontOfPlayer(paperObj, 2.2, 0.06);

      if (state?.rot) paperObj.rotation.set(state.rot[0], state.rot[1], state.rot[2]);
      if (state?.scl) paperObj.scale.set(state.scl[0], state.scl[1], state.scl[2]);

      paperObj.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });

      scene.add(paperObj);
      p.root = paperObj;
    },
    undefined,
    (err) => console.warn("paper.glb reload failed during load.", err)
  );
}

function getKeyState() {
  return {
    spawned: !!keySpawned,
    collected: !!keyCollected,
    exists: !!keyRoot && !keyCollected,
    pos: keyRoot ? vecToArr(keyRoot.position) : null,
    rotY: keyRoot ? keyRoot.rotation.y : 0,
    scale: keyRoot ? keyRoot.scale.x : 4.0,
  };
}

function clearKeyNow() {
  if (keyRoot) scene.remove(keyRoot);
  keyRoot = null;
  keySpawned = false;
  keyCollected = false;
  lookedKey = false;
}

function applyKeyState(state) {
  clearKeyNow();
  if (!state) return;

  keySpawned = !!state.spawned;
  keyCollected = !!state.collected;
  if (keyCollected) return;

  if (state.spawned) {
    spawnKeyReplacePaimon();
    setTimeout(() => {
      if (!keyRoot) return;
      if (state.pos) keyRoot.position.copy(arrToVec(state.pos));
      keyRoot.rotation.y = state.rotY ?? keyRoot.rotation.y;
      const sc = state.scale ?? 4.0;
      keyRoot.scale.setScalar(sc);
    }, 350);
  }
}

function getPaimonModelType() {
  if (bossActive) return "dark";
  if (!paimon) return "none";
  return normalEndingTriggered || badEndingTriggered ? "none" : "normal";
}

function loadPaimonOfType(type, onReady) {
  if (paimon) scene.remove(paimon);
  paimon = null;
  darkPaimon = null;

  if (type === "none") {
    if (typeof onReady === "function") onReady();
    return;
  }

  if (type === "dark") {
    swapToDarkPaimon(() => {
      if (typeof onReady === "function") onReady();
    });
    return;
  }

  gltfLoader.load(
    "./assets/models/model.glb",
    (gltf) => {
      paimon = gltf.scene;
      paimon.scale.set(2, 2, 2);
      paimon.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      scene.add(paimon);
      if (typeof onReady === "function") onReady();
    },
    undefined,
    (err) => {
      console.warn("model.glb load failed during load.", err);
      if (typeof onReady === "function") onReady();
    }
  );
}

function saveGame() {
  const obj = controls.getObject();

  const data = {
    v: 2,
    t: Date.now(),

    // player
    playerPos: vecToArr(obj.position),
    vY,
    onGround,

    // high-level states
    introHasRun,
    introActive,
    gameplayLocked,

    // HUD
    hudTaskLine,
    hudRulesVisible,
    hudTalkObjective,

    // story/dialogue
    endingStage,
    badEndingTriggered,
    normalEndingTriggered,

    // convo
    convoActive,
    convoIndex,
    hearts,

    // paimon
    paimonType: getPaimonModelType(),
    paimonPos: paimon ? vecToArr(paimon.position) : null,
    paimonRotY: paimon ? paimon.rotation.y : 0,
    PAIMON_STATE: {
      state: PAIMON.state,
      baseY: PAIMON.baseY,
      targetPos: vecToArr(PAIMON.targetPos),
      gateSpoken: PAIMON.gateSpoken,
      statueSpoken: PAIMON.statueSpoken,
      _introTargetSet: PAIMON._introTargetSet,
      talkReady: PAIMON.talkReady,
    },

    // items
    paper: getPaperState(),
    key: getKeyState(),

    // boss
    bossActive,
    bossTutorialShowing,
    BOSS: {
      hp: BOSS.hp,
      maxHP: BOSS.maxHP,
      lastHitT: BOSS.lastHitT,
      frozen: BOSS.frozen,
    },
    PLAYER: {
      hp: PLAYER.hp,
      maxHP: PLAYER.maxHP,
    },

    // held
    heldParticle,
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast("Saved (S)");
  } catch (e) {
    console.warn("Save failed:", e);
    toast("Save failed (storage blocked?)");
  }
}

function loadGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    toast("No save found");
    return;
  }

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.warn("Bad save JSON:", e);
    toast("Save corrupted");
    return;
  }

  // Close any UI that would block restore
  closeStoryPanel();
  closeDialogue();
  dialogueQueue = [];
  dialogueTyping = false;

  // Reset prompts
  setPickupPrompt(false);
  setTalkPrompt(false);
  bossTutorialShowing = false;

  // restore basics
  introHasRun = !!data.introHasRun;
  introActive = false; // give control immediately after load
  gameplayLocked = !!data.gameplayLocked;

  hudTaskLine = data.hudTaskLine ?? "";
  hudRulesVisible = !!data.hudRulesVisible;
  hudTalkObjective = !!data.hudTalkObjective;
  renderHud();

  endingStage = data.endingStage ?? 0;
  badEndingTriggered = !!data.badEndingTriggered;
  normalEndingTriggered = !!data.normalEndingTriggered;

  convoActive = !!data.convoActive;
  convoIndex = data.convoIndex ?? 0;
  hearts = data.hearts ?? 3;
  updateDialogueStyle();

  // boss restore
  bossActive = !!data.bossActive;
  BOSS.hp = data?.BOSS?.hp ?? BOSS.maxHP;
  BOSS.lastHitT = data?.BOSS?.lastHitT ?? 0;
  BOSS.frozen = !!data?.BOSS?.frozen;
  PLAYER.hp = data?.PLAYER?.hp ?? PLAYER.maxHP;
  updateBossHud();
  setBossHudVisible(bossActive);

  heldParticle = !!data.heldParticle;
  setHeldItem(heldParticle);

  // restore player position
  const obj = controls.getObject();
  obj.position.copy(arrToVec(data.playerPos, new THREE.Vector3(0, EYE_HEIGHT, GATE_Z + 34)));
  vY = data.vY ?? 0;
  onGround = !!data.onGround;

  // restore items
  applyPaperState(data.paper);
  applyKeyState(data.key);

  // restore paimon + PAIMON state (async)
  const savedPType = data.paimonType ?? "normal";
  loadPaimonOfType(savedPType, () => {
    const st = data.PAIMON_STATE || {};
    PAIMON.state = st.state ?? "GATE_WAIT";
    PAIMON.baseY = st.baseY ?? 2.2;
    PAIMON.targetPos.copy(arrToVec(st.targetPos, new THREE.Vector3(0, 2.2, 18)));
    PAIMON.gateSpoken = !!st.gateSpoken;
    PAIMON.statueSpoken = !!st.statueSpoken;
    PAIMON._introTargetSet = !!st._introTargetSet;
    PAIMON.talkReady = !!st.talkReady;

    if (paimon && data.paimonPos) {
      paimon.position.copy(arrToVec(data.paimonPos));
      paimon.rotation.y = data.paimonRotY ?? paimon.rotation.y;
      yawFaceTarget(paimon, controls.getObject().position);
    }

    // if key spawned, paimon should not be present
    if (data?.key?.spawned && !data?.key?.collected) {
      if (paimon) {
        scene.remove(paimon);
        paimon = null;
      }
      PAIMON.talkReady = false;
      PAIMON.state = "AT_STATUE";
    }
  });

  toast("Loaded ✓ (L)");
}

// Hotkeys:
//  - Ctrl+S (or Cmd+S on Mac) = Save
//  - L = Load
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  // Don't steal keys if user is typing somewhere
  const tag = document.activeElement?.tagName?.toLowerCase?.() || "";
  if (tag === "input" || tag === "textarea") return;

  // SAVE: Ctrl+S / Cmd+S
  if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
    e.preventDefault(); // prevent browser Save Page dialog
    saveGame();
    return;
  }

  // LOAD: L
  if (e.code === "KeyL") {
    if (!controls.isLocked) {
      toast("Click Start first");
      return;
    }
    loadGame();
    return;
  }
});

// =====================================================
// Animation loop
// =====================================================
let lastT = performance.now();
function tick(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  resizeRendererToDisplaySize();
  
  // allow closing boss freeze prompt
  updateBossPromptFreezeState();
  applyWakeWobble(t);


  if (controls.isLocked) {
    const obj = controls.getObject();
    const prev = obj.position.clone();

    // Movement locked on ending / story / dialogue / boss tutorial
    if (!introActive && !dialogueActive && storyPanel.style.display !== "flex" && !gameplayLocked && !bossTutorialShowing) {
      movePlayer(dt);
      resolveCollisionsAxisSeparated(prev);
    }

    const prevAfterMove = obj.position.clone();
    applyGravityAndGround(dt);
    resolveCollisionsAxisSeparated(prevAfterMove);
  }

  // orbiting light
  const center = new THREE.Vector3(0, 26, 0);
  const radius = 190;
  const heightBob = 10;
  const ang = t * 0.00018;

  orbitLight.position.set(
    center.x + Math.cos(ang) * radius,
    center.y + Math.sin(t * 0.0006) * heightBob,
    center.z + Math.sin(ang) * radius
  );
  orbitMarker.position.copy(orbitLight.position);

  directional.position.set(orbitLight.position.x * 0.32, 50, orbitLight.position.z * 0.32);
  if (helpersVisible) helpers[1].update();

  // clouds
  for (const c of clouds) {
    const sp = c.userData.spin;
    c.rotation.x += dt * sp.x;
    c.rotation.y += dt * sp.y;
    c.rotation.z += dt * sp.z;

    const w = c.userData.wobble;
    c.position.y = c.userData.base.y + Math.sin(t * 0.001 * w.spd + w.phase) * w.amp;
  }

  // spinning decor
  for (const s of spinMeshes) {
    if (!s.mesh) continue;
    s.mesh.rotation.y += dt * (s.ry ?? 0);
    s.mesh.rotation.x += dt * (s.rx ?? 0);
    if (s.bob) s.mesh.position.y += Math.sin(t * 0.002 + (s.phase ?? 0)) * 0.003;
  }

  // Paimon AI (only when NOT boss)
  if (!bossActive) updatePaimon(dt, t);

  // Boss AI
  updateBossAI(dt, t);
    // click + hold to shoot anemo during boss fight
  if (anemoShooting) shootAnemoShot(t);
  // projectiles
  updateProjectiles(dt);

  // pickup + key prompt + particle prompt
  updatePickupRaycast();

  // Talk prompt only when ready
  const canShowTalk =
    controls.isLocked &&
    !introActive &&
    !dialogueActive &&
    !bossTutorialShowing &&
    storyPanel.style.display !== "flex" &&
    !bossActive &&
    PAIMON.talkReady &&
    playerNearPaimon(4.0);

  setTalkPrompt(!!canShowTalk);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);