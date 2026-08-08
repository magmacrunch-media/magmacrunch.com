#!/usr/bin/env node

/**
 * generate-theme-audit.mjs
 *
 * Scans all CSS files and HTML <style> blocks across the site,
 * extracts CSS custom properties (colors), and generates a visual preview.
 *
 * Usage: node scripts/generate-theme-audit.mjs
 * Output: og/theme-audit.png
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Font registration ──────────────────────────────────────────────

const FONT_PATH = join(ROOT, 'fonts', 'PressStart2P-Regular.ttf');
if (existsSync(FONT_PATH)) {
  GlobalFonts.registerFromPath(FONT_PATH, 'Press Start 2P');
}

// ── Color extraction ───────────────────────────────────────────────

const COLOR_REGEX = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;
const HEX_REGEX = /^#[0-9a-fA-F]{3,8}$/;
const RGBA_REGEX = /^rgba?\(/;

function parseColor(value) {
  if (HEX_REGEX.test(value)) {
    return hexToRgb(value);
  }
  if (RGBA_REGEX.test(value)) {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
  }
  return null;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6); // strip alpha
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function isColorVar(name) {
  // Filter out non-color variables
  const skip = ['font', 'size', 'width', 'height', 'padding', 'margin', 'gap',
    'border', 'radius', 'shadow', 'opacity', 'z-index', 'transition',
    'duration', 'delay', 'ease', 'curve', 'speed', 'scale', 'rotate',
    'translate', 'space', 'indent', 'leading', 'tracking', 'weight'];
  return !skip.some(s => name.toLowerCase().includes(s));
}

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const colors = [];
  let match;

  // Extract from CSS custom properties
  const regex = new RegExp(COLOR_REGEX.source, 'g');
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const value = match[2];
    if (isColorVar(name)) {
      const rgb = parseColor(value);
      if (rgb) {
        colors.push({ name, value, rgb, source: filePath });
      }
    }
  }

  return colors;
}

function scanAllFiles() {
  const files = [];

  // CSS files
  const cssPatterns = [
    'style.css',
    'assets/**/*.css',
    'archive/by-artist/**/*.css',
    'archive/by-place/**/*.css',
    'archive/by-contributor/**/*.css',
    'archive/by-label/**/*.css',
    'templates/*.css',
    'arcade/shared/arcade-base.css',
    'arcade/shared/chat-widget.css',
    'home/*.css',
    'music/**/*.css',
    'press/**/*.css',
    'visual/**/*.css',
  ];

  for (const pattern of cssPatterns) {
    try {
      const matches = globSync(pattern, { cwd: ROOT, absolute: true });
      files.push(...matches);
    } catch {}
  }

  // HTML files with inline styles
  const htmlPatterns = [
    'visual/**/*.html',
    'arcade/*/index.html',
    'arcade/*/css/*.html',
  ];

  for (const pattern of htmlPatterns) {
    try {
      const matches = globSync(pattern, { cwd: ROOT, absolute: true });
      files.push(...matches);
    } catch {}
  }

  return [...new Set(files)];
}

// ── Group colors by section ────────────────────────────────────────

function groupColors(allColors) {
  const groups = {};

  for (const color of allColors) {
    const relPath = relative(ROOT, color.source);
    const parts = relPath.split('/');
    let group;

    if (parts[0] === 'style.css') {
      group = 'Global Palette (style.css)';
    } else if (parts[0] === 'archive') {
      group = `Archive — ${parts.slice(0, 3).join('/')}`;
    } else if (parts[0] === 'visual') {
      group = `Visual — ${parts[1] || 'shared'}`;
    } else if (parts[0] === 'arcade') {
      group = `Arcade — ${parts[1] || 'shared'}`;
    } else if (parts[0] === 'templates') {
      group = 'Templates';
    } else if (parts[0] === 'assets') {
      group = 'Assets';
    } else if (parts[0] === 'home') {
      group = 'Home';
    } else if (parts[0] === 'music') {
      group = 'Music';
    } else if (parts[0] === 'press') {
      group = 'Press';
    } else {
      group = parts[0];
    }

    if (!groups[group]) groups[group] = [];
    groups[group].push(color);
  }

  // Sort groups alphabetically
  const sorted = {};
  for (const key of Object.keys(groups).sort()) {
    sorted[key] = groups[key];
  }
  return sorted;
}

