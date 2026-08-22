/* ═══════════════════════════════════════════════
    magmacrunch media — shared nav script
    nav.js
    ═══════════════════════════════════════════════ */

/* ── NAV CONFIG ──
   Update this config to change nav across all pages at once.
   Used by the auto-nav generator below. */

window.NAV_CONFIG = {
    brand: { href: './', text: 'magmacrunch.com' },
    sections: [
        { label: 'home', href: './' },
        { label: 'about', href: 'home/about.html' },
        { label: 'music', href: 'music/', items: [
            { href: 'music/jukebox/', label: 'jukebox' },
            { href: 'music/distributed-music/', label: 'distributed music' },
            { href: 'music/music-videos.html', label: 'music videos' },
            { href: 'music/physical-media/', label: 'physical media' }
        ]},
        { label: 'visual', href: 'visual/', items: [
            { href: 'visual/tv/', label: 'TV' },
            { href: 'visual/collage.html', label: 'collage' },
            { href: 'visual/photography/', label: 'photography' }
        ]},
        { label: 'archive', href: 'archive/', items: [
            { href: 'archive/by-artist/', label: 'by artist' },
            { href: 'archive/by-place/', label: 'by place' },
            { href: 'archive/by-label/', label: 'by label' },
            { href: 'archive/by-contributor/', label: 'by contributor' }
        ]},
        { label: 'arcade', href: 'arcade/', items: [
            { href: 'arcade/board-games/', label: 'board games' },
            { href: 'arcade/card-games/', label: 'card games' },
            { href: 'arcade/puzzles/', label: 'puzzles' },
            { href: 'arcade/action/', label: 'action' }
        ]},
        { label: 'press', href: 'press/', items: [
            { href: 'press/scientific/', label: 'scientific' },
            { href: 'press/experimental/', label: 'experimental' },
            { href: 'press/lyrics/', label: 'lyrics' }
        ]},
        { label: 'tools', href: 'tools/', items: [
            { href: 'tools/utilities/', label: 'creative utilities' },
            { href: 'tools/dev/', label: 'developer tools' }
        ]},
        { label: 'guestbook', href: 'home/guestbook.html' }
    ]
};

/* ── AUTO-NAV GENERATOR ──
   If a page has <nav id="auto-nav">, generates nav from NAV_CONFIG.
   Respects relative paths for pages in subdirectories. */

(function () {
    const autoNav = document.getElementById('auto-nav');
    if (!autoNav || !window.NAV_CONFIG) return;

    const cfg = window.NAV_CONFIG;
    const depth = autoNav.dataset.depth || '';

    // Build nav HTML
    let navHTML = `<a href="${depth}${cfg.brand.href}" class="nav-brand">${cfg.brand.text}</a>\n<ul class="nav-links" id="navLinks">`;

    for (const sec of cfg.sections) {
        const href = depth + sec.href;
        if (sec.items && sec.items.length) {
            // Dropdown item
            navHTML += `\n<li><a href="${href}">${sec.label}</a><div class="dropdown">`;
            navHTML += `\n<a href="${href}" class="dropdown-view-all">view all ${sec.label}</a>`;
            for (const item of sec.items) {
                navHTML += `\n<a href="${depth}${item.href}">${item.label}</a>`;
            }
            navHTML += '</div></li>';
        } else {
            // Simple item
            navHTML += `\n<li><a href="${href}">${sec.label}</a></li>`;
        }
    }
    navHTML += '\n</ul>';
    navHTML += '\n<button class="hamburger" id="hamburger" aria-label="menu"><span></span><span></span><span></span></button>';

    autoNav.innerHTML = navHTML;
})();

/* ── FAVICON ──
   Every page declares its own <link rel="icon"> pointing at the root
   favicon.ico. There used to be a JS injector here for pages without one; it
   was unreachable (it required both a missing icon link AND <nav id="auto-nav">,
   a combination no page has) and it targeted a favicon.ico that didn't exist.
   The real file at the site root now covers those pages via the browser's own
   /favicon.ico fallback, which works without scripting. The SPA router keeps
   the icon in sync on navigation — see the favicon block in navigate(). */

/* ═══════════════════════════════════════════════
   INTERACTIVE FUNCTIONALITY
   (hamburger, dropdowns, active link)
   ═══════════════════════════════════════════════ */

