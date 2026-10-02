// Unsymmetrical (skew) bending of a rectangular section.
// The load plane is tilted θ from the vertical. Split the moment into two components, one about
// each principal axis, and add the two bending stresses:
//   σ = Mz y / Iz + My z / Iy      (y up, z to the right, both from the centroid)
// Lengths in mm, moment in kN m, stress in MPa, angles in degrees.

export type SkewInput = { b: number; h: number; m: number; theta: number };

export type SkewResult = {
  iz: number; // mm⁴, about the horizontal axis (the strong one when h > b)
  iy: number; // mm⁴, about the vertical axis
  mz: number; // kN m
  my: number; // kN m
  beta: number; // degrees, the neutral axis measured from the horizontal axis
  sigmaMax: number; // MPa, at the worst corner
  stressAt: (y: number, z: number) => number;
};

export function solveSkew({ b, h, m, theta }: SkewInput): SkewResult {
  const radians = (theta * Math.PI) / 180;
  const iz = (b * h ** 3) / 12;
  const iy = (h * b ** 3) / 12;
  const mz = m * Math.cos(radians);
  const my = m * Math.sin(radians);
  const stressAt = (y: number, z: number) =>
    (mz * 1e6 * y) / iz + (my * 1e6 * z) / iy;
  // σ = 0 gives the neutral axis: tan β = (Iz / Iy) tan θ.
  const beta = (Math.atan2(my * iz, mz * iy) * 180) / Math.PI;
  return { iz, iy, mz, my, beta, sigmaMax: stressAt(h / 2, b / 2), stressAt };
}
