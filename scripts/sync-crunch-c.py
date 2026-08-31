#!/usr/bin/env python3
"""Generate ware/crunch-c/lessons.js from the crunch-c repository.

The course pages are data-driven: one lesson.html shell reads an array of
lessons rather than eighteen hand-written pages. This script builds that array
from the source of truth — the .mgs exercises, the module READMEs and the
worked solutions in https://github.com/magmacrunch-media/crunch-c.

Nothing here is hand-copied, so a lesson edited in crunch-c reaches the site by
re-running this, which .github/workflows/sync-crunch-c.yml does on a dispatch
from that repo and again weekly as a backstop.

The site has no build step and no runtime dependencies, so Markdown is
converted to HTML here rather than in the browser. The converter handles
exactly the constructs the module READMEs use — headings, tables, fenced code,
inline code, bold, links and bullet lists — and nothing else. If a README
starts using something new, add it here; do not reach for a Markdown library.

Source resolution, in order:
    $CRUNCH_C_ROOT, then ../crunch-c relative to this repo.

Run it by hand any time:

    python scripts/sync-crunch-c.py
"""

from __future__ import annotations

import html
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "ware" / "crunch-c" / "lessons.js"

MODULE_DIR_RE = re.compile(r"^\d{2}-[a-z-]+$")
EXERCISE_RE = re.compile(r"^(\d{2})-([a-z0-9-]+)\.mgs$")

# "// Module 03, Exercise 01: Use-After-Free (Quicksand)"
TITLE_RE = re.compile(
    r"^//\s*Module\s+(\d+),\s*Exercise\s+(\d+)\s*:\s*(.+?)\s*$", re.I
)


# ---------------------------------------------------------------- markdown --


def _inline(text: str) -> str:
    """Escape, then apply the inline constructs the READMEs actually use.

    Escaping first means a stray < in prose is safe; the markers below are
    matched against the escaped text, where they are still themselves.
    """
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", lambda m: f"<code>{m.group(1)}</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", lambda m: f"<strong>{m.group(1)}</strong>", out)
    out = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: f'<a href="{m.group(2)}" rel="noopener">{m.group(1)}</a>',
        out,
    )
    return out


def _table(rows: list[str]) -> str:
    """Render a GitHub pipe table. rows[1] is the |---|---| separator."""
    def cells(line: str) -> list[str]:
        return [c.strip() for c in line.strip().strip("|").split("|")]

    head = cells(rows[0])
    body = [cells(r) for r in rows[2:]]

    out = ["<table>", "<thead><tr>"]
    out += [f"<th>{_inline(c)}</th>" for c in head]
    out += ["</tr></thead>", "<tbody>"]
    for row in body:
        out.append("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in row) + "</tr>")
    out += ["</tbody>", "</table>"]
    return "".join(out)


def markdown(text: str) -> str:
    """A deliberately small Markdown subset. See the module docstring."""
    lines = text.split("\n")
    out: list[str] = []
    para: list[str] = []
    i = 0

    def flush_para() -> None:
        if para:
            out.append(f"<p>{_inline(' '.join(para))}</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            flush_para()
            i += 1
            continue

        if stripped.startswith("```"):
            flush_para()
            lang = stripped[3:].strip()
            body: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                body.append(lines[i])
                i += 1
            i += 1  # closing fence
            cls = f' class="language-{lang}"' if lang else ""
            escaped = html.escape("\n".join(body), quote=False)
            out.append(f"<pre><code{cls}>{escaped}</code></pre>")
            continue

        if stripped.startswith("#"):
            flush_para()
            level = len(stripped) - len(stripped.lstrip("#"))
            out.append(f"<h{level}>{_inline(stripped[level:].strip())}</h{level}>")
            i += 1
            continue

        # A pipe table needs its separator row to be a table at all.
        if (
            stripped.startswith("|")
            and i + 1 < len(lines)
            and set(lines[i + 1].strip()) <= set("|-: ")
            and "-" in lines[i + 1]
        ):
            flush_para()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i])
                i += 1
            out.append(_table(rows))
            continue

        if stripped.startswith("- "):
            flush_para()
            items = []
            while i < len(lines):
                current = lines[i]
                if current.strip().startswith("- "):
                    items.append(current.strip()[2:])
                elif items and current.strip() and current[:1].isspace():
                    # A wrapped bullet: fold the continuation into the item it
                    # belongs to, the way numbered task items are folded in
                    # paragraphs(). Without this a bullet that runs past one
                    # line breaks out of the <ul> and becomes a stray <p>.
                    items[-1] += " " + current.strip()
                else:
                    break
                i += 1
            out.append(
                "<ul>" + "".join(f"<li>{_inline(x)}</li>" for x in items) + "</ul>"
            )
            continue

        para.append(stripped)
        i += 1

    flush_para()
    return "".join(out)


