// score-basic: Save a score with no server (queues offline), load it back
var el = document.getElementById('output-content');
el.innerHTML = '';

var title = document.createElement('p');
title.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;';
title.textContent = 'Saving a score with no server — uses localStorage offline queue';
el.appendChild(title);

var log = document.createElement('div');
log.style.cssText = 'padding:0 1rem;font-size:13px;white-space:pre-wrap;';
el.appendChild(log);

function append(text) {
  log.textContent += text + '\n';
}

var client = new AdScore.ScoreClient();
append('ScoreClient created');
append('Methods: ' + Object.keys(client).filter(function (k) { return typeof client[k] === 'function'; }).join(', '));
append('');

client.save('playground-game', 'AAA', 9999).then(function (r) {
  append('Save result:');
  append('  synced: ' + r.synced);
  append('  (false = queued offline, no server running)');
  append('');
  return client.load('playground-game');
}).then(function (scores) {
  append('Load result (' + scores.length + ' score(s)):');
  scores.forEach(function (s) {
    append('  ' + s.initials + ': ' + s.score);
  });
  append('');
  append('The score persists in localStorage across page reloads.');
}).catch(function (e) {
  append('Error: ' + e.message);
});
