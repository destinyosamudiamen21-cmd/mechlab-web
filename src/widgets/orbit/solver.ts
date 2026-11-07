// A satellite launched sideways (at right angles to the line from Earth's
// centre) at some height. Its path is a conic: circle, ellipse, or an
// escape path, depending on its speed compared with circular orbit speed.

export const MU = 3.986e14; // G M for Earth, m³/s²
export const EARTH_RADIUS = 6.371e6; // m

export function circularSpeed(r: number): number {
  return Math.sqrt(MU / r);
}

export function escapeSpeed(r: number): number {
  return Math.sqrt((2 * MU) / r);
}

export function circularPeriod(r: number): number {
  return (2 * Math.PI * r) / circularSpeed(r);
}

export function gravityAt(r: number): number {
  return MU / (r * r);
}

export type OrbitShape = {
  p: number; // semi-latus rectum: the "size" in r = p / (1 + e cos φ)
  e: number; // eccentricity: 0 circle, below 1 ellipse, 1 or more escapes
  launchAngle: number; // φ at the launch point (0 = closest point, π = furthest)
  perigee: number; // closest distance to Earth's centre, m
  apogee: number; // furthest distance, m (Infinity if it escapes)
  escapes: boolean;
  crashes: boolean;
  period: number; // s (Infinity if it escapes)
};

// k = launch speed ÷ circular speed at that radius.
export function orbitShape(r0: number, k: number): OrbitShape {
  const p = r0 * k * k;
  const e = Math.abs(k * k - 1);
  const launchAngle = k >= 1 ? 0 : Math.PI;
  const perigee = p / (1 + e);
  const escapes = e >= 1;
  const apogee = escapes ? Infinity : p / (1 - e);
  const a = escapes ? Infinity : (perigee + apogee) / 2;
  return {
    p,
    e,
    launchAngle,
    perigee,
    apogee,
    escapes,
    crashes: perigee < EARTH_RADIUS,
    period: escapes ? Infinity : 2 * Math.PI * Math.sqrt(a ** 3 / MU),
  };
}

export function radiusAt(shape: OrbitShape, phi: number): number {
  const denominator = 1 + shape.e * Math.cos(phi);
  return denominator > 1e-9 ? shape.p / denominator : Infinity;
}

// Speed anywhere on the path, from energy: v² = μ (2/r − 1/a), written with p and e.
export function speedAt(shape: OrbitShape, r: number): number {
  const inverseA = (1 - shape.e * shape.e) / shape.p;
  return Math.sqrt(MU * (2 / r - inverseA));
}

// How fast the angle sweeps round: dφ/dt = h / r², with h = √(μ p). Kepler's second law.
export function sweepRate(shape: OrbitShape, r: number): number {
  return Math.sqrt(MU * shape.p) / (r * r);
}
