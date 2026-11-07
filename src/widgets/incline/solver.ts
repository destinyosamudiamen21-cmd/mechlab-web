// A block on a rough slope, released from rest. Newton's second law along
// the slope and at right angles to it.

export type Slope = {
  mass: number; // kg
  angle: number; // degrees
  muS: number; // coefficient of static friction
  muK: number; // coefficient of kinetic (sliding) friction
  g: number;
};

export function solveSlope({ mass, angle, muS, muK, g }: Slope) {
  const theta = (angle * Math.PI) / 180;
  const weight = mass * g;
  const along = weight * Math.sin(theta); // pulls the block down the slope
  const normal = weight * Math.cos(theta); // the slope pushes back this hard
  const maxStatic = muS * normal;
  // Static friction matches the pull exactly, up to its limit. Past the limit, the block slides.
  const slides = along > maxStatic + 1e-9;
  const friction = slides ? muK * normal : along;
  const net = along - friction;
  return {
    weight,
    along,
    normal,
    maxStatic,
    slides,
    friction,
    net,
    acceleration: net / mass,
    // The steepest slope that can hold the block still: tan θ = μs.
    criticalAngle: (Math.atan(muS) * 180) / Math.PI,
  };
}
