// ============================================================
// crunch-c course — lesson viewer and runner
// ============================================================
// One page serves all eighteen lessons: ?m=<module>&e=<exercise>. The lesson
// content is generated from the crunch-c repository by
// scripts/sync-crunch-c.py; the interpreter is the shared ware runtime.

import { createMgsRuntime } from "../shared/mgs-runtime.js";
import { LESSONS } from "./lessons.js";

(async () => {
  // ----------------------------------------------------------
  // DOM
  // ----------------------------------------------------------

  const lessonContent = document.getElementById("lesson-content");
  const editorPanel = document.getElementById("editor-panel");
  const outputContent = document.getElementById("output-content");
  const consoleLog = document.getElementById("console-log");
  const loadingBar = document.getElementById("loading-bar");
  const statusReady = document.getElementById("status-ready");
  const breadcrumb = document.getElementById("breadcrumb");
  const position = document.getElementById("position");
  const divider = document.getElementById("divider");

  const lessonSelect = document.getElementById("lesson-select");
  const runBtn = document.getElementById("run");
  const resetBtn = document.getElementById("reset");
  const solutionBtn = document.getElementById("solution");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------

  let runtime = null;
  let editorView = null;
  let index = 0;

  // ----------------------------------------------------------
  // Logging
  // ----------------------------------------------------------

  function logLine(message, className) {
    const el = document.createElement("div");
    el.className = `console-line ${className}`;
    el.textContent = message;
    consoleLog.appendChild(el);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  const logInit = (m) => logLine(m, "log");
  const logError = (m) => logLine(m, "error");

  function setStatus(html) {
    statusReady.innerHTML = html;
  }

  // ----------------------------------------------------------
  // Routing
  // ----------------------------------------------------------

  /** Resolve ?m=&e= to a lesson index, tolerating anything unrecognised. */
  function indexFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const module = params.get("m");
    const exercise = params.get("e");

    if (!module) return 0;

    if (exercise) {
      const exact = LESSONS.findIndex(
        (l) => l.module === module && l.number === exercise
      );
      if (exact !== -1) return exact;
    }

    // A module with no exercise (or an unknown one) opens at its first lesson.
    const first = LESSONS.findIndex((l) => l.module === module);
    return first === -1 ? 0 : first;
  }

  function updateLocation(replace) {
    const lesson = LESSONS[index];
    const url = `${window.location.pathname}?m=${encodeURIComponent(lesson.module)}&e=${encodeURIComponent(lesson.number)}`;
    if (replace) window.history.replaceState({ index }, "", url);
    else window.history.pushState({ index }, "", url);
  }

  // ----------------------------------------------------------
  // Lesson rendering
  // ----------------------------------------------------------

  function section(title, html) {
    if (!html) return null;
    const wrap = document.createElement("section");
    wrap.className = "lesson-section";

    const heading = document.createElement("h3");
    heading.textContent = title;
    wrap.appendChild(heading);

    const body = document.createElement("div");
    // Generated at build time by scripts/sync-crunch-c.py from the crunch-c
    // repo, escaped there. Not user input.
    body.innerHTML = html;
    wrap.appendChild(body);

    return wrap;
  }

  function renderLesson() {
    const lesson = LESSONS[index];

    lessonContent.textContent = "";

    const kicker = document.createElement("p");
    kicker.className = "lesson-kicker";
    kicker.textContent = lesson.moduleTitle;
    lessonContent.appendChild(kicker);

    const heading = document.createElement("h2");
    heading.className = "lesson-title";
    heading.textContent = lesson.title;
    lessonContent.appendChild(heading);

    for (const [title, html] of [
      ["The concept", lesson.introHtml],
      ["Your task", lesson.tasksHtml],
      ["Bonus", lesson.bonusHtml],
    ]) {
      const el = section(title, html);
      if (el) lessonContent.appendChild(el);
    }

    lessonContent.scrollTop = 0;

    breadcrumb.textContent = `${lesson.module} / ${lesson.slug}`;
    position.textContent = `${index + 1} of ${LESSONS.length}`;
    lessonSelect.value = String(index);

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === LESSONS.length - 1;

    solutionBtn.disabled = !lesson.solution;
    solutionBtn.title = lesson.solution
      ? "Load the worked solution"
      : "This lesson has no solution file";

    setEditorText(lesson.code);
    outputContent.textContent = "";
    consoleLog.textContent = "";

    const hint = document.createElement("div");
    hint.className = "empty-state";
    hint.innerHTML = "<span>Press Run to execute this lesson</span><code>Ctrl+Enter</code>";
    outputContent.appendChild(hint);

    document.title = `${lesson.title} — crunch-c`;
  }

  function goTo(newIndex, { push = true } = {}) {
    index = Math.max(0, Math.min(LESSONS.length - 1, newIndex));
    renderLesson();
    updateLocation(!push);
  }

  // ----------------------------------------------------------
  // Editor
  // ----------------------------------------------------------

  function setEditorText(text) {
    if (!editorView) return;
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: text },
    });
  }

  async function initEditor() {
    logInit("Loading CodeMirror...");

    const [stateMod, viewMod, jsMod, themeMod] = await Promise.all([
      import("https://esm.sh/@codemirror/state@6"),
      import("https://esm.sh/@codemirror/view@6"),
      import("https://esm.sh/@codemirror/lang-javascript@6"),
      import("https://esm.sh/@codemirror/theme-one-dark@6"),
    ]);

    const { EditorState } = stateMod;
    const { EditorView, keymap } = viewMod;
    const { javascript } = jsMod;
    const { oneDark } = themeMod;

    if (!EditorState || !EditorView || !keymap || !javascript || !oneDark) {
      throw new Error("CodeMirror import failed");
    }

    const runKey = { run: () => (runCode(), true) };
    const runKeymap = keymap.of([
      { key: "Ctrl-Enter", ...runKey },
      { key: "Cmd-Enter", ...runKey },
    ]);

    editorView = new EditorView({
      state: EditorState.create({
        doc: "",
        // .mgs has no CodeMirror grammar; JavaScript's is close enough for
        // //-comments, strings and numbers, which is most of what shows here.
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
      }),
      parent: editorPanel,
    });

    logInit("CodeMirror ready");
  }

  // ----------------------------------------------------------
  // Output
  // ----------------------------------------------------------

  /**
   * Paint one run's three streams. Built from text nodes, never innerHTML —
   * program output is arbitrary text and must not be parsed as markup.
   *
   * The warn stream carries the "spooked:" lines: overflow wraps and the
   * ancient-weeds leak report. For this course those are not noise, they are
   * frequently the entire lesson, so they get their own visible block rather
   * than being folded in with stdout.
   */
  function renderResult(result) {
    outputContent.textContent = "";

    const paint = (text, className) => {
      if (!text) return false;
      const el = document.createElement("div");
      el.className = className;
      el.textContent = text.trimEnd();
      outputContent.appendChild(el);
      return true;
    };

    let painted = paint(result.out, "out-stdout");
    painted = paint(result.warn, "out-warn") || painted;
    painted = paint(result.error, "out-error") || painted;

    if (!painted) {
      const el = document.createElement("div");
      el.className = "out-empty";
      el.textContent = "(no output)";
      outputContent.appendChild(el);
    }
  }

  function runCode() {
    if (!runtime) {
      logError("Interpreter not ready — still loading");
      return;
    }

    const code = editorView.state.doc.toString();
    if (!code.trim()) {
      logError("Nothing to run");
      return;
    }

    consoleLog.textContent = "";
    logInit("Running...");

    try {
      const result = runtime.run(code);
      renderResult(result);
      logInit(result.error ? "Done (stopped by a fault)" : "Done");
    } catch (err) {
      outputContent.textContent = "";
      logError(`Error: ${err.message}`);
    }
  }

  // ----------------------------------------------------------
  // Split pane
  // ----------------------------------------------------------

  function initSplitPane() {
    let dragging = false;

    divider.addEventListener("mousedown", (e) => {
      dragging = true;
      e.preventDefault();
      document.body.style.cursor = "col-resize";
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const main = divider.parentElement;
      const rect = main.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, pct));
      main.style.gridTemplateColumns = `${clamped}% 4px 1fr`;
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      document.body.style.cursor = "";
    });
  }

  // ----------------------------------------------------------
  // Wiring
  // ----------------------------------------------------------

  function populateLessonSelect() {
    let currentModule = null;
    let group = null;

    LESSONS.forEach((lesson, i) => {
      if (lesson.module !== currentModule) {
        currentModule = lesson.module;
        group = document.createElement("optgroup");
        group.label = lesson.moduleTitle;
        lessonSelect.appendChild(group);
      }
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `${lesson.number}. ${lesson.title}`;
      group.appendChild(option);
    });
  }

  function wireEvents() {
    runBtn.addEventListener("click", runCode);
    resetBtn.addEventListener("click", () => setEditorText(LESSONS[index].code));
    solutionBtn.addEventListener("click", () => {
      const { solution } = LESSONS[index];
      if (solution) setEditorText(solution);
    });

    prevBtn.addEventListener("click", () => goTo(index - 1));
    nextBtn.addEventListener("click", () => goTo(index + 1));
    lessonSelect.addEventListener("change", () => goTo(Number(lessonSelect.value)));

    // Back/forward should move between lessons, not reload the interpreter.
    window.addEventListener("popstate", () => {
      index = indexFromLocation();
      renderLesson();
    });
  }

  // ----------------------------------------------------------
  // Boot
  // ----------------------------------------------------------

  index = indexFromLocation();
  populateLessonSelect();
  initSplitPane();
  wireEvents();

  try {
    await initEditor();
    renderLesson();
    updateLocation(true);
  } catch (err) {
    logError(`Editor failed to load: ${err.message}`);
    return;
  }

  try {
    setStatus('<span class="dot loading"></span>loading');
    runtime = await createMgsRuntime(logInit);
    loadingBar.classList.add("hidden");
    setStatus('<span class="dot ok"></span>ready');
  } catch (err) {
    loadingBar.classList.add("hidden");
    logError(`Interpreter failed to load: ${err.message}`);
    setStatus('<span class="dot err"></span>failed');
  }
})();
