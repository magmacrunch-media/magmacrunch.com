"use strict";
var AdCards = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    CRIBBAGE_SCORE: () => CRIBBAGE_SCORE,
    Card: () => Card,
    ChipAnim: () => ChipAnim,
    CribbageHandEval: () => CribbageHandEval,
    DENOMS: () => DENOMS,
    Deck: () => Deck,
    FACE_CARD_SVG: () => FACE_CARD_SVG,
    FC_CORNERS: () => FC_CORNERS,
    FC_PIP_ART: () => FC_PIP_ART,
    HAND_POINTS: () => HAND_POINTS,
    HAND_RANKS: () => HAND_RANKS,
    HandEvaluator: () => HandEvaluator,
    POKER_RANK_VALUES: () => POKER_RANK_VALUES,
    RANKS: () => RANKS,
    RANK_VALUES: () => RANK_VALUES,
    SUITS: () => SUITS,
    SUIT_COLORS: () => SUIT_COLORS,
    SUIT_COLOR_NAMES: () => SUIT_COLOR_NAMES,
    SUIT_SYMBOLS: () => SUIT_SYMBOLS,
    breakIntoStacks: () => breakIntoStacks,
    cornerHTML: () => cornerHTML,
    cornerPipSVG: () => cornerPipSVG,
    drawChip: () => drawChip,
    getAceHTML: () => getAceHTML,
    getCardBackSVG: () => getCardBackSVG,
    getNumberCardHTML: () => getNumberCardHTML,
    getSuitLayout: () => getSuitLayout,
    pipColor: () => pipColor,
    pokerValue: () => pokerValue,
    renderStack: () => renderStack
  });

  // src/face-cards.ts
  var FC_RANK_SIZE = 8;
  var FC_PIP_SIZE = 7;
  var FC_LARGE_PIP_SIZE = 14;
  var FC_FONT = "Arial, sans-serif";
  var FC_RANK_X = 3;
  var FC_RANK_Y = 8;
  var FC_GLYPH_X = 3.5;
  var FC_GLYPH_Y = 15;
  var FC_LARGE_PIP_X = 12;
  var FC_LARGE_PIP_Y = 12;
  var FC_PIP_ART = {
    // ♠  spades — inverted heart head, flared base
    spades: (c) => `
              <rect x="17" y="3" width="2" height="1" fill="${c}"/>
              <rect x="16" y="4" width="4" height="1" fill="${c}"/>
              <rect x="15" y="5" width="6" height="1" fill="${c}"/>
              <rect x="14" y="6" width="8" height="1" fill="${c}"/>
              <rect x="15" y="7" width="6" height="1" fill="${c}"/>
              <rect x="17" y="8" width="2" height="1" fill="${c}"/>
              <rect x="15" y="9" width="6" height="1" fill="${c}"/>
              <rect x="16" y="10" width="4" height="1" fill="${c}"/>`,
    // ♥  hearts — classic heart, two lobes + point
    hearts: (c) => `
              <rect x="15" y="3" width="2" height="1" fill="${c}"/>
              <rect x="19" y="3" width="2" height="1" fill="${c}"/>
              <rect x="14" y="4" width="8" height="1" fill="${c}"/>
              <rect x="14" y="5" width="8" height="1" fill="${c}"/>
              <rect x="15" y="6" width="6" height="1" fill="${c}"/>
              <rect x="16" y="7" width="4" height="1" fill="${c}"/>
              <rect x="17" y="8" width="2" height="1" fill="${c}"/>`,
    // ♦  diamonds — clean rhombus
    diamonds: (c) => `
              <rect x="17" y="3" width="2" height="1" fill="${c}"/>
              <rect x="16" y="4" width="4" height="1" fill="${c}"/>
              <rect x="15" y="5" width="6" height="1" fill="${c}"/>
              <rect x="14" y="6" width="8" height="1" fill="${c}"/>
              <rect x="15" y="7" width="6" height="1" fill="${c}"/>
              <rect x="16" y="8" width="4" height="1" fill="${c}"/>
              <rect x="17" y="9" width="2" height="1" fill="${c}"/>`,
    // ♣  clubs — solid trefoil: top lobe, two side lobes fully filled, stem + base
    clubs: (c) => `
              <rect x="17" y="3" width="2" height="1" fill="${c}"/>
              <rect x="16" y="4" width="4" height="1" fill="${c}"/>
              <rect x="15" y="5" width="6" height="1" fill="${c}"/>
              <rect x="14" y="6" width="8" height="1" fill="${c}"/>
              <rect x="15" y="7" width="6" height="1" fill="${c}"/>
              <rect x="16" y="8" width="4" height="1" fill="${c}"/>
              <rect x="17" y="9" width="2" height="1" fill="${c}"/>
              <rect x="16" y="10" width="4" height="1" fill="${c}"/>`
  };
  function FC_CORNERS(rank, suit, color) {
    const suitSymbol = { clubs: "\u2663", diamonds: "\u2666", hearts: "\u2665", spades: "\u2660" }[suit];
    return (
      // Small rank letter (top-left column)
      `<text x="${FC_RANK_X}" y="${FC_RANK_Y}" font-family="${FC_FONT}" font-size="${FC_RANK_SIZE}" font-weight="bold" text-anchor="start" fill="${color}">${rank}</text>
              <text x="${FC_GLYPH_X}" y="${FC_GLYPH_Y}" font-family="Arial, sans-serif" font-size="${FC_PIP_SIZE}" text-anchor="start" fill="${color}">${suitSymbol}</text>
              <text x="${FC_LARGE_PIP_X}" y="${FC_LARGE_PIP_Y}" font-family="Arial, sans-serif" font-size="${FC_LARGE_PIP_SIZE}" text-anchor="start" fill="${color}">${suitSymbol}</text>`
    );
  }
  var FACE_CARD_SVG = {
    // ── J♣ ───────────────────────────────────────────────────
    "j-clubs": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("J", "clubs", "var(--fc-black, #111111)")}
              <rect x="50" y="6" width="4" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="52" y="10" width="4" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="48" y="18" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-black, #111111)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="28" y="30" width="8" height="8" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-black, #111111)"/>
              <rect x="46" y="26" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("J", "clubs", "var(--fc-black, #111111)")}
              <rect x="50" y="6" width="4" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="52" y="10" width="4" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="48" y="18" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-black, #111111)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="28" y="30" width="8" height="8" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-black, #111111)"/>
              <rect x="46" y="26" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
          </g>
        </svg>
    `,
    // ── J♦ ───────────────────────────────────────────────────
    "j-diamonds": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("J", "diamonds", "var(--fc-red, #cc0000)")}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="8" width="4" height="8" fill="var(--fc-steel, #8899aa)"/>
              <rect x="46" y="10" width="2" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="54" y="10" width="2" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold, #d4a017)"/>
              <rect x="44" y="18" width="4" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="28" width="8" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="32" width="4" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="48" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-blue, #1a3a8a)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("J", "diamonds", "var(--fc-red, #cc0000)")}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="8" width="4" height="8" fill="var(--fc-steel, #8899aa)"/>
              <rect x="46" y="10" width="2" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="54" y="10" width="2" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold, #d4a017)"/>
              <rect x="44" y="18" width="4" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="28" width="8" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="32" width="4" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="48" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-blue, #1a3a8a)"/>
          </g>
        </svg>
    `,
    // ── J♥ ───────────────────────────────────────────────────
    "j-hearts": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("J", "hearts", "var(--fc-red, #cc0000)")}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="46" y="10" width="6" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="44" y="12" width="2" height="8" fill="var(--fc-steel, #8899aa)"/>
              <rect x="22" y="10" width="22" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="6" width="18" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="12" width="10" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="10" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="24" y="18" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="28" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="22" y="24" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="28" y="26" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="14" y="24" width="6" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="16" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="34" width="14" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="28" y="32" width="8" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-red, #cc0000)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("J", "hearts", "var(--fc-red, #cc0000)")}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="46" y="10" width="6" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="44" y="12" width="2" height="8" fill="var(--fc-steel, #8899aa)"/>
              <rect x="22" y="10" width="22" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="6" width="18" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="12" width="10" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="10" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="24" y="18" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="28" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="22" y="24" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="28" y="26" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="14" y="24" width="6" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="16" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="34" width="14" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="28" y="32" width="8" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-red, #cc0000)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
          </g>
        </svg>
    `,
    // ── J♠ ───────────────────────────────────────────────────
    "j-spades": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("J", "spades", "var(--fc-black, #111111)")}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="6" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="8" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="54" y="8" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="12" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="14" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="54" y="14" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="18" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="14" y="32" width="2" height="2" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="18" y="36" width="2" height="2" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="32" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="48" y="30" width="6" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-red, #cc0000)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("J", "spades", "var(--fc-black, #111111)")}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="6" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="8" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="54" y="8" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="12" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="14" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="54" y="14" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="50" y="18" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="14" y="32" width="2" height="2" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="18" y="36" width="2" height="2" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="32" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="48" y="30" width="6" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-red, #cc0000)"/>
          </g>
        </svg>
    `,
    // ── Q♣ ───────────────────────────────────────────────────
    "q-clubs": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("Q", "clubs", "var(--fc-black, #111111)")}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("Q", "clubs", "var(--fc-black, #111111)")}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `,
    // ── Q♦ ───────────────────────────────────────────────────
    "q-diamonds": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("Q", "diamonds", "var(--fc-red, #cc0000)")}
              <rect x="18" y="24" width="2" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="16" y="20" width="6" height="6" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="18" y="22" width="2" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="30" width="14" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="20" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("Q", "diamonds", "var(--fc-red, #cc0000)")}
              <rect x="18" y="24" width="2" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="16" y="20" width="6" height="6" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="18" y="22" width="2" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="30" width="14" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="20" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `,
    // ── Q♥ ───────────────────────────────────────────────────
    "q-hearts": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("Q", "hearts", "var(--fc-red, #cc0000)")}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("Q", "hearts", "var(--fc-red, #cc0000)")}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-red, #cc0000)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-gold, #d4a017)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `,
    // ── Q♠ ───────────────────────────────────────────────────
    "q-spades": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("Q", "spades", "var(--fc-black, #111111)")}
              <rect x="50" y="8" width="2" height="22" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="4" width="6" height="6" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="50" y="4" width="2" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="20" y="10" width="8" height="20" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="14" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="28" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="38" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="16" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="28" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="32" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="30" width="12" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="26" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("Q", "spades", "var(--fc-black, #111111)")}
              <rect x="50" y="8" width="2" height="22" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="4" width="6" height="6" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="50" y="4" width="2" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="2" width="4" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="20" y="10" width="8" height="20" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="14" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="28" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="38" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="22" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="16" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="28" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="32" y="30" width="4" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="40" y="30" width="12" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="26" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `,
    // ── K♣ ───────────────────────────────────────────────────
    "k-clubs": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("K", "clubs", "var(--fc-black, #111111)")}
              <rect x="48" y="4" width="4" height="26" fill="var(--fc-steel, #8899aa)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-art-bg, #fffef5)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="12" y="24" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
              <rect x="16" y="20" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="22" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="28" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="34" y="4" width="4" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="22" y="10" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="28" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("K", "clubs", "var(--fc-black, #111111)")}
              <rect x="48" y="4" width="4" height="26" fill="var(--fc-steel, #8899aa)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-art-bg, #fffef5)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="12" y="24" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
              <rect x="16" y="20" width="2" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="22" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="28" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="34" y="4" width="4" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="22" y="10" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="28" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `,
    // ── K♦ ───────────────────────────────────────────────────
    "k-diamonds": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("K", "diamonds", "var(--fc-red, #cc0000)")}
              <rect x="46" y="4" width="2" height="36" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="8" width="6" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="54" y="6" width="2" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="50" y="10" width="2" height="8" fill="var(--fc-art-bg, #fffef5)"/>
              <rect x="24" y="6" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="34" y="10" width="8" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="22" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="20" y="14" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="24" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="20" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="30" width="18" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="16" y="34" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="30" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="34" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("K", "diamonds", "var(--fc-red, #cc0000)")}
              <rect x="46" y="4" width="2" height="36" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="8" width="6" height="12" fill="var(--fc-steel, #8899aa)"/>
              <rect x="54" y="6" width="2" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="50" y="10" width="2" height="8" fill="var(--fc-art-bg, #fffef5)"/>
              <rect x="24" y="6" width="14" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="34" y="10" width="8" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="22" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="20" y="14" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="24" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="20" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="12" y="30" width="18" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="16" y="34" width="6" height="6" fill="var(--fc-gold, #d4a017)"/>
              <rect x="30" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="34" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `,
    // ── K♥ ───────────────────────────────────────────────────
    "k-hearts": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("K", "hearts", "var(--fc-red, #cc0000)")}
              <rect x="22" y="12" width="22" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="40" y="10" width="10" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="44" y="4" width="2" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="42" y="2" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="6" width="12" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="28" y="4" width="8" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="10" width="2" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="26" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="42" y="6" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="14" y="26" width="30" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="16" y="32" width="8" height="8" fill="var(--fc-black, #111111)"/>
              <rect x="28" y="30" width="16" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="32" y="32" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("K", "hearts", "var(--fc-red, #cc0000)")}
              <rect x="22" y="12" width="22" height="4" fill="var(--fc-steel, #8899aa)"/>
              <rect x="40" y="10" width="10" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="44" y="4" width="2" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="42" y="2" width="6" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="26" y="6" width="12" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="28" y="4" width="8" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="24" y="10" width="2" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel, #8899aa)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="26" y="22" width="6" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="42" y="6" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="14" y="26" width="30" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="16" y="32" width="8" height="8" fill="var(--fc-black, #111111)"/>
              <rect x="28" y="30" width="16" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="32" y="32" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
          </g>
        </svg>
    `,
    // ── K♠ ───────────────────────────────────────────────────
    "k-spades": () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg, #fffef5)"/>
          <g>
              ${FC_CORNERS("K", "spades", "var(--fc-black, #111111)")}
              <rect x="48" y="4" width="6" height="26" fill="var(--fc-steel, #8899aa)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="46" y="38" width="8" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="6" width="18" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="4" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="4" width="4" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="10" width="6" height="18" fill="var(--fc-steel, #8899aa)"/>
              <rect x="38" y="10" width="6" height="18" fill="var(--fc-steel, #8899aa)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="30" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="34" y="16" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="22" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="12" y="26" width="32" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="16" y="28" width="24" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS("K", "spades", "var(--fc-black, #111111)")}
              <rect x="48" y="4" width="6" height="26" fill="var(--fc-steel, #8899aa)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-card-bg, #fffef5)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="46" y="38" width="8" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="22" y="6" width="18" height="4" fill="var(--fc-gold, #d4a017)"/>
              <rect x="24" y="4" width="4" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="30" y="4" width="4" height="2" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red, #cc0000)"/>
              <rect x="20" y="10" width="6" height="18" fill="var(--fc-steel, #8899aa)"/>
              <rect x="38" y="10" width="6" height="18" fill="var(--fc-steel, #8899aa)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="30" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="36" y="14" width="2" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="34" y="16" width="2" height="4" fill="var(--fc-skin, #f5cba7)"/>
              <rect x="34" y="22" width="4" height="2" fill="var(--fc-black, #111111)"/>
              <rect x="12" y="26" width="32" height="4" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="16" y="28" width="24" height="2" fill="var(--fc-gold, #d4a017)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-gold, #d4a017)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-blue, #1a3a8a)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-red, #cc0000)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-black, #111111)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin, #f5cba7)"/>
          </g>
        </svg>
    `
  };

  // src/number-cards.ts
  var SUIT_CHAR = { hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663", spades: "\u2660" };
  function pipColor(suit) {
    return suit === "hearts" || suit === "diamonds" ? "#cc0000" : "#111111";
  }
  function colorAttr(color) {
    return color ? ` style="color:${color}"` : "";
  }
  function cornerPipSVG(suit, color) {
    const shapes = {
      hearts: `<svg viewBox="0 0 8 7" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="1" y="0" width="2" height="1" fill="${color}"/>
            <rect x="5" y="0" width="2" height="1" fill="${color}"/>
            <rect x="0" y="1" width="8" height="2" fill="${color}"/>
            <rect x="1" y="3" width="6" height="1" fill="${color}"/>
            <rect x="2" y="4" width="4" height="1" fill="${color}"/>
            <rect x="3" y="5" width="2" height="1" fill="${color}"/>
            <rect x="3" y="6" width="2" height="1" fill="${color}"/>
          </svg>`,
      diamonds: `<svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="3" y="0" width="2" height="1" fill="${color}"/>
            <rect x="2" y="1" width="4" height="1" fill="${color}"/>
            <rect x="1" y="2" width="6" height="1" fill="${color}"/>
            <rect x="0" y="3" width="8" height="1" fill="${color}"/>
            <rect x="1" y="4" width="6" height="1" fill="${color}"/>
            <rect x="2" y="5" width="4" height="1" fill="${color}"/>
            <rect x="3" y="6" width="2" height="1" fill="${color}"/>
          </svg>`,
      spades: `<svg viewBox="0 0 8 9" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="3" y="0" width="2" height="1" fill="${color}"/>
            <rect x="2" y="1" width="4" height="1" fill="${color}"/>
            <rect x="1" y="2" width="6" height="1" fill="${color}"/>
            <rect x="0" y="3" width="8" height="1" fill="${color}"/>
            <rect x="1" y="4" width="6" height="1" fill="${color}"/>
            <rect x="3" y="5" width="2" height="1" fill="${color}"/>
            <rect x="1" y="6" width="6" height="1" fill="${color}"/>
            <rect x="2" y="7" width="4" height="1" fill="${color}"/>
          </svg>`,
      clubs: `<svg viewBox="0 0 8 9" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="3" y="0" width="2" height="1" fill="${color}"/>
            <rect x="2" y="1" width="4" height="2" fill="${color}"/>
            <rect x="0" y="2" width="3" height="2" fill="${color}"/>
            <rect x="5" y="2" width="3" height="2" fill="${color}"/>
            <rect x="2" y="2" width="4" height="4" fill="${color}"/>
            <rect x="0" y="4" width="8" height="1" fill="${color}"/>
            <rect x="1" y="5" width="6" height="1" fill="${color}"/>
            <rect x="3" y="6" width="2" height="1" fill="${color}"/>
            <rect x="2" y="7" width="4" height="1" fill="${color}"/>
          </svg>`
    };
    return shapes[suit] ?? "";
  }
  function cornerHTML(rank, suit, color) {
    const s = SUIT_CHAR[suit];
    const c = colorAttr(color);
    return `
        <div class="card-corner top-left">
            <div class="corner-rank"${c}>${rank}</div>
            <div class="corner-suit"${c}>${s}</div>
        </div>
        <div class="card-corner bottom-right">
            <div class="corner-rank"${c}>${rank}</div>
            <div class="corner-suit"${c}>${s}</div>
        </div>`;
  }
  function getAceHTML(suit, _rank) {
    return `
        ${cornerHTML("A", suit)}
        <div class="card-suit-center single">
            <div class="pip-ace">${SUIT_CHAR[suit]}</div>
        </div>`;
  }
  function getNumberCardHTML(suit, rank) {
    const layout = getSuitLayout(rank, suit);
    return `
        ${cornerHTML(rank, suit)}
        <div class="card-suit-center" data-rank="${rank}">
            ${layout}
        </div>`;
  }
  function pu(suit, color) {
    return `<span class="pip"${colorAttr(color)}>${SUIT_CHAR[suit]}</span>`;
  }
  function pr(suit, color) {
    return `<span class="pip rotated"${colorAttr(color)}>${SUIT_CHAR[suit]}</span>`;
  }
  function getSuitLayout(rank, suit, color) {
    const layouts = {
      // 2: top center up, bottom center down
      "2": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}</div>
            </div>`,
      // 3: top, middle, bottom
      "3": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}</div>
            </div>`,
      // 4: two pairs — top pair, bottom pair
      "4": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`,
      // 5: top pair, center single, bottom pair
      "5": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`,
      // 6: three rows of two
      "6": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`,
      // 7: like 6 + one pip in upper-middle (between rows 1 and 2)
      "7": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`,
      // 8: like 7 + one pip in lower-middle (between rows 3 and 4)
      "8": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`,
      // 9: two columns of 4 + center single pip between them
      "9": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`,
      // 10: two columns of 5
      "10": `
            <div class="suit-rows">
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pu(suit, color)}${pu(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
                <div class="suit-row">${pr(suit, color)}${pr(suit, color)}</div>
            </div>`
    };
    return layouts[rank] ?? "";
  }

  // src/constants.ts
  var SUITS = ["hearts", "diamonds", "clubs", "spades"];
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  var SUIT_SYMBOLS = {
    hearts: "\u2665",
    diamonds: "\u2666",
    clubs: "\u2663",
    spades: "\u2660"
  };
  var SUIT_COLORS = {
    hearts: "#cc0000",
    diamonds: "#cc0000",
    clubs: "#111111",
    spades: "#111111"
  };
  var SUIT_COLOR_NAMES = {
    hearts: "red",
    diamonds: "red",
    clubs: "black",
    spades: "black"
  };
  var RANK_VALUES = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13
  };
  var POKER_RANK_VALUES = {
    ...RANK_VALUES,
    A: 14
  };
  function pokerValue(rank) {
    return POKER_RANK_VALUES[rank];
  }

  // src/deck.ts
  var _cardBackIdCounter = 0;
  function getCardBackSVG() {
    const id = _cardBackIdCounter++;
    return `
    <svg class="card-back-svg" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg"
         style="shape-rendering:crispEdges; image-rendering:pixelated;">
      <defs>
        <!-- Diagonal crosshatch: thin pink + cyan lines -->
        <pattern id="vwgrid${id}" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#0d0028"/>
          <line x1="0" y1="0" x2="8" y2="8" stroke="#ff2d78" stroke-width="0.6" opacity="0.55"/>
          <line x1="8" y1="0" x2="0" y2="8" stroke="#00e5ff" stroke-width="0.6" opacity="0.45"/>
        </pattern>
      </defs>

      <!-- Card body: deep purple -->
      <rect x="0" y="0" width="64" height="88" fill="#0d0028"/>

      <!-- Outer bevel -->
      <line x1="0" y1="0" x2="64" y2="0"  stroke="#4a107a" stroke-width="1"/>
      <line x1="0" y1="0" x2="0"  y2="88" stroke="#4a107a" stroke-width="1"/>
      <line x1="63" y1="0" x2="63" y2="88" stroke="#06000f" stroke-width="1"/>
      <line x1="0" y1="87" x2="64" y2="87" stroke="#06000f" stroke-width="1"/>

      <!-- Inner border frame (pink) -->
      <rect x="3" y="3" width="58" height="82" fill="none"
            stroke="#ff2d78" stroke-width="0.75" opacity="0.6"/>
      <!-- Second inner frame (cyan) -->
      <rect x="5" y="5" width="54" height="78" fill="none"
            stroke="#00e5ff" stroke-width="0.5" opacity="0.4"/>

      <!-- Grid fill -->
      <rect x="6" y="6" width="52" height="76" fill="url(#vwgrid${id})"/>

      <!-- Center badge: centered on card (viewBox 64x88, center=32,44) -->
      <!-- Badge: 34x30, top-left=(15,29), center=(32,44) -->
      <rect x="15" y="29" width="34" height="30" rx="2" ry="2" fill="#060018"/>
      <rect x="16" y="30" width="32" height="28" rx="1" ry="1" fill="none"
            stroke="#ffd700" stroke-width="0.75" opacity="0.7"/>

      <!-- Pixel-art volcano - centered within badge -->
      <!-- Badge inner: x=17..47, y=31..57. Volcano 20px tall, start y=34 -->

      <!-- Lava eruption particles -->
      <rect x="30" y="34" width="2" height="2" fill="#ff6000" opacity="0.9"/>
      <rect x="34" y="34" width="2" height="2" fill="#ff2d00" opacity="0.8"/>
      <rect x="27" y="35" width="2" height="2" fill="#ff2d00" opacity="0.7"/>
      <rect x="32" y="35" width="2" height="2" fill="#ffaa00" opacity="0.95"/>
      <rect x="36" y="36" width="2" height="2" fill="#ff6000" opacity="0.7"/>
      <rect x="29" y="36" width="2" height="1" fill="#ffaa00" opacity="0.8"/>

      <!-- Crater rim -->
      <rect x="28" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
      <rect x="33" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
      <rect x="31" y="38" width="2" height="2" fill="#ff4400" opacity="1"/>

      <!-- Volcano body: 5 stepped rows -->
      <rect x="27" y="40" width="10" height="2" fill="#cc8800" opacity="0.95"/>
      <rect x="25" y="42" width="14" height="2" fill="#bb7700" opacity="0.95"/>
      <rect x="22" y="44" width="20" height="2" fill="#aa6600" opacity="0.95"/>
      <rect x="19" y="46" width="26" height="2" fill="#996600" opacity="0.95"/>
      <rect x="17" y="48" width="30" height="2" fill="#885500" opacity="0.95"/>

      <!-- Ground base -->
      <rect x="16" y="50" width="32" height="2" fill="#774400" opacity="0.95"/>

      <!-- Lava glow at base -->
      <rect x="20" y="51" width="6"  height="1" fill="#ff6600" opacity="0.6"/>
      <rect x="28" y="51" width="8"  height="1" fill="#ff8800" opacity="0.55"/>
      <rect x="37" y="51" width="5"  height="1" fill="#ff4400" opacity="0.5"/>

      <!-- Thin gold rules above and below badge -->
      <line x1="10" y1="27" x2="54" y2="27" stroke="#ffd700" stroke-width="0.5" opacity="0.35"/>
      <line x1="10" y1="61" x2="54" y2="61" stroke="#ffd700" stroke-width="0.5" opacity="0.35"/>

            <!-- Corner accent marks: pink 2\xD72 squares -->
      <rect x="7"  y="7"  width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="54" y="7"  width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="7"  y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="54" y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>

      <!-- Cyan dots just inside corners -->
      <rect x="11" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="51" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="11" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="51" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
    </svg>`;
  }
  var Card = class {
    suit;
    rank;
    faceUp;
    /** Ink colour as a hex value, for canvas and SVG fills. */
    color;
    /** Ink colour as the name the stylesheet keys on: 'red' or 'black'. */
    colorName;
    value;
    constructor(suit, rank) {
      this.suit = suit;
      this.rank = rank;
      this.faceUp = false;
      this.color = SUIT_COLORS[suit];
      this.colorName = SUIT_COLOR_NAMES[suit];
      this.value = RANK_VALUES[rank];
    }
    flip() {
      this.faceUp = !this.faceUp;
    }
    getHTML() {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.suit = this.suit;
      card.dataset.rank = this.rank;
      if (this.faceUp) {
        card.classList.add("face-up", this.colorName);
        if (this.rank === "J" || this.rank === "Q" || this.rank === "K") {
          const key = `${this.rank.toLowerCase()}-${this.suit}`;
          const svgFn = FACE_CARD_SVG[key];
          if (svgFn) {
            const wrapper = document.createElement("div");
            wrapper.className = "face-card-svg-wrapper";
            wrapper.innerHTML = svgFn();
            card.appendChild(wrapper);
          } else {
            card.innerHTML = this._fallbackFaceHTML();
          }
        } else if (this.rank === "A") {
          card.innerHTML = getAceHTML(this.suit, this.rank);
        } else {
          card.innerHTML = getNumberCardHTML(this.suit, this.rank);
        }
      } else {
        card.classList.add("face-down");
        card.innerHTML = getCardBackSVG();
      }
      return card;
    }
    _fallbackFaceHTML() {
      const symbol = SUIT_SYMBOLS[this.suit];
      return `
            <div class="card-corner top-left">
                <div class="corner-rank">${this.rank}</div>
                <div class="corner-suit">${symbol}</div>
            </div>
            <div class="card-suit-center single">
                <div class="suit-symbol">${symbol}</div>
            </div>
            <div class="card-corner bottom-right">
                <div class="corner-rank">${this.rank}</div>
                <div class="corner-suit">${symbol}</div>
            </div>`;
    }
  };
  var Deck = class {
    cards;
    constructor() {
      this.cards = [];
      this.createDeck();
    }
    createDeck() {
      this.cards = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(suit, rank));
        }
      }
    }
    shuffle() {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }
    deal() {
      return this.cards.pop();
    }
  };

  // src/chip-animation.ts
  var DENOMS = [
    { value: 500, face: "#7744cc", edge: "#3d1a77", mid: "#ffffff", dark: "#1a0044", label: "500", name: "Purple" },
    { value: 100, face: "#444444", edge: "#111111", mid: "#aaaaaa", dark: "#000000", label: "100", name: "Black" },
    { value: 25, face: "#22aa44", edge: "#0d5520", mid: "#ffffff", dark: "#062b10", label: "25", name: "Green" },
    { value: 5, face: "#dd2233", edge: "#770f18", mid: "#ffffff", dark: "#3b0009", label: "5", name: "Red" },
    { value: 1, face: "#ddddbb", edge: "#888866", mid: "#cc2200", dark: "#444433", label: "1", name: "White" }
  ];
  var CW = 64;
  var FACE_RY = 10;
  var EDGE_H = 9;
  var CHIP_H = FACE_RY * 2 + EDGE_H;
  var OVERLAP = FACE_RY * 2 + 2;
  var MAX_STACK = 12;
  var currentChips = 500;
  function drawChip(ctx, denom, cx, topY) {
    const { face, edge, mid, dark } = denom;
    const rx = CW / 2 - 4;
    const faceY = topY + FACE_RY;
    ctx.beginPath();
    ctx.ellipse(cx, faceY + EDGE_H + 3, rx - 1, FACE_RY - 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.fillRect(cx - rx, faceY, rx * 2, EDGE_H);
    ctx.beginPath();
    ctx.ellipse(cx, faceY + EDGE_H, rx, FACE_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.fillStyle = mid;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(cx - rx + 4, faceY + 2, rx * 2 - 8, 2);
    ctx.fillRect(cx - rx + 4, faceY + EDGE_H - 4, rx * 2 - 8, 2);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx, FACE_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx - 6, FACE_RY - 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = mid;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx - 12, FACE_RY - 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = mid;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.25, faceY - FACE_RY * 0.3, rx * 0.38, FACE_RY * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx, FACE_RY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function renderStack(canvas, denom, count) {
    const drawn = Math.min(count, MAX_STACK);
    const totalH = CHIP_H + (drawn - 1) * OVERLAP + 6;
    canvas.width = CW;
    canvas.height = totalH;
    canvas.style.width = CW + "px";
    canvas.style.height = totalH + "px";
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CW, totalH);
    const cx = CW / 2;
    for (let i = 0; i < drawn; i++) {
      const topY = totalH - CHIP_H - 3 - i * OVERLAP;
      drawChip(ctx, denom, cx, topY);
    }
  }
  function breakIntoStacks(amount) {
    const stacks = [];
    let rem = amount;
    for (const d of DENOMS) {
      const n = Math.floor(rem / d.value);
      if (n > 0) {
        stacks.push({ denom: d, count: n });
        rem -= n * d.value;
      }
    }
    return stacks;
  }
  function renderChips(chips) {
    const display = document.getElementById(_displayId);
    if (!display) return;
    display.innerHTML = "";
    if (chips <= 0) {
      display.innerHTML = '<div class="bust-msg">B U S T</div>';
      return;
    }
    const stacks = breakIntoStacks(chips);
    stacks.forEach(function(stack) {
      const wrap = document.createElement("div");
      wrap.className = "chip-stack-wrap";
      const badge = document.createElement("div");
      badge.className = "stack-count";
      badge.textContent = "\xD7" + stack.count;
      wrap.appendChild(badge);
      const canvas = document.createElement("canvas");
      canvas.className = "stack-canvas";
      renderStack(canvas, stack.denom, stack.count);
      wrap.appendChild(canvas);
      display.appendChild(wrap);
    });
  }
  var _displayId = "chipDisplay";
  var _legendId = "chipLegend";
  var ChipAnim = {
    init: function(displayId, legendId) {
      _displayId = displayId || "chipDisplay";
      _legendId = legendId || "chipLegend";
    },
    setChips: function(amount) {
      currentChips = Math.max(0, amount);
      renderChips(currentChips);
      renderLegend();
    },
    addChips: function(delta) {
      currentChips = Math.max(0, currentChips + delta);
      renderChips(currentChips);
    },
    getChips: function() {
      return currentChips;
    }
  };
  function renderLegend() {
    const legend = document.getElementById(_legendId);
    if (!legend) return;
    legend.innerHTML = "";
    DENOMS.forEach(function(d) {
      const item = document.createElement("div");
      item.className = "legend-item";
      const canvas = document.createElement("canvas");
      const scale = 0.55;
      const w = Math.round(CW * scale);
      const faceRY = Math.round(FACE_RY * scale);
      const edgeH = Math.round(EDGE_H * scale);
      const h = faceRY * 2 + edgeH + 4;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.scale(scale, scale);
      drawChip(ctx, d, CW / 2, faceRY + 1);
      ctx.restore();
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = d.mid;
      ctx.globalAlpha = 0.85;
      ctx.fillText(d.label, w / 2, faceRY + 1);
      ctx.globalAlpha = 1;
      const label = document.createElement("span");
      label.textContent = "=" + d.value;
      item.appendChild(canvas);
      item.appendChild(label);
      legend.appendChild(item);
    });
  }

  // src/hand-eval.ts
  var HAND_RANKS = {
    "Royal Flush": 9,
    "Straight Flush": 8,
    "Four of a Kind": 7,
    "Full House": 6,
    "Flush": 5,
    "Straight": 4,
    "Three of a Kind": 3,
    "Two Pair": 2,
    "One Pair": 1,
    "High Card": 0
  };
  var HAND_POINTS = {
    "Royal Flush": 1e3,
    "Straight Flush": 500,
    "Four of a Kind": 250,
    "Full House": 150,
    "Flush": 100,
    "Straight": 75,
    "Three of a Kind": 50,
    "Two Pair": 25,
    "One Pair": 10,
    "High Card": 0
  };
  var HandEvaluator = class {
    evaluate(cards) {
      if (!cards || cards.length < 2) {
        return this._emptyResult();
      }
      if (cards.length < 5) {
        return this._evaluatePartial(cards);
      }
      const combos = this._combinations(cards, 5);
      let best = null;
      for (const combo of combos) {
        const result = this._evaluateFive(combo);
        if (!best || this._compareTo(result, best) > 0) {
          best = result;
        }
      }
      return best ?? this._emptyResult();
    }
    _evaluateFive(cards) {
      const sorted = [...cards].sort((a, b) => b.value - a.value);
      const isFlush = this._isFlush(cards);
      const isStraight = this._isStraight(sorted);
      const counts = this._getValueCounts(cards);
      const countVals = Object.values(counts).sort((a, b) => b - a);
      let name;
      let rank;
      let tiebreakers;
      if (isFlush && isStraight && sorted[0].value === 14 && sorted[1].value === 13) {
        name = "Royal Flush";
        rank = HAND_RANKS["Royal Flush"];
        tiebreakers = [14];
      } else if (isFlush && isStraight) {
        name = "Straight Flush";
        rank = HAND_RANKS["Straight Flush"];
        tiebreakers = [this._straightHighCard(sorted)];
      } else if ((countVals[0] ?? 0) === 4) {
        name = "Four of a Kind";
        rank = HAND_RANKS["Four of a Kind"];
        tiebreakers = this._tiebreakByCount(counts, [4, 1]);
      } else if ((countVals[0] ?? 0) === 3 && (countVals[1] ?? 0) === 2) {
        name = "Full House";
        rank = HAND_RANKS["Full House"];
        tiebreakers = this._tiebreakByCount(counts, [3, 2]);
      } else if (isFlush) {
        name = "Flush";
        rank = HAND_RANKS["Flush"];
        tiebreakers = sorted.map((c) => c.value);
      } else if (isStraight) {
        name = "Straight";
        rank = HAND_RANKS["Straight"];
        tiebreakers = [this._straightHighCard(sorted)];
      } else if ((countVals[0] ?? 0) === 3) {
        name = "Three of a Kind";
        rank = HAND_RANKS["Three of a Kind"];
        tiebreakers = this._tiebreakByCount(counts, [3, 1, 1]);
      } else if ((countVals[0] ?? 0) === 2 && (countVals[1] ?? 0) === 2) {
        name = "Two Pair";
        rank = HAND_RANKS["Two Pair"];
        tiebreakers = this._tiebreakByCount(counts, [2, 2, 1]);
      } else if ((countVals[0] ?? 0) === 2) {
        name = "One Pair";
        rank = HAND_RANKS["One Pair"];
        tiebreakers = this._tiebreakByCount(counts, [2, 1, 1, 1]);
      } else {
        name = "High Card";
        rank = HAND_RANKS["High Card"];
        tiebreakers = sorted.map((c) => c.value);
      }
      return {
        name,
        rank,
        points: HAND_POINTS[name],
        tiebreakers,
        cards: sorted,
        description: this._describe(name, sorted)
      };
    }
    _evaluatePartial(cards) {
      const sorted = [...cards].sort((a, b) => b.value - a.value);
      const counts = this._getValueCounts(cards);
      const countVals = Object.values(counts).sort((a, b) => b - a);
      let name = "High Card";
      if ((countVals[0] ?? 0) === 2 && (countVals[1] ?? 0) === 2) name = "Two Pair";
      else if ((countVals[0] ?? 0) === 3 && (countVals[1] ?? 0) === 2) name = "Full House";
      else if ((countVals[0] ?? 0) === 4) name = "Four of a Kind";
      else if ((countVals[0] ?? 0) === 3) name = "Three of a Kind";
      else if ((countVals[0] ?? 0) === 2) name = "One Pair";
      return {
        name,
        rank: HAND_RANKS[name],
        points: HAND_POINTS[name],
        tiebreakers: sorted.map((c) => c.value),
        cards: sorted,
        description: `${name} (partial)`,
        partial: true
      };
    }
    _emptyResult() {
      return {
        name: "No Cards",
        rank: -1,
        points: 0,
        tiebreakers: [],
        cards: [],
        description: "No cards dealt",
        partial: true
      };
    }
    _compareTo(a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
        const av = a.tiebreakers[i] || 0;
        const bv = b.tiebreakers[i] || 0;
        if (av !== bv) return av - bv;
      }
      return 0;
    }
    _isFlush(cards) {
      const suit = cards[0].suit;
      return cards.every((c) => c.suit === suit);
    }
    _isStraight(sortedCards) {
      let straight = true;
      for (let i = 0; i < sortedCards.length - 1; i++) {
        if (sortedCards[i].value - sortedCards[i + 1].value !== 1) {
          straight = false;
          break;
        }
      }
      if (straight) return true;
      const values = sortedCards.map((c) => c.value).sort((a, b) => a - b);
      if (values[4] === 14 && values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5) {
        return true;
      }
      return false;
    }
    _straightHighCard(sortedCards) {
      const values = sortedCards.map((c) => c.value).sort((a, b) => a - b);
      if (values[4] === 14 && values[0] === 2 && values[3] === 5) return 5;
      return sortedCards[0].value;
    }
    /**
     * The rank to label a straight with. Mirrors `_straightHighCard`: in the
     * wheel (A-2-3-4-5) the ace plays low, so the hand is five high even though
     * the ace sorts to the front.
     */
    _straightRankName(sortedCards) {
      const high = this._straightHighCard(sortedCards);
      return sortedCards.find((c) => c.value === high)?.rank ?? sortedCards[0].rank;
    }
    _getValueCounts(cards) {
      const counts = {};
      cards.forEach((c) => {
        counts[c.value] = (counts[c.value] || 0) + 1;
      });
      return counts;
    }
    _tiebreakByCount(counts, pattern) {
      const groups = {};
      Object.entries(counts).forEach(([val, cnt]) => {
        const c = Number(cnt);
        (groups[c] ??= []).push(parseInt(val, 10));
      });
      Object.values(groups).forEach((g) => g.sort((a, b) => b - a));
      const result = [];
      const seen = /* @__PURE__ */ new Set();
      for (const targetCount of pattern) {
        if (groups[targetCount]) {
          for (const val of groups[targetCount]) {
            if (!seen.has(val)) {
              result.push(val);
              seen.add(val);
              break;
            }
          }
        }
      }
      return result;
    }
    _combinations(arr, k) {
      const results = [];
      function combine(start, current) {
        if (current.length === k) {
          results.push([...current]);
          return;
        }
        for (let i = start; i < arr.length; i++) {
          current.push(arr[i]);
          combine(i + 1, current);
          current.pop();
        }
      }
      combine(0, []);
      return results;
    }
    _describe(name, sortedCards) {
      const top = sortedCards[0];
      switch (name) {
        case "Royal Flush":
          return `Royal Flush \u2014 ${top.suit}`;
        case "Straight Flush":
          return `Straight Flush \u2014 ${this._straightRankName(sortedCards)} high`;
        case "Four of a Kind":
          return `Four ${top.rank}s`;
        case "Full House": {
          const counts = this._getValueCounts(sortedCards);
          const triple = Object.entries(counts).find(([, v]) => v === 3);
          const pair = Object.entries(counts).find(([, v]) => v === 2);
          const rankName = (r) => sortedCards.find((c) => c.value === parseInt(r, 10))?.rank ?? r;
          return triple && pair ? `Full House \u2014 ${rankName(triple[0])}s full of ${rankName(pair[0])}s` : "Full House";
        }
        case "Flush":
          return `Flush \u2014 ${top.rank} high (${top.suit})`;
        case "Straight":
          return `Straight \u2014 ${this._straightRankName(sortedCards)} high`;
        case "Three of a Kind":
          return `Three ${top.rank}s`;
        case "Two Pair": {
          const counts = this._getValueCounts(sortedCards);
          const pairs = Object.entries(counts).filter(([, v]) => v === 2).map(([k]) => sortedCards.find((c) => c.value === parseInt(k, 10))?.rank ?? k).join("s and ");
          return `Two Pair \u2014 ${pairs}s`;
        }
        case "One Pair": {
          const counts = this._getValueCounts(sortedCards);
          const pair = Object.entries(counts).find(([, v]) => v === 2);
          const pairRank = pair ? sortedCards.find((c) => c.value === parseInt(pair[0], 10))?.rank ?? pair[0] : "";
          return `Pair of ${pairRank}s`;
        }
        case "High Card":
          return `${top.rank} high`;
        default:
          return name;
      }
    }
  };

  // src/cribbage-hand-eval.ts
  var CRIBBAGE_SCORE = {
    FIFTEEN: 2,
    PAIR: 2,
    THREE_OF_KIND: 6,
    FOUR_OF_KIND: 12,
    FLUSH_4: 4,
    FLUSH_5: 5,
    NIBS: 1,
    HIS_HEELS: 2,
    GO: 1,
    THIRTY_ONE: 2
  };
  var CRIBBAGE_ORDER = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13
  };
  function cribbageOrder(rank) {
    return CRIBBAGE_ORDER[rank] ?? 0;
  }
  function cribbageValue(rank) {
    return Math.min(cribbageOrder(rank), 10);
  }
  var CribbageHandEval = {
    /** What a card counts toward fifteen and thirty-one -- J, Q and K are 10. */
    value(rank) {
      return cribbageValue(rank);
    },
    /** Where a card sits in a run -- A=1 through K=13, court cards distinct. */
    order(rank) {
      return cribbageOrder(rank);
    },
    countFifteens(cards) {
      let count = 0;
      const n = cards.length;
      for (let mask = 1; mask < 1 << n; mask++) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          if (mask & 1 << i) {
            sum += cribbageValue(cards[i].rank);
          }
        }
        if (sum === 15) count++;
      }
      return count;
    },
    countPairs(cards) {
      const rankCounts = {};
      for (const card of cards) {
        rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1;
      }
      let points = 0;
      for (const rank in rankCounts) {
        const count = rankCounts[rank] ?? 0;
        if (count === 2) points += CRIBBAGE_SCORE.PAIR;
        else if (count === 3) points += CRIBBAGE_SCORE.THREE_OF_KIND;
        else if (count === 4) points += CRIBBAGE_SCORE.FOUR_OF_KIND;
      }
      return points;
    },
    /**
     * Only the longest run in each consecutive block scores, once for every way
     * duplicate ranks can build it -- so 2-3-4-5 is 4, not the 3 + 4 + 3 that
     * paying each sub-run would give, and a double run of three is 6 (plus 2 for
     * its pair, counted by `countPairs`).
     */
    countRuns(cards) {
      if (cards.length < 3) return 0;
      const orderCounts = {};
      for (const card of cards) {
        const ord = cribbageOrder(card.rank);
        orderCounts[ord] = (orderCounts[ord] || 0) + 1;
      }
      const uniqueOrders = Object.keys(orderCounts).map(Number).sort((a, b) => a - b);
      let totalPoints = 0;
      let i = 0;
      while (i < uniqueOrders.length) {
        let j = i;
        while (j + 1 < uniqueOrders.length && uniqueOrders[j + 1] === uniqueOrders[j] + 1) {
          j++;
        }
        const seqLength = j - i + 1;
        if (seqLength >= 3) {
          let ways = 1;
          for (let k = i; k <= j; k++) {
            ways *= orderCounts[uniqueOrders[k]] ?? 1;
          }
          totalPoints += seqLength * ways;
        }
        i = j + 1;
      }
      return totalPoints;
    },
    /** The starter never makes a four-card flush, and a crib flush must be five. */
    countFlush(hand, starter, isCrib) {
      if (hand.length < 4) return 0;
      const handSuit = hand[0]?.suit;
      if (!hand.every((c) => c.suit === handSuit)) return 0;
      if (starter && starter.suit === handSuit) return CRIBBAGE_SCORE.FLUSH_5;
      return isCrib ? 0 : CRIBBAGE_SCORE.FLUSH_4;
    },
    countNobs(hand, starter) {
      if (!starter) return 0;
      for (const card of hand) {
        if (card.rank === "J" && card.suit === starter.suit) {
          return CRIBBAGE_SCORE.NIBS;
        }
      }
      return 0;
    },
    scoreHand(hand, starter, isCrib = false) {
      const allCards = starter ? [...hand, starter] : [...hand];
      const fifteens = this.countFifteens(allCards) * CRIBBAGE_SCORE.FIFTEEN;
      const pairs = this.countPairs(allCards);
      const runs = this.countRuns(allCards);
      const flush = this.countFlush(hand, starter, isCrib);
      const nobs = this.countNobs(hand, starter);
      return {
        total: fifteens + pairs + runs + flush + nobs,
        breakdown: { fifteens, pairs, runs, flush, nobs }
      };
    },
    /**
     * Score laying `card` on top of `playedCards`, the series so far this go.
     *
     * Every category is counted: a card that makes thirty-one and completes a
     * run scores both.
     */
    scorePeggingPlay(card, playedCards) {
      const sequence = [...playedCards, card];
      const count = sequence.reduce((sum, c) => sum + cribbageValue(c.rank), 0);
      let points = 0;
      const descriptions = [];
      if (count === 15) {
        points += CRIBBAGE_SCORE.FIFTEEN;
        descriptions.push("Fifteen!");
      }
      if (count === 31) {
        points += CRIBBAGE_SCORE.THIRTY_ONE;
        descriptions.push("Thirty-one!");
      }
      let matching = 1;
      for (let i = playedCards.length - 1; i >= 0 && playedCards[i].rank === card.rank; i--) {
        matching++;
      }
      if (matching === 2) {
        points += CRIBBAGE_SCORE.PAIR;
        descriptions.push("Pair!");
      } else if (matching === 3) {
        points += CRIBBAGE_SCORE.THREE_OF_KIND;
        descriptions.push("Pair royal!");
      } else if (matching >= 4) {
        points += CRIBBAGE_SCORE.FOUR_OF_KIND;
        descriptions.push("Double pair royal!");
      }
      for (let length = sequence.length; length >= 3; length--) {
        const tail = sequence.slice(-length).map((c) => cribbageOrder(c.rank)).sort((a, b) => a - b);
        const consecutive = tail.every((ord, i) => i === 0 || ord === tail[i - 1] + 1);
        if (consecutive) {
          points += length;
          descriptions.push(`Run of ${length}!`);
          break;
        }
      }
      return { points, description: descriptions.join(" + ") };
    }
  };
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map