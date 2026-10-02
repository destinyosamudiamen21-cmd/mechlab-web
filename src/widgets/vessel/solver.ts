// Thin-walled pressure vessels.
// Cylinder: hoop stress σh = p d / 2t (round the circumference), longitudinal σl = p d / 4t (along the axis).
// Sphere: σ = p d / 4t in every direction.
// p in MPa, lengths in mm, stress in MPa, E in GPa. Strains are returned in microstrain (με).

export type VesselKind = "cylinder" | "sphere";
export type VesselInput = {
  kind: VesselKind;
  p: number;
  d: number;
  t: number;
  e: number;
  nu: number;
};

export type VesselResult = {
  hoop: number; // MPa
  longitudinal: number; // MPa
  maxShear: number; // MPa, taking the stress through the thin wall as zero
  ratio: number; // d / t
  thin: boolean; // thin-wall theory is normally used when d / t is at least 20
  hoopStrain: number; // με
  longitudinalStrain: number; // με
  volumeStrain: number; // με, change of enclosed volume / volume
  growth: number; // mm, increase in diameter
};

export function solveVessel({
  kind,
  p,
  d,
  t,
  e,
  nu,
}: VesselInput): VesselResult {
  const longitudinal = (p * d) / (4 * t);
  const hoop = kind === "cylinder" ? (p * d) / (2 * t) : longitudinal;
  const modulus = e * 1000; // MPa
  const hoopStrain = ((hoop - nu * longitudinal) / modulus) * 1e6;
  const longitudinalStrain = ((longitudinal - nu * hoop) / modulus) * 1e6;
  return {
    hoop,
    longitudinal,
    maxShear: hoop / 2,
    ratio: d / t,
    thin: d / t >= 20,
    hoopStrain,
    longitudinalStrain,
    // Cylinder volume ∝ d² L, sphere volume ∝ d³.
    volumeStrain:
      kind === "cylinder"
        ? 2 * hoopStrain + longitudinalStrain
        : 3 * hoopStrain,
    growth: (hoopStrain / 1e6) * d,
  };
}
