import { useState } from "react";
import {
  elasticConstants,
  principalStresses,
  solveStrain,
} from "./strain/solver";
import Plot, { PLOT } from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import {
  ACCENT,
  AMBER,
  AMBER_TEXT,
  INK,
  SOFT,
  TINT,
  fmt,
} from "./shared/theme";

const DEFAULTS = { ex: 400, ey: -200, gxy: 600, e: 200, nu: 0.3 };

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: on Mohr's circle for strain, direct strain ε goes along the horizontal axis. What goes on the vertical axis?",
  options: [
    "The shear strain, γ",
    "Half the shear strain, γ/2",
    "Twice the shear strain, 2γ",
  ],
  correct: 1,
  explain:
    "Half the shear strain. That is the one change from the stress circle: replace σ with ε and τ with γ/2, and every formula carries over. So the radius is half the largest shear strain, and γ max is twice the radius. Forgetting the half is the most common mistake in this topic.",
};

// The same number of pixels per microstrain on both axes, so the circle is round.
const HALF_X = 1000;
const HALF_Y =
  (HALF_X * (PLOT.height - PLOT.top - PLOT.bottom)) /
  (PLOT.width - PLOT.left - PLOT.right);
// The strained square is drawn with its strains made this many times larger, so you can see them.
const EXAGGERATE = 250;

