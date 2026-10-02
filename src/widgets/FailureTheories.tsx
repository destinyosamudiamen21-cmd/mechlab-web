import { useState } from "react";
import {
  THEORIES,
  envelope,
  equivalentStress,
  safetyFactor,
} from "./failure/solver";
import type { TheoryId } from "./failure/solver";
import Plot, { PLOT } from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, GOOD, INK, SOFT, fmt } from "./shared/theme";

const NU = 0.3;
const DEFAULTS = { s1: 120, s2: -80, sy: 250, theory: "vonmises" as TheoryId };
const FAIL = "#c2410c";
const SHORT: { id: TheoryId; label: string }[] = [
  { id: "rankine", label: "Rankine" },
  { id: "stvenant", label: "St Venant" },
  { id: "tresca", label: "Tresca" },
  { id: "haigh", label: "Haigh" },
  { id: "vonmises", label: "von Mises" },
];

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a steel shaft is twisted (pure shear) until it yields. Which theory predicts yielding at the LOWEST shear stress, making it the most cautious?",
  options: [
    "Maximum principal stress (Rankine)",
    "Maximum shear stress (Tresca)",
    "Shear strain energy (von Mises)",
  ],
  correct: 1,
  explain:
    "Tresca predicts yield at τ = 0.5 σy. Von Mises says 0.577 σy, and tests on ductile metals agree best with von Mises. Rankine says τ = σy, which is far too optimistic for a ductile metal in shear; it suits brittle materials. Press “Pure shear” below and compare the table.",
};

// A square plot, in units of the yield stress, so the outlines never move.
const HEIGHT = 360;
const HALF_X = 1.6;
const HALF_Y =
  (HALF_X * (HEIGHT - PLOT.top - PLOT.bottom)) /
  (PLOT.width - PLOT.left - PLOT.right);

