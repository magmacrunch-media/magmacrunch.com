# opencode on MC1 — known tool-serialization bug and workarounds.

## opencode on MC1 — known issues

### Tool Serialization Bug (BuildMessage)

**Error:** `BuildMessage: Unexpected escaped backslash '\\'`
**Also shows as:** `Unexpected server error. Check server logs for details.`

**Cause:** opencode v1.18.18 has a bug in its tool definition serialization. When too many custom TypeScript tools from `~/.opencode/tools/` are loaded together, the message builder hits a backslash parsing error in `ToolRegistry.state`. The issue is combinatorial — individual tools work fine, but certain combinations trigger it.

**Known problematic tools (Aug 15 batch):**
- `analyze-corrections.ts`
- `auto-update-facts.ts`
- `detect-patterns.ts`
- `service-monitor.ts`

**Fix:**
1. Remove the problematic tools: `rm ~/.opencode/tools/{analyze-corrections,auto-update-facts,detect-patterns,service-monitor}.ts`
2. Keep the 11 working tools: `check-services, deploy, run-tests, search-codebase, changelog, search-multiple, test-runner, detect-project, verify-claim, verify-deploy, rag-search`
3. Restart opencode

**Workaround:** Use `opencode run --pure` to skip tool loading entirely.

**Prevention:**
- Don't run `opencode uninstall` — it can delete `~/.config/opencode/opencode.json` (the Ollama provider config). If it does, restore from the example config in the `magmacrunch-ai` repo.
- When adding new tools, test them one at a time first, then in combination
- Keep tool count under ~11 to avoid triggering the bug
- Reference: `magmacrunch-ai` repo `knowledge/projects/error-patterns.md`

