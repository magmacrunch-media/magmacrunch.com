/* ── contributor.js — shared template for by-contributor pages ── */
/* Requires: window.__CONTRIBUTOR_CONFIG = { MB_ID, NAME, ARCHIVE_LINKS, accent? } */

(function() {
    var config = window.__CONTRIBUTOR_CONFIG;
    if (!config || !config.MB_ID) return;

    var MB_ID = config.MB_ID;
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

        contentEl.innerHTML = html;
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

    fetchMB(API)
        .then(function(data) {
            var ids = [];
            if (data.isnis && data.isnis.length) ids.push('ISNI: ' + data.isnis[0]);
            if (data.ipis && data.ipis.length) ids.push('IPI: ' + data.ipis[0]);
            if (ids.length) idsEl.textContent = ids.join(' · ');

            var baseUrl = 'https://musicbrainz.org/ws/2/artist/' + MB_ID + '?fmt=json&inc=';
            return delay(1100).then(function() {
                return fetchMB(baseUrl + 'recording-rels');
            }).then(function(recordingData) {
                return delay(1100).then(function() {
                    return fetchMB(baseUrl + 'work-rels');
                }).then(function(workData) {
                    return delay(1100).then(function() {
                        return fetchMB(baseUrl + 'release-rels');
                    }).then(function(releaseData) {
                        return delay(1100).then(function() {
                            return fetchMB(baseUrl + 'label-rels');
                        }).then(function(labelData) {
                            return delay(1100).then(function() {
                                return fetchMB(baseUrl + 'place-rels');
                            }).then(function(placeData) {
                                return delay(1100).then(function() {
                                    return fetchMB(baseUrl + 'event-rels');
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
            contentEl.innerHTML = '<div class="error-msg">failed to load from MusicBrainz<br><span style="opacity:0.6;font-size:7px">' + esc(e.message) + '</span></div>';
        });
})();
