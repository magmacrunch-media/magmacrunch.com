/**
 * The `?v=` cache-buster rule, in one place.
 *
 * Extracted from check-cache-busters.mjs when a second checker appeared:
 * check-game-stamps.mjs verifies the same stamps in the *source* repos the
 * four generated arcade folders are copied from. Two implementations of the
 * digest would be two chances to disagree, and a disagreement here is silent —
 * one checker passes, the other fails, and the stamp is right by one rule and
 * wrong by the other.
 *
 * scripts/sync-playground.py:bundle_digest() is a third implementation, in
 * Python, for the bundle it generates, and
 * scripts/sync-texastoast-playground.py:app_digest() a fourth, for the
 * texastoast engine it embeds. Neither can import this, so each carries a
 * comment saying they must agree. Any change to digest() below belongs in both
 * of them in the same commit.
 *
 * check-staged-stamps.mjs, which .githooks/pre-commit runs, is the other
 * caller, and the reason more than the digest lives here. It reads files out
 * of the index rather than off the disk, so it needs the digest in a form that
 * takes content; and it has to agree with check-cache-busters.mjs about which
 * file a reference names, which trees are skipped and how a stamp is rewritten
 * — every disagreement there is a commit the hook passes and CI then fails.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { posix } from 'node:path';

/**
 * First 8 hex of sha256 over the content with newlines normalized to LF.
 *
 * .gitattributes deliberately pins only the files the Pi executes (*.sh, *.py,
 * *.yml, *.conf) to LF. .js and .css are left to each clone's core.autocrlf, so
 * git hands you CRLF on Windows and LF on Linux for the same committed blob,
 * and the two hash differently. A checker that hashed raw bytes would pass on
 * Linux and fail on every Windows clone, for files that are perfectly correct.
 */
export const digestContent = (buf) => createHash('sha256')
  .update(buf.toString('utf8').replace(/\r\n/g, '\n'))
  .digest('hex')
  .slice(0, 8);

/** digestContent() of a file on disk. Decoded as UTF-8 either way. */
export const digest = (file) => digestContent(readFileSync(file));

/**
 * What a page can load and be visibly wrong without: code, styling, and the
 * media that occupies layout. Page-to-page .html links are deliberately absent
 * — those belong to the check-links workflow, which follows redirects and knows
 * about the generated archive stubs.
 */
export const ASSET_EXT = 'js|css|jpg|jpeg|png|gif|svg|webp|avif|ico|bmp' +
                         '|mp4|webm|mov|mp3|wav|ogg|oga|m4a' +
                         '|woff|woff2|ttf|otf|eot';

/** src=, href= or poster= in HTML, pointing at one of those, optional query. */
export const HTML_REF_RE = new RegExp(
  `(?:src|href|poster)\\s*=\\s*["']([^"']+?\\.(?:${ASSET_EXT}))(\\?[^"']*)?["']`, 'gi');

/** url(...) inside a stylesheet — quoted or bare. */
export const CSS_REF_RE = new RegExp(
  `url\\(\\s*(['"]?)([^'")]+?\\.(?:${ASSET_EXT}))(\\?[^'")]*)?\\1\\s*\\)`, 'gi');

/**
 * A stamped `.src` or `.href` assignment in JavaScript, which is how nav.js
 * loads the jukebox and the search widget:
 *
 *   script.src = root + 'assets/jukebox.js?v=e3795c24';
 *
 * Captures (href, query) like HTML_REF_RE, so every caller's capture handling
 * is the HTML one. The optional `root + ` is why the attribute pattern never
 * saw these: it wants the quoted string immediately after the `=`.
 *
 * ── Why it demands an ASSIGNMENT rather than any quoted path ──
 *
 * JavaScript has no syntax that marks a string as a URL, so a looser pattern
 * reads prose and test data as references. Both exist here and both would fail.
 * arcade/george-boole/sw.js carries "css/base.css?v=c634b661" inside a comment
 * explaining why its precache list was deleted, and the two tests/test-sw.js
 * build fake URLs stamped OLDSTAMP, NEWSTAMP and abc12345 to assert on. The
 * last of those is eight hex and names a file that exists, so no rule about the
 * shape of a stamp can separate it from a real one. The assignment can, and it
 * is also the DOM API spelling of the src=/href= this already trusts in HTML.
 *
 * ── Why it demands a STAMP ──
 *
 * A relative URL set from a script resolves against the DOCUMENT, not the
 * script, and which document loads a script is not knowable from the script.
 * arcade/solitaire/js/game.js sets 'images/card-back.jpg', which exists at
 * arcade/solitaire/images/ and not beside the script, so resolving these the
 * way a stylesheet's url() is resolved would report a file that is perfectly
 * fine as missing. Stamped references do not have that problem, because a
 * cache-buster is written by loader code that has already computed a site root;
 * see resolveJsRef. Unstamped ones are left to the check-links workflow, which
 * is where reachability lives.
 */
export const JS_REF_RE = new RegExp(
  `\\.\\s*(?:src|href)\\s*=\\s*(?:[^;'"]*\\+\\s*)?['"]([^'"]+?\\.(?:${ASSET_EXT}))(\\?[^'"]*)['"]`, 'g');

/** Which reference pattern a source file is read with. */
export const refKind = (path) =>
  path.endsWith('.css') ? 'css' : path.endsWith('.js') ? 'js' : 'html';

export const RE_FOR = { html: HTML_REF_RE, css: CSS_REF_RE, js: JS_REF_RE };

/**
 * A reference a checker cannot resolve to one fixed path, and must not guess
 * at. `${...}` is a JS template literal inside an inline <script> — the archive
 * pages build gallery markup that way — and a scheme like data:, blob: or
 * about: never names a file in the tree.
 */
