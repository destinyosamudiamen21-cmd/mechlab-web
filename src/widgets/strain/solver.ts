// Mohr's circle for strain, and the links between the elastic constants.
// Strains are in microstrain (με, parts per million). On the strain circle the vertical
// axis is HALF the shear strain, γ/2, so the algebra matches the stress circle.

export type StrainInput = { ex: number; ey: number; gxy: number };

export type StrainResult = {
  centre: number;
  radius: number;
  e1: number; // larger principal strain
  e2: number; // smaller principal strain
  gammaMax: number; // largest shear strain, twice the radius
  thetaP: number; // degrees, from the x direction to the direction of e1 (anticlockwise positive)
};

export function solveStrain({ ex, ey, gxy }: StrainInput): StrainResult {
  const centre = (ex + ey) / 2;
  const radius = Math.hypot((ex - ey) / 2, gxy / 2);
  return {
    centre,
    radius,
    e1: centre + radius,
    e2: centre - radius,
    gammaMax: 2 * radius,
    thetaP: (0.5 * Math.atan2(gxy, ex - ey) * 180) / Math.PI,
  };
}

// G (shear modulus) and K (bulk modulus) from E and Poisson's ratio. Same units as E.
export function elasticConstants(
  e: number,
  nu: number
): { g: number; k: number } {
  return { g: e / (2 * (1 + nu)), k: e / (3 * (1 - 2 * nu)) };
}

// Principal stresses in MPa from principal strains (με), for plane stress. E in GPa.
export function principalStresses(
  e1: number,
  e2: number,
  e: number,
  nu: number
): { s1: number; s2: number } {
  const factor = (e * 1000) / (1 - nu * nu) / 1e6;
  return { s1: factor * (e1 + nu * e2), s2: factor * (e2 + nu * e1) };
}
