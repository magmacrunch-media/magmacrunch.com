/* mb-cache.js — MusicBrainz cache loader
 *
 * Loads cached MusicBrainz data from local JSON files.
 * Templates call loadMBCache() before fetching from the API.
 * If cache is available, templates can skip API calls entirely.
 *
 * Usage in templates:
 *   1. Load this script before the template script
 *   2. Call await loadMBCache(uuid, type) at the start of the template
 *   3. If it returns true, read data from window.__MB_CACHE and skip API calls
 */

(function () {
    'use strict';

    window.__MB_CACHE = null;

    /**
     * Attempt to load a cached MusicBrainz JSON file.
     * @param {string} uuid — MusicBrainz entity UUID
     * @param {string} type — 'artist' | 'place' | 'contributor' | 'label' | 'work'
     * @param {string} [depth='../../../'] — path prefix to site root
     * @returns {Promise<boolean>} true if cache was loaded successfully
     */
    window.loadMBCache = async function (uuid, type, depth) {
        var prefix = depth || '../../../';
        var url = prefix + 'archive/_cache/' + type + 's/' + uuid + '.json';
        try {
            var resp = await fetch(url);
            if (!resp.ok) return false;
            var data = await resp.json();
            if (!data || !data.fetchedAt) return false;
            window.__MB_CACHE = data;
            console.log('[MB Cache] loaded ' + type + ' ' + uuid + ' (fetched ' + data.fetchedAt + ')');
            return true;
        } catch (e) {
            return false;
        }
    };
})();
