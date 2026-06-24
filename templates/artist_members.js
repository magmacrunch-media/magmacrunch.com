/* ═══════════════════════════════════════════════
   magmacrunch media — artist members sidebar
   templates/artist_members.js

   Fetches member data from MusicBrainz and renders
   a floated sidebar into #artist-sidebar.

   Requires window.ARTIST_CONFIG = { id, name }

   Works with SPA navigation: uses MutationObserver
   to re-run when sidebar element appears in DOM.
   ═══════════════════════════════════════════════ */

(function () {
    let lastConfigId = null;

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function fetchJSON(url) {
        return fetch(url).then(function(r) {
            if (!r.ok) throw new Error('API error: ' + r.status);
            return r.json();
        });
    }

    function delay(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    function render(sidebar, allMembers, subgroups, C) {
        if (!allMembers.length) return;

        const groups = {};
        allMembers.forEach(function(m) {
            const id = m.artist.id;
            if (!groups[id]) groups[id] = { name: m.artist.name, roles: [], projects: [], begin: null };
            const attrs = (m.attributes || []).filter(Boolean);
            attrs.forEach(function(a) {
                if (groups[id].roles.indexOf(a) === -1) groups[id].roles.push(a);
            });
            if (m.project && groups[id].projects.indexOf(m.project) === -1) {
                groups[id].projects.push(m.project);
            }
            if (m.begin && (!groups[id].begin || m.begin < groups[id].begin)) {
                groups[id].begin = m.begin;
            }
        });

        let html = '<div class="members-label">// members //</div>';
        Object.keys(groups).forEach(function(id) {
            const g = groups[id];
            const roles = g.roles.length ? esc(g.roles.join(', ')) : '';
            const year = g.begin ? 'est. ' + esc(g.begin.split('-')[0]) : '';
            const meta = [roles, year].filter(Boolean).join(' &mdash; ');
            html += '<div class="member-entry">';
            html += '<div class="member-name">' + esc(g.name) + '</div>';
            if (meta) html += '<div class="member-meta">' + meta + '</div>';
            html += '</div>';
        });

        if (subgroups.length) {
            html += '<div class="members-label" style="margin-top:14px;">// projects //</div>';
            html += '<div class="member-entry">';
            html += '<div class="member-name">' + esc(C.name) + '</div>';
            html += '</div>';
            subgroups.forEach(function(r) {
                html += '<div class="member-entry">';
                html += '<div class="member-name">' + esc(r.artist.name) + '</div>';
                html += '</div>';
            });
        }

        sidebar.innerHTML = html;
        sidebar.style.display = 'block';
    }

    function fetchAndRender(sidebar) {
        const C = window.ARTIST_CONFIG;
        if (!C || !C.id) return;
        if (lastConfigId === C.id && sidebar.innerHTML.trim() !== '') return;
        lastConfigId = C.id;

        const API = 'https://musicbrainz.org/ws/2/artist/' + C.id + '?fmt=json&inc=artist-rels';

        fetchJSON(API)
            .then(function(data) {
                const rels = data.relations || [];
                const members = rels.filter(function(r) {
                    return r['target-type'] === 'artist' && r.artist && r.type === 'member of band';
                });
                members.forEach(function(m) { m.project = C.name; });

                const subgroups = rels.filter(function(r) {
                    return r['target-type'] === 'artist' && r.artist && r.type === 'subgroup';
                });

                const subgroupFetches = subgroups.map(function(sg, i) {
                    return delay(1100 * i).then(function() {
                        return fetchJSON('https://musicbrainz.org/ws/2/artist/' + sg.artist.id + '?fmt=json&inc=artist-rels');
                    }).then(function(sgData) {
                        const sgMembers = (sgData.relations || []).filter(function(r) {
                            return r['target-type'] === 'artist' && r.artist && r.type === 'member of band';
                        });
                        sgMembers.forEach(function(m) { m.project = sg.artist.name; });
                        return sgMembers;
                    }).catch(function() { return []; });
                });

                return Promise.all(subgroupFetches).then(function(sgResults) {
                    const allMembers = members.concat([].concat.apply([], sgResults));
                    render(sidebar, allMembers, subgroups, C);
                });
            })
            .catch(function(e) {
                console.warn('artist_members.js:', e.message);
                sidebar.style.display = 'none';
            });
    }

    /* Run immediately if sidebar already exists */
    const existing = document.getElementById('artist-sidebar');
    if (existing) fetchAndRender(existing);

    /* Watch for sidebar being added to DOM (SPA navigation) */
    const observer = new MutationObserver(function(mutations) {
        for (let i = 0; i < mutations.length; i++) {
            const nodes = mutations[i].addedNodes;
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                if (node.id === 'artist-sidebar') {
                    fetchAndRender(node);
                    return;
                }
                if (node.querySelector) {
                    const found = node.querySelector('#artist-sidebar');
                    if (found) {
                        fetchAndRender(found);
                        return;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
