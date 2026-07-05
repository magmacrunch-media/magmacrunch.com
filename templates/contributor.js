/* ── contributor.js — shared template for by-contributor pages ── */
/* Requires: window.__CONTRIBUTOR_CONFIG = { MB_ID, NAME, ARCHIVE_LINKS, accent?, STATIC_SECTIONS?, TMDB_ID? } */

(function() {
    var config = window.__CONTRIBUTOR_CONFIG;
    if (!config || !config.MB_ID) return;

    var MB_ID = config.MB_ID;
    var TMDB_ID = config.TMDB_ID;
    var ARCHIVE_LINKS = config.ARCHIVE_LINKS || {};
    var ENTITY_MAP = window.__ENTITY_MAP || {};
    var accent = config.accent || 'cyan';
    var API = 'https://musicbrainz.org/ws/2/artist/' + MB_ID + '?fmt=json&inc=artist-rels';
    var contentEl = document.getElementById('content');
    var idsEl = document.getElementById('contrib-ids');

    /* ── HELPERS ── */

    function archiveLink(artist) {
        var link = ENTITY_MAP[artist.id] || ARCHIVE_LINKS[artist.id];
        if (link) return '<a href="' + link + '">' + esc(artist.name) + '</a>';
        return '<a href="https://musicbrainz.org/artist/' + esc(artist.id) + '" target="_blank" rel="noopener">' + esc(artist.name) + '</a>';
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function formatDate(d) {
        if (!d) return '';
        return d.split('-')[0];
    }

    function dateRange(begin, end, ended) {
        var b = formatDate(begin);
        var e = ended ? formatDate(end) : 'present';
        if (!b && e === 'present') return 'present';
        if (!b) return e;
        if (b === e) return b;
        return b + ' — ' + e;
    }

    function renderSection(title, html) {
        if (!html) return '';
        return '<div class="section">' +
            '<div class="section-divider"></div>' +
            '<div class="section-title">// ' + title + ' //</div>' +
            html +
            '</div>';
    }

    function renderCreditSection(title, items) {
        if (!items || items.length === 0) return '';
        return '<details class="credit-section">' +
            '<summary class="credit-header">' +
                '<span class="credit-arrow">▶</span>' +
                '<div class="section-title">// ' + title + ' //</div>' +
                '<span class="credit-count">(' + items.length + ')</span>' +
            '</summary>' +
            '<ul class="credit-list">' +
                items.map(function(item) {
                    var html = item.html;
                    if (item.year) html += '<span class="credit-sub">' + esc(item.year) + '</span>';
                    if (item.roles && item.roles.length > 0) {
                        var filtered = item.roles.filter(function(r) {
                            var lower = r.toLowerCase();
                            return !lower.includes('original') && !lower.includes('additional');
                        });
                        if (filtered.length > 0) html += '<span class="credit-sub">— ' + esc(filtered.join(', ')) + '</span>';
                    }
                    if (item.versions && item.versions.length > 0) {
                        html += '<span class="credit-sub credit-versions">· original, ' + esc(item.versions.join(', ')) + '</span>';
                    }
                    return '<li>' + html + '</li>';
                }).join('') +
            '</ul>' +
            '</details>';
    }

    function renderEntry(artist, attrs, begin, end, ended, role) {
        var dates = dateRange(begin, end, ended);

        var roleHtml = '';
        if (role === 'supporting') {
            roleHtml = '<div class="entry-role">(session / supporting)</div>';
        }

        var instrumentsHtml = '';
        if (attrs && attrs.length > 0) {
            var tags = attrs.filter(function(a) {
                var lower = a.toLowerCase();
                return !lower.includes('original') && !lower.includes('additional') &&
                    lower !== 'member of band' && lower !== 'instrumental supporting musician';
            }).map(function(a) {
                return '<span class="instrument-tag">' + esc(a) + '</span>';
            }).join('');
            instrumentsHtml = '<div class="entry-instruments">' +
                '<div class="label">instruments / roles</div>' +
                tags +
                '</div>';
        }

        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">▶</span>' +
                '<span class="entry-name">' + archiveLink(artist) + '</span>' +
                '<span class="entry-dates">' + esc(dates) + '</span>' +
            '</summary>' +
            '<div class="entry-body">' + roleHtml + instrumentsHtml + '</div>' +
            '</details>';
    }

    function renderSimpleEntry(artist) {
        var link = archiveLink(artist);
        return '<li>' + link + '</li>';
    }

    function renderLabelEntry(label, roles, begin, end, ended) {
        var dates = dateRange(begin, end, ended);
        var link = '<a href="https://musicbrainz.org/label/' + label.id + '" target="_blank" rel="noopener">' + esc(label.name) + '</a>';
        var roleTags = roles.map(function(r) {
            return '<span class="instrument-tag">' + esc(r) + '</span>';
        }).join('');
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + link + '</span>' +
                '<span class="entry-dates">' + esc(dates) + '</span>' +
            '</summary>' +
            '<div class="entry-body">' +
                '<div class="entry-instruments">' +
                    '<div class="label">roles</div>' + roleTags +
                '</div>' +
            '</div>' +
            '</details>';
    }

    function renderStaticLabelEntry(item) {
        var link = item.url ? '<a href="' + esc(item.url) + '">' + esc(item.name) + '</a>' : esc(item.name);
        var dates = item.dates ? esc(item.dates) : '';
        var roleTags = '';
        if (item.roles && item.roles.length > 0) {
            roleTags = '<div class="entry-instruments">' +
                '<div class="label">roles</div>' +
                item.roles.map(function(r) {
                    return '<span class="instrument-tag">' + esc(r) + '</span>';
                }).join('') +
                '</div>';
        }
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + link + '</span>' +
                (dates ? '<span class="entry-dates">' + dates + '</span>' : '') +
            '</summary>' +
            (roleTags ? '<div class="entry-body">' + roleTags + '</div>' : '') +
            '</details>';
    }

    function renderStaticSection(section) {
        if (!section.items || section.items.length === 0) return '';
        var items = section.items.map(function(item) {
            return renderStaticLabelEntry(item);
        }).join('');
        return renderSection(section.title, items);
    }

    function renderStaticSections() {
        var staticSections = config.STATIC_SECTIONS;
        if (!staticSections || staticSections.length === 0) return '';
        return staticSections.map(renderStaticSection).join('');
    }

    function renderPlaceEntry(place, roles, begin, end, ended) {
        var dates = dateRange(begin, end, ended);
        var internalPath = ENTITY_MAP[place.id];
        var link = internalPath
            ? '<a href="' + internalPath + '">' + esc(place.name) + '</a>'
            : '<a href="https://musicbrainz.org/place/' + place.id + '" target="_blank" rel="noopener">' + esc(place.name) + '</a>';
        var location = place.area ? esc(place.area.name) : '';
        var type = place.type ? ' <span class="credit-sub">' + esc(place.type) + '</span>' : '';
        var roleTags = roles.map(function(r) {
            return '<span class="instrument-tag">' + esc(r) + '</span>';
        }).join('');
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + link + '</span>' +
                '<span class="entry-dates">' + esc(dates) + '</span>' +
            '</summary>' +
            '<div class="entry-body">' +
                '<div class="entry-instruments">' +
                    '<div class="label">roles</div>' + roleTags +
                '</div>' +
                (location ? '<div class="credit-sub">' + location + type + '</div>' : '') +
            '</div>' +
            '</details>';
    }

    function renderEventEntry(event, roles, begin, end, ended) {
        var dates = dateRange(begin, end, ended);
        var link = '<a href="https://musicbrainz.org/event/' + event.id + '" target="_blank" rel="noopener">' + esc(event.name) + '</a>';
        var roleTags = roles.map(function(r) {
            return '<span class="instrument-tag">' + esc(r) + '</span>';
        }).join('');
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + link + '</span>' +
                '<span class="entry-dates">' + esc(dates) + '</span>' +
            '</summary>' +
            '<div class="entry-body">' +
                '<div class="entry-instruments">' +
                    '<div class="label">roles</div>' + roleTags +
                '</div>' +
            '</div>' +
            '</details>';
    }

    function mergeRels(rels) {
        var begins = rels.map(function(r) { return r.begin; }).filter(Boolean).sort();
        var begin = begins[0] || null;
        var ends = rels.map(function(r) { return r.end; });
        var end = ends.indexOf(null) !== -1 ? null : ends.filter(Boolean).sort().reverse()[0];
        var ended = rels.every(function(r) { return r.ended; });
        var allAttrs = [];
        rels.forEach(function(r) {
            if (r.type && allAttrs.indexOf(r.type) === -1) allAttrs.push(r.type);
            (r.attributes || []).forEach(function(a) {
                if (allAttrs.indexOf(a) === -1) allAttrs.push(a);
            });
        });
        return { begin: begin, end: end, ended: ended, attributes: allAttrs };
    }

    function dedupCreditRels(rels, getTarget, getRoles) {
        var groups = {};
        rels.forEach(function(r) {
            var target = getTarget(r);
            if (!target) return;
            var id = target.id;
            if (!groups[id]) groups[id] = { target: target, rels: [] };
            groups[id].rels.push(r);
        });
        var results = [];
        Object.keys(groups).forEach(function(id) {
            var g = groups[id];
            var merged = mergeRels(g.rels);
            var roles = [];
            g.rels.forEach(function(r) {
                (getRoles(r) || []).forEach(function(a) {
                    if (roles.indexOf(a) === -1) roles.push(a);
                });
            });
            results.push({ target: g.target, begin: merged.begin, end: merged.end, ended: merged.ended, roles: roles });
        });
        results.sort(function(a, b) {
            return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
        });
        return results;
    }

    function dedupCreditRelsByVersion(rels, getTarget, getRoles) {
        var groups = {};
        rels.forEach(function(r) {
            var target = getTarget(r);
            if (!target) return;
            var key = target.title.toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });

        var results = [];
        Object.keys(groups).forEach(function(key) {
            var groupRels = groups[key];

            if (groupRels.length === 1) {
                var r = groupRels[0];
                var target = getTarget(r);
                var merged = mergeRels([r]);
                var roles = [];
                (getRoles(r) || []).forEach(function(a) { if (roles.indexOf(a) === -1) roles.push(a); });
                results.push({ html: creditLink(target, 'recording'), year: formatDate(merged.begin), roles: roles, versions: [] });
                return;
            }

            var original = null;
            var variantRels = [];
            groupRels.forEach(function(r) {
                var target = getTarget(r);
                var isOriginal = !target.video && !target.disambiguation;
                if (isOriginal && !original) {
                    original = r;
                } else {
                    variantRels.push(r);
                }
            });

            if (!original) {
                original = groupRels[0];
                variantRels = groupRels.slice(1);
            }

            var origTarget = getTarget(original);
            var origMerged = mergeRels([original]);
            var origRoles = [];
            (getRoles(original) || []).forEach(function(a) { if (origRoles.indexOf(a) === -1) origRoles.push(a); });

            var versionTags = [];
            variantRels.forEach(function(r) {
                var target = getTarget(r);
                var tag = target.disambiguation || (target.video ? 'video' : null);
                if (tag && versionTags.indexOf(tag) === -1) versionTags.push(tag);
            });

            results.push({ html: creditLink(origTarget, 'recording'), year: formatDate(origMerged.begin), roles: origRoles, versions: versionTags });
        });

        results.sort(function(a, b) {
            return (a.year || 'zzzz').localeCompare(b.year || 'zzzz');
        });
        return results;
    }

    function creditLink(target, type) {
        var path = type === 'work' ? 'work' : type === 'recording' ? 'recording' : 'release';
        return '<a href="https://musicbrainz.org/' + path + '/' + target.id + '" target="_blank" rel="noopener">' + esc(target.title) + '</a>';
    }

    /* ── TMDB ── */

    var LOCAL_FILM_MAP = {
        1721141: '../../by-artist/svfp/documentary.html',
    };

    var _tmdb = null;
    function loadTMDBCache() {
        if (!TMDB_ID) return Promise.resolve();
        return fetch('../../../archive/_cache/tmdb/person/' + TMDB_ID + '.json')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(j) { if (j && j.fetchedAt) _tmdb = j; })
            .catch(function() {});
    }

    function renderProfilePhoto() {
        if (!_tmdb || !_tmdb.profile_path) return;
        var header = document.querySelector('.contrib-header');
        if (!header) return;
        var img = document.createElement('img');
        img.className = 'contrib-profile-photo';
        img.src = 'https://image.tmdb.org/t/p/w185' + _tmdb.profile_path;
        img.alt = _tmdb.name + ' photo';
        img.loading = 'lazy';
        header.insertBefore(img, header.firstChild);
    }

    function tmdbFilmLink(credit) {
        var localPath = LOCAL_FILM_MAP[credit.id];
        if (localPath) {
            return '<a href="' + localPath + '">' + esc(credit.title) + '</a>';
        }
        var mediaType = credit.media_type || 'movie';
        var path = mediaType === 'tv' ? 'tv' : 'movie';
        return '<a href="https://www.themoviedb.org/' + path + '/' + credit.id + '" target="_blank" rel="noopener">' + esc(credit.title) + '</a>';
    }

    function renderTMDBSections() {
        if (!_tmdb || !_tmdb.credits) return '';
        var html = '';
        var cast = _tmdb.credits.cast || [];
        var crew = _tmdb.credits.crew || [];

        /* Group crew by department */
        var crewByDept = {};
        crew.forEach(function(c) {
            var dept = c.department || 'Other';
            if (!crewByDept[dept]) crewByDept[dept] = [];
            crewByDept[dept].push(c);
        });

        /* Department order */
        var deptOrder = ['Directing', 'Production', 'Crew', 'Sound', 'Camera', 'Editing', 'Lighting', 'Writing'];
        var depts = Object.keys(crewByDept);
        depts.sort(function(a, b) {
            var ai = deptOrder.indexOf(a);
            var bi = deptOrder.indexOf(b);
            if (ai === -1) ai = 99;
            if (bi === -1) bi = 99;
            return ai - bi;
        });

        /* Render crew departments */
        depts.forEach(function(dept) {
            var items = crewByDept[dept].map(function(c) {
                var year = c.release_date ? c.release_date.split('-')[0] : '';
                return { html: tmdbFilmLink(c), year: year, roles: [c.job] };
            });
            items.sort(function(a, b) { return (b.year || '0').localeCompare(a.year || '0'); });
            html += renderCreditSection(dept.toLowerCase(), items);
        });

        /* Render acting */
        if (cast.length > 0) {
            var items = cast.map(function(c) {
                var year = c.release_date ? c.release_date.split('-')[0] : '';
                var role = c.character || 'Self';
                return { html: tmdbFilmLink(c), year: year, roles: [role] };
            });
            items.sort(function(a, b) { return (b.year || '0').localeCompare(a.year || '0'); });
            html += renderCreditSection('acting', items);
        }

        return html;
    }

    function renderTMDBLink() {
        if (!_tmdb) return '';
        return '<a href="https://www.themoviedb.org/person/' + TMDB_ID + '" target="_blank" rel="noopener" class="mb-link tmdb-link">VIEW ON TMDB ↗</a>';
    }

    /* ── RENDER ── */

    function render(data, recordingData, workData, releaseData, labelData, placeData, eventData) {
        var rels = data.relations || [];

        var founders = [];
        var members = {};
        var supporting = {};
        var aliases = [];
        var seen = {};

        rels.forEach(function(r) {
            if (r['target-type'] !== 'artist' || !r.artist) return;

            if (r.type === 'founder' || r.type === 'is person') {
                var key = r.type + ':' + r.artist.id;
                if (seen[key]) return;
                seen[key] = true;
            }

            switch (r.type) {
                case 'founder':
                    founders.push(r);
                    if (!members[r.artist.id]) members[r.artist.id] = { artist: r.artist, rels: [] };
                    members[r.artist.id].rels.push(r);
                    break;
                case 'member of band':
                    if (!members[r.artist.id]) members[r.artist.id] = { artist: r.artist, rels: [] };
                    members[r.artist.id].rels.push(r);
                    break;
                case 'instrumental supporting musician':
                    if (!supporting[r.artist.id]) supporting[r.artist.id] = { artist: r.artist, rels: [] };
                    supporting[r.artist.id].rels.push(r);
                    break;
                case 'is person':
                    aliases.push(r);
                    break;
            }
        });

        var html = '';

        /* Labels */
        if (labelData && labelData.relations) {
            var labelRels = labelData.relations.filter(function(r) {
                return r['target-type'] === 'label' && r.label;
            });
            var labelGroups = {};
            labelRels.forEach(function(r) {
                var id = r.label.id;
                if (!labelGroups[id]) labelGroups[id] = { label: r.label, rels: [] };
                labelGroups[id].rels.push(r);
            });
            var labelEntries = Object.keys(labelGroups).map(function(id) {
                var g = labelGroups[id];
                var merged = mergeRels(g.rels);
                var roles = [];
                g.rels.forEach(function(r) {
                    var t = r.type;
                    if (t === 'label founder') t = 'founder';
                    else if (t === 'executive position at') t = 'executive';
                    if (roles.indexOf(t) === -1) roles.push(t);
                });
                return { label: g.label, roles: roles, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            labelEntries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
            var labelItems = labelEntries.map(function(e) {
                return renderLabelEntry(e.label, e.roles, e.begin, e.end, e.ended);
            }).join('');
            if (labelItems) html += renderSection('labels', labelItems);
        }

        /* Bands */
        var allBandMap = {};
        Object.keys(members).forEach(function(id) {
            allBandMap[id] = { artist: members[id].artist, rels: members[id].rels, role: 'member' };
        });
        Object.keys(supporting).forEach(function(id) {
            if (allBandMap[id]) {
                allBandMap[id].rels = allBandMap[id].rels.concat(supporting[id].rels);
                allBandMap[id].role = 'supporting';
            } else {
                allBandMap[id] = { artist: supporting[id].artist, rels: supporting[id].rels, role: 'supporting' };
            }
        });

        var allBands = Object.values(allBandMap);
        allBands.sort(function(a, b) {
            var aMerged = mergeRels(a.rels);
            var bMerged = mergeRels(b.rels);
            return (aMerged.begin || 'zzzz').localeCompare(bMerged.begin || 'zzzz');
        });

        if (allBands.length > 0) {
            var items = allBands.map(function(g) {
                var m = mergeRels(g.rels);
                return renderEntry(g.artist, m.attributes, m.begin, m.end, m.ended, g.role);
            }).join('');
            html += renderSection('bands', items);
        }

        /* Solo projects */
        if (aliases.length > 0) {
            var items = aliases.map(function(r) {
                return renderSimpleEntry(r.artist);
            }).join('');
            html += renderSection('solo projects', '<ul class="simple-list">' + items + '</ul>');
        }

        /* Places */
        if (placeData && placeData.relations) {
            var placeRels = placeData.relations.filter(function(r) {
                return r['target-type'] === 'place' && r.place;
            });
            var placeGroups = {};
            placeRels.forEach(function(r) {
                var id = r.place.id;
                if (!placeGroups[id]) placeGroups[id] = { place: r.place, rels: [] };
                placeGroups[id].rels.push(r);
            });
            var placeEntries = Object.keys(placeGroups).map(function(id) {
                var g = placeGroups[id];
                var merged = mergeRels(g.rels);
                var roles = [];
                g.rels.forEach(function(r) {
                    var t = r.type.replace(' position', '');
                    if (roles.indexOf(t) === -1) roles.push(t);
                });
                return { place: g.place, roles: roles, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            placeEntries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
            var placeItems = placeEntries.map(function(e) {
                return renderPlaceEntry(e.place, e.roles, e.begin, e.end, e.ended);
            }).join('');
            if (placeItems) html += renderSection('places', placeItems);
        }

        /* Events */
        if (eventData && eventData.relations) {
            var eventRels = eventData.relations.filter(function(r) {
                return r['target-type'] === 'event' && r.event;
            });
            var eventGroups = {};
            eventRels.forEach(function(r) {
                var id = r.event.id;
                if (!eventGroups[id]) eventGroups[id] = { event: r.event, rels: [] };
                eventGroups[id].rels.push(r);
            });
            var eventItems = Object.keys(eventGroups).map(function(id) {
                var g = eventGroups[id];
                var merged = mergeRels(g.rels);
                var roles = [];
                g.rels.forEach(function(r) {
                    if (roles.indexOf(r.type) === -1) roles.push(r.type);
                });
                return renderEventEntry(g.event, roles, merged.begin, merged.end, merged.ended);
            }).join('');
            if (eventItems) html += renderSection('events', eventItems);
        }

        /* Compositions */
        if (workData && workData.relations) {
            var composerRels = workData.relations.filter(function(r) { return r.type === 'composer' && r['target-type'] === 'work' && r.work; });
            var lyricistRels = workData.relations.filter(function(r) { return r.type === 'lyricist' && r['target-type'] === 'work' && r.work; });

            var compositions = dedupCreditRels(composerRels, function(r) { return r.work; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'work'), year: formatDate(g.begin), roles: [] };
            });
            var lyrics = dedupCreditRels(lyricistRels, function(r) { return r.work; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'work'), year: formatDate(g.begin), roles: [] };
            });

            html += renderCreditSection('compositions', compositions);
            html += renderCreditSection('lyrics', lyrics);
        }

        /* Recordings */
        if (recordingData && recordingData.relations) {
            var perfTypes = ['instrument', 'recording', 'vocal'];
            var perfRels = recordingData.relations.filter(function(r) { return r['target-type'] === 'recording' && r.recording && perfTypes.indexOf(r.type) !== -1; });
            var editRels = recordingData.relations.filter(function(r) { return r.type === 'editor' && r['target-type'] === 'recording' && r.recording; });
            var prodRecRels = recordingData.relations.filter(function(r) { return r.type === 'producer' && r['target-type'] === 'recording' && r.recording; });
            var fieldRels = recordingData.relations.filter(function(r) { return r.type === 'field recordist' && r['target-type'] === 'recording' && r.recording; });
            var videoRels = recordingData.relations.filter(function(r) { return (r.type === 'video director' || r.type === 'cinematographer') && r['target-type'] === 'recording' && r.recording; });

            var performed = dedupCreditRelsByVersion(perfRels, function(r) { return r.recording; }, function(r) { return r.attributes || []; });
            var edited = dedupCreditRelsByVersion(editRels, function(r) { return r.recording; }, function() { return []; });
            var producedRec = dedupCreditRelsByVersion(prodRecRels, function(r) { return r.recording; }, function() { return []; });
            var fieldRec = dedupCreditRelsByVersion(fieldRels, function(r) { return r.recording; }, function() { return []; });
            var videos = dedupCreditRelsByVersion(videoRels, function(r) { return r.recording; }, function(r) { return [r.type === 'video director' ? 'director' : 'cinematographer']; });

            html += renderCreditSection('recordings performed on', performed);
            html += renderCreditSection('recordings edited', edited);
            html += renderCreditSection('recordings produced', producedRec);
            html += renderCreditSection('field recordings', fieldRec);
            html += renderCreditSection('music videos', videos);
        }

        /* Releases */
        if (releaseData && releaseData.relations) {
            var prodRelRels = releaseData.relations.filter(function(r) { return r.type === 'producer' && r['target-type'] === 'release' && r.release; });
            var masterRels = releaseData.relations.filter(function(r) { return r.type === 'mastering' && r['target-type'] === 'release' && r.release; });
            var designRels = releaseData.relations.filter(function(r) { return (r.type === 'design' || r.type === 'artwork') && r['target-type'] === 'release' && r.release; });
            var photoRels = releaseData.relations.filter(function(r) { return r.type === 'photography' && r['target-type'] === 'release' && r.release; });
            var artDirRels = releaseData.relations.filter(function(r) { return r.type === 'art direction' && r['target-type'] === 'release' && r.release; });
            var compRels = releaseData.relations.filter(function(r) { return r.type === 'compiler' && r['target-type'] === 'release' && r.release; });

            var producedRel = dedupCreditRels(prodRelRels, function(r) { return r.release; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'release'), year: formatDate(g.begin), roles: [] };
            });
            var mastered = dedupCreditRels(masterRels, function(r) { return r.release; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'release'), year: formatDate(g.begin), roles: [] };
            });
            var designed = dedupCreditRels(designRels, function(r) { return r.release; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'release'), year: formatDate(g.begin), roles: [] };
            });
            var photographed = dedupCreditRels(photoRels, function(r) { return r.release; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'release'), year: formatDate(g.begin), roles: [] };
            });
            var artDirected = dedupCreditRels(artDirRels, function(r) { return r.release; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'release'), year: formatDate(g.begin), roles: [] };
            });
            var compiled = dedupCreditRels(compRels, function(r) { return r.release; }, function() { return []; }).map(function(g) {
                return { html: creditLink(g.target, 'release'), year: formatDate(g.begin), roles: [] };
            });

            html += renderCreditSection('releases produced', producedRel);
            html += renderCreditSection('mastered', mastered);
            html += renderCreditSection('photography', photographed);
            html += renderCreditSection('design', designed);
            html += renderCreditSection('art direction', artDirected);
            html += renderCreditSection('compiled', compiled);
        }

        if (!html) {
            html = '<div class="error-msg">no relationships found</div>';
        }

        html += renderTMDBSections();

        contentEl.innerHTML = html + renderStaticSections();

        /* TMDB link */
        var tmdbLink = renderTMDBLink();
        if (tmdbLink) {
            var mbLink = document.querySelector('.mb-link');
            if (mbLink) {
                mbLink.insertAdjacentHTML('afterend', tmdbLink);
            }
        }

        /* TMDB attribution */
        if (_tmdb) {
            var footer = document.querySelector('footer');
            if (footer) {
                footer.insertAdjacentHTML('beforeend',
                    '<div class="tmdb-attribution">' +
                        '<img src="' + (config.depth || '../../../') + 'assets/logos/TMDB_blue_long.svg" alt="TMDB">' +
                        '<p>This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>' +
                    '</div>'
                );
            }
        }

        /* MusicBrainz attribution */
        var footer = document.querySelector('footer');
        if (footer) {
            footer.insertAdjacentHTML('beforeend',
                '<div class="mb-data-attribution">' +
                    '<img src="' + (config.depth || '../../../') + 'assets/logos/MB_logo.svg" alt="MusicBrainz">' +
                    '<p>Music data provided by <a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a>. ' +
                    'Licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="noopener">CC BY-NC-SA 3.0</a>.</p>' +
                '</div>'
            );
        }

        /* Profile photo */
        renderProfilePhoto();
    }

    /* ── FETCH WITH RATE LIMITING ── */

    function fetchMB(url) {
        return fetch(url).then(function(res) {
            if (!res.ok) throw new Error('API error: ' + res.status);
            return res.json();
        });
    }

    function delay(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    /* ── CACHE ── */
    var _cache = null;
    function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return Promise.resolve(); }
        return fetch('../../../archive/_cache/contributors/' + MB_ID + '.json')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(j) { if (j && j.fetchedAt) _cache = j; })
            .catch(function() {});
    }
    function cachedFetch(inc) {
        if (_cache && _cache.responses && _cache.responses[inc]) {
            return Promise.resolve(_cache.responses[inc]);
        }
        return fetchMB('https://musicbrainz.org/ws/2/artist/' + MB_ID + '?fmt=json&inc=' + inc);
    }

    loadCache().then(function() {
        return loadTMDBCache();
    }).then(function() {
        return cachedFetch('artist-rels');
    }).then(function(data) {
            var ids = [];
            if (data.isnis && data.isnis.length) ids.push('ISNI: ' + data.isnis[0]);
            if (data.ipis && data.ipis.length) ids.push('IPI: ' + data.ipis[0]);
            if (ids.length) idsEl.textContent = ids.join(' · ');

            var useCache = _cache && _cache.responses;
            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                return cachedFetch('recording-rels');
            }).then(function(recordingData) {
                return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                    return cachedFetch('work-rels');
                }).then(function(workData) {
                    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                        return cachedFetch('release-rels');
                    }).then(function(releaseData) {
                        return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                            return cachedFetch('label-rels');
                        }).then(function(labelData) {
                            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                                return cachedFetch('place-rels');
                            }).then(function(placeData) {
                                return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                                    return cachedFetch('event-rels');
                                }).then(function(eventData) {
                                    render(data, recordingData, workData, releaseData, labelData, placeData, eventData);
                                });
                            });
                        });
                    });
                });
            });
        })
        .catch(function(e) {
            contentEl.innerHTML = '<div class="error-msg">failed to load from MusicBrainz<br><span style="opacity:0.6;font-size:7px">' + esc(e.message) + '</span></div>' + renderStaticSections();
        });
})();
