import { EditorState } from "https://esm.sh/@codemirror/state@6";
import { EditorView, keymap } from "https://esm.sh/@codemirror/view@6";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6";

/* ── Package metadata ────────────────────────────────── */

const PACKAGES = {
  rpg:           { global: "AdRPG",     version: "0.2.3", css: [] },
  puzzle:        { global: "AdPuzzle",  version: "0.2.5", css: ["puzzle-base.css","puzzle-grid.css","puzzle-modals.css","puzzle-responsive.css"] },
  cards:         { global: "AdCards",   version: "0.7.4", css: ["cards.css","chip-animation.css"] },
  audio:         { global: "AdAudio",   version: "0.2.4", css: [] },
  "score-client":{ global: "AdScore",   version: "0.2.5", css: [] },
  multiplayer:   { global: "AdMP",      version: "0.4.4", css: ["lobby.css"] },
  chat:          { global: "AdChat",    version: "0.4.3", css: ["chat-widget.css"] },
};

const EXAMPLES = {
  rpg:          ["rpg-basic","rpg-camera","rpg-npcs","rpg-enemies","rpg-inventory","rpg-health","rpg-transitions","rpg-events"],
  puzzle:       ["puzzle-15","puzzle-2048"],
  cards:        ["cards-deal","cards-poker"],
  audio:        ["audio-tone"],
  "score-client":["score-basic"],
  multiplayer:  ["mp-template"],
  chat:         ["chat-widget"],
};

/* ── DOM refs ────────────────────────────────────────── */

const pkgSelect    = document.getElementById("pkg-select");
const exampleSelect= document.getElementById("example-select");
const runBtn       = document.getElementById("run");
const resetBtn     = document.getElementById("reset");
const editorPanel  = document.getElementById("editor-panel");
const outputContent= document.getElementById("output-content");
const consoleLog   = document.getElementById("console-log");
const statusPkg    = document.getElementById("status-pkg");
const statusVer    = document.getElementById("status-version");
const statusGlobals= document.getElementById("status-globals");
const statusReady  = document.getElementById("status-ready");

/* ── State ───────────────────────────────────────────── */

let state = { package: "rpg", example: "rpg-basic", mode: "cdn" };
let originalCode = "";
let loadedScript = null;
let loadedCssLinks = [];

/* ── CodeMirror ──────────────────────────────────────── */

const editor = new EditorView({
  state: EditorState.create({
    doc: "// Select an example and click Run\n",
    extensions: [
      keymap.of([{ key: "Ctrl-Enter", run: () => { run(); return true; } },
                 { key: "Cmd-Enter",  run: () => { run(); return true; } }]),
      javascript(),
      oneDark,
      EditorView.lineWrapping,
    ],
  }),
  parent: editorPanel,
});

/* ── Example loader ──────────────────────────────────── */

async function loadExample(pkg, name) {
  state.package = pkg;
  state.example = name;
  try {
    const res = await fetch(`examples/${name}.js`);
    const code = await res.text();
    originalCode = code;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });
  } catch (e) {
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: `// Failed to load example: ${e.message}` } });
  }
  loadBundle(pkg);
  loadCSS(pkg);
  updateStatus();
}

/* ── Bundle loading ──────────────────────────────────── */

function bundleURL(pkg) {
  const meta = PACKAGES[pkg];
  if (state.mode === "local") return `../packages/${pkg}/dist/index.global.js`;
  return `https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-${pkg}@${meta.version}/dist/index.global.js`;
}

function loadBundle(pkg) {
  if (loadedScript) { loadedScript.remove(); loadedScript = null; }
  statusReady.innerHTML = '<span class="dot loading"></span>loading…';
  const script = document.createElement("script");
  script.src = bundleURL(pkg);
  script.onload  = () => setStatusDot(true);
  script.onerror = () => setStatusDot(false);
  document.body.appendChild(script);
  loadedScript = script;
}

/* ── CSS loading ─────────────────────────────────────── */

function cssURL(pkg, file) {
  if (state.mode === "local") return `../packages/${pkg}/${file}`;
  return `https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-${pkg}@${PACKAGES[pkg].version}/${file}`;
}

