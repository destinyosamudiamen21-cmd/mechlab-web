import { useState } from "react";
import {
  cycleTotals,
  legDeltaU,
  legHeat,
  legWork,
  pointOnLeg,
} from "./firstlaw/solver";
import type { Leg, Point } from "./firstlaw/solver";
import PistonScene from "./piston/PistonScene";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import {
  ACCENT,
  AMBER,
  GOOD,
  INK,
  SOFT,
  WARN,
  clamp,
  fmt,
} from "./shared/theme";

const GAMMA = 1.4;
type CycleId = "exam" | "test";

const CYCLES: { id: CycleId; label: string }[] = [
  { id: "exam", label: "Exam 2013/14 Q4" },
  { id: "test", label: "Test 2014/15 Q2(b)" },
];

const LEG_NAMES: Record<CycleId, string[]> = {
  exam: [
    "1 to 2: expansion, p = a + bV",
    "2 to 3: cooling at constant pressure",
    "3 to 1: compression, pV = constant",
  ],
  test: [
    "1 to 2: isothermal expansion",
    "2 to 3: cooling at constant volume",
    "3 to 1: polytropic compression",
  ],
};

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a gas goes round a complete cycle and returns to its starting state. The net work done by the gas is 6.8 kJ. What is the net heat supplied to it?",
  options: [
    "6.8 kJ",
    "0 kJ, because it ends where it started",
    "It cannot be found without the gas properties",
  ],
  correct: 0,
  explain:
    "Internal energy is a property, so round a complete cycle ΔU = 0. The first law Q = ΔU + W then gives net Q = net W. What returns to zero is ΔU, not the heat. Step round the cycle and add up the columns.",
};

function buildCycle(id: CycleId, a: number, b: number): Leg[] {
  if (id === "exam") {
    // a = p₂ in bar, b = V₂ in m³. State 3 lies on pV = C through state 1.
    const s1: Point = { p: 600, v: 0.02 };
    const s2: Point = { p: a * 100, v: b };
    const s3: Point = { p: a * 100, v: (s1.p * s1.v) / (a * 100) };
    return [
      { kind: "linear", from: s1, to: s2 },
      { kind: "constantPressure", from: s2, to: s3 },
      { kind: "hyperbolic", from: s3, to: s1 },
    ];
  }
  // a = expansion ratio V₂/V₁, b = T₃ in K. T₁ = 550 K.
  const s1: Point = { p: 1500, v: 0.15 };
  const s2: Point = { p: 1500 / a, v: 0.15 * a };
  const s3: Point = { p: ((1500 / a) * b) / 550, v: 0.15 * a };
  return [
    { kind: "hyperbolic", from: s1, to: s2 },
    { kind: "constantVolume", from: s2, to: s3 },
    { kind: "polytropic", from: s3, to: s1 },
  ];
}

const DEFAULTS: Record<CycleId, [number, number]> = {
  exam: [2, 0.08],
  test: [4, 290],
};

