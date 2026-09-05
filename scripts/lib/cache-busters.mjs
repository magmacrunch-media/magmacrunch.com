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
 * Python, for the bundle it generates. It cannot import this, so it carries a
 * comment saying the two must agree. Any change to digest() below belongs
 * there in the same commit.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * First 8 hex of sha256 over the content with newlines normalised to LF.
 *
 * .gitattributes deliberately pins only the files the Pi executes (*.sh, *.py,
 * *.yml, *.conf) to LF. .js and .css are left to each clone's core.autocrlf, so
 * git hands you CRLF on Windows and LF on Linux for the same committed blob,
 * and the two hash differently. A checker that hashed raw bytes would pass on
 * Linux and fail on every Windows clone, for files that are perfectly correct.
 */
export const digest = (file) => createHash('sha256')
  .update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
  .digest('hex')
  .slice(0, 8);

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
