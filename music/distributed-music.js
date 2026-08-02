(function () {
  var releases = window.RELEASES;
  if (!releases) return;

  /* ── render quick jump list ── */
  var quickList = document.getElementById('quick-list');
  if (quickList) {
    releases.forEach(function (r) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + r.id;
      a.textContent = r.artist + ' - ' + r.title;
      li.appendChild(a);
      quickList.appendChild(li);
    });
  }

  /* ── render release cards ── */
  var container = document.getElementById('releases');
  if (container) {
    releases.forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'dist-card';
      card.id = r.id;
      card.innerHTML =
        '<div class="dist-art">' +
          '<img class="release-hero-img" src="' + r.art + '" alt="' + r.title + '">' +
        '</div>' +
        '<div class="dist-info">' +
          '<div class="dist-title">' + r.title + '</div>' +
          '<div class="dist-artist">by <a href="' + r.artistLink + '">' + r.artist + '</a></div>' +
          '<div class="dist-description"><p>' + r.description + '</p></div>' +
          '<div class="dist-links">' +
            '<a href="' + r.distLink + '" class="dist-link" target="_blank" rel="noopener">stream / download</a>' +
            '<a href="#quick-jump-menu" class="dist-top-link">[ ^ top ]</a>' +
          '</div>' +
        '</div>';
      container.appendChild(card);
    });
  }

  /* ── search filter ── */
  var filter = document.getElementById('release-filter');
  if (filter && quickList) {
    filter.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      var items = quickList.querySelectorAll('li');
      for (var i = 0; i < items.length; i++) {
        var text = items[i].textContent.toLowerCase();
        items[i].style.display = text.indexOf(q) !== -1 ? '' : 'none';
      }
    });
  }
})();
