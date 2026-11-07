// Projectile motion with no air resistance: constant velocity sideways,
// constant acceleration g downwards. Every result comes from the four
// equations of uniformly accelerated motion applied to each direction.

export type Launch = {
  speed: number; // u, m/s
  angle: number; // θ above the horizontal, degrees
  height: number; // h, launch height above the ground, m
  g: number; // m/s²
};

const rad = (degrees: number) => (degrees * Math.PI) / 180;

export function components({ speed, angle }: Launch) {
  return { ux: speed * Math.cos(rad(angle)), uy: speed * Math.sin(rad(angle)) };
}

// Time to hit the ground: solve h + uy t − ½ g t² = 0 for the positive root.
export function flightTime(launch: Launch): number {
  const { uy } = components(launch);
  const { g, height } = launch;
  return (uy + Math.sqrt(uy * uy + 2 * g * height)) / g;
}

export function positionAt(launch: Launch, t: number) {
  const { ux, uy } = components(launch);
  return { x: ux * t, y: launch.height + uy * t - 0.5 * launch.g * t * t };
}

export function velocityAt(launch: Launch, t: number) {
  const { ux, uy } = components(launch);
  const vy = uy - launch.g * t;
  return { vx: ux, vy, speed: Math.hypot(ux, vy) };
}

// Highest point: where vy = 0, so t = uy / g and the rise is uy² / 2g.
export function peak(launch: Launch) {
  const { uy } = components(launch);
  const t = Math.max(0, uy / launch.g);
  return { t, height: launch.height + (uy > 0 ? (uy * uy) / (2 * launch.g) : 0) };
}

export function range(launch: Launch): number {
  return components(launch).ux * flightTime(launch);
}
