#!/usr/bin/env node

/**
 * generate-og.mjs — Generates retro-styled OG preview images (1200x630 PNGs)
 * for magmacrunch.com pages.
 *
 * Usage: node scripts/generate-og.mjs
 * Output: og/*.png
 */

import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------

const FONT_PATH = join(ROOT, 'fonts', 'PressStart2P-Regular.ttf')
if (!existsSync(FONT_PATH)) {
  console.error('Font not found at', FONT_PATH)
  console.error('Download PressStart2P-Regular.ttf to fonts/')
  process.exit(1)
}
GlobalFonts.registerFromPath(FONT_PATH, 'Press Start 2P')

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

const LOGO_PATH = join(ROOT, 'assets', 'logos', 'MClogoNoText.png')
let logo = null
if (existsSync(LOGO_PATH)) {
  logo = await loadImage(LOGO_PATH)
} else {
  console.warn('Logo not found at', LOGO_PATH, '— will use fallback pixel M')
}

// ---------------------------------------------------------------------------
// Page configs
// ---------------------------------------------------------------------------

const PAGES = [
  // Section pages
  { id: 'home', title: 'magmacrunch\nmedia', subtitle: 'music / art / archives / arcade', color: '#FF3D6E' },
  { id: 'arcade', title: 'ARCADE', subtitle: 'board games / card games / puzzles / action', color: '#00F5FF' },
  { id: 'music', title: 'MUSIC', subtitle: 'distributed music / jukebox / physical media', color: '#C45FFF' },
  { id: 'archive', title: 'ARCHIVE', subtitle: 'artists / places / labels / contributors', color: '#39FF6E' },
  { id: 'visual', title: 'VISUAL', subtitle: 'collage / photography / music videos / TV', color: '#FFE03A' },
  { id: 'press', title: 'PRESS', subtitle: 'journals / lyrics / press', color: '#FF7C1F' },
  { id: 'ware', title: 'WARE', subtitle: 'browser utilities', color: '#00F5FF' },
  { id: 'about', title: 'ABOUT', subtitle: 'magmacrunch media', color: '#FF3D6E' },
  { id: 'guestbook', title: 'GUESTBOOK', subtitle: 'sign the guestbook', color: '#39FF6E' },
  { id: 'donate', title: 'DONATE', subtitle: 'support magmacrunch media', color: '#FF3D6E' },

  // Arcade collection indexes
  { id: 'arcade-board-games', title: 'BOARD GAMES', subtitle: 'chess / checkers / backgammon / parchisi / chinese checkers', color: '#00F5FF' },
  { id: 'arcade-card-games', title: 'CARD GAMES', subtitle: 'solitaire / cribbage / soko / texas hold\'em / tarot', color: '#00F5FF' },
  { id: 'arcade-puzzles', title: 'PUZZLES', subtitle: '2^N / george boole / 15 puzzle / threes / klotski / tetris', color: '#00F5FF' },
  { id: 'arcade-action', title: 'ACTION', subtitle: 'moonlight drift / very long boards / roderick tron / cave diving', color: '#00F5FF' },

  // Board games
  { id: 'arcade-chess', title: 'CHESS', subtitle: 'play in the magmacrunch arcade', color: '#00F5FF' },
  { id: 'arcade-checkers', title: 'CHECKERS', subtitle: 'play in the magmacrunch arcade', color: '#00F5FF' },
  { id: 'arcade-backgammon', title: 'BACKGAMMON', subtitle: 'play in the magmacrunch arcade', color: '#00F5FF' },
  { id: 'arcade-parchisi', title: 'PARCHIS', subtitle: 'play in the magmacrunch arcade', color: '#F1BF00' },
  { id: 'arcade-chinese-checkers', title: 'CHINESE\nCHECKERS', subtitle: 'play in the magmacrunch arcade', color: '#C45FFF' },

  // Card games
  { id: 'arcade-solitaire', title: 'KLONDIKE\nSOLITAIRE', subtitle: 'play in the magmacrunch arcade', color: '#00F0FF' },
  { id: 'arcade-cribbage', title: 'CRIBBAGE', subtitle: 'play in the magmacrunch arcade', color: '#FFD700' },
  { id: 'arcade-scandinavian-stud', title: 'SOKO', subtitle: 'scandinavian stud — play in the arcade', color: '#39FF84' },
  { id: 'arcade-solitaire-thld', title: 'TEXAS HOLD\'EM\nLAVA DOME', subtitle: 'play in the magmacrunch arcade', color: '#FF6F1A' },
  { id: 'arcade-tarot', title: 'FRENCH\nTAROT', subtitle: 'play in the magmacrunch arcade', color: '#FFD700' },

  // Puzzles
  { id: 'arcade-2^N', title: '2^N', subtitle: 'play in the magmacrunch arcade', color: '#00F0FF' },
  { id: 'arcade-george-boole', title: 'GEORGE BOOLE', subtitle: 'has entered the chat', color: '#39FF84' },
  { id: 'arcade-fifteen-puzzle', title: '15 PUZZLE', subtitle: 'play in the magmacrunch arcade', color: '#00F5FF' },
  { id: 'arcade-threes', title: 'THREES', subtitle: 'play in the magmacrunch arcade', color: '#00F5FF' },
  { id: 'arcade-klotski', title: 'KLOTSKI', subtitle: 'play in the magmacrunch arcade', color: '#FF2D4A' },
  { id: 'arcade-tetris', title: 'TETRIS', subtitle: 'helsinki 1989 — play in the arcade', color: '#F0F8FF' },

  // Action
  { id: 'arcade-moonlight-drift', title: 'MOONLIGHT\nDRIFT', subtitle: 'play in the magmacrunch arcade', color: '#FF2E9C' },
  { id: 'arcade-very-long-boards', title: 'VERY LONG\nBOARDS', subtitle: 'play in the magmacrunch arcade', color: '#B537F2' },
  { id: 'arcade-roderick-tron', title: 'RODERICK\nTRON', subtitle: 'play in the magmacrunch arcade', color: '#00F0FF' },
  { id: 'arcade-makemecookies', title: 'MAKEME-\nCOOKIES!X4', subtitle: 'play in the magmacrunch arcade', color: '#FF5FA2' },
  { id: 'arcade-jovian', title: 'JOVIAN', subtitle: 'humanitarian conflict — play in the arcade', color: '#FFC247' },
  { id: 'arcade-cave-diving', title: 'CAVE\nDIVING', subtitle: 'not even once — play in the arcade', color: '#3FE0D0' },

  // Unclassified
  { id: 'arcade-sorry', title: 'SORRY!', subtitle: 'play in the magmacrunch arcade', color: '#FF8C00' },
  { id: 'arcade-aggravation', title: 'AGGRAVATION', subtitle: 'play in the magmacrunch arcade', color: '#FFE03A' },
  { id: 'arcade-pay2play', title: 'PAY2PLAY', subtitle: 'play in the magmacrunch arcade', color: '#FF00FF' },
]

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

