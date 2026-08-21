// chat-widget: Mount the chat widget (shows disconnected — no server)
var el = document.getElementById('output-content');
el.innerHTML = '';

var title = document.createElement('p');
title.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;';
title.textContent = 'Chat widget mounts but shows disconnected — no server running';
el.appendChild(title);

AdChat.ChatWidget.connect({
  server: 'chat.example.com',
  allowlist: ['chat.example.com'],
});

// Check after a short delay for the widget to mount
setTimeout(function () {
  var widget = document.getElementById('arcadeChatWidget');
  if (widget) {
    var status = document.createElement('div');
    status.style.cssText = 'padding:1rem;font-size:13px;';
    status.textContent = 'Widget element: #' + widget.id
      + '  class: ' + widget.className
      + '  children: ' + widget.children.length;
    el.appendChild(status);

    var note = document.createElement('p');
    note.style.cssText = 'padding:0 1rem;color:#9d99b5;font-size:13px;';
    note.textContent = 'The widget is present but disconnected. It would show a chat panel when connected to a server.';
    el.appendChild(note);
  } else {
    var err = document.createElement('p');
    err.style.cssText = 'padding:1rem;color:#ff6b6b;font-size:13px;';
    err.textContent = 'Widget did not mount — check console for errors';
    el.appendChild(err);
  }
}, 1500);