(function () {
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');

    // ── MOBILE HAMBURGER ──
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // ── MOBILE DROPDOWN TOGGLE ──
    // On mobile, tapping a nav item with a dropdown toggles it open/closed.
    // On desktop, CSS :hover handles it — JS only needed for mobile.
    if (navLinks) {
        navLinks.querySelectorAll('li').forEach(li => {
            const dropdown = li.querySelector('.dropdown');
            if (!dropdown) return;

            li.querySelector('a').addEventListener('click', (e) => {
                // Only intercept on mobile (hamburger visible)
                if (window.getComputedStyle(hamburger).display !== 'none') {
                    e.preventDefault();
                    // Close siblings
                    navLinks.querySelectorAll('li.open').forEach(openLi => {
                        if (openLi !== li) openLi.classList.remove('open');
                    });
                    li.classList.toggle('open');
                }
            });
        });

        // Close mobile menu when a dropdown link is clicked
        navLinks.querySelectorAll('.dropdown a').forEach(a => {
            a.addEventListener('click', () => {
                navLinks.classList.remove('open');
                navLinks.querySelectorAll('li.open').forEach(li => li.classList.remove('open'));
            });
        });
    }

    // ── ACTIVE LINK HIGHLIGHT ──
    // Disabled — caused too many edge-case issues with relative paths
    // Re-enable by restoring the matching logic when ready
})();

/* ═══════════════════════════════════════════════
    archive sub-nav auto-inject
    ───────────────────────────────────────────────
    Add  data-siblings="events,personnel,recordings,works"
    (or whichever subset exist) to <main> on any
    artist or place archive sub-page. This script
    will inject a .sub-nav block with a ← back
    button plus one nav-card per sibling, skipping
    whichever page is currently active.

    Inject target (in order of preference):
      1. first  .sub-nav already in .page-header  → replaced
      2. after  .page-title inside .page-header    → inserted after
      3. after  .page-header itself                → inserted after
      4. top of <main>                             → prepended
    ═══════════════════════════════════════════════ */

(function () {
    const main = document.querySelector('main[data-siblings]');
    if (!main) return;

    const siblings = main.dataset.siblings
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (!siblings.length) return;

    // color map for sibling nav cards
    const COLOR_MAP = {
        events: 'c-rose',
        links: 'c-links',
        recordings: 'c-cyan',
        releases: 'c-cyan',
        works: 'c-purple',
        personnel: 'c-green',
        about: 'c-yellow',
        members: 'c-green',
        photography: 'c-orange',
    };

    // derive current page slug from filename (e.g. "recordings")
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    // back button color: use data-back-color attribute if set, else default to c-orange
    const backColor = main.dataset.backColor || 'c-orange';

    // always include ← back to parent index
    const cards = [`<a href="./" class="nav-card ${backColor}">← back</a>`];
    for (const s of siblings) {
        if (s === currentPage) continue;
        cards.push(`<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${s}</a>`);
    }

    // if a hand-authored .sub-nav already exists inside .page-header, replace it
    // so there's no duplication if someone starts adding them manually mid-migration
    const pageHeader   = main.querySelector('.page-header');
    const existingNav  = pageHeader && pageHeader.querySelector('.sub-nav');

    const subNav = document.createElement('div');
    subNav.className = 'sub-nav';
    subNav.innerHTML = cards.join('\n');

    if (existingNav) {
        existingNav.replaceWith(subNav);
    } else if (pageHeader) {
        const titleEl = pageHeader.querySelector('.page-title');
        if (titleEl) {
            titleEl.insertAdjacentElement('afterend', subNav);
        } else {
            pageHeader.appendChild(subNav);
        }
    } else {
        main.prepend(subNav);
    }
})();

/* ═══════════════════════════════════════════════
   AUTO BREADCRUMB INJECTOR
   ───────────────────────────────────────────────
   Detects archive subpages (by-artist, by-place)
   and auto-generates breadcrumbs based on URL path.

   Add <div id="breadcrumb"></div> where you want
   the breadcrumb to appear. If not present, injects
   at top of <main>.

   Supports:
   - archive/by-artist/[artist]/index.html
   - archive/by-artist/[artist]/recordings.html
   - archive/by-place/[place]/index.html
   - archive/by-place/[place]/recordings.html
    ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   JUKEBOX MINI-PLAYER LOADER
   ───────────────────────────────────────────────
   Loads assets/jukebox.css and assets/jukebox.js
   on every page that has a <nav> element.
   Arcade games don't load nav.js, so they're
   automatically excluded.
   ═══════════════════════════════════════════════ */