const WIDTH = 1200
const HEIGHT = 630

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawBackground(ctx) {
  ctx.fillStyle = '#080808'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
}

function drawScanlines(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
  for (let y = 0; y < HEIGHT; y += 4) {
    ctx.fillRect(0, y, WIDTH, 1)
  }
}

function drawBorder(ctx, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40)
  ctx.shadowBlur = 0
}

function drawAccentBar(ctx, color) {
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 20
  ctx.fillRect(60, 80, 200, 4)
  ctx.shadowBlur = 0
}

function drawTitle(ctx, title, color) {
  const lines = title.split('\n')
  ctx.shadowColor = color
  ctx.shadowBlur = 30
  ctx.fillStyle = color
  ctx.font = '42px "Press Start 2P"'

  if (lines.length === 1) {
    ctx.fillText(lines[0], 60, 200)
  } else {
    ctx.fillText(lines[0], 60, 180)
    ctx.fillText(lines[1], 60, 240)
  }
  ctx.shadowBlur = 0
}

function drawSubtitle(ctx, subtitle) {
  ctx.fillStyle = '#8a7a8a'
  ctx.font = '14px "Press Start 2P"'
  ctx.fillText(subtitle, 60, 320)
}

function drawBranding(ctx, color) {
  ctx.fillStyle = '#4a4a4a'
  ctx.font = '10px "Press Start 2P"'
  ctx.fillText('magmacrunch.com', 60, HEIGHT - 50)

  if (logo) {
    const logoSize = 80
    const logoX = WIDTH - 60 - logoSize
    const logoY = HEIGHT - 60 - logoSize
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
  } else {
    drawPixelM(ctx, WIDTH - 180, HEIGHT - 200, color)
  }
}

function drawPixelM(ctx, x, y, color) {
  const s = 8
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 10

  const pattern = [
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 1, 0, 0, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
  ]

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (pattern[row][col]) {
        ctx.fillRect(x + col * s, y + row * s, s, s)
      }
    }
  }
  ctx.shadowBlur = 0
}

// ---------------------------------------------------------------------------
// Generate cards
// ---------------------------------------------------------------------------

function generateCard(page) {
  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx)
  drawScanlines(ctx)
  drawBorder(ctx, page.color)
  drawAccentBar(ctx, page.color)
  drawTitle(ctx, page.title, page.color)
  drawSubtitle(ctx, page.subtitle)
  drawBranding(ctx, page.color)

  return canvas.toBuffer('image/png')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const outDir = join(ROOT, 'og')
mkdirSync(outDir, { recursive: true })

console.log('Generating OG images...')

for (const page of PAGES) {
  const buf = generateCard(page)
  const outPath = join(outDir, `${page.id}.png`)
  writeFileSync(outPath, buf)
  console.log(`  ✓ ${page.id}.png (${(buf.length / 1024).toFixed(0)} KB)`)
}

console.log(`\nDone! ${PAGES.length} images generated to og/`)
