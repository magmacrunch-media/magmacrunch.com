// cards-poker: Deal 7 cards, evaluate best 5-card poker hand
var deck = new AdCards.Deck();
deck.shuffle();

var hand = [];
for (var i = 0; i < 7; i++) {
  hand.push(deck.deal());
}

// Set poker rank values for evaluation
hand.forEach(function (c) {
  c.value = AdCards.POKER_RANK_VALUES[c.rank];
});

var ev = new AdCards.HandEvaluator();
var result = ev.evaluate(hand);

console.log('7-card hand:');
hand.forEach(function (c) { console.log('  ' + c.rank + ' of ' + c.suit); });
console.log('Best hand: ' + result.name);
console.log('Rank: ' + result.rank);

// Render
var el = document.getElementById('output-content');
el.innerHTML = '';

var title = document.createElement('p');
title.style.cssText = 'padding:0 1rem;color:#9d99b5;font-size:13px;';
title.textContent = 'Best 5-card hand from 7 cards dealt';
el.appendChild(title);

var row = document.createElement('div');
row.style.cssText = 'display:flex;gap:8px;padding:1rem;flex-wrap:wrap;';
hand.forEach(function (c) {
  c.faceUp = true;
  row.appendChild(c.getHTML());
});
el.appendChild(row);

var resultEl = document.createElement('div');
resultEl.style.cssText = 'padding:1rem;font-size:18px;font-weight:bold;color:#ff6ec7;';
resultEl.textContent = result.name;
el.appendChild(resultEl);

var detail = document.createElement('p');
detail.style.cssText = 'padding:0 1rem;color:#9d99b5;font-size:13px;';
detail.textContent = 'Hand rank: ' + result.rank + ' — Click "Run" to deal again';
el.appendChild(detail);

var dealBtn = document.createElement('button');
dealBtn.textContent = 'Deal Again';
dealBtn.style.cssText = 'margin:1rem;padding:.5rem 1rem;font-size:14px;'
  + 'background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;';
dealBtn.addEventListener('click', function () { location.reload(); });
el.appendChild(dealBtn);
