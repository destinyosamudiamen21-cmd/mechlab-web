// Water flowing steadily through a pipe that changes diameter and height.
// Continuity: A₁v₁ = A₂v₂.  Bernoulli: p/ρg + v²/2g + z is the same at both sections (no losses).

export const RHO = 1000; // kg/m³, water
export const G = 9.81; // m/s²

export type PipeInput = {
  d1: number; // m
  d2: number; // m
  v1: number; // m/s
  p1: number; // kPa (gauge)
  z1: number; // m
  z2: number; // m
};

export type Section = {
  v: number; // m/s
  p: number; // kPa (gauge)
  pressureHead: number; // m of water
  velocityHead: number; // m
  elevation: number; // m
};

const area = (d: number) => (Math.PI * d * d) / 4;

export function solvePipe({ d1, d2, v1, p1, z1, z2 }: PipeInput): {
  one: Section;
  two: Section;
  flow: number;
  totalHead: number;
} {
  const flow = area(d1) * v1; // m³/s
  const v2 = flow / area(d2);
  // Pressures in Pa inside the formula, kPa outside.
  const p2 =
    p1 + (RHO * (v1 * v1 - v2 * v2)) / 2000 + (RHO * G * (z1 - z2)) / 1000;
  const section = (v: number, p: number, z: number): Section => ({
    v,
    p,
    pressureHead: (p * 1000) / (RHO * G),
    velocityHead: (v * v) / (2 * G),
    elevation: z,
  });
  const one = section(v1, p1, z1);
  const two = section(v2, p2, z2);
  return {
    one,
    two,
    flow,
    totalHead: one.pressureHead + one.velocityHead + one.elevation,
  };
}