(function () {
    const nav = document.querySelector('nav');
    if (!nav || document.body.classList.contains('no-jukebox')) return;

    // Compute base path to site root from current page
    const depth = window.location.pathname.split('/').length - 2;
    const root = depth > 0 ? '../'.repeat(depth) : '';

    // Load CSS immediately — prevents FOUT when widget is created
    let cssReady;
    if (!document.querySelector('link[href*="jukebox.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = root + 'assets/jukebox.css';
        cssReady = new Promise((resolve) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
        });
        document.head.appendChild(link);
    } else {
        cssReady = Promise.resolve();
    }

    // Defer JS loading until browser is idle — widget is small and non-essential
    function loadJukeboxJS() {
        if (!document.querySelector('script[src*="jukebox.js"]')) {
            window.__jukeboxReady = cssReady.then(() => new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = root + 'assets/jukebox.js';
                script.onload = resolve;
                script.onerror = resolve;
                document.body.appendChild(script);
            }));
        } else {
            window.__jukeboxReady = Promise.resolve();
        }
    }

    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadJukeboxJS, { timeout: 2000 });
    } else {
        setTimeout(loadJukeboxJS, 100);
    }
})();

/* ═══════════════════════════════════════════════
   SEARCH LOADER
   ───────────────────────────────────────────────
   Loads assets/search.css and assets/search.js
   on every page that has a <nav> element.
   ═══════════════════════════════════════════════ */

(function () {
    const nav = document.querySelector('nav');
    if (!nav || document.body.classList.contains('no-search')) return;

    const depth = window.location.pathname.split('/').length - 2;
    const root = depth > 0 ? '../'.repeat(depth) : '';

    /* Load CSS, keeping a promise for when it's actually applied. */
    let cssReady;
    if (!document.querySelector('link[href*="search.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = root + 'assets/search.css';
        cssReady = new Promise((resolve) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
        });
        document.head.appendChild(link);
    } else {
        cssReady = Promise.resolve();
    }

    /* Load JS only once the stylesheet is live — same unstyled-markup race as
       the jukebox above. */
    if (!document.querySelector('script[src*="search.js"]')) {
        cssReady.then(() => {
            const script = document.createElement('script');
            script.src = root + 'assets/search.js';
            document.body.appendChild(script);
        });
    }
})();

/* ═══════════════════════════════════════════════
    HIT COUNTER LOADER
    ───────────────────────────────────────────────
    Loads assets/counter-client.js on every page
    that has a <nav> element. Increments the
    counter once per session (fire-and-forget).
    Deferred via requestIdleCallback to avoid
    competing with critical rendering.
    ═══════════════════════════════════════════════ */

(function () {
    const nav = document.querySelector('nav');
    if (!nav || document.body.classList.contains('no-counter')) return;

    const depth = window.location.pathname.split('/').length - 2;
    const root = depth > 0 ? '../'.repeat(depth) : '';

    function loadCounter() {
        if (!document.querySelector('script[src*="counter-client.js"]')) {
            const script = document.createElement('script');
            script.src = root + 'assets/counter-client.js';
            script.onload = function () {
                if (window.CounterClient) CounterClient.increment();
            };
            document.body.appendChild(script);
        }
    }

    if ('requestIdleCallback' in window) {
        requestIdleCallback(loadCounter, { timeout: 2000 });
    } else {
        setTimeout(loadCounter, 100);
    }
})();

/* ── ABSOLUTIZE NAV HREFS ──
   Convert all <nav> links to absolute paths so
   they survive pushState URL changes from the SPA
   router. Must run before the SPA router inits.  ── */
document.querySelectorAll('nav a[href]').forEach(a => {
    try {
        const url = new URL(a.getAttribute('href'), location.href);
        if (url.origin === location.origin) a.href = url.pathname;
    } catch {}
});

/* ═══════════════════════════════════════════════
   SPA-STYLE AJAX ROUTER
   ───────────────────────────────────────────────
   Intercepts same-site <a> clicks, fetches the
   target page, parses it, swaps <main> content,
   and manages CSS/script lifecycle. Audio in <nav>
   persists across navigations.
   ═══════════════════════════════════════════════ */

