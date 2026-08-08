#!/usr/bin/env node

/**
 * generate-og.mjs — Generates retro-styled OG preview images (1200x630 PNGs)
 * for magmacrunch.com pages.
 *
 * Usage: node scripts/generate-og.mjs
 * Output: og/*.png
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
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
// Page configs
// ---------------------------------------------------------------------------

const PAGES = [
  { id: 'home', title: 'magmacrunch\nmedia', subtitle: 'music / art / archives / arcade', color: '#FF3D6E' },
  { id: 'arcade', title: 'ARCADE', subtitle: 'board games / card games / puzzles / action', color: '#00F5FF' },
  { id: 'music', title: 'MUSIC', subtitle: 'distributed music / jukebox / physical media', color: '#C45FFF' },
  { id: 'archive', title: 'ARCHIVE', subtitle: 'artists / places / labels / contributors', color: '#39FF6E' },
  { id: 'visual', title: 'VISUAL', subtitle: 'collage / photography / music videos / TV', color: '#FFE03A' },
  { id: 'press', title: 'PRESS', subtitle: 'journals / lyrics / press', color: '#FF7C1F' },
  { id: 'tools', title: 'TOOLS', subtitle: 'browser utilities', color: '#00F5FF' },
  { id: 'about', title: 'ABOUT', subtitle: 'magmacrunch media', color: '#FF3D6E' },
  { id: 'guestbook', title: 'GUESTBOOK', subtitle: 'sign the guestbook', color: '#39FF6E' },
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
  // Black background
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
  // Thin neon border
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  ctx.strokeRect(20, 20, WIDTH - 40, HEIGHT - 40)
  ctx.shadowBlur = 0
}

function drawAccentBar(ctx, color) {
  // Top accent bar
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
  // Site URL at bottom
  ctx.fillStyle = '#4a4a4a'
  ctx.font = '10px "Press Start 2P"'
  ctx.fillText('magmacrunch.com', 60, HEIGHT - 50)

  // Pixel logo on the right
  drawPixelM(ctx, WIDTH - 180, HEIGHT - 200, color)
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
