// Shear flow in a thin-walled I-section: q = V Q / I, in newtons per millimetre of wall.
// "Thin-walled" means we work along the centre-lines of the walls: h is the distance between
// the flange centre-lines and b is the full flange width.
// Lengths in mm, V in kN, q in N/mm.

export type IInput = {
  v: number;
  b: number;
  h: number;
  tf: number;
  tw: number;
};

export function secondMoment({ b, h, tf, tw }: IInput): number {
  return (tw * h ** 3) / 12 + 2 * b * tf * (h / 2) ** 2;
}

// In a flange, s mm in from the free tip. It grows in a straight line from zero.
export function flangeFlow(input: IInput, s: number): number {
  return (input.v * 1000 * input.tf * s * (input.h / 2)) / secondMoment(input);
}

// In the web at height y from the neutral axis. Two flange flows arrive at the top, then it grows as a parabola.
export function webFlow(input: IInput, y: number): number {
  const fromFlanges = 2 * flangeFlow(input, input.b / 2);
  const fromWeb =
    (input.v * 1000 * input.tw * ((input.h / 2) ** 2 - y * y)) /
    (2 * secondMoment(input));
  return fromFlanges + fromWeb;
}

export type IResult = {
  i: number; // mm⁴
  flangeJunction: number; // N/mm, arriving at the web from one half flange
  webTop: number; // N/mm
  webMax: number; // N/mm, at the neutral axis
  webForce: number; // kN, the flow in the web added up
  flangeForce: number; // kN, the sideways force in one half flange
};

export function solveShearFlow(input: IInput): IResult {
  const flangeJunction = flangeFlow(input, input.b / 2);
  const webTop = webFlow(input, input.h / 2);
  const webMax = webFlow(input, 0);
  return {
    i: secondMoment(input),
    flangeJunction,
    webTop,
    webMax,
    // Area under the web's curve: a rectangle (webTop) plus a parabola (two thirds of the extra).
    webForce: ((webTop + (2 / 3) * (webMax - webTop)) * input.h) / 1000,
    // Area under a triangle.
    flangeForce: (flangeJunction * (input.b / 2)) / 2 / 1000,
  };
}
