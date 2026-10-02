// The steady flow energy equation, per kilogram of fluid flowing through a device:
//   h₁ + C₁²/2 + q = h₂ + C₂²/2 + w
// h in kJ/kg, C in m/s, q = heat supplied TO the fluid, w = shaft work done BY the fluid.
// Height changes are left out: in these devices they are negligible.

export type FlowInput = {
  h1: number; // kJ/kg
  h2: number; // kJ/kg
  c1: number; // m/s
  c2: number; // m/s
  q: number; // kJ/kg, positive when heat goes into the fluid
};

// Kinetic energy per kg in kJ/kg. The 1000 turns J into kJ: the classic place to lose marks.
export function kinetic(c: number): number {
  return (c * c) / 2000;
}

// Shaft work per kg. Positive: the fluid does work (turbine). Negative: work is put in (compressor).
export function shaftWork({ h1, h2, c1, c2, q }: FlowInput): number {
  return h1 - h2 + kinetic(c1) - kinetic(c2) + q;
}

// A nozzle has no work and no heat: the enthalpy drop becomes kinetic energy.
export function nozzleExitVelocity(h1: number, h2: number, c1: number): number {
  return Math.sqrt(c1 * c1 + 2000 * (h1 - h2));
}

// A heater or boiler has no work: the heat supplied raises the enthalpy.
export function heatSupplied(
  h1: number,
  h2: number,
  c1: number,
  c2: number
): number {
  return h2 - h1 + kinetic(c2) - kinetic(c1);
}

// Continuity: ṁ = A C / v, so the pipe area needed is A = ṁ v / C.
export function pipeArea(
  massFlow: number,
  specificVolume: number,
  velocity: number
): number {
  return (massFlow * specificVolume) / velocity;
}
