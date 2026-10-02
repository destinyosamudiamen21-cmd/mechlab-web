import { useState } from "react";
import { CP, optimumPressureRatio, solveBrayton } from "./brayton/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, INK, SOFT, WARN, fmt } from "./shared/theme";

const DEFAULTS = { t1: 300, t3: 1200, rp: 6 };
const S1 = 0.15; // where state 1 sits on the entropy axis (only differences matter)

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: the inlet temperature and the turbine inlet temperature are fixed. You keep raising the pressure ratio. What happens to the net work from each kg of air?",
  options: [
    "It keeps rising",
    "It rises to a peak, then falls",
    "It keeps falling",
  ],
  correct: 1,
  explain:
    "A higher pressure ratio always improves the efficiency, but the compressor delivers hotter and hotter air, so less heat can be added before the turbine inlet limit. The net work peaks where T₂ = T₄. Drag the pressure ratio and watch the dot ride over the hill.",
};

export default function GasTurbine(_props: { topicSlug: string }) {
  const [t1, setT1] = useState(DEFAULTS.t1);
  const [t3, setT3] = useState(DEFAULTS.t3);
  const [rp, setRp] = useState(DEFAULTS.rp);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const cycle = solveBrayton({ t1, t3, rp });
  const best = optimumPressureRatio(t1, t3);
  const s3 = S1 + cycle.entropyRise;

  // A constant-pressure line on T-s: T grows exponentially with s.
  const pressureLine = (
    tStart: number,
    sStart: number,
    sEnd: number
  ): [number, number][] =>
    Array.from({ length: 25 }, (_, i): [number, number] => {
      const s = sStart + ((sEnd - sStart) * i) / 24;
      return [s, tStart * Math.exp((s - sStart) / CP)];
    });
  const heating = pressureLine(cycle.t2, S1, s3); // 2 to 3
  const cooling = pressureLine(t1, S1, s3); // 1 to 4, drawn left to right
  const workCurve = Array.from({ length: 59 }, (_, i): [number, number] => {
    const ratio = 1 + i * 0.5;
    return [ratio, solveBrayton({ t1, t3, rp: ratio }).netWork];
  });

  function preset(nextT1: number, nextT3: number, nextRp: number) {
    setT1(nextT1);
    setT3(nextT3);
    setRp(nextRp);
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
            x={[0, 1.8]}
            y={[0, 1600]}
            xTicks={[0.5, 1, 1.5]}
            yTicks={[400, 800, 1200, 1600]}
            xLabel='entropy s (kJ/kg K)'
            yLabel='T (K)'
            label={`Temperature against entropy for the gas turbine cycle. Temperatures: ${fmt(
              t1,
              0
            )}, ${fmt(cycle.t2, 0)}, ${fmt(t3, 0)} and ${fmt(
              cycle.t4,
              0
            )} kelvin.`}
          >
            {(sx, sy) => {
              const points = (list: [number, number][]) =>
                list.map(([s, t]) => `${sx(s)},${sy(t)}`).join(" ");
              const corners: [string, number, number, number, number][] = [
                ["1", S1, t1, -12, 14],
                ["2", S1, cycle.t2, -12, -4],
                ["3", s3, t3, 10, -4],
                ["4", s3, cycle.t4, 10, 14],
              ];
              return (
                <>
                  {/* the area inside the loop is the net work */}
                  <polygon
                    points={`${points(heating)} ${points(
                      [...cooling].reverse()
                    )}`}
                    fill={AMBER}
                    fillOpacity='0.25'
                  />
                  <line
                    x1={sx(0)}
                    y1={sy(t3)}
                    x2={sx(1.8)}
                    y2={sy(t3)}
                    stroke={WARN}
                    strokeDasharray='5 4'
                  />
                  <text x={sx(0.04)} y={sy(t3) - 5} fontSize='11' fill={WARN}>
                    turbine inlet limit T₃
                  </text>
                  <polyline
                    points={points(heating)}
                    fill='none'
                    stroke={WARN}
                    strokeWidth='2.5'
                  />
                  <polyline
                    points={points(cooling)}
                    fill='none'
                    stroke={ACCENT}
                    strokeWidth='2.5'
                  />
                  <line
                    x1={sx(S1)}
                    y1={sy(t1)}
                    x2={sx(S1)}
                    y2={sy(cycle.t2)}
                    stroke={INK}
                    strokeWidth='2.5'
                  />
                  <line
                    x1={sx(s3)}
                    y1={sy(t3)}
                    x2={sx(s3)}
                    y2={sy(cycle.t4)}
                    stroke={INK}
                    strokeWidth='2.5'
                  />
                  {corners.map(([name, s, t, dx, dy]) => (
                    <g key={name}>
                      <circle cx={sx(s)} cy={sy(t)} r='4' fill={INK} />
                      <text
                        x={sx(s) + dx}
                        y={sy(t) + dy}
                        fontSize='13'
                        fontWeight='600'
                        fill={INK}
                        textAnchor='middle'
                        stroke='#fff'
                        strokeWidth='3'
                        paintOrder='stroke'
                      >
                        {name}
                      </text>
                    </g>
                  ))}
                </>
              );
            }}
          </Plot>
          <figcaption>
            1→2 compressor, 2→3 heat added at constant pressure (orange), 3→4
            turbine, 4→1 heat rejected (blue). The shaded area is the net work.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Plot
              x={[0, 30]}
              y={[0, 500]}
              xTicks={[10, 20, 30]}
              yTicks={[100, 200, 300, 400, 500]}
              xLabel='pressure ratio'
              yLabel='net work (kJ/kg)'
              height={220}
              wide
              label={`Net work against pressure ratio. Now ${fmt(
                cycle.netWork,
                0
              )} kilojoules per kilogram at a ratio of ${fmt(
                rp,
                1
              )}. The peak is at ${fmt(best, 1)}.`}
            >
              {(sx, sy) => (
                <>
                  <polyline
                    points={workCurve
                      .map(
                        ([ratio, work]) =>
                          `${sx(ratio)},${sy(Math.max(0, work))}`
                      )
                      .join(" ")}
                    fill='none'
                    stroke={INK}
                    strokeWidth='2'
                  />
                  {best <= 30 && (
                    <line
                      x1={sx(best)}
                      y1={sy(0)}
                      x2={sx(best)}
                      y2={sy(solveBrayton({ t1, t3, rp: best }).netWork)}
                      stroke={SOFT}
                      strokeDasharray='4 4'
                    />
                  )}
                  <circle
                    cx={sx(rp)}
                    cy={sy(Math.max(0, cycle.netWork))}
                    r='6'
                    fill={AMBER}
                    stroke={INK}
                    strokeWidth='1.5'
                  />
                </>
              )}
            </Plot>
            <figcaption>
              The dashed line marks the pressure ratio for maximum work.
            </figcaption>
          </figure>

          <div className='controls'>
            <Slider
              id='gt-rp'
              label={
                <>
                  Pressure ratio r<sub>p</sub>
                </>
              }
              display={fmt(rp, 2)}
              min={2}
              max={30}
              step={0.01}
              value={rp}
              disabled={locked}
              onChange={setRp}
            />
            <Slider
              id='gt-t3'
              label={
                <>
                  Turbine inlet T<sub>3</sub>
                </>
              }
              display={`${fmt(t3, 0)} K`}
              min={900}
              max={1500}
              step={1}
              value={t3}
              disabled={locked}
              onChange={setT3}
            />
            <Slider
              id='gt-t1'
              label={
                <>
                  Compressor inlet T<sub>1</sub>
                </>
              }
              display={`${fmt(t1, 0)} K`}
              min={280}
              max={320}
              step={1}
              value={t1}
              disabled={locked}
              onChange={setT1}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setRp(Math.min(30, best))}
              >
                Maximum work
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() =>
                  preset(293, 1033, optimumPressureRatio(293, 1033))
                }
              >
                Exam 2013/14 Q1(h)
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => preset(298, 1073, 8)}
              >
                CA 2015/16 Q1(c)
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => preset(DEFAULTS.t1, DEFAULTS.t3, DEFAULTS.rp)}
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
                After the compressor, T<sub>2</sub> = T<sub>1</sub> r
                <sub>p</sub>
                <sup>(γ−1)/γ</sup>
              </>
            ),
            value: (
              <>
                {fmt(t1, 0)} × {fmt(rp, 2)}
                <sup>0.2857</sup> = <b>{fmt(cycle.t2, 1)} K</b>
              </>
            ),
          },
          {
            label: (
              <>
                After the turbine, T<sub>4</sub> = T<sub>3</sub> / r<sub>p</sub>
                <sup>(γ−1)/γ</sup>
              </>
            ),
            value: <b>{fmt(cycle.t4, 1)} K</b>,
          },
          {
            label: (
              <>
                Compressor work, c<sub>p</sub>(T<sub>2</sub> − T<sub>1</sub>)
              </>
            ),
            value: <b>{fmt(cycle.compressorWork, 1)} kJ/kg</b>,
          },
          {
            label: (
              <>
                Turbine work, c<sub>p</sub>(T<sub>3</sub> − T<sub>4</sub>)
              </>
            ),
            value: <b>{fmt(cycle.turbineWork, 1)} kJ/kg</b>,
          },
          {
            label: "Net work = turbine − compressor",
            value: <b>{fmt(cycle.netWork, 1)} kJ/kg</b>,
          },
          {
            label: (
              <>
                Thermal efficiency, η = 1 − 1 / r<sub>p</sub>
                <sup>(γ−1)/γ</sup>
              </>
            ),
            value: <b>{fmt(cycle.efficiency * 100, 2)} %</b>,
          },
          {
            label: (
              <>
                Work ratio = net work / turbine work = 1 − (T<sub>1</sub>/T
                <sub>3</sub>) r<sub>p</sub>
                <sup>(γ−1)/γ</sup>
              </>
            ),
            value: <b>{fmt(cycle.workRatio, 4)}</b>,
          },
          {
            label: (
              <>
                Pressure ratio for maximum work, (T<sub>3</sub>/T<sub>1</sub>)
                <sup>γ/2(γ−1)</sup>
              </>
            ),
            value: <b>{fmt(best, 2)}</b>,
          },
        ]}
      />
      <p className='hint'>
        Air standard cycle: γ = 1.4, c<sub>p</sub> = 1.005 kJ/kg K, ideal
        compressor and turbine.
      </p>
    </div>
  );
}
