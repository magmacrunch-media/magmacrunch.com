/**
 * lightbox.js — Full-size viewer with download + open in new tab
 */
(function() {
    'use strict';

    /* Shell chrome (ware/shell/toast.js), shared with app.js. This file used
       to carry its own copy that skipped the stacking offset, so a copy result
       drew directly on top of any toast already showing. */
    const showToast = Toast.show;

    const lightbox = document.getElementById('lightbox');
    const lightboxBody = document.getElementById('lightboxBody');
    const lbTitle = document.getElementById('lbTitle');
    const lbMeta = document.getElementById('lbMeta');
    const lbCounter = document.getElementById('lbCounter');
    const lbOpenTab = document.getElementById('lbOpenTab');
    const lbDownload = document.getElementById('lbDownload');
    const lbCopyUrl = document.getElementById('lbCopyUrl');
    const lbPrev = document.getElementById('lbPrev');
    const lbNext = document.getElementById('lbNext');
    const lbClose = document.getElementById('lbClose');

    let currentIndex = 0;
    let items = [];

    function open(index, allItems) {
        items = allItems;
        currentIndex = index;
        render();
        lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function stopMedia() {
        lightboxBody.querySelectorAll('video, audio').forEach(el => {
            el.pause();
            el.src = '';
        });
    }

    function close() {
        stopMedia();
        lightbox.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function prev() {
        if (currentIndex > 0) {
            currentIndex--;
            render();
        }
    }

    function next() {
        if (currentIndex < items.length - 1) {
            currentIndex++;
            render();
        }
    }

    function render() {
        const item = items[currentIndex];
        if (!item) return;

        stopMedia();
        lightboxBody.innerHTML = '';

        if (item.type === 'video') {
            const video = document.createElement('video');
            video.src = item.fullUrl;
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            lightboxBody.appendChild(video);
        } else if (item.type === 'audio') {
            const audio = document.createElement('audio');
            audio.src = item.fullUrl;
            audio.controls = true;
            audio.autoplay = true;
            lightboxBody.appendChild(audio);

            if (item.thumbnail) {
                const img = document.createElement('img');
                img.src = item.thumbnail;
                img.style.maxWidth = '300px';
                img.style.marginBottom = '16px';
                lightboxBody.insertBefore(img, audio);
            }
        } else {
            const img = document.createElement('img');
            img.src = item.fullUrl || item.thumbnail;
            img.alt = item.title || '';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.onerror = function() {
                if (this.src !== item.thumbnail) this.src = item.thumbnail;
                else this.style.display = 'none';
            };
            lightboxBody.appendChild(img);
        }

        const esc = window.UI.escapeHtml;
        lbTitle.textContent = item.title || '';
        lbMeta.innerHTML = `
            ${item.author ? `By ${esc(item.author)} &middot; ` : ''}
            ${item.source.replace(/_/g, ' ')}
            <span class="license-badge">${esc(item.license || '')}</span>
        `;

        lbCounter.textContent = `${currentIndex + 1} / ${items.length}`;

        lbOpenTab.href = item.fullUrl || item.sourceUrl;
        lbDownload.href = item.fullUrl || item.thumbnail;
        lbDownload.download = `${item.source}-${item.id}`;

        lbPrev.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
        lbNext.style.visibility = currentIndex < items.length - 1 ? 'visible' : 'hidden';
    }

    // Event bindings
    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', prev);
    lbNext.addEventListener('click', next);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightboxBody) close();
    });

    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('hidden')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') prev();
        else if (e.key === 'ArrowRight') next();
    });

    lbCopyUrl.addEventListener('click', () => {
        const item = items[currentIndex];
        if (!item) return;
        const url = item.fullUrl || item.sourceUrl;
        copyToClipboard(url);
    });

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('URL COPIED');
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(ok ? 'URL COPIED' : 'COPY FAILED');
    }

    window.Lightbox = { open, close };
})();
