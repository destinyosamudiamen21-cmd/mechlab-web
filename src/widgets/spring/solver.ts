// A close-coiled helical spring under an axial load W.
// Each turn of wire is twisted by the torque T = W D / 2, so the wire is really a shaft in torsion.
// W in N, lengths in mm, G in GPa. Stress in MPa, deflection in mm, stiffness in N/mm.

export type SpringInput = {
  w: number; // axial load
  coil: number; // D, mean coil diameter
  wire: number; // d, wire diameter
  turns: number; // n, number of active coils
  g: number; // shear modulus
};

export type SpringResult = {
  torque: number; // N mm
  shear: number; // MPa, τ = 8WD / πd³
  deflection: number; // mm, δ = 8WD³n / Gd⁴
  stiffness: number; // N/mm, k = Gd⁴ / 8D³n
  energy: number; // J, stored = ½ W δ
  index: number; // C = D / d
  wahl: number; // Wahl's correction factor for curvature and direct shear
  shearCorrected: number; // MPa
  wireLength: number; // mm, π D n
};

export function solveSpring({
  w,
  coil,
  wire,
  turns,
  g,
}: SpringInput): SpringResult {
  const modulus = g * 1000; // MPa
  const shear = (8 * w * coil) / (Math.PI * wire ** 3);
  const stiffness = (modulus * wire ** 4) / (8 * coil ** 3 * turns);
  const deflection = w / stiffness;
  const index = coil / wire;
  const wahl = (4 * index - 1) / (4 * index - 4) + 0.615 / index;
  return {
    torque: (w * coil) / 2,
    shear,
    deflection,
    stiffness,
    energy: (w * deflection) / 2 / 1000,
    index,
    wahl,
    shearCorrected: wahl * shear,
    wireLength: Math.PI * coil * turns,
  };
}
