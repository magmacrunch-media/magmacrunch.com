// ============================================================
// MagmaScript browser runtime — shared by the ware playgrounds
// ============================================================
// Boots Pyodide, writes the embedded magmascript/lang/** sources into its
// virtual filesystem, stubs the domain modules the browser cannot use, and
// exposes one run(code) call.
//
// Consumed by ware/magmascript/app.js and ware/crunch-c/app.js. Both pages
// need exactly this and differ only in the UI around it, so it lives here
// rather than being copied — the same reason the interpreter itself does.

import { LANG_FILE_CONTENTS } from "./mgs-lang-bundle.js?v=3ba74fc8";

const PYODIDE_VERSION = "0.25.1";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const LANG_FILES = Object.keys(LANG_FILE_CONTENTS);

// Domain clients reach the network and are not available in the browser, so
// the package init imports only `lang` and these stand in for the rest.
const STUB_REGISTRY = `REGISTRY = {}
def register_domain(name, module):
    REGISTRY[name] = module
def get_domain(name):
    return REGISTRY.get(name)
def list_domains():
    return list(REGISTRY.keys())
`;

const STUB_CONFIG = `from dataclasses import dataclass, field

@dataclass
class Config:
    pass

def get_config():
    return Config()
`;

// Mirrors what the CLI does in cli.py: run hypnagogia's threshold check,
// execute, then report leaks. Three details matter here, and a runner that
// only captures stdout gets all three wrong:
//
//   1. Warnings go to stderr, not stdout. Integer-overflow warnings and the
//      leak report are written there, so capturing stdout alone silently
//      drops them.
//   2. report_leaks() is explicitly "call at program exit". Nothing calls it
//      for you, and without it "ancient weeds" never appears at all.
//   3. On error, the output printed before the fault still matters, and
//      e.format() carries the prefix, line, column and a caret that str(e)
//      does not.
//
// Returns JSON so the three streams stay distinguishable to the caller.
const RUNNER_CODE = `
import io
import json
import sys
from magmascript.lang.lexer import Lexer
from magmascript.lang.parser import Parser
from magmascript.lang.interpreter import Interpreter
from magmascript.lang.hypnagogia import inspect as _hypnagogia

def _run(code):
    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout = out_buf = io.StringIO()
    sys.stderr = err_buf = io.StringIO()
    error = None
    try:
        tokens = Lexer(code).tokenize()
        tree = Parser(tokens, source=code).parse()
        interpreter = Interpreter(source=code)
        for finding in _hypnagogia(tree, set(interpreter.globals.variables)):
            print("spooked: " + finding.render(None), file=sys.stderr)
        interpreter.run(tree)
        interpreter.report_leaks()
    except Exception as e:
        error = e.format() if hasattr(e, "format") else str(e)
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr
    return json.dumps({
        "out": out_buf.getvalue(),
        "warn": err_buf.getvalue(),
        "error": error,
    })
`;

/**
 * Boot the interpreter.
 *
 * @param {(message: string) => void} [onLog] progress messages, one per step.
 * @returns {Promise<{run: (code: string) => {out: string, warn: string, error: string|null}}>}
 */
export async function createMgsRuntime(onLog = () => {}) {
  onLog("Loading Pyodide runtime...");

  const script = document.createElement("script");
  script.src = `${PYODIDE_BASE}pyodide.js`;
  document.head.appendChild(script);
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load the Pyodide CDN script"));
  });
  onLog("Pyodide script loaded");

  onLog("Initializing WASM runtime (this may take a moment)...");
  if (typeof window.loadPyodide !== "function") {
    throw new Error("loadPyodide not found on window — the Pyodide script did not load correctly");
  }
  const pyodide = await window.loadPyodide({ indexURL: PYODIDE_BASE });
  onLog("WASM runtime ready");

  onLog("Creating filesystem...");
  const fs = pyodide.FS;
  const dirs = [
    "/home/pyodide/magmascript",
    "/home/pyodide/magmascript/lang",
    "/home/pyodide/magmascript/core",
    // Subpackage dirs (lang/astheno/...) come from the embedded paths, so a
    // new subpackage needs no edit here.
    ...LANG_FILES.filter((name) => name.includes("/")).map(
      (name) => `/home/pyodide/magmascript/lang/${name.slice(0, name.lastIndexOf("/"))}`
    ),
  ];
  for (const dir of dirs) {
    if (!fs.analyzePath(dir).exists) fs.mkdirTree(dir);
  }
  onLog("Directories created");

  for (const name of LANG_FILES) {
    fs.writeFile(`/home/pyodide/magmascript/lang/${name}`, LANG_FILE_CONTENTS[name]);
  }
  onLog(`All ${LANG_FILES.length} lang files installed`);

  onLog("Installing stub modules...");
  fs.writeFile("/home/pyodide/magmascript/core/__init__.py", "");
  fs.writeFile("/home/pyodide/magmascript/core/registry.py", STUB_REGISTRY);
  fs.writeFile("/home/pyodide/magmascript/core/config.py", STUB_CONFIG);
  fs.writeFile("/home/pyodide/magmascript/__init__.py", "from magmascript import lang\n");
  onLog("Stub modules installed");

  onLog("Configuring Python path...");
  pyodide.runPython("import sys\nsys.path.insert(0, '/home/pyodide')\n");

  onLog("Testing Python imports...");
  try {
    pyodide.runPython(`
from magmascript.lang.lexer import Lexer
from magmascript.lang.parser import Parser
from magmascript.lang.interpreter import Interpreter
`);
  } catch (e) {
    throw new Error(`Python import failed: ${e.message}`);
  }
  onLog("Python imports verified");

  onLog("Installing runner...");
  pyodide.runPython(RUNNER_CODE);
  onLog("Runner installed");

  return {
    run(code) {
      pyodide.globals.set("__code", code);
      return JSON.parse(pyodide.runPython("_run(__code)"));
    },
  };
}
