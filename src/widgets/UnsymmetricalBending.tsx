import { useState } from "react";
import { solveSkew } from "./unsym/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER_TEXT, INK, SOFT, fmt } from "./shared/theme";

const DEFAULTS = { theta: 30, m: 10, b: 100, h: 200 };
const TENSION = "#c2410c";

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a beam twice as deep as it is wide is loaded in a plane tilted 30° from the vertical. How far does the neutral axis tilt from the horizontal?",
  options: ["Also 30°", "Less than 30°", "More than 30°"],
  correct: 2,
  explain:
    "Much more: about 67°. The beam is four times stiffer about its strong axis than its weak one (I goes with depth cubed), so the small sideways part of the load bends it a lot. tan β = (Iz / Iy) tan θ = 4 × tan 30°. The neutral axis only stays square to the load when Iz = Iy.",
};

// Drawing: section centred at (180, 135), 0.6 px per mm.
const SCALE = 0.6;
const CX = 180;
const CY = 135;
const CELLS = 14;

export default function UnsymmetricalBending(_props: { topicSlug: string }) {
  const [theta, setTheta] = useState(DEFAULTS.theta);
  const [m, setM] = useState(DEFAULTS.m);
  const [b, setB] = useState(DEFAULTS.b);
  const [h, setH] = useState(DEFAULTS.h);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const result = solveSkew({ b, h, m, theta });
  const upright = (6 * m * 1e6) / (b * h * h);
  const toX = (z: number) => CX + z * SCALE;
  const toY = (y: number) => CY - y * SCALE;
  const radians = (angle: number) => (angle * Math.PI) / 180;

  // Colour each small square by the stress at its centre.
  const cells = [];
  for (let row = 0; row < CELLS; row += 1) {
    for (let column = 0; column < CELLS; column += 1) {
      const z = -b / 2 + ((column + 0.5) * b) / CELLS;
      const y = h / 2 - ((row + 0.5) * h) / CELLS;
      const stress = result.stressAt(y, z);
      cells.push(
        <rect
          key={`${row}-${column}`}
          x={toX(z - b / CELLS / 2)}
          y={toY(y + h / CELLS / 2)}
          width={(b / CELLS) * SCALE + 0.4}
          height={(h / CELLS) * SCALE + 0.4}
          fill={stress >= 0 ? TENSION : ACCENT}
          fillOpacity={0.85 * Math.min(1, Math.abs(stress) / result.sigmaMax)}
        />
      );
    }
  }

  // Lines through the centroid: the neutral axis (y = −tan β × z) and the load plane (θ from vertical).
  const reach = 118;
  const beta = radians(result.beta);
  const naX = Math.cos(beta) * reach;
  const naY = Math.sin(beta) * reach;
  const loadX = Math.sin(radians(theta)) * reach;
  const loadY = Math.cos(radians(theta)) * reach;
  const corners: [number, number][] = [
    [h / 2, b / 2],
    [h / 2, -b / 2],
    [-h / 2, -b / 2],
    [-h / 2, b / 2],
  ];

  return (
    <div className='widget'>
      <Prediction
        data={PREDICTION}
        predicted={predicted}
        onPredict={setPredicted}
      />

      <div className='widget-grid'>
        <figure className='widget-figure'>
          <svg
            viewBox='0 0 360 270'
            role='img'
            aria-label={`Rectangular section with the load plane at ${fmt(
              theta,
              0
            )} degrees and the neutral axis at ${fmt(
              result.beta,
              1
            )} degrees. Largest stress ${fmt(
              result.sigmaMax,
              1
            )} megapascals at two opposite corners.`}
          >
            {cells}
            <rect
              x={toX(-b / 2)}
              y={toY(h / 2)}
              width={b * SCALE}
              height={h * SCALE}
              fill='none'
              stroke={INK}
              strokeWidth='2'
            />
            {/* principal axes */}
            <line
              x1='40'
              y1={CY}
              x2='320'
              y2={CY}
              stroke={SOFT}
              strokeDasharray='8 3 2 3'
            />
            <line
              x1={CX}
              y1='12'
              x2={CX}
              y2='258'
              stroke={SOFT}
              strokeDasharray='8 3 2 3'
            />
            <text x='322' y={CY + 4} fontSize='11' fill={SOFT}>
              z
            </text>
            <text x={CX + 5} y='18' fontSize='11' fill={SOFT}>
              y
            </text>
            {/* neutral axis */}
            <line
              x1={CX - naX}
              y1={CY - naY}
              x2={CX + naX}
              y2={CY + naY}
              stroke={INK}
              strokeWidth='2.5'
            />
            <text
              x={CX + naX * 0.98 + 4}
              y={CY + naY * 0.98 + (result.beta > 45 ? 12 : -6)}
              fontSize='12'
              fontWeight='600'
              fill={INK}
              stroke='#fff'
              strokeWidth='3'
              paintOrder='stroke'
            >
              N.A.
            </text>
            {/* plane of loading */}
            <line
              x1={CX - loadX}
              y1={CY + loadY}
              x2={CX + loadX}
              y2={CY - loadY}
              stroke={AMBER_TEXT}
              strokeWidth='2'
              strokeDasharray='6 4'
            />
            <text
              x={CX + loadX + 4}
              y={CY - loadY + 4}
              fontSize='12'
              fontWeight='600'
              fill={AMBER_TEXT}
              stroke='#fff'
              strokeWidth='3'
              paintOrder='stroke'
            >
              load plane
            </text>
            {corners.map(([y, z], index) => {
              const stress = result.stressAt(y, z);
              return (
                <text
                  key={index}
                  x={toX(z) + (z > 0 ? 6 : -6)}
                  y={toY(y) + (y > 0 ? -5 : 14)}
                  fontSize='11'
                  fontWeight='600'
                  fill={stress >= 0 ? TENSION : ACCENT}
                  textAnchor={z > 0 ? "start" : "end"}
                  stroke='#fff'
                  strokeWidth='3'
                  paintOrder='stroke'
                >
                  {stress > 0 ? "+" : ""}
                  {fmt(stress, 1)}
                </text>
              );
            })}
          </svg>
          <figcaption>
            Orange is tension, blue is compression, darker is larger (corner
            values in MPa). The stress is zero along the neutral axis (N.A.) and
            largest at the corners furthest from it.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='skew-theta'
              label='Tilt of the load plane, θ'
              display={`${fmt(theta, 0)}°`}
              min={0}
              max={90}
              step={1}
              value={theta}
              disabled={locked}
              onChange={setTheta}
            />
            <Slider
              id='skew-m'
              label='Bending moment M'
              display={`${fmt(m, 0)} kN m`}
              min={1}
              max={30}
              step={1}
              value={m}
              disabled={locked}
              onChange={setM}
            />
            <Slider
              id='skew-b'
              label='Width b'
              display={`${fmt(b, 0)} mm`}
              min={50}
              max={200}
              step={10}
              value={b}
              disabled={locked}
              onChange={setB}
            />
            <Slider
              id='skew-h'
              label='Depth h'
              display={`${fmt(h, 0)} mm`}
              min={50}
              max={300}
              step={10}
              value={h}
              disabled={locked}
              onChange={setH}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setB(150);
                  setH(150);
                }}
              >
                Square section
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setTheta(DEFAULTS.theta);
                  setM(DEFAULTS.m);
                  setB(DEFAULTS.b);
                  setH(DEFAULTS.h);
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
                Split the moment: M<sub>z</sub> = M cos θ, M<sub>y</sub> = M sin
                θ
              </>
            ),
            value: (
              <>
                <b>{fmt(result.mz)}</b> and <b>{fmt(result.my)} kN m</b>
              </>
            ),
          },
          {
            label: (
              <>
                I<sub>z</sub> = bh³/12, I<sub>y</sub> = hb³/12
              </>
            ),
            value: (
              <>
                <b>{fmt(result.iz / 1e6, 2)}</b> and{" "}
                <b>{fmt(result.iy / 1e6, 2)} × 10⁶ mm⁴</b>
              </>
            ),
          },
          {
            label: (
              <>
                Neutral axis, tan β = (I<sub>z</sub> / I<sub>y</sub>) tan θ
              </>
            ),
            value: (
              <>
                {fmt(result.iz / result.iy, 2)} × tan {fmt(theta, 0)}° gives β ={" "}
                <b>{fmt(result.beta, 1)}°</b>
              </>
            ),
          },
          {
            label: (
              <>
                Largest stress, σ = M<sub>z</sub>(h/2)/I<sub>z</sub> + M
                <sub>y</sub>(b/2)/I<sub>y</sub>
              </>
            ),
            value: (
              <>
                {fmt((result.mz * 1e6 * h) / 2 / result.iz, 1)} +{" "}
                {fmt((result.my * 1e6 * b) / 2 / result.iy, 1)} ={" "}
                <b>{fmt(result.sigmaMax, 1)} MPa</b>
              </>
            ),
          },
          {
            label: "Same moment with the load upright, σ = 6M / bh²",
            value: <b>{fmt(upright, 1)} MPa</b>,
          },
          {
            label: "Angle between the neutral axis and the load plane",
            value: (
              <>
                <b>{fmt(90 - result.beta + theta, 1)}°</b> (90° only when I
                <sub>z</sub> = I<sub>y</sub> or θ = 0)
              </>
            ),
          },
        ]}
      />
      <p className='hint'>
        Which pair of corners is in tension depends on which way the load
        pushes. The pattern and the sizes are what matter.
      </p>
    </div>
  );
}