export default function FirstLawCycle(_props: { topicSlug: string }) {
  const [cycle, setCycle] = useState<CycleId>("exam");
  const [a, setA] = useState(DEFAULTS.exam[0]);
  const [b, setB] = useState(DEFAULTS.exam[1]);
  const [position, setPosition] = useState(0); // 0 to 300: three legs of 100
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const legs = buildCycle(cycle, a, b);
  const totals = cycleTotals(legs, GAMMA);
  const legIndex = Math.min(2, Math.floor(position / 100));
  const now = pointOnLeg(legs[legIndex], position / 100 - legIndex);
  const s1 = legs[0].from;

  const vMax = Math.max(...legs.map((leg) => leg.from.v)) * 1.12;
  const pMaxBar = cycle === "exam" ? 7 : 16;
  const heat = clamp(
    0.5 + (0.5 * Math.log2((now.p * now.v) / (s1.p * s1.v))) / 2,
    0,
    1
  );

  const largest = Math.max(
    1,
    ...legs.flatMap((leg) =>
      [legWork(leg), legHeat(leg, GAMMA), legDeltaU(leg, GAMMA)].map(Math.abs)
    )
  );
  const bars = [
    { name: "Q", value: legHeat(legs[legIndex], GAMMA), color: WARN },
    { name: "ΔU", value: legDeltaU(legs[legIndex], GAMMA), color: SOFT },
    { name: "W", value: legWork(legs[legIndex]), color: ACCENT },
  ];

  function choose(next: CycleId) {
    setCycle(next);
    setA(DEFAULTS[next][0]);
    setB(DEFAULTS[next][1]);
    setPosition(0);
  }

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
            x={[0, vMax]}
            y={[0, pMaxBar]}
            xTicks={
              cycle === "exam"
                ? [0.02, 0.04, 0.06, 0.08, 0.1]
                : [0.15, 0.3, 0.45, 0.6, 0.75]
            }
            yTicks={cycle === "exam" ? [2, 4, 6] : [5, 10, 15]}
            xLabel='V (m³)'
            yLabel='p (bar)'
            label={`Pressure-volume diagram of a three-process cycle. Net work ${fmt(
              totals.work
            )} kilojoules.`}
          >
            {(sx, sy) => {
              const loop = legs.flatMap((leg) =>
                Array.from({ length: 25 }, (_, index) => {
                  const point = pointOnLeg(leg, index / 24);
                  return `${sx(point.v).toFixed(1)},${sy(point.p / 100).toFixed(
                    1
                  )}`;
                })
              );
              return (
                <>
                  <polygon
                    points={loop.join(" ")}
                    fill={AMBER}
                    fillOpacity='0.3'
                    stroke={INK}
                    strokeWidth='2'
                    strokeLinejoin='round'
                  />
                  {legs.map((leg, index) => (
                    <g key={index}>
                      <circle
                        cx={sx(leg.from.v)}
                        cy={sy(leg.from.p / 100)}
                        r='4'
                        fill={INK}
                      />
                      <text
                        x={sx(leg.from.v) + (index === 1 ? 8 : -8)}
                        y={sy(leg.from.p / 100) + (index === 0 ? -8 : 16)}
                        fontSize='12'
                        fill={INK}
                        textAnchor={index === 1 ? "start" : "end"}
                      >
                        {index + 1}
                      </text>
                    </g>
                  ))}
                  <circle
                    cx={sx(now.v)}
                    cy={sy(now.p / 100)}
                    r='6'
                    fill={AMBER}
                    stroke={INK}
                    strokeWidth='1.5'
                  />
                </>
              );
            }}
          </Plot>
          <figcaption>
            <span className='caption-strong'>
              {LEG_NAMES[cycle][legIndex]}.
            </span>{" "}
            The shaded loop is the net work of the cycle, {fmt(totals.work)} kJ.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <PistonScene volume={(0.2 * now.v) / vMax} heat={heat} />
            <svg
              className='wide'
              viewBox='0 0 360 96'
              role='img'
              aria-label='Heat, change in internal energy and work for this process'
            >
              <line x1='190' y1='4' x2='190' y2='92' stroke={INK} />
              {bars.map((bar, index) => {
                const width = (Math.abs(bar.value) / largest) * 150;
                return (
                  <g key={bar.name}>
                    <text
                      x='6'
                      y={22 + index * 30}
                      fontSize='13'
                      fontWeight='600'
                      fill={INK}
                    >
                      {bar.name}
                    </text>
                    <rect
                      x={bar.value >= 0 ? 190 : 190 - width}
                      y={10 + index * 30}
                      width={width}
                      height='16'
                      fill={bar.color}
                    />
                    <text
                      x={bar.value >= 0 ? 196 + width : 184 - width}
                      y={23 + index * 30}
                      fontSize='12'
                      fill={INK}
                      textAnchor={bar.value >= 0 ? "start" : "end"}
                    >
                      {fmt(bar.value, 1)} kJ
                    </text>
                  </g>
                );
              })}
            </svg>
            <figcaption>
              For this process: Q = ΔU + W. Bars to the left are negative.
            </figcaption>
          </figure>

          <div className='controls'>
            <Segments
              label='Cycle'
              options={CYCLES}
              value={cycle}
              disabled={locked}
              onChange={choose}
            />
            <Slider
              id='firstlaw-position'
              label='Go round the cycle'
              display={`process ${legIndex + 1} of 3`}
              min={0}
              max={300}
              step={1}
              value={position}
              disabled={locked}
              onChange={setPosition}
            />
            {cycle === "exam" ? (
              <>
                <Slider
                  id='firstlaw-a'
                  label={
                    <>
                      p<sub>2</sub>
                    </>
                  }
                  display={`${fmt(a, 1)} bar`}
                  min={2}
                  max={5}
                  step={0.5}
                  value={a}
                  disabled={locked}
                  onChange={setA}
                />
                <Slider
                  id='firstlaw-b'
                  label={
                    <>
                      V<sub>2</sub>
                    </>
                  }
                  display={`${fmt(b)} m³`}
                  min={0.07}
                  max={0.1}
                  step={0.01}
                  value={b}
                  disabled={locked}
                  onChange={setB}
                />
              </>
            ) : (
              <>
                <Slider
                  id='firstlaw-a'
                  label={
                    <>
                      Expansion ratio V<sub>2</sub> / V<sub>1</sub>
                    </>
                  }
                  display={fmt(a, 1)}
                  min={2}
                  max={5}
                  step={0.5}
                  value={a}
                  disabled={locked}
                  onChange={setA}
                />
                <Slider
                  id='firstlaw-b'
                  label={
                    <>
                      T<sub>3</sub> after cooling
                    </>
                  }
                  display={`${fmt(b, 0)} K`}
                  min={250}
                  max={500}
                  step={10}
                  value={b}
                  disabled={locked}
                  onChange={setB}
                />
              </>
            )}
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => choose(cycle)}
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
        <table className='data-table'>
          <tbody>
            <tr>
              <th>Process</th>
              <th>W (kJ)</th>
              <th>ΔU (kJ)</th>
              <th>Q = ΔU + W (kJ)</th>
            </tr>
            {legs.map((leg, index) => (
              <tr
                key={index}
                className={index === legIndex ? "is-selected" : undefined}
              >
                <td>{LEG_NAMES[cycle][index].split(":")[0]}</td>
                <td>{fmt(legWork(leg))}</td>
                <td>{fmt(legDeltaU(leg, GAMMA))}</td>
                <td>{fmt(legHeat(leg, GAMMA))}</td>
              </tr>
            ))}
            <tr>
              <td>
                <b>Whole cycle</b>
              </td>
              <td className='is-same'>{fmt(totals.work)}</td>
              <td style={{ color: GOOD }}>{fmt(totals.deltaU)}</td>
              <td className='is-same'>{fmt(totals.heat)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className='hint'>
        Negative W means work is done on the gas. ΔU and Q for each process
        assume a perfect gas with γ = 1.4; the net work and net heat of the
        cycle do not depend on γ.
      </p>
    </div>
  );
}
