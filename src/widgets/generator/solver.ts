// A flat coil of N turns spinning at a steady rate in a uniform magnetic field.
// θ is the angle between the field and the coil's normal (θ = 0: face-on, most flux).

export type Coil = {
  turns: number; // N
  area: number; // m²
  field: number; // B, T
  rpm: number;
};

export const omegaOf = (rpm: number) => (rpm * 2 * Math.PI) / 60;

export function fluxLinkage(coil: Coil, theta: number): number {
  return coil.turns * coil.field * coil.area * Math.cos(theta); // N Φ = N B A cos θ
}

// ε = −d(NΦ)/dt = N B A ω sin θ, with θ = ω t
export function emf(coil: Coil, theta: number): number {
  return coil.turns * coil.field * coil.area * omegaOf(coil.rpm) * Math.sin(theta);
}

export function peakEmf(coil: Coil): number {
  return coil.turns * coil.field * coil.area * omegaOf(coil.rpm);
}

export const frequency = (coil: Coil) => coil.rpm / 60;
export const rms = (peak: number) => peak / Math.SQRT2;
