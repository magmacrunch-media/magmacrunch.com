// ai.js — French Tarot | MagmaCrunch Media © 2026
// AI opponents: bidding, card selection, trick play

const TarotAI = {

    // ── Bidding decisions ──────────────────────────────────
    decideBid(hand, currentBid, isTaker) {
        if (isTaker) return 'PASSE'; // Already have a bid

        const evaluation = Scoring.evaluateHandForBidding(hand);
        const suggestedBid = Scoring.suggestBid(hand);

        // Can only bid higher than current
        const currentBidIndex = BID_ORDER.indexOf(currentBid);
        const suggestedIndex = BID_ORDER.indexOf(suggestedBid);

        if (suggestedIndex > currentBidIndex) {
            // Sometimes bid lower than suggested to be unpredictable
            if (Math.random() < 0.7) {
                return suggestedBid;
            } else if (suggestedIndex > currentBidIndex + 1) {
                return BID_ORDER[currentBidIndex + 1];
            }
        }

        return 'PASSE';
    },

    // ── Select cards for the dog ───────────────────────────
    selectDogCards(hand, takerCards) {
        // Keep: trumps (especially oudlers), kings, long suits
        // Discard: low suited cards, isolated cards

        const scored = hand.map(card => ({
            card,
            score: this.scoreCardForDog(card, hand)
        }));

        // Sort by score (lowest first = best to discard)
        scored.sort((a, b) => a.score - b.score);

        // Return 6 lowest-scored cards
        return scored.slice(0, DOG_SIZE).map(s => s.card);
    },

    scoreCardForDog(card, hand) {
        let score = 0;

        // Never discard oudlers
        if (card.isOudler) return 100;

        // Never discard kings (unless forced)
        if (card.rank === 'R') return 90;

        // Keep high trumps
        if (card.type === 'trump') {
            if (card.number >= 16) score += 20;
            else if (card.number >= 10) score += 10;
            else score += 5;
        }

        // Keep cards in long suits
        if (card.type === 'suited') {
            const suitCount = hand.filter(c => c.type === 'suited' && c.suit === card.suit).length;
            score += suitCount * 2;

            // Keep high cards in the suit
            const rankIndex = TAROT_RANKS.indexOf(card.rank);
            score += rankIndex;
        }

        return score;
    },

    // ── Card play during trick-taking ──────────────────────
    chooseCard(hand, trickState, gameHistory, playerIndex) {
        const legalPlays = TrickLogic.getLegalPlays(hand, trickState);
        if (legalPlays.length === 0) return null;

        // If leading
        if (!trickState || trickState.cards.length === 0) {
            return this.chooseLeadCard(hand, gameHistory, playerIndex);
        }

        // Following
        return this.chooseFollowCard(hand, trickState, gameHistory, playerIndex);
    },

    chooseLeadCard(hand, gameHistory, playerIndex) {
        // Strategy: lead with high trumps to draw, or long suits
        const trumps = hand.filter(c => c.type === 'trump');
        const suited = hand.filter(c => c.type === 'suited');

        // If we have many trumps, lead a high one
        if (trumps.length >= 4) {
            const highTrumps = trumps.filter(c => c.number >= 10);
            if (highTrumps.length > 0) {
                return highTrumps[highTrumps.length - 1].id; // Highest
            }
            return trumps[trumps.length - 1].id;
        }

        // Lead from longest suit
        const suitCounts = {};
        for (const card of suited) {
            suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        }

        let longestSuit = null;
        let longestCount = 0;
        for (const suit in suitCounts) {
            if (suitCounts[suit] > longestCount) {
                longestCount = suitCounts[suit];
                longestSuit = suit;
            }
        }

        if (longestSuit) {
            // Lead highest card from longest suit
            const suitCards = suited.filter(c => c.suit === longestSuit);
            return suitCards[suitCards.length - 1].id;
        }

        // Fallback: play any card
        return hand[0].id;
    },

    chooseFollowCard(hand, trickState, gameHistory, playerIndex) {
        const legalPlays = TrickLogic.getLegalPlays(hand, trickState);

        // Map IDs to cards
        const legalCards = legalPlays.map(id => hand.find(c => c.id === id));

        // If winning is possible, try to win
        const winningCards = this.findWinningCards(legalCards, trickState);
        if (winningCards.length > 0) {
            // Win with lowest possible winning card
            return winningCards[0].id;
        }

        // Can't win — play lowest value card
        const sorted = legalCards.sort((a, b) => a.pointValue - b.pointValue);
        return sorted[0].id;
    },

    findWinningCards(legalCards, trickState) {
        const winning = [];
        const ledSuit = trickState.ledSuit;
        const ledTrump = trickState.ledTrump;

        for (const card of legalCards) {
            // Excuse never wins
            if (card.type === 'excuse') continue;

            // Suited card can only win if it matches the led suit and no trumps played
            if (card.type === 'suited') {
                if (card.suit !== ledSuit || ledTrump) continue;
            }

            // Check if this card would win
            let wouldWin = true;

            for (const played of trickState.cards) {
                if (played.card.id === card.id) continue;

                // Excuse doesn't count
                if (played.card.type === 'excuse') continue;

                // Trump beats non-trump
                if (played.card.type === 'trump' && card.type !== 'trump') {
                    wouldWin = false;
                    break;
                }

                // Higher trump beats lower trump
                if (played.card.type === 'trump' && card.type === 'trump') {
                    if (played.card.number > card.number) {
                        wouldWin = false;
                        break;
                    }
                }

                // Same suit: higher rank wins
                if (card.type === 'suited' && played.card.type === 'suited' &&
                    card.suit === played.card.suit) {
                    const cardRank = TAROT_RANKS.indexOf(card.rank);
                    const playedRank = TAROT_RANKS.indexOf(played.card.rank);
                    if (playedRank > cardRank) {
                        wouldWin = false;
                        break;
                    }
                }
            }

            if (wouldWin) {
                winning.push(card);
            }
        }

        // Sort by value (lowest first to save high cards)
        winning.sort((a, b) => a.pointValue - b.pointValue);
        return winning;
    },

    // ── Check for poignee declaration ──────────────────────
    checkPoignee(hand) {
        const trumps = hand.filter(c => c.type === 'trump' || c.type === 'excuse');

        if (trumps.length >= 15) return BONUSES.POIGNEE_TRIPLE;
        if (trumps.length >= 13) return BONUSES.POIGNEE_DOUBLE;
        if (trumps.length >= 10) return BONUSES.POIGNEE_SIMPLE;
        return null;
    }
};