function loadCSS(pkg) {
  clearCSS();
  const files = PACKAGES[pkg].css;
  for (const file of files) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssURL(pkg, file);
    document.head.appendChild(link);
    loadedCssLinks.push(link);
  }
}

function clearCSS() {
  for (const link of loadedCssLinks) link.remove();
  loadedCssLinks = [];
}

/* ── Console capture ─────────────────────────────────── */

const origConsole = { log: console.log, warn: console.warn, error: console.error };

function setupConsole() {
  console.log   = (...args) => { appendConsole("log",   args); origConsole.log(...args); };
  console.warn  = (...args) => { appendConsole("warn",  args); origConsole.warn(...args); };
  console.error = (...args) => { appendConsole("error", args); origConsole.error(...args); };
}

function restoreConsole() {
  console.log   = origConsole.log;
  console.warn  = origConsole.warn;
  console.error = origConsole.error;
}

function appendConsole(type, args) {
  const line = document.createElement("div");
  line.className = `console-line ${type}`;
  line.textContent = args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

/* ── Run ─────────────────────────────────────────────── */

function run() {
  outputContent.innerHTML = "";
  consoleLog.innerHTML = "";

  const meta = PACKAGES[state.package];
  if (typeof window[meta.global] === "undefined") {
    outputContent.innerHTML = `<div class="empty-state" style="color:#ff6b6b;flex-direction:column;gap:.5rem;">
      <span>Bundle not loaded — <code>${meta.global}</code> is undefined</span>
      <span style="font-size:12px;color:#9d99b5;">Check network, wait for load, or try CDN mode</span>
    </div>`;
    return;
  }

  // Insert canvas for RPG package
  if (state.package === "rpg") {
    const canvas = document.createElement("canvas");
    canvas.id = "c";
    canvas.width = 640;
    canvas.height = 480;
    outputContent.appendChild(canvas);
  }

  setupConsole();
  try {
    const code = editor.state.doc.toString();
    const fn = new Function(code);
    fn();
  } catch (e) {
    appendConsole("error", [e.message]);
  }
  restoreConsole();
}

/* ── Reset ───────────────────────────────────────────── */

function reset() {
  editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: originalCode } });
}

/* ── UI wiring ───────────────────────────────────────── */

function populateExamples(pkg) {
  exampleSelect.innerHTML = "";
  for (const name of (EXAMPLES[pkg] || [])) {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    exampleSelect.appendChild(opt);
  }
}

function updateStatus() {
  const meta = PACKAGES[state.package];
  statusPkg.textContent     = `pkg: ${state.package}`;
  statusVer.textContent     = `v: ${meta.version}`;
  statusGlobals.textContent = `globals: ${meta.global}`;
}

function setStatusDot(ok) {
  statusReady.innerHTML = ok
    ? '<span class="dot ok"></span>ready'
    : '<span class="dot err"></span>load error';
}

pkgSelect.addEventListener("change", () => {
  const pkg = pkgSelect.value;
  populateExamples(pkg);
  loadExample(pkg, exampleSelect.value);
});

exampleSelect.addEventListener("change", () => {
  loadExample(state.package, exampleSelect.value);
});

runBtn.addEventListener("click", run);
resetBtn.addEventListener("click", reset);

// No source toggle on the site: there is no packages/ sibling to load from, so
// the markup is not shipped here and this matches nothing. Kept so this file
// stays a small diff away from the standalone copy in the adenosine repo.
document.querySelectorAll('input[name="source"]').forEach(r => {
  r.addEventListener("change", (e) => {
    state.mode = e.target.value;
    loadBundle(state.package);
    loadCSS(state.package);
  });
});

/* ── Split pane drag ─────────────────────────────────── */

{
  const divider = document.getElementById("divider");
  let dragging = false;

  divider.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = document.querySelector("main").getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(20, Math.min(80, pct));
    editorPanel.style.flex = `0 0 ${clamped}%`;
    document.getElementById("output-panel").style.flex = `0 0 ${100 - clamped}%`;
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}

/* ── Init ────────────────────────────────────────────── */

populateExamples("rpg");
loadExample("rpg", "rpg-basic");