export const isUnresolvable = (href) =>
  href.includes('${') || href.includes('{{') ||
  /^(?:[a-z][a-z0-9+.-]*:)/i.test(href) && !href.startsWith('/');

/** Someone else's asset, on another origin. */
export const isRemote = (href) => /^(?:https?:)?\/\//.test(href);

/**
 * The stamp in a matched query string, or undefined when there is none.
 * Returns the raw text, so a non-hash serial (`?v=11`) comes back as "11" and
 * the caller decides what to do with it — those are a different convention and
 * cannot be verified against content.
 */
export const stampOf = (query) => query?.match(/^\?v=([^&]*)$/)?.[1];

/** Whether a stamp is a real content digest rather than a hand-bumped serial. */
export const isDigestStamp = (stamp) => /^[0-9a-f]{8}$/.test(stamp);

/**
 * The repo-relative path a local reference names, given the repo-relative
 * path of the file it is written in. Both use `/`. A leading `/` is the site
 * root, which is the repo root; anything else resolves against the file the
 * reference appears in — for a stylesheet's url() that is the stylesheet, not
 * whichever page loaded it.
 */
export const resolveRef = (href, source) => posix.normalize(
  href.startsWith('/') ? href.slice(1) : posix.join(posix.dirname(source), href));

/**
 * Where a stamped reference in a script points: from the repo root, never from
 * the script. The reasoning is at JS_REF_RE. In short, the script does not know
 * which document will load it, and the loader code that writes a stamp is
 * working from a site root already, so root-relative is the form actually
 * written. nav.js is the whole of it today, and `root + 'assets/jukebox.js'`
 * means assets/jukebox.js from the root whatever depth the page sits at.
 */
export const resolveJsRef = (href) => posix.normalize(href.replace(/^\//, ''));

// Only trees git does not track: node_modules, and the four .gitignore entries
// that hold HTML. Everything deployed is checked, archive/ included — its ten
// `?v=` hits are all YouTube watch URLs and one og:image, which is precisely
// what the src/href-plus-extension pattern above exists to step over.
// game-repos/ is the last entry and the odd one: it exists only inside a CI
// workspace, where check-game-stamps.mjs has the four game repos checked out
// under it. Their pages load ../shared/*, which resolves only after a sync, so
// walking into them here would report a wall of missing files for pages that
// are perfectly correct where they actually live.
export const SKIP_DIRS = new Set(['node_modules', 'wiki', 'wiki-old-backup', 'drafts', 'game-repos']);

/** Whether the tree walk in check-cache-busters.mjs would reach this path. */
export const isWalked = (path) =>
  path.split('/').every(seg => !seg.startsWith('.') && !SKIP_DIRS.has(seg));

// Written by a running service rather than committed, so absent from a fresh
// clone and from CI without that being a fault. arcade/admin/server.py renders
// visual/tv/channels.js from tv-channels.json whenever the channel list is
// saved, and visual/tv/main.js reads `window.TV_CHANNELS || [ ...fallback ]`
// precisely so the page works in the window where the file does not exist.
// Anything added here must have that shape: a generator in the tree, and a
// consumer that copes with its absence.
export const GENERATED = new Set(['visual/tv/channels.js']);

/**
 * Rewrite the stale stamps in one file's text, returning `{ text, changed }`.
 * `entries` are `{ href, actual }`: every occurrence of that reference gets
 * `?v=<actual>`. `isCss` picks url() over src=/href=/poster=.
 *
 * The replacement runs through the same regex that found them, so what gets
 * edited is exactly what was matched — no second, looser search that could
 * land on a `?v=` in prose or in an unrelated attribute. Within a match the
 * reference is spliced by value rather than by index, and it appears once
 * there as the quoted attribute value, so repeated hrefs on a page each get
 * their own correct stamp.
 *
 * Written back as read. digest() normalizes CRLF to LF to hash, which is right
 * for hashing and would be wrong here: writing a normalized string back would
 * silently convert a CRLF page to LF and bury a one-token change under a
 * whole-file diff.
 */
export function rewriteStampsIn(text, kind, entries) {
  const isCss = kind === 'css';
  const re = RE_FOR[kind] ?? HTML_REF_RE;
  const wanted = new Map(entries.map(e => [e.href, e.actual]));
  let changed = 0;

  const after = text.replace(re, (match, ...groups) => {
    // HTML captures (href, query); CSS captures (quote, href, query).
    const [href, query] = isCss ? [groups[1], groups[2]] : [groups[0], groups[1]];
    const actual = wanted.get(href);
    if (actual === undefined) return match;

    // Only digest stamps are rewritten. The same href can also appear bare or
    // with a serial (`?v=11`) elsewhere on the page, and adding or replacing
    // those is a caching decision, not a repair.
    const stamp = stampOf(query);
    if (stamp === undefined || !isDigestStamp(stamp)) return match;

    // Compare before counting: the same href can appear twice on a page, one
    // occurrence stale and one already correct, and only the stale one is a
    // change. Callers pass one entry per stale match, so the counts line up.
    const oldRef = href + (query ?? '');
    const newRef = `${href}?v=${actual}`;
    if (oldRef === newRef) return match;
    changed++;
    return match.replace(oldRef, newRef);
  });

  return { text: after, changed };
}

/** rewriteStampsIn() on a file in place, returning how many stamps changed. */
export function rewriteStamps(source, entries) {
  const { text, changed } = rewriteStampsIn(readFileSync(source, 'utf8'), refKind(source), entries);
  if (changed) writeFileSync(source, text);
  return changed;
}
