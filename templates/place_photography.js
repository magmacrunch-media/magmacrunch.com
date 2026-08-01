/* ═══════════════════════════════════════════════
   magmacrunch media — place photography page template
   templates/place_photography.js

   The stub HTML file provides the static structure (nav, main
   skeleton, footer) and links templates/artist-photography.css
   for styling. This script populates the dynamic stub elements
   (breadcrumb, sub-nav, place label) and renders the full photo
   gallery — sections, strips, drag-to-scroll, and one shared
   lightbox — from config. No fetch, no entity-map.js dependency;
   photo content is curated, not MusicBrainz data.

   Requires window.PLACE_CONFIG (defined in stub) = {
     name:      string   — full place name
     abbr:      string   — short label
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     photography: Array<{
       section: string,   — e.g. 'THE BACKYARD SESSIONS'
       photos: Array<{
         src:     string,               — image path
         alt:     string,               — alt text
         caption: string,               — shown on hover (strip) and below image (lightbox)
         aspect:  'landscape'|'square'|'wide',  — strip thumbnail aspect ratio
       }>
     }>
   }

   The stub's <main> needs one empty mount point in addition to the
   usual breadcrumb/label/sub-nav stubs:
     <div id="photography-body"></div>

   Lightbox navigation stays scoped to the section it was opened
   from — prev/next cycle within that section's photos, not across
   section boundaries. Portrait images are detected automatically at
   display time (naturalHeight > naturalWidth), not from config.
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.PLACE_CONFIG;
    if (!C) { console.error('place_photography.js: window.PLACE_CONFIG is not defined'); return; }

    const d = C.depth || '../../../';

    const COLOR_MAP = {
        about:       'c-about',
        links:       'c-links',
        photography: 'c-photography',
        events:      'c-events',
        recordings:  'c-recordings',
        works:       'c-works',
        personnel:   'c-personnel',
    };

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // breadcrumb
    const breadcrumbEl = document.querySelector('.breadcrumb');
    if (breadcrumbEl) {
        breadcrumbEl.innerHTML = `
            <a href="${d}archive/">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-place/">by place</a>
            <span class="sep">›</span>
            <a href="./">${esc((C.abbr || '').toLowerCase())}</a>
        `;
    }

    // place label
    const placeLabelEl = document.getElementById('place-label');
    if (placeLabelEl) placeLabelEl.textContent = `// ${C.name} //`;

    // sub-nav
    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="./" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'photography').map(s =>
                `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${s}</a>`
            )
        ].join('\n');
    }

    // ══════════════════════════════════════════
    // PHOTO GALLERY
    // ══════════════════════════════════════════
    const bodyEl = document.getElementById('photography-body');
    const sections = Array.isArray(C.photography) ? C.photography : [];
    if (!bodyEl || !sections.length) return;

    // one shared lightbox for every section on the page
    const lb = document.createElement('div');
    lb.className = 'photo-lightbox';
    lb.id = 'photo-lightbox';
    lb.innerHTML = `
        <button class="lb-close" id="lbClose">[ close ]</button>
        <div class="lb-img-wrap"><img id="lbImg" src="" alt=""></div>
        <div class="lb-cap" id="lbCap"></div>
        <div class="lb-nav">
            <button class="lb-btn" id="lbPrev">← prev</button>
            <span class="lb-counter" id="lbCounter"></span>
            <button class="lb-btn" id="lbNext">next →</button>
        </div>
    `;
    document.querySelector('main').appendChild(lb);

    const lbImg = lb.querySelector('#lbImg');
    const lbCap = lb.querySelector('#lbCap');
    const lbCount = lb.querySelector('#lbCounter');
    const lbImgWrap = lb.querySelector('.lb-img-wrap');
    let currentPhotoSet = [];
    let current = 0;

    function openLightbox(photos, i) {
        currentPhotoSet = photos;
        current = i;
        showPhoto();
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        lb.classList.remove('open');
        document.body.style.overflow = '';
    }
    function showPhoto() {
        const p = currentPhotoSet[current];
        lbImg.src = p.src;
        lbImg.alt = p.alt || '';
        lbCap.textContent = p.caption || '';
        lbCount.textContent = `${current + 1} / ${currentPhotoSet.length}`;
        lbImgWrap.classList.remove('vertical');
        if (lbImg.complete && lbImg.naturalWidth && lbImg.naturalHeight) {
            if (lbImg.naturalHeight > lbImg.naturalWidth) lbImgWrap.classList.add('vertical');
        }
        lbImg.onload = () => {
            lbImgWrap.classList.toggle('vertical', lbImg.naturalHeight > lbImg.naturalWidth);
        };
    }
    function navLightbox(dir) {
        current = (current + dir + currentPhotoSet.length) % currentPhotoSet.length;
        showPhoto();
    }

    lb.querySelector('#lbClose').addEventListener('click', closeLightbox);
    lb.querySelector('#lbPrev').addEventListener('click', () => navLightbox(-1));
    lb.querySelector('#lbNext').addEventListener('click', () => navLightbox(1));
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', e => {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape')     closeLightbox();
        if (e.key === 'ArrowLeft')  navLightbox(-1);
        if (e.key === 'ArrowRight') navLightbox(1);
    });

    function initStrip(photos, strip, wrap, hint) {
        if (!photos.length) {
            strip.innerHTML = '<div class="photo-strip-empty">no photos yet — check back soon</div>';
            hint.style.display = 'none';
            return;
        }

        photos.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = `photo-item ${esc(p.aspect || 'wide')}`;
            item.dataset.index = i;
            item.innerHTML = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"><div class="photo-caption">${esc(p.caption)}</div>`;
            strip.appendChild(item);
        });

        let isDown = false, startX, scrollLeft;
        strip.addEventListener('mousedown', e => { isDown = true; strip.classList.add('dragging'); startX = e.pageX - strip.offsetLeft; scrollLeft = strip.scrollLeft; });
        strip.addEventListener('mouseleave', () => { isDown = false; strip.classList.remove('dragging'); });
        strip.addEventListener('mouseup',    () => { isDown = false; strip.classList.remove('dragging'); });
        strip.addEventListener('mousemove',  e => { if (!isDown) return; e.preventDefault(); strip.scrollLeft = scrollLeft - (e.pageX - strip.offsetLeft - startX) * 1.2; });
        strip.addEventListener('scroll', () => { if (strip.scrollLeft > 30) wrap.classList.add('scrolled'); }, { passive: true });

        strip.querySelectorAll('.photo-item').forEach(item => {
            item.addEventListener('click', () => {
                if (!strip.classList.contains('dragging')) openLightbox(photos, parseInt(item.dataset.index, 10));
            });
        });
    }

    sections.forEach((section, i) => {
        if (i > 0) bodyEl.insertAdjacentHTML('beforeend', '<div class="divider"></div>');

        const sectionEl = document.createElement('div');
        sectionEl.className = 'photo-strip-section';
        sectionEl.innerHTML = `
            <div class="section-label">${esc(section.section)}</div>
            <div class="photo-strip-wrap" id="photo-strip-wrap-${i}">
                <div class="photo-strip" id="photo-strip-${i}"></div>
                <div class="strip-scroll-hint" id="photo-strip-hint-${i}">← drag to scroll →</div>
            </div>
        `;
        bodyEl.appendChild(sectionEl);

        initStrip(
            section.photos || [],
            sectionEl.querySelector(`#photo-strip-${i}`),
            sectionEl.querySelector(`#photo-strip-wrap-${i}`),
            sectionEl.querySelector(`#photo-strip-hint-${i}`)
        );
    });
})();
