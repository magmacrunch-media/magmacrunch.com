/* ═══════════════════════════════════════════════
   magmacrunch media — place links page template
   templates/place_links.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer) and links
   templates/artist-links.css for styling. This script
   populates the dynamic stub elements (breadcrumb,
   sub-nav, place label, links body) — no fetch, no
   entity-map.js dependency; link content is static
   config, not a MusicBrainz API query.

   Requires window.PLACE_CONFIG (defined in stub) = {
     name:      string   — full place name
     abbr:      string   — short label
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     links:     Array<{
       section: string,           — e.g. 'MUSICBRAINZ', 'BANDCAMP'
       items: Array<{
         id:    string,  — MusicBrainz place ID (url auto-built if no `url` given)
         url:   string,  — explicit external URL (Bandcamp, Discogs, etc.)
         name:  string,  — display name (list mode, >1 item in section)
         abbr:  string,  — short badge (list mode, >1 item in section)
         label: string,  — button text (single mode, exactly 1 item in section)
       }>
     }>
   }

   Rendering rule per section (auto-detected from item count):
     items.length === 1  → single .mb-link-card
     items.length  >  1  → .mb-links-list of .mb-link-item (abbr + name)
   (A place is a single entity, not a collective, so list mode is unlikely
   in practice, but the same auto-detected rendering as artist_links.js is
   kept for consistency in case a place ever needs to list multiple
   affiliated entities.)
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.PLACE_CONFIG;
    if (!C) { console.error('place_links.js: window.PLACE_CONFIG is not defined'); return; }

    const d = C.depth || '../../../';

    const COLOR_MAP = {
        about:      'c-about',
        links:      'c-links',
        photography: 'c-photography',
        events:     'c-events',
        recordings: 'c-recordings',
        works:      'c-works',
        personnel:  'c-personnel',
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
            ...(C.siblings || []).filter(s => s !== 'links').map(s =>
                `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${s}</a>`
            )
        ].join('\n');
    }

    // links body
    const linksBodyEl = document.getElementById('links-body');
    if (linksBodyEl && Array.isArray(C.links)) {
        linksBodyEl.innerHTML = C.links.map(section => {
            const items = section.items || [];
            const heading = `<div class="section-label">${esc(section.section)}</div>`;
            if (items.length > 1) {
                const rows = items.map(item => {
                    const url = item.url || (item.id ? `https://musicbrainz.org/place/${esc(item.id)}` : '#');
                    return `<a href="${url}" target="_blank" rel="noopener" class="mb-link-item">
                        <span class="mb-link-abbr">${esc(item.abbr || '')}</span>
                        <span class="mb-link-name">${esc(item.name || '')}</span>
                    </a>`;
                }).join('\n');
                return `${heading}<div class="mb-links-list">${rows}</div>`;
            }
            const item = items[0] || {};
            const url = item.url || (item.id ? `https://musicbrainz.org/place/${esc(item.id)}` : '#');
            const label = item.label || (item.id ? '▶ view on MusicBrainz' : '▶ view');
            return `${heading}<a href="${url}" target="_blank" rel="noopener" class="mb-link-card">${esc(label)}</a>`;
        }).join('\n');
    }
})();