export default function FailureTheories(_props: { topicSlug: string }) {
  const [s1, setS1] = useState(DEFAULTS.s1);
  const [s2, setS2] = useState(DEFAULTS.s2);
  const [sy, setSy] = useState(DEFAULTS.sy);
  const [theory, setTheory] = useState(DEFAULTS.theory);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const factor = safetyFactor(theory, s1, s2, sy, NU);
  const safe = factor >= 1;
  const chosen = THEORIES.find((item) => item.id === theory) ?? THEORIES[0];
  const preset = (a: number, b: number) => {
    setS1(a);
    setS2(b);
  };

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
            y={[-HALF_Y, HALF_Y]}
            xTicks={[-1, 1]}
            yTicks={[-1, 1]}
            xLabel='σ₁ / σy'
            yLabel='σ₂ / σy'
            height={HEIGHT}
            label={`Yield outlines of five failure theories on principal stress axes. The stress point is ${
              safe ? "inside" : "outside"
            } the ${chosen.name} outline, factor of safety ${fmt(factor)}.`}
          >
            {(sx, sy2) => {
              const outline = (id: TheoryId) =>
                envelope(id, 1, NU)
                  .map(([a, b]) => `${sx(a)},${sy2(b)}`)
                  .join(" ");
              const px = sx(s1 / sy);
              const py = sy2(s2 / sy);
              // Where the straight line from the origin through the point meets the chosen outline.
              const edge = Number.isFinite(factor)
                ? { x: sx((s1 / sy) * factor), y: sy2((s2 / sy) * factor) }
                : null;
              return (
                <>
                  {THEORIES.filter((item) => item.id !== theory).map((item) => (
                    <polygon
                      key={item.id}
                      points={outline(item.id)}
                      fill='none'
                      stroke={SOFT}
                      strokeOpacity='0.55'
                      strokeWidth='1'
                    />
                  ))}
                  <polygon
                    points={outline(theory)}
                    fill={ACCENT}
                    fillOpacity='0.12'
                    stroke={ACCENT}
                    strokeWidth='2.5'
                    strokeLinejoin='round'
                  />
                  {edge && (
                    <line
                      x1={sx(0)}
                      y1={sy2(0)}
                      x2={edge.x}
                      y2={edge.y}
                      stroke={INK}
                      strokeDasharray='4 4'
                    />
                  )}
                  {edge && (
                    <circle
                      cx={edge.x}
                      cy={edge.y}
                      r='3.5'
                      fill='#fff'
                      stroke={INK}
                      strokeWidth='1.5'
                    />
                  )}
                  <circle
                    cx={px}
                    cy={py}
                    r='6.5'
                    fill={safe ? GOOD : FAIL}
                    stroke='#fff'
                    strokeWidth='2'
                  />
                  <text
                    x={px + 10}
                    y={py + 4}
                    fontSize='12'
                    fontWeight='600'
                    fill={safe ? GOOD : FAIL}
                    stroke='#fff'
                    strokeWidth='3'
                    paintOrder='stroke'
                  >
                    {safe ? "safe" : "yields"}
                  </text>
                </>
              );
            }}
          </Plot>
          <figcaption>
            Each outline is one theory's limit. Inside is safe, outside has
            yielded. The blue one is the theory you picked. The dashed line
            shows how far the stresses can grow before reaching it: that ratio
            is the factor of safety.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments
              label='Theory'
              options={SHORT}
              value={theory}
              disabled={locked}
              columns={3}
              onChange={setTheory}
            />
            <p className='hint'>
              <strong>{chosen.name}.</strong> Yield starts when {chosen.idea}.
            </p>
            <Slider
              id='fail-s1'
              label={
                <>
                  Principal stress σ<sub>1</sub>
                </>
              }
              display={`${fmt(s1, 0)} MPa`}
              min={-300}
              max={300}
              step={5}
              value={s1}
              disabled={locked}
              onChange={setS1}
            />
            <Slider
              id='fail-s2'
              label={
                <>
                  Principal stress σ<sub>2</sub>
                </>
              }
              display={`${fmt(s2, 0)} MPa`}
              min={-300}
              max={300}
              step={5}
              value={s2}
              disabled={locked}
              onChange={setS2}
            />
            <Slider
              id='fail-sy'
              label={
                <>
                  Yield stress σ<sub>y</sub>
                </>
              }
              display={`${fmt(sy, 0)} MPa`}
              min={200}
              max={400}
              step={10}
              value={sy}
              disabled={locked}
              onChange={setSy}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => preset(200, 0)}
              >
                Simple tension
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => preset(130, -130)}
              >
                Pure shear
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => preset(200, 100)}
              >
                Thin cylinder
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  preset(DEFAULTS.s1, DEFAULTS.s2);
                  setSy(DEFAULTS.sy);
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

      <div className='table-wrap'>
        <table className='data-table wrap'>
          <tbody>
            <tr>
              <th>Theory</th>
              <th>Equivalent stress</th>
              <th>Factor of safety</th>
              <th>Verdict</th>
            </tr>
            {THEORIES.map((item) => {
              const n = safetyFactor(item.id, s1, s2, sy, NU);
              return (
                <tr
                  key={item.id}
                  className={item.id === theory ? "is-selected" : undefined}
                >
                  <td>{item.name}</td>
                  <td>{fmt(equivalentStress(item.id, s1, s2, NU), 1)} MPa</td>
                  <td>{Number.isFinite(n) ? fmt(n) : "–"}</td>
                  <td
                    style={{
                      color: n >= 1 ? GOOD : FAIL,
                      fontFamily: "inherit",
                      fontWeight: 600,
                    }}
                  >
                    {n >= 1 ? "safe" : "yields"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className='hint'>
        Two-dimensional stress: σ<sub>1</sub> and σ<sub>2</sub> are the
        principal stresses and the third is zero. ν = {NU} for the two theories
        that need it. Factor of safety = σ<sub>y</sub> ÷ equivalent stress.
      </p>
    </div>
  );
}
