// Shear centre of a thin-walled channel, and the twist you get when the load misses it.
// The channel's web is vertical; the flanges point to the right (+x).
// Lengths in mm (measured on the wall centre-lines), load in kN, G in GPa.

export const G_STEEL = 80; // GPa

export type ChannelInput = {
  b: number; // flange width
  h: number; // web height, between flange centre-lines
  tf: number; // flange thickness
  tw: number; // web thickness
  v: number; // kN, vertical load
  x: number; // where the load acts, mm from the web centre-line (+ towards the flanges)
  length: number; // m, length of the cantilever
};

export type ChannelResult = {
  i: number; // mm⁴, about the horizontal axis
  e: number; // mm, the shear centre is this far from the web, on the side away from the flanges
  centroid: number; // mm from the web, on the flange side
  flangeForce: number; // kN, the sideways force carried by each flange
  torque: number; // N m, load × its distance from the shear centre
  j: number; // mm⁴, torsion constant of the open section, Σ b t³ / 3
  twist: number; // degrees, at the free end
};

export function solveChannel({
  b,
  h,
  tf,
  tw,
  v,
  x,
  length,
}: ChannelInput): ChannelResult {
  const i = (tw * h ** 3) / 12 + 2 * b * tf * (h / 2) ** 2;
  // Shear flow in a flange grows from 0 at the tip to V tf b (h/2) / I at the web; the force is the area under it.
  const flangeForce = (v * tf * b * b * h) / (4 * i);
  // The two flange forces form a couple (F × h). The load must sit e outside the web to balance it: V e = F h.
  const e = (flangeForce * h) / v;
  const torque = v * (x + e); // kN mm, which is the same number as N m
  const j = (h * tw ** 3 + 2 * b * tf ** 3) / 3;
  const twistRadians = (torque * 1000 * length * 1000) / (G_STEEL * 1000 * j);
  return {
    i,
    e,
    centroid: (b * b * tf) / (h * tw + 2 * b * tf),
    flangeForce,
    torque,
    j,
    twist: (twistRadians * 180) / Math.PI,
  };
}
