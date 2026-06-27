/* ── label.js — shared template for by-label pages ── */
/* Requires: window.__LABEL_CONFIG = { MB_ID, NAME, accent? } */

(function() {
    var config = window.__LABEL_CONFIG;
    if (!config || !config.MB_ID) return;

    var MB_ID = config.MB_ID;
    var ENTITY_MAP = window.__ENTITY_MAP || {};
    var accent = config.accent || 'cyan';
    var API = 'https://musicbrainz.org/ws/2/label/' + MB_ID + '?fmt=json&inc=artist-rels';
    var contentEl = document.getElementById('content');
    var idsEl = document.getElementById('contrib-ids');

    /* ── HELPERS ── */

    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        var path = ENTITY_MAP[id];
        if (path) return '<a href="' + path + '">' + esc(name) + '</a>';
        return '<a href="https://musicbrainz.org/' + (type || 'artist') + '/' + esc(id) + '" target="_blank" rel="noopener">' + esc(name) + '</a>';
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
        return b + ' \u2014 ' + e;
    }

    function renderSection(title, html) {
        if (!html) return '';
        return '<div class="section">' +
            '<div class="section-divider"></div>' +
            '<div class="section-title">// ' + title + ' //</div>' +
            html +
            '</div>';
    }

    function renderSimpleEntry(target, type) {
        var link = archiveLink(target.id, target.name, type || 'artist');
        return '<li>' + link + '</li>';
    }

    function renderEntry(target, roles, begin, end, ended, type) {
        var dates = dateRange(begin, end, ended);
        var link = archiveLink(target.id, target.name, type || 'artist');
        var roleTags = '';
        if (roles && roles.length > 0) {
            roleTags = '<div class="entry-instruments"><div class="label">roles</div>' +
                roles.map(function(r) {
                    return '<span class="instrument-tag">' + esc(r) + '</span>';
                }).join('') + '</div>';
        }
        return '<details class="entry">' +
            '<summary class="entry-header">' +
                '<span class="entry-arrow">\u25b6</span>' +
                '<span class="entry-name">' + link + '</span>' +
                '<span class="entry-dates">' + esc(dates) + '</span>' +
            '</summary>' +
            '<div class="entry-body">' + roleTags + '</div>' +
            '</details>';
    }

    function mergeRels(rels) {
        var begins = rels.map(function(r) { return r.begin; }).filter(Boolean).sort();
        var begin = begins[0] || null;
        var ends = rels.map(function(r) { return r.end; });
        var end = ends.indexOf(null) !== -1 ? null : ends.filter(Boolean).sort().reverse()[0];
        var ended = rels.every(function(r) { return r.ended; });
        return { begin: begin, end: end, ended: ended };
    }

    function creditLink(target, type) {
        var path = type === 'work' ? 'work' : type === 'recording' ? 'recording' : 'release';
        return '<a href="https://musicbrainz.org/' + path + '/' + target.id + '" target="_blank" rel="noopener">' + esc(target.title) + '</a>';
    }

    /* ── CONSTANTS ── */

    var PERSONNEL_TYPES = [
        'label founder', 'founder', 'owner', 'executive position at',
        'employed by', 'producer position', 'engineer position', 'creative position'
    ];

    var ROLE_DISPLAY = {
        'label founder': 'founder',
        'founder': 'founder',
        'owner': 'owner',
        'executive position at': 'executive',
        'employed by': 'employed by',
        'producer position': 'producer',
        'engineer position': 'engineer',
        'creative position': 'creative',
        'artists and repertoire persons': 'A&R'
    };

    /* ── RENDER ── */

    function render(artistData, labelData, eventData, recordingData, workData, releaseData) {
        var artistRels = artistData.relations || [];
        var labelRels = labelData.relations || [];
        var eventRels = eventData.relations || [];
        var html = '';

        /* Personnel + Signed Artists (relationship-level filtering — artist can appear in both) */
        var allArtistRels = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist;
        });

        var personnelRels = allArtistRels.filter(function(r) {
            return PERSONNEL_TYPES.indexOf(r.type) !== -1;
        });
        var signedRels = allArtistRels.filter(function(r) {
            return PERSONNEL_TYPES.indexOf(r.type) === -1;
        });

        function groupByArtist(rels) {
            var groups = {};
            rels.forEach(function(r) {
                var id = r.artist.id;
                if (!groups[id]) groups[id] = { artist: r.artist, rels: [] };
                groups[id].rels.push(r);
            });
            return Object.keys(groups).map(function(id) {
                var g = groups[id];
                var merged = mergeRels(g.rels);
                var roles = [];
                g.rels.forEach(function(r) {
                    var display = ROLE_DISPLAY[r.type] || r.type;
                    if (roles.indexOf(display) === -1) roles.push(display);
                });
                return { target: g.artist, roles: roles, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
        }

        function sortEntries(entries) {
            entries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
        }

        /* Personnel section */
        var personnelEntries = groupByArtist(personnelRels);
        sortEntries(personnelEntries);
        if (personnelEntries.length > 0) {
            var items = personnelEntries.map(function(e) {
                return renderEntry(e.target, e.roles, e.begin, e.end, e.ended, 'artist');
            }).join('');
            html += renderSection('personnel', items);
        }

        /* Signed artists section */
        var signedEntries = groupByArtist(signedRels);
        sortEntries(signedEntries);
        if (signedEntries.length > 0) {
            var items = signedEntries.map(function(e) {
                return renderEntry(e.target, e.roles, e.begin, e.end, e.ended, 'artist');
            }).join('');
            html += renderSection('signed artists', items);
        }

        /* Label relationships — broken out by type */
        var ownedLabels = labelRels.filter(function(r) {
            return r['target-type'] === 'label' && r.label && r.type === 'label ownership' && r.direction === 'forward';
        });
        if (ownedLabels.length > 0) {
            var items = ownedLabels.map(function(r) {
                return '<li>' + archiveLink(r.label.id, r.label.name, 'label') + '</li>';
            }).join('');
            html += renderSection('owns', '<ul class="simple-list">' + items + '</ul>');
        }

        var ownedByLabels = labelRels.filter(function(r) {
            return r['target-type'] === 'label' && r.label && r.type === 'label ownership' && r.direction === 'backward';
        });
        var ownedByArtists = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist && r.type === 'owner' && r.direction === 'backward';
        });
        var ownedByAll = ownedByLabels.map(function(r) {
            return { name: r.label.name, id: r.label.id, type: 'label' };
        });
        ownedByArtists.forEach(function(r) {
            if (!ownedByAll.some(function(e) { return e.name === r.artist.name; })) {
                ownedByAll.push({ name: r.artist.name, id: r.artist.id, type: 'artist' });
            }
        });
        if (ownedByAll.length > 0) {
            var items = ownedByAll.map(function(e) {
                return '<li>' + archiveLink(e.id, e.name, e.type) + '</li>';
            }).join('');
            html += renderSection('owned by', '<ul class="simple-list">' + items + '</ul>');
        }

        var distributedBy = labelRels.filter(function(r) {
            return r['target-type'] === 'label' && r.label && r.type === 'label distribution';
        });
        if (distributedBy.length > 0) {
            var items = distributedBy.map(function(r) {
                return '<li>' + archiveLink(r.label.id, r.label.name, 'label') + '</li>';
            }).join('');
            html += renderSection('distributed by', '<ul class="simple-list">' + items + '</ul>');
        }

        var otherLabelRels = labelRels.filter(function(r) {
            return r['target-type'] === 'label' && r.label &&
                r.type !== 'label ownership' && r.type !== 'label distribution';
        });
        if (otherLabelRels.length > 0) {
            var items = otherLabelRels.map(function(r) {
                return '<li>' + archiveLink(r.label.id, r.label.name, 'label') + ' <span class="credit-sub">(' + esc(r.type) + ')</span></li>';
            }).join('');
            html += renderSection('related labels', '<ul class="simple-list">' + items + '</ul>');
        }

        /* Events presented */
        var presentedEvents = eventRels.filter(function(r) {
            return r['target-type'] === 'event' && r.event && r.type === 'presented';
        });
        if (presentedEvents.length > 0) {
            var eventGroups = {};
            presentedEvents.forEach(function(r) {
                var id = r.event.id;
                if (!eventGroups[id]) eventGroups[id] = { event: r.event, rels: [] };
                eventGroups[id].rels.push(r);
            });
            var eventEntries = Object.keys(eventGroups).map(function(id) {
                var g = eventGroups[id];
                var merged = mergeRels(g.rels);
                return { event: g.event, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            eventEntries.sort(function(a, b) {
                return (a.begin || b.event['life-span']?.begin || 'zzzz').localeCompare(b.begin || a.event['life-span']?.begin || 'zzzz');
            });
            var items = eventEntries.map(function(e) {
                var eventDate = e.event['life-span']?.begin || e.begin;
                return '<li><a href="https://musicbrainz.org/event/' + esc(e.event.id) + '" target="_blank" rel="noopener">' + esc(e.event.name) + '</a>' +
                    (eventDate ? ' <span class="credit-sub">' + esc(formatDate(eventDate)) + '</span>' : '') +
                    (e.event.disambiguation ? ' <span class="credit-sub">(' + esc(e.event.disambiguation) + ')</span>' : '') +
                    '</li>';
            }).join('');
            html += renderSection('events presented', '<ul class="simple-list">' + items + '</ul>');
        }

        /* Associated places */
        var placeRels = artistRels.filter(function(r) {
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
        if (placeEntries.length > 0) {
            var items = placeEntries.map(function(e) {
                return renderEntry(e.place, e.roles, e.begin, e.end, e.ended, 'place');
            }).join('');
            html += renderSection('associated places', items);
        }

        /* Releases */
        if (releaseData && releaseData.relations) {
            var releaseRels = releaseData.relations.filter(function(r) {
                return r['target-type'] === 'release' && r.release;
            });
            var releaseGroups = {};
            releaseRels.forEach(function(r) {
                var key = r.release.title.toLowerCase();
                if (!releaseGroups[key]) releaseGroups[key] = { release: r.release, rels: [] };
                releaseGroups[key].rels.push(r);
            });
            var releaseEntries = Object.keys(releaseGroups).map(function(key) {
                var g = releaseGroups[key];
                var merged = mergeRels(g.rels);
                return { release: g.release, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            releaseEntries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
            if (releaseEntries.length > 0) {
                var items = releaseEntries.map(function(e) {
                    return '<li>' + creditLink(e.release, 'release') + (e.begin ? ' <span class="credit-sub">' + esc(formatDate(e.begin)) + '</span>' : '') + '</li>';
                }).join('');
                html += renderSection('releases', '<ul class="simple-list">' + items + '</ul>');
            }

            /* Manufactured releases */
            var manufacturedRels = releaseRels.filter(function(r) {
                return r.type === 'manufactured';
            });
            if (manufacturedRels.length > 0) {
                var mfgGroups = {};
                manufacturedRels.forEach(function(r) {
                    var key = r.release.title.toLowerCase();
                    if (!mfgGroups[key]) mfgGroups[key] = { release: r.release, rels: [] };
                    mfgGroups[key].rels.push(r);
                });
                var mfgEntries = Object.keys(mfgGroups).map(function(key) {
                    var g = mfgGroups[key];
                    var merged = mergeRels(g.rels);
                    return { release: g.release, begin: merged.begin, end: merged.end, ended: merged.ended };
                });
                mfgEntries.sort(function(a, b) {
                    return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
                });
                var items = mfgEntries.map(function(e) {
                    return '<li>' + creditLink(e.release, 'release') + (e.begin ? ' <span class="credit-sub">' + esc(formatDate(e.begin)) + '</span>' : '') + '</li>';
                }).join('');
                html += renderSection('manufactured', '<ul class="simple-list">' + items + '</ul>');
            }
        }

        /* Works */
        if (workData && workData.relations) {
            var workRels = workData.relations.filter(function(r) {
                return r['target-type'] === 'work' && r.work;
            });
            var workGroups = {};
            workRels.forEach(function(r) {
                var key = r.work.title.toLowerCase();
                if (!workGroups[key]) workGroups[key] = { work: r.work, rels: [] };
                workGroups[key].rels.push(r);
            });
            var workEntries = Object.keys(workGroups).map(function(key) {
                var g = workGroups[key];
                var merged = mergeRels(g.rels);
                var types = [];
                g.rels.forEach(function(r) {
                    if (types.indexOf(r.type) === -1) types.push(r.type);
                });
                return { work: g.work, types: types, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            workEntries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
            if (workEntries.length > 0) {
                var items = workEntries.map(function(e) {
                    var typeStr = e.types.length > 0 ? ' <span class="credit-sub">' + e.types.map(esc).join(', ') + '</span>' : '';
                    return '<li>' + creditLink(e.work, 'work') + typeStr + (e.begin ? ' <span class="credit-sub">' + esc(formatDate(e.begin)) + '</span>' : '') + '</li>';
                }).join('');
                html += renderSection('works', '<ul class="simple-list">' + items + '</ul>');
            }
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

    /* ── CACHE ── */
    var _cache = null;
    function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return Promise.resolve(); }
        return fetch('../../../archive/_cache/labels/' + MB_ID + '.json')
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(j) { if (j && j.fetchedAt) _cache = j; })
            .catch(function() {});
    }
    function cachedFetch(inc) {
        if (_cache && _cache.responses && _cache.responses[inc]) {
            return Promise.resolve(_cache.responses[inc]);
        }
        return fetchMB('https://musicbrainz.org/ws/2/label/' + MB_ID + '?fmt=json&inc=' + inc);
    }

    loadCache().then(function() {
        return cachedFetch('artist-rels');
    }).then(function(artistData) {
            var ids = [];
            if (artistData.isnis && artistData.isnis.length) ids.push('ISNI: ' + artistData.isnis[0]);
            if (artistData.ipis && artistData.ipis.length) ids.push('IPI: ' + artistData.ipis[0]);
            if (ids.length) idsEl.textContent = ids.join(' \u00b7 ');

            /* Label type and years active */
            var meta = [];
            if (artistData.type) meta.push(artistData.type.toLowerCase());
            var ls = artistData['life-span'];
            if (ls && ls.begin) {
                var beginYear = ls.begin.split('-')[0];
                if (ls.ended && ls.end) {
                    meta.push(beginYear + ' \u2014 ' + ls.end.split('-')[0]);
                } else {
                    meta.push('est ' + beginYear);
                }
            }
            if (meta.length) {
                idsEl.insertAdjacentHTML('beforebegin',
                    '<div class="contrib-meta">' + meta.join(' \u00b7 ') + '</div>');
            }

            var useCache = _cache && _cache.responses;
            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                return cachedFetch('label-rels');
            }).then(function(labelData) {
                return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                    return cachedFetch('event-rels');
                }).then(function(eventData) {
                    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                        return cachedFetch('recording-rels');
                    }).then(function(recordingData) {
                        return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                            return cachedFetch('work-rels');
                        }).then(function(workData) {
                            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                                return cachedFetch('release-rels');
                            }).then(function(releaseData) {
                                render(artistData, labelData, eventData, recordingData, workData, releaseData);
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
