// cards-deal: Deal 5 cards and render them face-up
var deck = new AdCards.Deck();
deck.shuffle();

var hand = [];
for (var i = 0; i < 5; i++) {
  hand.push(deck.deal());
}

console.log('Dealt 5 cards:');
hand.forEach(function (c) {
  console.log('  ' + c.rank + ' of ' + c.suit);
});

// Render cards into the output panel
var el = document.getElementById('output-content');
el.innerHTML = '';

var title = document.createElement('p');
title.style.cssText = 'padding:0 1rem 1rem;color:#9d99b5;font-size:13px;';
title.textContent = 'Dealt 5 cards — click "Run" to re-deal';
el.appendChild(title);

var row = document.createElement('div');
row.style.cssText = 'display:flex;gap:8px;padding:1rem;flex-wrap:wrap;';
hand.forEach(function (c) {
  c.faceUp = true;
  row.appendChild(c.getHTML());
});
el.appendChild(row);

var dealBtn = document.createElement('button');
dealBtn.textContent = 'Deal Again';
dealBtn.style.cssText = 'margin:1rem;padding:.5rem 1rem;font-size:14px;'
  + 'background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;';
dealBtn.addEventListener('click', function () {
  deck = new AdCards.Deck();
  deck.shuffle();
  row.innerHTML = '';
  for (var i = 0; i < 5; i++) {
    var c = deck.deal();
    c.faceUp = true;
    row.appendChild(c.getHTML());
  }
});
el.appendChild(dealBtn);