export default function StrainCircle(_props: { topicSlug: string }) {
  const [ex, setEx] = useState(DEFAULTS.ex);
  const [ey, setEy] = useState(DEFAULTS.ey);
  const [gxy, setGxy] = useState(DEFAULTS.gxy);
  const [e, setE] = useState(DEFAULTS.e);
  const [nu, setNu] = useState(DEFAULTS.nu);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const result = solveStrain({ ex, ey, gxy });
  const { g, k } = elasticConstants(e, nu);
  const { s1, s2 } = principalStresses(result.e1, result.e2, e, nu);

  // The strained square: a point (x, y) moves by (εx x + γ/2 y, γ/2 x + εy y).
  const scale = EXAGGERATE / 1e6;
  const move = (x: number, y: number): [number, number] => [
    x + scale * (ex * x + (gxy / 2) * y),
    y + scale * ((gxy / 2) * x + ey * y),
  ];
  const square: [number, number][] = [
    [-50, -50],
    [50, -50],
    [50, 50],
    [-50, 50],
  ];
  const drawn = (points: [number, number][]) =>
    points.map(([x, y]) => `${120 + x},${105 - y}`).join(" "); // y up
  const angle = (result.thetaP * Math.PI) / 180;

  return (
    <div className='widget'>
      <Prediction
        data={PREDICTION}
        predicted={predicted}
        onPredict={setPredicted}
      />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <Plot
            x={[-HALF_X, HALF_X]}
            y={[HALF_Y, -HALF_Y]}
            xTicks={[-500, 500]}
            yTicks={[-600, -300, 300, 600]}
            xLabel='direct strain ε (με)'
            yLabel='γ/2 (με), positive downwards'
            label={`Mohr's strain circle. Centre ${fmt(
              result.centre,
              0
            )}, radius ${fmt(
              result.radius,
              0
            )} microstrain. Principal strains ${fmt(result.e1, 0)} and ${fmt(
              result.e2,
              0
            )}.`}
          >
            {(sx, sy) => (
              <>
                <circle
                  cx={sx(result.centre)}
                  cy={sy(0)}
                  r={sx(result.radius) - sx(0)}
                  fill={TINT}
                  fillOpacity='0.6'
                  stroke={INK}
                  strokeWidth='2'
                />
                {/* the diameter joining the x face and the y face */}
                <line
                  x1={sx(ex)}
                  y1={sy(gxy / 2)}
                  x2={sx(ey)}
                  y2={sy(-gxy / 2)}
                  stroke={ACCENT}
                  strokeWidth='2'
                />
                <circle cx={sx(result.centre)} cy={sy(0)} r='3' fill={INK} />
                <circle
                  cx={sx(ex)}
                  cy={sy(gxy / 2)}
                  r='5'
                  fill={ACCENT}
                  stroke='#fff'
                  strokeWidth='1.5'
                />
                <circle
                  cx={sx(ey)}
                  cy={sy(-gxy / 2)}
                  r='5'
                  fill='#fff'
                  stroke={ACCENT}
                  strokeWidth='2'
                />
                <text
                  x={sx(ex) + 8}
                  y={sy(gxy / 2) + (gxy >= 0 ? 14 : -8)}
                  fontSize='12'
                  fontWeight='600'
                  fill={ACCENT}
                  stroke='#fff'
                  strokeWidth='3'
                  paintOrder='stroke'
                >
                  x
                </text>
                <text
                  x={sx(ey) - 8}
                  y={sy(-gxy / 2) + (gxy >= 0 ? -8 : 14)}
                  fontSize='12'
                  fontWeight='600'
                  fill={ACCENT}
                  textAnchor='end'
                  stroke='#fff'
                  strokeWidth='3'
                  paintOrder='stroke'
                >
                  y
                </text>
                {/* principal strains: where the circle crosses the axis */}
                <circle
                  cx={sx(result.e1)}
                  cy={sy(0)}
                  r='5.5'
                  fill={AMBER}
                  stroke={INK}
                  strokeWidth='1.5'
                />
                <circle
                  cx={sx(result.e2)}
                  cy={sy(0)}
                  r='5.5'
                  fill={AMBER}
                  stroke={INK}
                  strokeWidth='1.5'
                />
                <text
                  x={sx(result.e1) + 8}
                  y={sy(0) - 8}
                  fontSize='12'
                  fontWeight='600'
                  fill={AMBER_TEXT}
                  stroke='#fff'
                  strokeWidth='3'
                  paintOrder='stroke'
                >
                  ε₁
                </text>
                <text
                  x={sx(result.e2) - 8}
                  y={sy(0) - 8}
                  fontSize='12'
                  fontWeight='600'
                  fill={AMBER_TEXT}
                  textAnchor='end'
                  stroke='#fff'
                  strokeWidth='3'
                  paintOrder='stroke'
                >
                  ε₂
                </text>
              </>
            )}
          </Plot>
          <figcaption>
            Filled dot: the x direction, plotted at (ε<sub>x</sub>, γ
            <sub>xy</sub>/2). Open dot: the y direction. Amber dots: the
            principal strains, where there is no shear strain.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <svg
              viewBox='0 0 240 210'
              role='img'
              aria-label='A small square of material before and after straining, with the principal directions'
            >
              <polygon
                points={drawn(square)}
                fill='none'
                stroke={SOFT}
                strokeDasharray='5 4'
              />
              <polygon
                points={drawn(square.map(([x, y]) => move(x, y)))}
                fill={TINT}
                stroke={INK}
                strokeWidth='2'
                strokeLinejoin='round'
              />
              {/* principal directions: the two lines that stay at right angles */}
              <line
                x1={120 - 86 * Math.cos(angle)}
                y1={105 + 86 * Math.sin(angle)}
                x2={120 + 86 * Math.cos(angle)}
                y2={105 - 86 * Math.sin(angle)}
                stroke={AMBER_TEXT}
                strokeWidth='1.5'
              />
              <line
                x1={120 + 60 * Math.sin(angle)}
                y1={105 + 60 * Math.cos(angle)}
                x2={120 - 60 * Math.sin(angle)}
                y2={105 - 60 * Math.cos(angle)}
                stroke={AMBER_TEXT}
                strokeWidth='1.5'
                strokeDasharray='4 3'
              />
              <text
                x={120 + 90 * Math.cos(angle)}
                y={105 - 90 * Math.sin(angle) + 4}
                fontSize='12'
                fontWeight='600'
                fill={AMBER_TEXT}
                textAnchor='middle'
              >
                1
              </text>
              <text x='8' y='202' fontSize='11' fill={SOFT}>
                dashed: before · solid: after (× {EXAGGERATE})
              </text>
            </svg>
            <figcaption>
              The element itself. Direction 1 is{" "}
              {fmt(Math.abs(result.thetaP), 1)}°{" "}
              {result.thetaP >= 0 ? "anticlockwise" : "clockwise"} from x (half
              the angle on the circle).
            </figcaption>
          </figure>

          <div className='controls'>
            <Slider
              id='strain-ex'
              label={
                <>
                  Strain ε<sub>x</sub>
                </>
              }
              display={`${fmt(ex, 0)} με`}
              min={-500}
              max={500}
              step={10}
              value={ex}
              disabled={locked}
              onChange={setEx}
            />
            <Slider
              id='strain-ey'
              label={
                <>
                  Strain ε<sub>y</sub>
                </>
              }
              display={`${fmt(ey, 0)} με`}
              min={-500}
              max={500}
              step={10}
              value={ey}
              disabled={locked}
              onChange={setEy}
            />
            <Slider
              id='strain-gxy'
              label={
                <>
                  Shear strain γ<sub>xy</sub>
                </>
              }
              display={`${fmt(gxy, 0)} με`}
              min={-800}
              max={800}
              step={10}
              value={gxy}
              disabled={locked}
              onChange={setGxy}
            />
            <Slider
              id='strain-e'
              label="Young's modulus E"
              display={`${fmt(e, 0)} GPa`}
              min={60}
              max={210}
              step={5}
              value={e}
              disabled={locked}
              onChange={setE}
            />
            <Slider
              id='strain-nu'
              label="Poisson's ratio ν"
              display={fmt(nu, 2)}
              min={0.2}
              max={0.4}
              step={0.01}
              value={nu}
              disabled={locked}
              onChange={setNu}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setEx(DEFAULTS.ex);
                  setEy(DEFAULTS.ey);
                  setGxy(DEFAULTS.gxy);
                  setE(DEFAULTS.e);
                  setNu(DEFAULTS.nu);
                }}
              >
                Reset
              </button>
            </div>
            {locked && (
              <p className='hint'>
                Answer the question above to unlock the controls.
              </p>
            )}
          </div>
        </div>
      </div>

      <Readout
        rows={[
          {
            label: (
              <>
                Centre = (ε<sub>x</sub> + ε<sub>y</sub>) / 2
              </>
            ),
            value: <b>{fmt(result.centre, 1)} με</b>,
          },
          {
            label: (
              <>
                Radius = √[((ε<sub>x</sub> − ε<sub>y</sub>)/2)² + (γ
                <sub>xy</sub>/2)²]
              </>
            ),
            value: <b>{fmt(result.radius, 1)} με</b>,
          },
          {
            label: "Principal strains = centre ± radius",
            value: (
              <>
                <b>{fmt(result.e1, 1)}</b> and <b>{fmt(result.e2, 1)} με</b>
              </>
            ),
          },
          {
            label: "Largest shear strain = 2 × radius",
            value: <b>{fmt(result.gammaMax, 1)} με</b>,
          },
          {
            label: (
              <>
                Principal stresses, σ<sub>1</sub> = E(ε<sub>1</sub> + ν ε
                <sub>2</sub>) / (1 − ν²)
              </>
            ),
            value: (
              <>
                <b>{fmt(s1, 1)}</b> and <b>{fmt(s2, 1)} MPa</b>
              </>
            ),
          },
          {
            label: "Shear modulus, G = E / 2(1 + ν)",
            value: <b>{fmt(g)} GPa</b>,
          },
          {
            label: "Bulk modulus, K = E / 3(1 − 2ν)",
            value: <b>{fmt(k)} GPa</b>,
          },
          {
            label: "Check: E = 9KG / (3K + G)",
            value: <b>{fmt((9 * k * g) / (3 * k + g), 1)} GPa</b>,
          },
        ]}
      />
      <p className='hint'>
        1 με (microstrain) is a strain of 10⁻⁶. Principal stresses assume plane
        stress (no stress through the thickness), as on a free surface with a
        strain gauge rosette.
      </p>
    </div>
  );
}