# ------------------------------------------------------------------- .mgs ---


def comment_blocks(source: str) -> list[list[str]]:
    """Maximal runs of //-comment lines, blank-line separated.

    Strips the marker and one following space only. The remaining indentation
    is load-bearing: it is how these files mark C snippets inside prose.
    """
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in source.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith("//"):
            body = stripped[2:]
            current.append(body[1:] if body.startswith(" ") else body)
        else:
            if current:
                blocks.append(current)
                current = []
    if current:
        blocks.append(current)
    return blocks


# An unindented line that is really a statement, not prose: "scorch(p)",
# "val = p.peek(i32)", "big = u8(256)". Indented snippets are already caught
# by their indentation; these are the ones written flush against the margin.
CODEISH_RE = re.compile(r"^[A-Za-z_]\w*\s*(?:=\s*\S|\(.*\)\s*$)")

NUMBERED_RE = re.compile(r"^(\d+)\.\s+(.*)$")


def paragraphs(lines: list[str]) -> str:
    """Comment prose to HTML.

    Four shapes appear in these files: prose paragraphs, numbered task items,
    indented C snippets, and bare statements. Numbered items become a real
    <ol>, with unnumbered continuation lines folded into the item they follow
    rather than breaking into a paragraph of their own.
    """
    out: list[str] = []
    para: list[str] = []
    items: list[str] = []
    code: list[str] = []

    def flush_para() -> None:
        if para:
            out.append(f"<p>{_inline(' '.join(para))}</p>")
            para.clear()

    def flush_code() -> None:
        if code:
            body = html.escape("\n".join(code), quote=False)
            out.append(f"<pre><code>{body}</code></pre>")
            code.clear()

    def flush_items() -> None:
        if items:
            out.append("<ol>" + "".join(f"<li>{_inline(x)}</li>" for x in items) + "</ol>")
            items.clear()

    def flush_all() -> None:
        flush_para()
        flush_code()
        flush_items()

    for line in lines:
        stripped = line.strip()

        if not stripped:
            flush_all()
            continue

        numbered = NUMBERED_RE.match(stripped)
        if numbered:
            flush_para()
            flush_code()
            items.append(numbered.group(2))
            continue

        # A continuation of the task item above: indented, and we are mid-list.
        if items and line.startswith(" "):
            items[-1] += " " + stripped
            continue

        if line.startswith(" ") or CODEISH_RE.match(stripped):
            flush_para()
            flush_items()
            code.append(line.strip() if not line.startswith(" ") else line[2:])
            continue

        flush_code()
        flush_items()
        para.append(stripped)

    flush_all()
    return "".join(out)


def parse_exercise(source: str) -> dict:
    """Split one .mgs into title, intro, tasks and bonus.

    `code` is the whole file, verbatim. The interior comments are part of the
    lesson and the learner runs the file as written; intro/tasks/bonus are
    pulled out *additionally*, so the prose panel reads well.
    """
    blocks = comment_blocks(source)

    title = ""
    intro: list[str] = []
    tasks: list[str] = []
    bonus: list[str] = []

    for index, block in enumerate(blocks):
        first = block[0] if block else ""

        if index == 0:
            match = TITLE_RE.match("// " + first)
            if match:
                title = match.group(3)
                intro = block[1:]
            else:
                intro = block
            continue

        if first.upper().startswith("YOUR TASK"):
            tasks = block[1:]
        elif first.upper().startswith("BONUS"):
            # Several exercises carry more than one BONUS block. Drop the
            # "BONUS:" prefix — the page puts these under their own heading,
            # so repeating the word in the first sentence just reads oddly.
            trimmed = list(block)
            trimmed[0] = re.sub(r"^BONUS\s*[:—-]?\s*", "", trimmed[0], flags=re.I)
            if not trimmed[0]:
                trimmed = trimmed[1:]
            if bonus:
                bonus.append("")
            bonus.extend(trimmed)

    return {
        "title": title,
        "introHtml": paragraphs(intro),
        "tasksHtml": paragraphs(tasks),
        "bonusHtml": paragraphs(bonus),
    }


