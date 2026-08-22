// audio-tone: Click button to init AudioContext and play a 440Hz tone
var el = document.getElementById('output-content');
el.innerHTML = '';

var title = document.createElement('p');
title.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;';
title.textContent = 'Web Audio requires a user gesture to start. Click the button below.';
el.appendChild(title);

var btn = document.createElement('button');
btn.textContent = 'Play 440Hz Tone';
btn.style.cssText = 'margin:1rem;padding:.75rem 1.5rem;font-size:16px;'
  + 'background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;';
el.appendChild(btn);

var status = document.createElement('p');
status.style.cssText = 'padding:0 1rem;color:#9d99b5;font-size:13px;';
status.textContent = 'Exports: ' + Object.keys(AdAudio).join(', ');
el.appendChild(status);

btn.addEventListener('click', function () {
  var ctx = AdAudio.getCtx() || new (window.AudioContext || window.webkitAudioContext)();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.frequency.value = 440;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
  status.textContent = 'Playing 440Hz for 0.5s — AudioContext state: ' + ctx.state;
  console.log('Tone started — frequency: 440Hz, duration: 0.5s');
});
