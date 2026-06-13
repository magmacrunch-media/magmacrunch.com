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

    /* ── RENDER ── */

    function render(artistData, labelData, eventData, recordingData, workData, releaseData) {
        var artistRels = artistData.relations || [];
        var labelRels = labelData.relations || [];
        var eventRels = eventData.relations || [];
        var html = '';

        /* Founders */
        var founders = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist && r.type === 'founder';
        });
        if (founders.length > 0) {
            var items = founders.map(function(r) {
                return renderSimpleEntry(r.artist, 'artist');
            }).join('');
            html += renderSection('founders', '<ul class="simple-list">' + items + '</ul>');
        }

        /* Owners */
        var owners = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist && r.type === 'owner';
        });
        if (owners.length > 0) {
            var items = owners.map(function(r) {
                return renderSimpleEntry(r.artist, 'artist');
            }).join('');
            html += renderSection('owners', '<ul class="simple-list">' + items + '</ul>');
        }

        /* Executives */
        var executives = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist && r.type === 'executive position at';
        });
        if (executives.length > 0) {
            var execGroups = {};
            executives.forEach(function(r) {
                var id = r.artist.id;
                if (!execGroups[id]) execGroups[id] = { artist: r.artist, rels: [] };
                execGroups[id].rels.push(r);
            });
            var execEntries = Object.keys(execGroups).map(function(id) {
                var g = execGroups[id];
                var merged = mergeRels(g.rels);
                return { artist: g.artist, begin: merged.begin, end: merged.end, ended: merged.ended };
            });
            execEntries.sort(function(a, b) {
                return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
            });
            var items = execEntries.map(function(e) {
                return renderEntry(e.artist, [], e.begin, e.end, e.ended, 'artist');
            }).join('');
            html += renderSection('executives', items);
        }

        /* Associated artists (exclude founders, owners, executives) */
        var skipTypes = ['founder', 'owner', 'executive position at'];
        var assocArtistRels = artistRels.filter(function(r) {
            return r['target-type'] === 'artist' && r.artist && skipTypes.indexOf(r.type) === -1;
        });
        var artistGroups = {};
        assocArtistRels.forEach(function(r) {
            var id = r.artist.id;
            if (!artistGroups[id]) artistGroups[id] = { artist: r.artist, rels: [] };
            artistGroups[id].rels.push(r);
        });
        var artistEntries = Object.keys(artistGroups).map(function(id) {
            var g = artistGroups[id];
            var merged = mergeRels(g.rels);
            var roles = [];
            g.rels.forEach(function(r) {
                if (roles.indexOf(r.type) === -1) roles.push(r.type);
            });
            return { artist: g.artist, roles: roles, begin: merged.begin, end: merged.end, ended: merged.ended };
        });
        artistEntries.sort(function(a, b) {
            return (a.begin || 'zzzz').localeCompare(b.begin || 'zzzz');
        });
        if (artistEntries.length > 0) {
            var items = artistEntries.map(function(e) {
                return renderEntry(e.artist, e.roles, e.begin, e.end, e.ended, 'artist');
            }).join('');
            html += renderSection('associated artists', items);
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
        if (ownedByLabels.length > 0) {
            var items = ownedByLabels.map(function(r) {
                return '<li>' + archiveLink(r.label.id, r.label.name, 'label') + '</li>';
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

    fetchMB(API)
        .then(function(artistData) {
            var ids = [];
            if (artistData.isnis && artistData.isnis.length) ids.push('ISNI: ' + artistData.isnis[0]);
            if (artistData.ipis && artistData.ipis.length) ids.push('IPI: ' + artistData.ipis[0]);
            if (ids.length) idsEl.textContent = ids.join(' \u00b7 ');

            var baseUrl = 'https://musicbrainz.org/ws/2/label/' + MB_ID + '?fmt=json&inc=';
            return delay(1100).then(function() {
                return fetchMB(baseUrl + 'label-rels');
            }).then(function(labelData) {
                return delay(1100).then(function() {
                    return fetchMB(baseUrl + 'event-rels');
                }).then(function(eventData) {
                    return delay(1100).then(function() {
                        return fetchMB(baseUrl + 'recording-rels');
                    }).then(function(recordingData) {
                        return delay(1100).then(function() {
                            return fetchMB(baseUrl + 'work-rels');
                        }).then(function(workData) {
                            return delay(1100).then(function() {
                                return fetchMB(baseUrl + 'release-rels');
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
