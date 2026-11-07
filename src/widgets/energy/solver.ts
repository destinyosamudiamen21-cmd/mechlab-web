// A trolley released from rest on a hilly track. Energy bookkeeping:
// potential energy lost = kinetic energy gained + work done against resistance.

export type Track = {
  mass: number; // kg
  start: number; // release height, m
  resistance: number; // constant resisting force along the track, N
  g: number;
};

export const TRACK_LENGTH = 40; // m, measured along the ground

// The track passes through these points (fraction along, fraction of release height):
// a big drop, a hump, a dip, then a rise at the end. Between points it follows a smooth
// cosine curve, so every peak and valley is flat on top, like a real track.
const SHAPE: [number, number][] = [
  [0, 1],
  [0.4, 0],
  [0.62, 0.6],
  [0.8, 0.1],
  [1, 0.35],
];

export function heightAt(x: number, start: number): number {
  const s = Math.min(Math.max(x / TRACK_LENGTH, 0), 1);
  for (let i = 1; i < SHAPE.length; i++) {
    const [s0, h0] = SHAPE[i - 1];
    const [s1, h1] = SHAPE[i];
    if (s <= s1) {
      const blend = (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0))) / 2;
      return start * (h0 + (h1 - h0) * blend);
    }
  }
  return start * SHAPE[SHAPE.length - 1][1];
}

// Distance travelled along the curve from the start to x (resistance acts along this).
export function pathLength(x: number, start: number, steps = 400): number {
  let length = 0;
  let previous = heightAt(0, start);
  for (let i = 1; i <= steps; i++) {
    const xi = (x * i) / steps;
    const hi = heightAt(xi, start);
    length += Math.hypot(x / steps, hi - previous);
    previous = hi;
  }
  return length;
}

export type EnergyState = {
  x: number;
  height: number;
  potential: number;
  kinetic: number;
  lost: number;
  speed: number;
  stopped: boolean; // true when the trolley never reaches x
};

// The energy split at x, or the point where the trolley stops if it cannot get that far.
export function energyAt(track: Track, x: number, steps = 400): EnergyState {
  const { mass, start, resistance, g } = track;
  const total = mass * g * start;
  let length = 0;
  let previous = heightAt(0, start);
  for (let i = 1; i <= steps; i++) {
    const xi = (x * i) / steps;
    const hi = heightAt(xi, start);
    const nextLength = length + Math.hypot(x / steps, hi - previous);
    const kinetic = total - mass * g * hi - resistance * nextLength;
    if (kinetic < 0) {
      // It runs out of energy here.
      const potential = mass * g * previous;
      return {
        x: (x * (i - 1)) / steps,
        height: previous,
        potential,
        kinetic: 0,
        lost: total - potential,
        speed: 0,
        stopped: true,
      };
    }
    length = nextLength;
    previous = hi;
  }
  const potential = mass * g * previous;
  const lost = resistance * length;
  const kinetic = Math.max(0, total - potential - lost);
  return {
    x,
    height: previous,
    potential,
    kinetic,
    lost,
    speed: Math.sqrt((2 * kinetic) / mass),
    stopped: false,
  };
}
