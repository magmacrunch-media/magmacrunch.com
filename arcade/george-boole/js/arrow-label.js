// Keep arrows legible without enlarging the words beside them. Use text nodes:
// chapter names and other labels must never be interpreted as HTML.
function setArrowLabel(element, text) {
    element.textContent = '';
    for (const part of String(text).split(/([←→↑↓])/)) {
        if (/^[←→↑↓]$/.test(part)) {
            const arrow = document.createElement('span');
            arrow.className = 'ui-arrow';
            arrow.textContent = part;
            element.appendChild(arrow);
        } else if (part) {
            element.appendChild(document.createTextNode(part));
        }
    }
}
