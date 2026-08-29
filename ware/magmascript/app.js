// ============================================================
// MagmaScript Playground — Browser-based code editor & runner
// ============================================================
// Uses Pyodide (Python WASM) to run .mgs code in the browser.
// Loads magmascript/lang/ source directly into Pyodide's FS,
// stubs out domain modules, and provides a CodeMirror 6 editor.

import { createMgsRuntime } from "../shared/mgs-runtime.js";

(async () => {
  // ----------------------------------------------------------
  // Constants
  // ----------------------------------------------------------

  const EXAMPLES = [
    "hello",
    "fibonacci",
    "lists",
    "dictionaries",
    "strings",
    "classes",
    "control-flow",
    "slicing",
    "error-handling",
    "multi-assignment",
    "builtins",
    "advanced-functions",
    "brand-commands",
    "asthenosphere",
  ];


  // ----------------------------------------------------------
  // DOM references
  // ----------------------------------------------------------

  const editorPanel = document.getElementById("editor-panel");
  const divider = document.getElementById("divider");
  const outputContent = document.getElementById("output-content");
  const consoleLog = document.getElementById("console-log");
  const loadingBar = document.getElementById("loading-bar");
  const statusInterp = document.getElementById("status-interp");
  const statusExample = document.getElementById("status-example");
  const statusReady = document.getElementById("status-ready");
  const exampleSelect = document.getElementById("example-select");
  const runBtn = document.getElementById("run");
  const resetBtn = document.getElementById("reset");
  const aboutBtn = document.getElementById("about-btn");
  const aboutModal = document.getElementById("about-modal");

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------

  let runtime = null;
  let editorView = null;
  let originalCode = "";

  // ----------------------------------------------------------
  // Logging helpers
  // ----------------------------------------------------------

  function logInit(msg) {
    const el = document.createElement("div");
    el.className = "console-line log";
    el.textContent = msg;
    consoleLog.appendChild(el);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function logError(msg) {
    const el = document.createElement("div");
    el.className = "console-line error";
    el.textContent = msg;
    consoleLog.appendChild(el);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function setStatus(html) {
    statusReady.innerHTML = html;
  }

  function setLoading(visible) {
    loadingBar.classList.toggle("hidden", !visible);
  }

  // ----------------------------------------------------------
  // CodeMirror 6 setup (independent of Pyodide)
  // ----------------------------------------------------------

  async function initEditor() {
    logInit("Loading CodeMirror...");

    // Import each module individually for better error reporting
    const stateMod = await import("https://esm.sh/@codemirror/state@6");
    const viewMod = await import("https://esm.sh/@codemirror/view@6");
    const jsMod = await import("https://esm.sh/@codemirror/lang-javascript@6");
    const themeMod = await import("https://esm.sh/@codemirror/theme-one-dark@6");

    const EditorState = stateMod.EditorState;
    const EditorView = viewMod.EditorView;
    const keymap = viewMod.keymap;
    const javascript = jsMod.javascript;
    const oneDark = themeMod.oneDark;

    if (!EditorState || !EditorView || !keymap || !javascript || !oneDark) {
      throw new Error(
        `CodeMirror import failed: EditorState=${!!EditorState}, EditorView=${!!EditorView}, keymap=${!!keymap}, javascript=${!!javascript}, oneDark=${!!oneDark}`
      );
    }

    const runKeymap = keymap.of([
      {
        key: "Ctrl-Enter",
        run: () => {
          runCode();
          return true;
        },
      },
      {
        key: "Cmd-Enter",
        run: () => {
          runCode();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: "// Write MagmaScript code here\nprint('Hello, MagmaScript!')\n",
      extensions: [
        javascript(),
        oneDark,
        runKeymap,
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    });

    editorView = new EditorView({
      state,
      parent: editorPanel,
    });

    logInit("CodeMirror ready");
  }

  // ----------------------------------------------------------
  // Interpreter (shared with ware/crunch-c)
  // ----------------------------------------------------------

  async function initPyodide() {
    setStatus('<span class="dot loading"></span>loading');
    runtime = await createMgsRuntime(logInit);
    setLoading(false);
    statusInterp.innerHTML = '<span class="dot ok"></span>Pyodide';
    setStatus('<span class="dot ok"></span>Ready');
  }

  // ----------------------------------------------------------
  // Output rendering
  // ----------------------------------------------------------

  /**
   * Paint one run's three streams into the output pane. Built from text nodes
   * rather than innerHTML — program output is arbitrary text and must never be
   * parsed as markup.
   */
  function renderResult(result) {
    outputContent.textContent = "";

    const section = (text, className) => {
      if (!text) return false;
      const el = document.createElement("div");
      el.className = className;
      el.textContent = text.trimEnd();
      outputContent.appendChild(el);
      return true;
    };

    let painted = section(result.out, "out-stdout");
    painted = section(result.warn, "out-warn") || painted;
    painted = section(result.error, "out-error") || painted;

    if (!painted) {
      const el = document.createElement("div");
      el.className = "out-empty";
      el.textContent = "(no output)";
      outputContent.appendChild(el);
    }
  }

  // ----------------------------------------------------------
  // Code execution
  // ----------------------------------------------------------

  function runCode() {
    if (!runtime) {
      logError("Interpreter not ready — still loading");
      return;
    }

    const code = editorView.state.doc.toString();
    if (!code.trim()) {
      logError("No code to run");
      return;
    }

    consoleLog.innerHTML = "";
    logInit("Running...");

    try {
      const result = runtime.run(code);
      renderResult(result);
      logInit(result.error ? "Done (with errors)" : "Done");
    } catch (err) {
      outputContent.textContent = "";
      logError(`Error: ${err.message}`);
    }
  }

  // ----------------------------------------------------------
  // Example loading
  // ----------------------------------------------------------

  async function loadExample(name) {
    statusExample.textContent = `example: ${name}`;
    try {
      const resp = await fetch(`examples/${name}.mgs`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const code = await resp.text();
      originalCode = code;
      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: code },
      });
    } catch (err) {
      logError(`Failed to load example: ${err.message}`);
    }
  }

  function populateExamples() {
    exampleSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "\u2014 select example \u2014";
    placeholder.disabled = true;
    placeholder.selected = true;
    exampleSelect.appendChild(placeholder);

    EXAMPLES.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      exampleSelect.appendChild(opt);
    });
  }

  // ----------------------------------------------------------
  // Split pane
  // ----------------------------------------------------------

  function initSplitPane() {
    let isDragging = false;
    const outputPanel = document.getElementById("output-panel");

    divider.addEventListener("mousedown", (e) => {
      isDragging = true;
      e.preventDefault();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const container = document.querySelector("main");
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(pct, 20), 80);
      editorPanel.style.flex = `0 0 ${clamped}%`;
      outputPanel.style.flex = `0 0 ${100 - clamped}%`;
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }

  // ----------------------------------------------------------
  // About modal
  // ----------------------------------------------------------

  function initAboutModal() {
    const modalClose = aboutModal.querySelector(".modal-close");

    aboutBtn.addEventListener("click", () => {
      aboutModal.showModal();
    });

    modalClose.addEventListener("click", () => {
      aboutModal.close();
    });

    aboutModal.addEventListener("click", (e) => {
      if (e.target === aboutModal) aboutModal.close();
    });
  }

  // ----------------------------------------------------------
  // Event wiring
  // ----------------------------------------------------------

  function wireEvents() {
    runBtn.addEventListener("click", runCode);
    resetBtn.addEventListener("click", () => {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: originalCode,
        },
      });
      outputContent.textContent = "";
      consoleLog.innerHTML = "";
    });

    exampleSelect.addEventListener("change", (e) => {
      if (e.target.value) loadExample(e.target.value);
    });
  }

  // ----------------------------------------------------------
  // Init — sequential, with per-step error handling
  // ----------------------------------------------------------

  try {
    // Phase 1: Editor (independent of Pyodide)
    await initEditor();

    // Phase 2: Pyodide (the heavy lift)
    await initPyodide();

    // Phase 3: UI wiring
    populateExamples();
    wireEvents();
    initSplitPane();
    initAboutModal();
  } catch (err) {
    console.error("Playground init failed:", err);
    setLoading(false);
    setStatus('<span class="dot err"></span>Error');
    logError(`Init failed: ${err.message}`);
    if (err.stack) {
      logError(err.stack.split("\n").slice(0, 3).join(" | "));
    }
  }
})();
