import { useState } from "react";
import { solveFlitched } from "./composite/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, INK, RULE, SOFT, STEEL, WARN, fmt } from "./shared/theme";

const DEFAULTS = { m: 20, b: 100, d: 200, t: 10, n: 20 };
const TIMBER = "#e3c08d";

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a timber beam has steel plates fixed firmly to its top and bottom faces, so they bend together. Right at the joint between timber and steel, which quantity is the same in both materials?",
  options: ["The stress", "The strain", "Neither"],
  correct: 1,
  explain:
    "The two are fixed together, so at the joint they stretch by the same amount: the strain is the same. Steel is much stiffer, so for the same strain it carries a much larger stress, n times larger, where n = E steel / E timber. Look for the jump in the stress diagram.",
};

// Drawing: 0.55 px per mm vertically for all three panels, so heights line up.
const SCALE = 0.55;
const CY = 142;

export default function CompositeBeam(_props: { topicSlug: string }) {
  const [m, setM] = useState(DEFAULTS.m);
  const [b, setB] = useState(DEFAULTS.b);
  const [d, setD] = useState(DEFAULTS.d);
  const [t, setT] = useState(DEFAULTS.t);
  const [n, setN] = useState(DEFAULTS.n);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const result = solveFlitched({ m, b, d, t, n });
  const timberAlone = (m * 1e6 * 6) / (b * d * d); // the same timber with no plates

  const halfD = (d / 2) * SCALE;
  const plate = Math.max(2, t * SCALE);
  const realWidth = b * SCALE;
  // Transformed section: the plates become n times wider. Scaled sideways so the flange always fits its panel.
  const flange = 112;
  const web = flange / n;
  // Stress diagram: the largest (steel) stress is drawn 44 px long.
  const AXIS = 302;
  const stress = (value: number) => (value / result.steelMax) * 44;

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
            aria-label={`Flitched beam: real section, equivalent all-timber section, and stress diagram. Timber ${fmt(
              result.timberMax
            )} megapascals, steel ${fmt(result.steelMax, 1)} megapascals.`}
          >
            <text x='60' y='16' fontSize='12' fill={INK} textAnchor='middle'>
              real section
            </text>
            <text x='182' y='16' fontSize='12' fill={INK} textAnchor='middle'>
              as all timber
            </text>
            <text x={AXIS} y='16' fontSize='12' fill={INK} textAnchor='middle'>
              stress
            </text>
            <line
              x1='8'
              y1={CY}
              x2='352'
              y2={CY}
              stroke={SOFT}
              strokeDasharray='8 3 2 3'
            />

            {/* 1: the real section */}
            <rect
              x={60 - realWidth / 2}
              y={CY - halfD}
              width={realWidth}
              height={2 * halfD}
              fill={TIMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <rect
              x={60 - realWidth / 2}
              y={CY - halfD - plate}
              width={realWidth}
              height={plate}
              fill={STEEL}
              stroke={INK}
              strokeWidth='1'
            />
            <rect
              x={60 - realWidth / 2}
              y={CY + halfD}
              width={realWidth}
              height={plate}
              fill={STEEL}
              stroke={INK}
              strokeWidth='1'
            />
            <text
              x='60'
              y={CY + 4}
              fontSize='11'
              fill={INK}
              textAnchor='middle'
            >
              timber
            </text>
            <text
              x='60'
              y={CY + halfD + plate + 14}
              fontSize='11'
              fill={SOFT}
              textAnchor='middle'
            >
              steel plates
            </text>

            {/* 2: the transformed section, an I-beam made only of timber */}
            <rect
              x={182 - web / 2}
              y={CY - halfD}
              width={web}
              height={2 * halfD}
              fill={TIMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <rect
              x={182 - flange / 2}
              y={CY - halfD - plate}
              width={flange}
              height={plate}
              fill={TIMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <rect
              x={182 - flange / 2}
              y={CY + halfD}
              width={flange}
              height={plate}
              fill={TIMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <text
              x='182'
              y={CY + halfD + plate + 14}
              fontSize='11'
              fill={SOFT}
              textAnchor='middle'
            >
              plates {fmt(n, 0)} × wider
            </text>

            {/* 3: stress. Compression at the top (drawn to the left), tension at the bottom. */}
            <line
              x1={AXIS}
              y1={CY - halfD - plate - 6}
              x2={AXIS}
              y2={CY + halfD + plate + 6}
              stroke={RULE}
              strokeWidth='1.5'
            />
            <polygon
              points={`${AXIS},${CY} ${AXIS - stress(result.timberMax)},${
                CY - halfD
              } ${AXIS},${CY - halfD}`}
              fill={ACCENT}
              fillOpacity='0.3'
              stroke={ACCENT}
            />
            <polygon
              points={`${AXIS},${CY} ${AXIS + stress(result.timberMax)},${
                CY + halfD
              } ${AXIS},${CY + halfD}`}
              fill={WARN}
              fillOpacity='0.3'
              stroke={WARN}
            />
            <polygon
              points={`${AXIS},${CY - halfD} ${
                AXIS - stress(result.steelJoint)
              },${CY - halfD} ${AXIS - 44},${CY - halfD - plate} ${AXIS},${
                CY - halfD - plate
              }`}
              fill={ACCENT}
              fillOpacity='0.6'
              stroke={ACCENT}
            />
            <polygon
              points={`${AXIS},${CY + halfD} ${
                AXIS + stress(result.steelJoint)
              },${CY + halfD} ${AXIS + 44},${CY + halfD + plate} ${AXIS},${
                CY + halfD + plate
              }`}
              fill={WARN}
              fillOpacity='0.6'
              stroke={WARN}
            />
            <text x={AXIS + 6} y={CY - halfD + 14} fontSize='11' fill={ACCENT}>
              {fmt(result.timberMax, 1)}
            </text>
            <text
              x={AXIS + 6}
              y={CY - halfD - plate - 4}
              fontSize='11'
              fill={ACCENT}
            >
              {fmt(result.steelMax, 0)} MPa
            </text>
            <text x='8' y='262' fontSize='11' fill={SOFT}>
              blue: compression · orange: tension
            </text>
          </svg>
          <figcaption>
            Middle: for the calculation, each steel plate is swapped for timber
            n times as wide. Right: the stress. It jumps by the factor n at the
            joint, because the strain is shared but steel is n times stiffer.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='flitch-n'
              label='Modular ratio n = E steel / E timber'
              display={fmt(n, 0)}
              min={10}
              max={25}
              step={1}
              value={n}
              disabled={locked}
              onChange={setN}
            />
            <Slider
              id='flitch-t'
              label='Plate thickness t'
              display={`${fmt(t, 0)} mm`}
              min={5}
              max={20}
              step={1}
              value={t}
              disabled={locked}
              onChange={setT}
            />
            <Slider
              id='flitch-m'
              label='Bending moment M'
              display={`${fmt(m, 0)} kN m`}
              min={5}
              max={60}
              step={1}
              value={m}
              disabled={locked}
              onChange={setM}
            />
            <Slider
              id='flitch-b'
              label='Width b'
              display={`${fmt(b, 0)} mm`}
              min={60}
              max={150}
              step={10}
              value={b}
              disabled={locked}
              onChange={setB}
            />
            <Slider
              id='flitch-d'
              label='Timber depth d'
              display={`${fmt(d, 0)} mm`}
              min={150}
              max={300}
              step={10}
              value={d}
              disabled={locked}
              onChange={setD}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setM(DEFAULTS.m);
                  setB(DEFAULTS.b);
                  setD(DEFAULTS.d);
                  setT(DEFAULTS.t);
                  setN(DEFAULTS.n);
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
            label:
              "I of the all-timber section = bd³/12 + 2n[bt³/12 + bt(d/2 + t/2)²]",
            value: <b>{fmt(result.i / 1e6, 1)} × 10⁶ mm⁴</b>,
          },
          {
            label: "Largest timber stress, σ = M (d/2) / I",
            value: <b>{fmt(result.timberMax)} MPa</b>,
          },
          {
            label: "Steel at the joint = n × timber stress there",
            value: (
              <>
                {fmt(n, 0)} × {fmt(result.timberMax)} ={" "}
                <b>{fmt(result.steelJoint, 1)} MPa</b>
              </>
            ),
          },
          {
            label: "Largest steel stress, σ = n M (d/2 + t) / I",
            value: <b>{fmt(result.steelMax, 1)} MPa</b>,
          },
          {
            label: "Share of the bending moment",
            value: (
              <>
                timber <b>{fmt(result.timberMoment, 1)}</b>, steel{" "}
                <b>{fmt(result.steelMoment, 1)} kN m</b> (
                {fmt((result.steelMoment / m) * 100, 0)} % in the steel)
              </>
            ),
          },
          {
            label: "The same timber with no plates, σ = 6M / bd²",
            value: (
              <>
                <b>{fmt(timberAlone, 1)} MPa</b>,{" "}
                {fmt(timberAlone / result.timberMax, 1)} times higher
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
