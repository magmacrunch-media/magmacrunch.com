/* ── color.js — color picker + eyedropper from reference image ── */
window.ColorManager = (function () {
    let refImage = null;
    let refCanvas = null;
    let refCtx = null;
    let refBlobUrl = null;
    let onColorSample = null;
    let onColorPreview = null;

    function init(onSample, onPreview) {
        onColorSample = onSample;
        onColorPreview = onPreview || null;
        refCanvas = document.getElementById('refCanvas');
        refCtx = refCanvas.getContext('2d', { willReadFrequently: true });

        document.getElementById('refUploadBtn').addEventListener('click', () => {
            document.getElementById('refFileInput').click();
        });

        document.getElementById('refFileInput').addEventListener('change', handleFileUpload);
        document.getElementById('refClearBtn').addEventListener('click', clearReference);

        refCanvas.addEventListener('click', handleRefClick);
        refCanvas.addEventListener('mousemove', handleRefHover);
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onerror = () => alert('Failed to load reference image.');
        img.onload = function () {
            refImage = img;
            refCanvas.width = img.width;
            refCanvas.height = img.height;
            refCtx.drawImage(img, 0, 0);

            document.getElementById('refPreviewWrap').classList.add('visible');
            document.querySelector('.ref-hint').classList.add('visible');
            document.getElementById('refUploadBtn').textContent = 'REPLACE IMAGE';
        };
        const url = URL.createObjectURL(file);
        refBlobUrl = url;
        img.src = url;
        e.target.value = '';
    }

    function clearReference() {
        refImage = null;
        if (refBlobUrl) {
            URL.revokeObjectURL(refBlobUrl);
            refBlobUrl = null;
        }
        refCtx.clearRect(0, 0, refCanvas.width, refCanvas.height);
        document.getElementById('refPreviewWrap').classList.remove('visible');
        document.querySelector('.ref-hint').classList.remove('visible');
        document.getElementById('refUploadBtn').textContent = 'UPLOAD IMAGE';
    }

    function handleRefClick(e) {
        if (!refImage) return;
        const color = sampleColor(e);
        if (color && onColorSample) onColorSample(color);
    }

    function handleRefHover(e) {
        if (!refImage) return;
        const color = sampleColor(e);
        if (color && onColorPreview) onColorPreview(color);
    }

    function sampleColor(e) {
        const rect = refCanvas.getBoundingClientRect();
        const scaleX = refCanvas.width / rect.width;
        const scaleY = refCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x < 0 || x >= refCanvas.width || y < 0 || y >= refCanvas.height) return null;

        const pixel = refCtx.getImageData(x, y, 1, 1).data;
        return rgbToHex(pixel[0], pixel[1], pixel[2]);
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    function hasReference() {
        return refImage !== null;
    }

    return { init, hasReference, clearReference };
})();