(function () {
    const mainEl = document.querySelector('main');
    const navEl  = document.querySelector('nav');
    if (!mainEl || !navEl) return;

    const SPA = 'data-spa';

    /* ── GLOBAL CSS: never removed ── */
    const GLOBAL_CSS_PATTERNS = [
        'style.css',
        'assets/archive.css',
        'assets/jukebox.css',
        'assets/jukebox.min',
        'assets/search.css',
        'fonts/'
    ];

    /* ── EXCLUDED PATHS: full page load ── */
    const EXCLUDE_PATHS = ['/arcade/', '/by-contributor/', '/by-label/', '/tools/'];

    /* ── HELPERS ── */
    function abs(href, base) {
        try { return new URL(href, base).href; } catch { return href; }
    }

    function isGlobal(href) {
        return GLOBAL_CSS_PATTERNS.some(p => href.includes(p));
    }

    function shouldExclude(path) {
        return EXCLUDE_PATHS.some(p => path.includes(p));
    }

    function isSPAEligible(a) {
        if (!a) return false;
        if (a.target === '_blank' || a.hasAttribute('download')) return false;
        const h = a.getAttribute('href');
        if (!h || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#')) return false;
        try {
            const url = new URL(h, location.href);
            if (url.origin !== location.origin) return false;
            if (shouldExclude(url.pathname)) return false;
            if (url.pathname === location.pathname && !url.hash) return false;
            return true;
        } catch { return false; }
    }

    async function fetchDoc(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status + ' ' + url);
        return new DOMParser().parseFromString(await r.text(), 'text/html');
    }

    /* ── CSS MANAGEMENT ── */
    function collectHrefs(doc, base) {
        const set = new Set();
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            const h = el.getAttribute('href');
            if (h) set.add(abs(h, base));
        });
        return set;
    }

    function swapCSS(doc, baseURL) {
        const newHrefs = collectHrefs(doc, baseURL);
        const loadPromises = [];

        // Collect the outgoing page's CSS but DON'T remove it yet. These files
        // hold the per-artist/per-place palette (the :root --xx-* vars) and the
        // sub-page layout; dropping them here would leave the still-visible old
        // content unstyled for the length of the stylesheet fetch — the page
        // title falls back to the archive default and the breadcrumb jumps to
        // the top-left corner. The caller removes these via dropStale() only
        // once the new sheets are live and the new content is in the DOM.
        const stale = [];
        document.querySelectorAll('link[' + SPA + ']').forEach(el => {
            const existingAbs = abs(el.getAttribute('href'), location.href);
            if (!newHrefs.has(existingAbs)) stale.push(el);
        });
        document.querySelectorAll('style[' + SPA + ']').forEach(e => stale.push(e));
        // Template-injected <style> tags from the outgoing page (no data-spa).
        document.querySelectorAll('head style:not([' + SPA + '])').forEach(e => stale.push(e));

        // Add new page-specific CSS — appended after the outgoing sheets, so
        // during the brief overlap the incoming rules win on source order.
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            const raw = el.getAttribute('href');
            if (!raw) return;
            const a = abs(raw, baseURL);
            if (isGlobal(a)) {
                if (!document.querySelector('link[href="' + a + '"]')) {
                    const c = document.createElement('link');
                    c.rel = 'stylesheet';
                    c.href = a;
                    loadPromises.push(new Promise(resolve => {
                        c.addEventListener('load', resolve, { once: true });
                        c.addEventListener('error', resolve, { once: true });
                    }));
                    document.head.appendChild(c);
                }
            } else {
                if (!document.querySelector('link[href="' + a + '"]')) {
                    const c = document.createElement('link');
                    c.rel = 'stylesheet';
                    c.href = a;
                    c.setAttribute(SPA, '');
                    loadPromises.push(new Promise(resolve => {
                        c.addEventListener('load', resolve, { once: true });
                        c.addEventListener('error', resolve, { once: true });
                    }));
                    document.head.appendChild(c);
                }
            }
        });

        // Add new inline styles
        doc.querySelectorAll('style').forEach(el => {
            const c = el.cloneNode(true);
            c.setAttribute(SPA, '');
            document.head.appendChild(c);
        });

        // `ready` resolves once every newly-added stylesheet has loaded (or
        // failed), so callers can wait for CSS to be ready before swapping in
        // content that depends on it. `dropStale` tears down the outgoing
        // page's CSS and must be called synchronously alongside the content
        // swap, so the browser never paints an unstyled in-between state.
        return {
            ready: Promise.all(loadPromises),
            dropStale: () => stale.forEach(el => el.remove()),
        };
    }

    /* ── SCRIPT MANAGEMENT ── */
    async function runScripts(doc, baseURL) {
        const configs   = [];
        const externals = [];
        const inits     = [];

        doc.querySelectorAll('head script:not([src])').forEach(s => {
            const t = s.textContent.trim();
            if (t && !t.includes('NAV_CONFIG')) configs.push(t);
        });

        // Collect head external scripts (e.g. MathJax CDN)
        doc.querySelectorAll('head script[src]').forEach(s => {
            const src = abs(s.getAttribute('src'), baseURL);
            if (src && !src.includes('nav.js') && !src.includes('jukebox')) {
                externals.push(src);
            }
        });

        doc.querySelectorAll('body script').forEach(s => {
            const src = s.getAttribute('src');
            if (src) {
                if (!src.includes('nav.js') && !src.includes('jukebox.js') && !src.includes('jukebox.css')) {
                    externals.push(abs(src, baseURL));
                }
            } else {
                const t = s.textContent.trim();
                if (t && !t.includes('NAV_CONFIG')) {
                    // Config scripts (window.*_CONFIG = ...) must run before templates
                    if (/window\.[A-Z_]+CONFIG\s*=/.test(t)) {
                        configs.push(t);
                    } else {
                        inits.push(t);
                    }
                }
            }
        });

        for (const t of configs) {
            // Special handling: MathJax config — merge macros without destroying runtime
            if (t.includes('MathJax') && t.includes('tex')) {
                try {
                    const valueStr = t.replace(/MathJax\s*=\s*/, '');
                    const cfg = new Function('return (' + valueStr + ')')();
                    if (cfg && cfg.tex && cfg.tex.macros && MathJax.config && MathJax.config.tex) {
                        if (!MathJax.config.tex.macros) MathJax.config.tex.macros = {};
                        Object.assign(MathJax.config.tex.macros, cfg.tex.macros);
                    }
                } catch (e) { console.warn('SPA MathJax config:', e); }
                continue;
            }
            const m = t.match(/window\.([\w]+)\s*=\s*([\s\S]+?)\s*;?\s*$/);
            if (m) {
                const varName = m[1];
                const valueStr = m[2];
                if (window[varName] !== undefined) {
                    try { delete window[varName]; } catch {}
                }
                try { window[varName] = new Function('return (' + valueStr + ')')(); } catch (e) { console.warn('SPA config:', e); }
            }
        }

        for (const src of externals) {
            try {
                const bustSrc = src + (src.includes('?') ? '&' : '?') + '_spa=' + Date.now();
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = bustSrc;
                    s.onload = () => { s.remove(); res(); };
                    s.onerror = () => { s.remove(); rej(); };
                    document.body.appendChild(s);
                });
            } catch (e) { console.warn('SPA external:', src, e); }
        }

        for (const t of inits) {
            try { new Function(t)(); } catch (e) { console.warn('SPA init:', e); }
        }
    }

    /* ── NAVIGATION ── */
    let navigating = false;
    // Monotonic token identifying the current page instance. Templates capture
    // this at load time and compare before mutating shared DOM (e.g. footer
    // attribution badges) from a slow-finishing async fetch, so stale work from
    // a page the user has already left can't write into the current page.
    window.__mcNavId = window.__mcNavId || 0;

    async function navigate(url, push) {
        if (navigating) return;
        navigating = true;

        try {
            if (typeof window.__pageCleanup === 'function') {
                window.__pageCleanup();
                window.__pageCleanup = null;
            }
            window.__MB_CACHE = null;
            window.__mcPageAborted = true;
            window.__mcNavId++;

            // Reset scroll lock from lightboxes
            document.body.style.overflow = '';

            const doc = await fetchDoc(url);

            // Load the incoming CSS first; the outgoing page keeps its own
            // styles (and colors) until the commit block below.
            const css = swapCSS(doc, url);
            await css.ready;

            // Update favicon. Read the raw attribute and resolve it against the
            // TARGET url: fetchDoc() builds `doc` with DOMParser, and a DOMParser
            // document inherits the baseURI of the page that created it — the one
            // we're leaving — so newFavicon.href would resolve against the old
            // path and 404 on any deep→shallow navigation. Same reason
            // collectHrefs() and runScripts() go through abs().
            const newFavicon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            const newFaviconHref = newFavicon && newFavicon.getAttribute('href');
            if (newFaviconHref) {
                // Replace rather than mutate: assigning .href on the live element
                // is unreliable (Safari/Firefox often keep the committed icon).
                // Removing every match also stops duplicates accumulating when a
                // page uses rel="shortcut icon".
                document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
                    .forEach(el => el.remove());
                const favicon = document.createElement('link');
                favicon.rel = 'icon';
                favicon.href = abs(newFaviconHref, url);
                const faviconType = newFavicon.getAttribute('type');
                if (faviconType) favicon.type = faviconType;
                document.head.appendChild(favicon);
            }

            const newMain = doc.querySelector('main');
            if (newMain) {
                // Resolve relative src/href to absolute using target page URL.
                // Operates on the detached document, so nothing is visible yet.
                newMain.querySelectorAll('[src]').forEach(el => {
                    const src = el.getAttribute('src');
                    if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                        el.setAttribute('src', new URL(src, url).href);
                    }
                });
                newMain.querySelectorAll('[href]').forEach(el => {
                    const href = el.getAttribute('href');
                    if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                        el.setAttribute('href', new URL(href, url).href);
                    }
                });
            }

            const newFooter = doc.querySelector('footer');
            const curFooter = document.querySelector('footer');

            // ── COMMIT ──────────────────────────────────────────────────
            // Body class, content and the old-CSS teardown all happen in one
            // synchronous block. No await in here, so the browser cannot paint
            // a half-swapped page: the outgoing content is never shown with the
            // incoming body class, and never shown with its own CSS removed.
            document.body.className = doc.body.className;

            // Sync <meta name="referrer"> from incoming page so referrer
            // policy doesn't leak across SPA navigations.
            document.querySelectorAll('meta[name="referrer"]').forEach(m => m.remove());
            const incomingReferrer = doc.querySelector('meta[name="referrer"]');
            if (incomingReferrer) {
                document.head.appendChild(incomingReferrer.cloneNode(true));
            }

            if (newMain) mainEl.innerHTML = newMain.innerHTML;
            if (newFooter && curFooter) curFooter.innerHTML = newFooter.innerHTML;
            css.dropStale();
            // ────────────────────────────────────────────────────────────

            // Hide chat widget on non-arcade pages
            const chatWidget = document.getElementById('arcadeChatWidget');
            if (chatWidget) {
                chatWidget.style.display = url.includes('/arcade/') ? '' : 'none';
            }

            document.title = doc.title;

            await runScripts(doc, url);
            window.__mcPageAborted = false;

            // Re-render MathJax if present (for pages with equations)
            if (window.MathJax) {
                const doTypeset = async () => {
                    if (MathJax.typesetClear) MathJax.typesetClear();
                    if (MathJax.typesetPromise) await MathJax.typesetPromise();
                };
                if (MathJax.typesetPromise) {
                    try { await doTypeset(); } catch (e) {}
                } else if (MathJax.startup) {
                    await new Promise(r => {
                        const check = setInterval(() => {
                            if (MathJax.typesetPromise) { clearInterval(check); doTypeset().then(r).catch(r); }
                        }, 100);
                        setTimeout(() => { clearInterval(check); r(); }, 5000);
                    });
                }
            }

            if (push) history.pushState({ spa: true }, '', url);

            // Re-inject jukebox widget if missing after SPA navigation
            if (!document.querySelector('.mcj') && window.__jukeboxReady) {
                await window.__jukeboxReady;
                if (typeof window.__initJukeboxPlayer === 'function' && !document.querySelector('.mcj')) {
                    window.__initJukeboxPlayer();
                }
            }

            window.scrollTo(0, 0);

        } catch (e) {
            console.error('SPA nav failed:', e);
            location.href = url;
        } finally {
            navigating = false;
        }
    }

    /* ── CLICK INTERCEPTION ── */
    document.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        const a = e.target.closest('a');
        if (!isSPAEligible(a)) return;
        e.preventDefault();

        // Close mobile menu
        const nl = document.getElementById('navLinks');
        if (nl) {
            nl.classList.remove('open');
            nl.querySelectorAll('li.open').forEach(li => li.classList.remove('open'));
        }

        navigate(abs(a.getAttribute('href'), location.href), true);
    });

    /* ── BACK/FORWARD ── */
    window.addEventListener('popstate', function (e) {
        navigate(location.href, false);
    });

    /* ── TAG INITIAL PAGE-SPECIFIC ELEMENTS ── */
    document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
        const h = el.getAttribute('href') || '';
        if (!isGlobal(h)) el.setAttribute(SPA, '');
    });
    document.querySelectorAll('style').forEach(el => {
        el.setAttribute(SPA, '');
    });
})();
