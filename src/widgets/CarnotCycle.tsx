import { useState } from "react";
import { GAMMA, solveCarnot } from "./carnot/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, INK, WARN, fmt } from "./shared/theme";

const DEFAULTS = { th: 600, tc: 300, ratio: 2.5 };
const P1 = 5000; // kPa, the top pressure of the cycle (fixed)
const FLOW = 70; // drawing width of the heat stream coming in
const S0 = 0.08; // where the cycle starts on the entropy axis (only differences matter)

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a Carnot engine works between 600 K and 300 K. You can change one temperature by 50 K. Which change improves the efficiency more?",
  options: [
    "Raise the hot side to 650 K",
    "Lower the cold side to 250 K",
    "Both give the same gain",
  ],
  correct: 1,
  explain:
    "Efficiency = 1 − (cold temperature ÷ hot temperature). Raising the hot side gives 1 − 300/650 = 53.8 %. Lowering the cold side gives 1 − 250/600 = 58.3 %. The cold temperature sits on top of the fraction, so each kelvin there counts for more. Try both with the sliders.",
};

export default function CarnotCycle(_props: { topicSlug: string }) {
  const [th, setTh] = useState(DEFAULTS.th);
  const [tc, setTc] = useState(DEFAULTS.tc);
  const [ratio, setRatio] = useState(DEFAULTS.ratio);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const cycle = solveCarnot({ th, tc, ratio, p1: P1 });
  const sEnd = S0 + cycle.entropyChange;

  // The hot side must stay hotter than the cold side.
  const changeTh = (value: number) => {
    setTh(value);
    if (tc > value - 50) setTc(value - 50);
  };
  const changeTc = (value: number) => setTc(Math.min(value, th - 50));

  // Widths of the energy streams in the flow sketch.
  const workWidth = FLOW * cycle.efficiency;
  const rejectedWidth = FLOW - workWidth;

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
            x={[0, 0.5]}
            y={[0, 1300]}
            xTicks={[0.1, 0.2, 0.3, 0.4, 0.5]}
            yTicks={[300, 600, 900, 1200]}
            xLabel='entropy s (kJ/kg K)'
            yLabel='T (K)'
            label={`Temperature against entropy for the Carnot cycle: a rectangle between ${fmt(
              tc,
              0
            )} and ${fmt(th, 0)} kelvin.`}
          >
            {(sx, sy) => (
              <>
                {/* heat rejected: the area under the cold line. Work: the rectangle above it. */}
                <rect
                  x={sx(S0)}
                  y={sy(tc)}
                  width={sx(sEnd) - sx(S0)}
                  height={sy(0) - sy(tc)}
                  fill={ACCENT}
                  fillOpacity='0.16'
                />
                <rect
                  x={sx(S0)}
                  y={sy(th)}
                  width={sx(sEnd) - sx(S0)}
                  height={sy(tc) - sy(th)}
                  fill={AMBER}
                  fillOpacity='0.35'
                  stroke={INK}
                  strokeWidth='2'
                />
                <line
                  x1={sx(S0)}
                  y1={sy(th)}
                  x2={sx(sEnd)}
                  y2={sy(th)}
                  stroke={WARN}
                  strokeWidth='3'
                />
                <line
                  x1={sx(S0)}
                  y1={sy(tc)}
                  x2={sx(sEnd)}
                  y2={sy(tc)}
                  stroke={ACCENT}
                  strokeWidth='3'
                />
                <text
                  x={(sx(S0) + sx(sEnd)) / 2}
                  y={(sy(th) + sy(tc)) / 2 + 4}
                  fontSize='12'
                  fontWeight='600'
                  fill={AMBER_TEXT}
                  textAnchor='middle'
                >
                  work
                </text>
                <text
                  x={(sx(S0) + sx(sEnd)) / 2}
                  y={(sy(tc) + sy(0)) / 2 + 4}
                  fontSize='12'
                  fill={ACCENT}
                  textAnchor='middle'
                >
                  heat rejected
                </text>
                <text
                  x={sx(sEnd) + 22}
                  y={sy(th) + 4}
                  fontSize='11'
                  fill={WARN}
                >
                  hot, {fmt(th, 0)} K
                </text>
                <text
                  x={sx(sEnd) + 22}
                  y={sy(tc) + 4}
                  fontSize='11'
                  fill={ACCENT}
                >
                  cold, {fmt(tc, 0)} K
                </text>
                {[
                  ["1", S0, th, -9, -6],
                  ["2", sEnd, th, 9, -6],
                  ["3", sEnd, tc, 9, 15],
                  ["4", S0, tc, -9, 15],
                ].map(([name, s, t, dx, dy]) => (
                  <text
                    key={name}
                    x={sx(Number(s)) + Number(dx)}
                    y={sy(Number(t)) + Number(dy)}
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
                ))}
              </>
            )}
          </Plot>
          <figcaption>
            On T–s a Carnot cycle is a rectangle. The whole area under the hot
            line is the heat supplied; the amber part becomes work, the blue
            part is thrown away. Efficiency is amber over the whole.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <svg
              viewBox='0 0 240 230'
              role='img'
              aria-label={`Energy flow: ${fmt(
                cycle.heatIn,
                0
              )} kilojoules in from the hot reservoir, ${fmt(
                cycle.work,
                0
              )} out as work, ${fmt(
                cycle.heatOut,
                0
              )} rejected to the cold reservoir`}
            >
              <rect x='20' y='8' width='150' height='26' rx='4' fill={WARN} />
              <text x='95' y='26' fontSize='12' fill='#fff' textAnchor='middle'>
                hot reservoir, {fmt(th, 0)} K
              </text>
              <rect
                x='20'
                y='196'
                width='150'
                height='26'
                rx='4'
                fill={ACCENT}
              />
              <text
                x='95'
                y='214'
                fontSize='12'
                fill='#fff'
                textAnchor='middle'
              >
                cold reservoir, {fmt(tc, 0)} K
              </text>
              {/* the stream of heat: full width coming in, then it splits into rejected heat and work */}
              <rect
                x='60'
                y='34'
                width={FLOW}
                height='56'
                fill={WARN}
                fillOpacity='0.35'
              />
              <rect
                x='60'
                y='90'
                width={rejectedWidth}
                height='106'
                fill={ACCENT}
                fillOpacity='0.35'
              />
              <rect
                x={60 + rejectedWidth}
                y='90'
                width={workWidth + 40}
                height={workWidth}
                fill={AMBER}
                fillOpacity='0.7'
              />
              <path
                d={`M${60 + FLOW + 40} 84 L${60 + FLOW + 54} ${
                  90 + workWidth / 2
                } L${60 + FLOW + 40} ${96 + workWidth} Z`}
                fill={AMBER}
                fillOpacity='0.7'
              />
              <text x='52' y='58' fontSize='12' fill={INK} textAnchor='end'>
                in
              </text>
              <text
                x='52'
                y='73'
                fontSize='12'
                fontWeight='600'
                fill={INK}
                textAnchor='end'
              >
                {fmt(cycle.heatIn, 0)}
              </text>
              <text x='52' y='146' fontSize='12' fill={INK} textAnchor='end'>
                out
              </text>
              <text
                x='52'
                y='161'
                fontSize='12'
                fontWeight='600'
                fill={INK}
                textAnchor='end'
              >
                {fmt(cycle.heatOut, 0)}
              </text>
              <text
                x='190'
                y={86 + workWidth / 2}
                fontSize='12'
                fill={AMBER_TEXT}
              >
                work
              </text>
              <text
                x='190'
                y={101 + workWidth / 2}
                fontSize='12'
                fontWeight='600'
                fill={AMBER_TEXT}
              >
                {fmt(cycle.work, 0)}
              </text>
            </svg>
            <figcaption>
              Where each kJ goes (values in kJ/kg). The stream from the hot
              reservoir splits: the amber branch is work, the rest must be
              rejected to the cold reservoir.
            </figcaption>
          </figure>

          <div className='controls'>
            <Slider
              id='carnot-th'
              label={
                <>
                  Hot reservoir T<sub>H</sub>
                </>
              }
              display={`${fmt(th, 0)} K`}
              min={400}
              max={1200}
              step={10}
              value={th}
              disabled={locked}
              onChange={changeTh}
            />
            <Slider
              id='carnot-tc'
              label={
                <>
                  Cold reservoir T<sub>C</sub>
                </>
              }
              display={`${fmt(tc, 0)} K`}
              min={250}
              max={400}
              step={10}
              value={tc}
              disabled={locked}
              onChange={changeTc}
            />
            <Slider
              id='carnot-ratio'
              label={
                <>
                  Expansion ratio v<sub>2</sub>/v<sub>1</sub>
                </>
              }
              display={fmt(ratio, 1)}
              min={1.5}
              max={4}
              step={0.1}
              value={ratio}
              disabled={locked}
              onChange={setRatio}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setTh(DEFAULTS.th);
                  setTc(DEFAULTS.tc);
                  setRatio(DEFAULTS.ratio);
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
                Efficiency, η = 1 − T<sub>C</sub> / T<sub>H</sub>
              </>
            ),
            value: (
              <>
                1 − {fmt(tc, 0)} / {fmt(th, 0)} ={" "}
                <b>{fmt(cycle.efficiency * 100, 1)} %</b>
              </>
            ),
          },
          {
            label: (
              <>
                Heat supplied at T<sub>H</sub>, q = R T<sub>H</sub> ln(v
                <sub>2</sub>/v<sub>1</sub>)
              </>
            ),
            value: <b>{fmt(cycle.heatIn, 1)} kJ/kg</b>,
          },
          {
            label: (
              <>
                Heat rejected at T<sub>C</sub>, q = R T<sub>C</sub> ln(v
                <sub>3</sub>/v<sub>4</sub>)
              </>
            ),
            value: <b>{fmt(cycle.heatOut, 1)} kJ/kg</b>,
          },
          {
            label: "Net work = heat supplied − heat rejected",
            value: <b>{fmt(cycle.work, 1)} kJ/kg</b>,
          },
          {
            label: (
              <>
                Entropy in at T<sub>H</sub> = entropy out at T<sub>C</sub> (the
                width of the rectangle)
              </>
            ),
            value: <b>{fmt(cycle.entropyChange, 4)} kJ/kg K</b>,
          },
          {
            label: "What the expansion ratio changes",
            value: "the size of the cycle and its work, not its efficiency",
          },
        ]}
      />
      <p className='hint'>
        Air as a perfect gas: R = 0.287 kJ/kg K, γ = {GAMMA}. No real engine
        between these two temperatures can beat this efficiency.
      </p>
    </div>
  );
}
