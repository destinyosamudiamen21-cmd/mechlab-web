// Shear stress across a beam section: τ = V Q / (I b).
// V: shear force. Q: first moment (about the neutral axis) of the area beyond the level you cut at.
// I: second moment of area of the whole section. b: width of the section at that level.
// Lengths in mm, V in kN, stress in MPa. y is measured up from the neutral axis.

export type Section =
  | { kind: "rectangle"; b: number; h: number }
  | { kind: "i"; b: number; h: number; tf: number; tw: number }; // b: flange width, h: overall depth

const webDepth = (section: Section) =>
  section.kind === "i" ? section.h - 2 * section.tf : section.h;

export function area(section: Section): number {
  if (section.kind === "rectangle") return section.b * section.h;
  return 2 * section.b * section.tf + webDepth(section) * section.tw;
}

export function secondMoment(section: Section): number {
  if (section.kind === "rectangle") return (section.b * section.h ** 3) / 12;
  // The full rectangle minus the two empty rectangles beside the web.
  return (
    (section.b * section.h ** 3 -
      (section.b - section.tw) * webDepth(section) ** 3) /
    12
  );
}

// Width at height y. At the exact joint between web and flange this returns the web width.
export function widthAt(section: Section, y: number): number {
  if (section.kind === "rectangle") return section.b;
  return Math.abs(y) > webDepth(section) / 2 ? section.b : section.tw;
}

// First moment of the area beyond y, about the neutral axis.
export function firstMoment(section: Section, y: number): number {
  const a = Math.min(Math.abs(y), section.h / 2);
  const half = section.h / 2;
  if (section.kind === "rectangle")
    return (section.b / 2) * (half * half - a * a);
  const halfWeb = webDepth(section) / 2;
  if (a >= halfWeb) return (section.b / 2) * (half * half - a * a); // the cut is inside the flange
  const flange = section.b * section.tf * (half - section.tf / 2);
  return flange + (section.tw / 2) * (halfWeb * halfWeb - a * a);
}

export function shearStress(
  section: Section,
  shearForce: number,
  y: number,
  width = widthAt(section, y)
): number {
  return (
    (shearForce * 1000 * firstMoment(section, y)) /
    (secondMoment(section) * width)
  );
}

// Points [y, τ] from the top to the bottom, with both values at each web-flange joint (the stress jumps there).
export function profile(
  section: Section,
  shearForce: number,
  steps = 40
): [number, number][] {
  const half = section.h / 2;
  const levels = (from: number, to: number, count: number) =>
    Array.from(
      { length: count + 1 },
      (_, i) => from + ((to - from) * i) / count
    );
  if (section.kind === "rectangle")
    return levels(half, -half, steps).map((y) => [
      y,
      shearStress(section, shearForce, y),
    ]);
  const halfWeb = webDepth(section) / 2;
  const at = (y: number, width: number): [number, number] => [
    y,
    shearStress(section, shearForce, y, width),
  ];
  return [
    ...levels(half, halfWeb, 6).map((y) => at(y, section.b)),
    ...levels(halfWeb, -halfWeb, steps).map((y) => at(y, section.tw)),
    ...levels(-halfWeb, -half, 6).map((y) => at(y, section.b)),
  ];
}

// The share of the shear force carried by the web of an I-section (0 to 1), by adding up τ × area.
export function webShare(section: Section): number {
  if (section.kind === "rectangle") return 1;
  const halfWeb = webDepth(section) / 2;
  const strips = 400;
  const dy = (2 * halfWeb) / strips;
  let force = 0;
  for (let i = 0; i < strips; i += 1) {
    const y = -halfWeb + (i + 0.5) * dy;
    force += shearStress(section, 1, y, section.tw) * section.tw * dy; // N, for V = 1 kN
  }
  return force / 1000;
}
