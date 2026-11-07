// A turntable carrying two equal masses on sliding arms. No outside torque,
// so angular momentum L = I ω stays the same while the masses move in or out.

export type Spinner = {
  platformMass: number; // kg, a solid disc
  platformRadius: number; // m
  mass: number; // kg, each of the two sliding masses
};

// Solid disc ½ M R², plus each small mass treated as a point: m r².
export function inertia({ platformMass, platformRadius, mass }: Spinner, r: number): number {
  return 0.5 * platformMass * platformRadius ** 2 + 2 * mass * r * r;
}

export function afterMove(spinner: Spinner, r0: number, omega0: number, r: number) {
  const i0 = inertia(spinner, r0);
  const i1 = inertia(spinner, r);
  const momentum = i0 * omega0; // L, kg m²/s, the same before and after
  const omega = momentum / i1;
  return {
    i0,
    i1,
    momentum,
    omega,
    ke0: 0.5 * i0 * omega0 * omega0,
    ke1: 0.5 * i1 * omega * omega,
  };
}

// Revolutions per minute from rad/s.
export const rpm = (omega: number) => (omega * 60) / (2 * Math.PI);
