// tarot-cards.js — French Tarot | MagmaCrunch Media © 2026
// SVG rendering for 78-card Tarot deck

// ── Create card DOM element ───────────────────────────────
// Uses the deck factory (TarotCardFactory) for rendering
function createTarotCardElement(card, faceUp) {
    // Ensure faceUp state matches what we want
    const savedFaceUp = card.faceUp;
    card.faceUp = faceUp;

    const el = TarotCardFactory.createCard(card);

    // Restore original faceUp state
    card.faceUp = savedFaceUp;

    return el;
}
