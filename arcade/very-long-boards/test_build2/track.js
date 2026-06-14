/**
 * track.js — Segment data module
 *
 * Each segment stores:
 *   index    : int    — position in track array
 *   worldY   : float  — accumulated elevation (positive = higher)
 *   worldX   : float  — accumulated horizontal offset (curves)
 *   deltaY   : float  — elevation change that PRODUCED this segment's worldY
 *   curve    : float  — horizontal curve rate for this segment
 *   color    : object — road/rumble colors (alternating)
 *   fog      : float  — 0..1 fog blend by distance (computed at draw time)
 *
 * AUTHORING YOUR ELEVATION PROFILE
 * ---------------------------------
 * Edit ELEVATION_PROFILE below. Each entry describes a "section" of track:
 *   { length, type, amplitude, frequency, bias }
 *
 *   length    : number of segments in this section
 *   type      : 'flat' | 'sine' | 'drop' | 'rise' | 'custom'
 *   amplitude : max deltaY per segment (height of hills)
 *   frequency : how quickly the sine oscillates (lower = longer hills)
 *   bias      : constant deltaY added each segment (positive = net uphill,
 *               negative = net downhill — use negative for "downhill run")
 *   customFn  : (segIdx, sectionProgress) => deltaY  (only for type:'custom')
 */

// ─── ELEVATION PROFILE ───────────────────────────────────────────────────────
// sectionProgress is 0..1 within that section. segIdx is absolute track index.
export const ELEVATION_PROFILE = [
  // Opening flat stretch
  { length: 40,  type: 'flat',   amplitude: 0,    frequency: 0,    bias:  0    },

  // First big crest — you see the drop before going over it
  { length: 60,  type: 'sine',   amplitude: 18,   frequency: 0.05, bias: -2    },

  // Steep downhill blast
  { length: 80,  type: 'drop',   amplitude: 0,    frequency: 0,    bias: -8    },

  // Valley + bumpy section
  { length: 50,  type: 'sine',   amplitude: 10,   frequency: 0.12, bias:  1    },

  // Rising curve with gentle hills
  { length: 70,  type: 'sine',   amplitude: 6,    frequency: 0.08, bias:  3    },

  // Big drop over a crest
  { length: 30,  type: 'rise',   amplitude: 0,    frequency: 0,    bias:  12   },
  { length: 60,  type: 'drop',   amplitude: 0,    frequency: 0,    bias: -10   },

  // Rolling finish
  { length: 100, type: 'sine',   amplitude: 8,    frequency: 0.07, bias: -1    },

  // Long flat run-out
  { length: 40,  type: 'flat',   amplitude: 0,    frequency: 0,    bias:  0    },
];

// ─── CURVE PROFILE ───────────────────────────────────────────────────────────
// Same structure as elevation but describes horizontal curves.
// curve value per segment: positive = curves right, negative = left.
export const CURVE_PROFILE = [
  { length: 40,  curve:  0.0  },
  { length: 30,  curve: -1.5  },   // left bend on the crest
  { length: 50,  curve:  0.0  },
  { length: 40,  curve:  2.0  },   // right hairpin in the valley
  { length: 40,  curve:  0.0  },
  { length: 30,  curve: -1.0  },
  { length: 30,  curve:  0.0  },
  { length: 40,  curve:  1.5  },
  { length: 70,  curve:  0.0  },
  { length: 60,  curve: -0.8  },
  { length: 50,  curve:  0.0  },
];

// ─── COLORS ──────────────────────────────────────────────────────────────────
// Alternating pairs give the classic rumble-strip / distance-cue effect.
export const ROAD_COLORS = [
  { road: '#444455', rumble: '#ff2222', grass: '#1a6b1a', sky: '#87ceeb' },
  { road: '#333344', rumble: '#eeeeee', grass: '#1f7a1f', sky: '#87ceeb' },
];

export const SEGMENT_LENGTH = 200;   // world-units long each segment is
export const ROAD_WIDTH     = 2000;  // half-width of road in world units

// ─── TRACK BUILDER ───────────────────────────────────────────────────────────
/**
 * buildTrack() → segment[]
 *
 * Expands ELEVATION_PROFILE and CURVE_PROFILE into a flat array of segments.
 * Call once at startup; the result is immutable.
 */
export function buildTrack() {
  const segments = [];

  // Expand elevation
  const deltaYPerSeg = [];
  for (const section of ELEVATION_PROFILE) {
    for (let i = 0; i < section.length; i++) {
      const t = i / section.length;
      let dy = section.bias;
      if (section.type === 'sine') {
        dy += Math.sin(i * section.frequency * Math.PI * 2) * section.amplitude;
      } else if (section.type === 'drop') {
        // Ease-in drop: slow at top, fast at bottom
        dy += -Math.pow(t, 1.5) * section.amplitude;
      } else if (section.type === 'rise') {
        dy += Math.pow(t, 1.5) * section.amplitude;
      } else if (section.type === 'custom' && section.customFn) {
        dy += section.customFn(segments.length + i, t);
      }
      deltaYPerSeg.push(dy);
    }
  }

  // Expand curves
  const curvePerSeg = [];
  for (const section of CURVE_PROFILE) {
    for (let i = 0; i < section.length; i++) {
      curvePerSeg.push(section.curve);
    }
  }

  // Build segment array
  const totalSegs = deltaYPerSeg.length;
  let worldY = 0;
  let worldX = 0;

  for (let i = 0; i < totalSegs; i++) {
    const dy    = deltaYPerSeg[i]  ?? 0;
    const curve = curvePerSeg[i]   ?? 0;

    worldY += dy;
    // worldX is accumulated at PROJECTION time, not here — it's a draw-space
    // offset so curves feel right. We store the per-segment curve rate only.

    segments.push({
      index:  i,
      worldY: worldY,
      worldX: 0,       // accumulated worldX is computed per-frame in the renderer
      deltaY: dy,
      curve:  curve,
      colors: ROAD_COLORS[Math.floor(i / 3) % 2],
    });
  }

  return segments;
}