// ── Deduplicate colors ─────────────────────────────────────────────

function deduplicateColors(colors) {
  const seen = new Map();
  for (const c of colors) {
    const key = c.rgb.r + ',' + c.rgb.g + ',' + c.rgb.b;
    if (!seen.has(key)) {
      seen.set(key, c);
    }
  }
  return [...seen.values()];
}

// ── Image generation ───────────────────────────────────────────────

const SWATCH_SIZE = 24;
const SWATCH_GAP = 4;
const SECTION_HEIGHT = 28;
const SECTION_PADDING = 12;
const GROUP_PADDING = 16;
const HEADER_HEIGHT = 60;
const WIDTH = 1200;

function generateImage(groups) {
  // Calculate total height
  let totalHeight = HEADER_HEIGHT;
  for (const [group, colors] of Object.entries(groups)) {
    const uniqueColors = deduplicateColors(colors);
    const swatchRows = Math.ceil(uniqueColors.length / Math.floor((WIDTH - 40) / (SWATCH_SIZE + SWATCH_GAP)));
    totalHeight += SECTION_HEIGHT + (swatchRows * (SWATCH_SIZE + SWATCH_GAP)) + GROUP_PADDING;
  }
  totalHeight += 20; // bottom padding

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, WIDTH, totalHeight);

  // Header
  ctx.fillStyle = '#00f5ff';
  ctx.font = 'bold 16px "Press Start 2P"';
  ctx.fillText('COLOR AUDIT', 20, 35);
  ctx.fillStyle = '#888';
  ctx.font = '10px "Press Start 2P"';
  ctx.fillText(`${Object.keys(groups).length} sections · ${Object.values(groups).reduce((sum, g) => sum + deduplicateColors(g).length, 0)} unique colors`, 20, 52);

  let y = HEADER_HEIGHT;

  for (const [group, colors] of Object.entries(groups)) {
    const uniqueColors = deduplicateColors(colors);

    // Section header
    ctx.fillStyle = '#ffe03a';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(group.toUpperCase(), 20, y + 14);
    ctx.fillStyle = '#666';
    ctx.fillText(`${uniqueColors.length} colors`, 20 + ctx.measureText(group.toUpperCase()).width + 12, y + 14);
    y += SECTION_HEIGHT;

    // Color swatches
    let x = 20;
    for (const color of uniqueColors) {
      if (x + SWATCH_SIZE > WIDTH - 20) {
        x = 20;
        y += SWATCH_SIZE + SWATCH_GAP;
      }

      // Draw swatch
      ctx.fillStyle = color.value;
      ctx.fillRect(x, y, SWATCH_SIZE, SWATCH_SIZE);

      // Border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, SWATCH_SIZE, SWATCH_SIZE);

      x += SWATCH_SIZE + SWATCH_GAP;
    }

    y += SWATCH_SIZE + SWATCH_GAP + GROUP_PADDING;
  }

  return canvas.toBuffer('image/png');
}

// ── Main ───────────────────────────────────────────────────────────

console.log('Scanning CSS files for color definitions...\n');

const files = scanAllFiles();
console.log(`Scanned ${files.length} files`);

const allColors = [];
for (const file of files) {
  const colors = scanFile(file);
  allColors.push(...colors);
}

console.log(`Found ${allColors.length} color definitions`);

const groups = groupColors(allColors);
const uniqueTotal = Object.values(groups).reduce((sum, g) => sum + deduplicateColors(g).length, 0);
console.log(`${Object.keys(groups).length} sections · ${uniqueTotal} unique colors\n`);

// Generate image
const imageData = generateImage(groups);
const ogDir = join(ROOT, 'og');
if (!existsSync(ogDir)) mkdirSync(ogDir, { recursive: true });
const outputPath = join(ogDir, 'theme-audit.png');
writeFileSync(outputPath, imageData);
console.log(`Generated: ${outputPath}`);

// Also output JSON
const jsonOutput = {};
for (const [group, colors] of Object.entries(groups)) {
  jsonOutput[group] = deduplicateColors(colors).map(c => ({
    name: c.name,
    value: c.value,
    source: relative(ROOT, c.source),
  }));
}
const jsonPath = join(ROOT, 'theme-audit.json');
writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
console.log(`Generated: ${jsonPath}`);