def parse_module_readme(text: str) -> dict:
    """Module title plus everything below it, minus the exercise table.

    The table lists files and concepts, which the lesson navigation already
    shows; repeating it in the prose panel would be noise.
    """
    lines = text.split("\n")
    title = ""
    if lines and lines[0].startswith("# "):
        title = lines[0][2:].strip()
        lines = lines[1:]

    body: list[str] = []
    skipping = False
    for line in lines:
        if line.strip().lower().startswith("## exercises"):
            skipping = True
            continue
        if skipping:
            if line.startswith("## "):
                skipping = False
            else:
                continue
        body.append(line)

    return {"title": title, "html": markdown("\n".join(body).strip())}


# ------------------------------------------------------------------ build ---


def find_source() -> Path:
    env = os.environ.get("CRUNCH_C_ROOT")
    candidates = [Path(env)] if env else []
    candidates.append(ROOT.parent / "crunch-c")

    for path in candidates:
        if (path / "README.md").is_file() and (path / "01-types").is_dir():
            return path

    tried = ", ".join(str(c) for c in candidates)
    print(f"error: no crunch-c checkout found (tried: {tried})", file=sys.stderr)
    print("       set CRUNCH_C_ROOT or clone it beside this repo", file=sys.stderr)
    raise SystemExit(1)


def build(src: Path) -> tuple[list[dict], list[dict]]:
    modules: list[dict] = []
    lessons: list[dict] = []

    module_dirs = sorted(
        p for p in src.iterdir() if p.is_dir() and MODULE_DIR_RE.match(p.name)
    )
    if not module_dirs:
        print(f"error: no module directories in {src}", file=sys.stderr)
        raise SystemExit(1)

    for module_dir in module_dirs:
        readme = module_dir / "README.md"
        if not readme.is_file():
            print(f"error: {module_dir.name} has no README.md", file=sys.stderr)
            raise SystemExit(1)

        meta = parse_module_readme(readme.read_text(encoding="utf-8"))
        module_slug = module_dir.name
        exercises = sorted(
            p for p in module_dir.glob("*.mgs") if EXERCISE_RE.match(p.name)
        )

        modules.append(
            {
                "slug": module_slug,
                "number": module_slug.split("-")[0],
                "title": meta["title"],
                "html": meta["html"],
                "count": len(exercises),
            }
        )

        for path in exercises:
            code = path.read_text(encoding="utf-8")
            parsed = parse_exercise(code)

            solution_path = src / "solutions" / module_slug / path.name
            solution = (
                solution_path.read_text(encoding="utf-8")
                if solution_path.is_file()
                else None
            )

            lessons.append(
                {
                    "module": module_slug,
                    "moduleTitle": meta["title"],
                    "number": EXERCISE_RE.match(path.name).group(1),
                    "slug": path.stem,
                    "title": parsed["title"] or path.stem,
                    "introHtml": parsed["introHtml"],
                    "tasksHtml": parsed["tasksHtml"],
                    "bonusHtml": parsed["bonusHtml"],
                    "code": code,
                    "solution": solution,
                }
            )

    return modules, lessons


def render(modules: list[dict], lessons: list[dict], src: Path) -> str:
    missing = sum(1 for x in lessons if not x["solution"])
    header = [
        "// ============================================================",
        "// crunch-c course content",
        "// ============================================================",
        "// Generated by scripts/sync-crunch-c.py from the crunch-c repository",
        "// — do not edit by hand. Edit the lesson in crunch-c and re-run:",
        "//",
        "//     python scripts/sync-crunch-c.py",
        "//",
        f"// {len(modules)} modules, {len(lessons)} lessons, "
        f"{len(lessons) - missing} with worked solutions.",
        "",
        f"export const MODULES = {json.dumps(modules, indent=2, ensure_ascii=False)};",
        "",
        f"export const LESSONS = {json.dumps(lessons, indent=2, ensure_ascii=False)};",
        "",
    ]
    return "\n".join(header)


def main() -> int:
    src = find_source()
    modules, lessons = build(src)

    if not lessons:
        print("error: no exercises found", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    updated = render(modules, lessons, src)
    existing = OUT.read_text(encoding="utf-8") if OUT.exists() else None

    solved = sum(1 for x in lessons if x["solution"])
    if updated == existing:
        print(
            f"unchanged — {len(lessons)} lessons across {len(modules)} modules "
            f"({solved} with solutions)"
        )
        return 0

    OUT.write_text(updated, encoding="utf-8", newline="\n")
    print(
        f"updated — {len(lessons)} lessons across {len(modules)} modules "
        f"({solved} with solutions) from {src}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
