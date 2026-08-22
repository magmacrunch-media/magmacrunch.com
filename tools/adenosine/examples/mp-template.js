// mp-template: Render BoardGameTemplate with title, instructions, credits
var el = document.getElementById('output-content');
el.innerHTML = '';

// Show the exported API surface
var title = document.createElement('p');
title.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;';
title.textContent = 'Multiplayer package exports — BoardGameTemplate renders the HTML shell';
el.appendChild(title);

var api = document.createElement('div');
api.style.cssText = 'padding:0 1rem 1rem;font-size:13px;';
api.textContent = 'MP: ' + typeof AdMP.MP
  + '  MSG: ' + typeof AdMP.MSG
  + '  BoardGameTemplate: ' + typeof AdMP.BoardGameTemplate;
el.appendChild(api);

// Configure (no real server — just showing the API)
AdMP.MP.configure({
  defaultServer: 'games.example.com/demo',
  allowlist: ['games.example.com'],
});

var html = AdMP.BoardGameTemplate.render({
  title: 'Playground Demo',
  instructions: 'This is a demo of the board game template. No server is connected.',
  credits: 'Built with adenosine-multiplayer',
});

var rendered = document.createElement('div');
rendered.style.cssText = 'padding:1rem;border:1px solid #33304a;border-radius:8px;margin:0 1rem;background:#1c1b26;';
rendered.innerHTML = html;
el.appendChild(rendered);

var note = document.createElement('p');
note.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;';
note.textContent = 'The template generates the full game page shell — header, instructions, game area, and credits.';
el.appendChild(note);
