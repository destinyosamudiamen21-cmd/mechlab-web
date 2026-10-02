// Pure physics for plane stress transformation. No React, no drawing:
// the widget only draws what this returns, so the numbers can be tested alone.

export type MohrInput = {
  sx: number; // normal stress on the x face, MPa (tension positive)
  sy: number; // normal stress on the y face, MPa
  txy: number; // shear stress, MPa
  thetaDeg: number; // rotation of the element, degrees, anticlockwise positive
};

export type MohrResult = {
  center: number; // C = (sx + sy) / 2
  radius: number; // R
  s1: number; // major principal stress
  s2: number; // minor principal stress
  tauMax: number; // maximum in-plane shear stress
  thetaPDeg: number; // angle to the principal plane of s1
  sxT: number; // normal stress on the rotated x' face
  syT: number; // normal stress on the rotated y' face
  txyT: number; // shear stress on the rotated element
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function solveMohr({ sx, sy, txy, thetaDeg }: MohrInput): MohrResult {
  const center = (sx + sy) / 2;
  const half = (sx - sy) / 2;
  const radius = Math.hypot(half, txy);

  // atan2 (not atan) keeps the correct quadrant and survives sx === sy.
  const thetaPDeg = toDeg(Math.atan2(txy, half)) / 2;

  const twoTheta = toRad(2 * thetaDeg);
  const cos = Math.cos(twoTheta);
  const sin = Math.sin(twoTheta);

  return {
    center,
    radius,
    s1: center + radius,
    s2: center - radius,
    tauMax: radius,
    thetaPDeg,
    sxT: center + half * cos + txy * sin,
    syT: center - half * cos - txy * sin,
    txyT: -half * sin + txy * cos,
  };
}
