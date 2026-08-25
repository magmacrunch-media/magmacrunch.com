/* ── generators.js — built-in pattern generators ── */

(function() {
    'use strict';

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    }

    function lerp(a, b, t) {
        return Math.round(a + (b - a) * t);
    }

    var generators = {
        'white-noise': function(w, h) {
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var i = 0; i < pixels.length; i += 4) {
                var v = Math.floor(Math.random() * 256);
                pixels[i] = v;
                pixels[i+1] = v;
                pixels[i+2] = v;
                pixels[i+3] = 255;
            }
            return pixels;
        },

        'perlin-noise': function(w, h) {
            var pixels = new Uint8ClampedArray(w * h * 4);
            // Simple value noise with interpolation
            var grid = 8;
            var cellW = w / grid;
            var cellH = h / grid;
            var values = [];
            for (var i = 0; i <= grid; i++) {
                values[i] = [];
                for (var j = 0; j <= grid; j++) {
                    values[i][j] = Math.random();
                }
            }

            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var gx = x / cellW;
                    var gy = y / cellH;
                    var x0 = Math.floor(gx);
                    var y0 = Math.floor(gy);
                    var x1 = Math.min(x0 + 1, grid);
                    var y1 = Math.min(y0 + 1, grid);
                    var fx = gx - x0;
                    var fy = gy - y0;

                    // Smoothstep
                    fx = fx * fx * (3 - 2 * fx);
                    fy = fy * fy * (3 - 2 * fy);

                    var top = values[y0][x0] * (1 - fx) + values[y0][x1] * fx;
                    var bot = values[y1][x0] * (1 - fx) + values[y1][x1] * fx;
                    var val = Math.round((top * (1 - fy) + bot * fy) * 255);

                    var idx = (y * w + x) * 4;
                    pixels[idx] = val;
                    pixels[idx+1] = val;
                    pixels[idx+2] = val;
                    pixels[idx+3] = 255;
                }
            }
            return pixels;
        },

        'h-gradient': function(w, h, colorA, colorB) {
            var a = hexToRgb(colorA || '#ff8c42');
            var b = hexToRgb(colorB || '#d4a030');
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var t = x / (w - 1);
                    var idx = (y * w + x) * 4;
                    pixels[idx]   = lerp(a.r, b.r, t);
                    pixels[idx+1] = lerp(a.g, b.g, t);
                    pixels[idx+2] = lerp(a.b, b.b, t);
                    pixels[idx+3] = 255;
                }
            }
            return pixels;
        },

        'v-gradient': function(w, h, colorA, colorB) {
            var a = hexToRgb(colorA || '#ff8c42');
            var b = hexToRgb(colorB || '#d4a030');
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var t = y / (h - 1);
                    var idx = (y * w + x) * 4;
                    pixels[idx]   = lerp(a.r, b.r, t);
                    pixels[idx+1] = lerp(a.g, b.g, t);
                    pixels[idx+2] = lerp(a.b, b.b, t);
                    pixels[idx+3] = 255;
                }
            }
            return pixels;
        },

        'radial-gradient': function(w, h, colorA, colorB) {
            var a = hexToRgb(colorA || '#ff8c42');
            var b = hexToRgb(colorB || '#d4a030');
            var cx = w / 2;
            var cy = h / 2;
            var maxDist = Math.sqrt(cx * cx + cy * cy);
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var dx = x - cx;
                    var dy = y - cy;
                    var t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxDist);
                    var idx = (y * w + x) * 4;
                    pixels[idx]   = lerp(a.r, b.r, t);
                    pixels[idx+1] = lerp(a.g, b.g, t);
                    pixels[idx+2] = lerp(a.b, b.b, t);
                    pixels[idx+3] = 255;
                }
            }
            return pixels;
        },

        'color-bars': function(w, h) {
            var colors = [
                [255, 255, 255], // white
                [255, 255, 0],   // yellow
                [0, 255, 255],   // cyan
                [0, 255, 0],     // green
                [255, 0, 255],   // magenta
                [255, 0, 0],     // red
                [0, 0, 255],     // blue
                [0, 0, 0]        // black
            ];
            var barW = Math.ceil(w / colors.length);
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var barIdx = Math.min(Math.floor(x / barW), colors.length - 1);
                    var idx = (y * w + x) * 4;
                    pixels[idx]   = colors[barIdx][0];
                    pixels[idx+1] = colors[barIdx][1];
                    pixels[idx+2] = colors[barIdx][2];
                    pixels[idx+3] = 255;
                }
            }
            return pixels;
        },

        'checkerboard': function(w, h) {
            var size = Math.max(4, Math.round(w / 16));
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var check = ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0);
                    var v = check ? 240 : 16;
                    var idx = (y * w + x) * 4;
                    pixels[idx] = v;
                    pixels[idx+1] = v;
                    pixels[idx+2] = v;
                    pixels[idx+3] = 255;
                }
            }
            return pixels;
        },

        'solid-color': function(w, h, color) {
            var c = hexToRgb(color || '#ff8c42');
            var pixels = new Uint8ClampedArray(w * h * 4);
            for (var i = 0; i < pixels.length; i += 4) {
                pixels[i]   = c.r;
                pixels[i+1] = c.g;
                pixels[i+2] = c.b;
                pixels[i+3] = 255;
            }
            return pixels;
        }
    };

    window.Generators = generators;
})();
