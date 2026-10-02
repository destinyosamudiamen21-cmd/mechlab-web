import { useState } from "react";
import {
  area,
  firstMoment,
  profile,
  secondMoment,
  shearStress,
  webShare,
  widthAt,
} from "./shear/solver";
import type { Section } from "./shear/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import {
  ACCENT,
  AMBER,
  AMBER_TEXT,
  INK,
  RULE,
  SOFT,
  TINT,
  fmt,
} from "./shared/theme";

type Shape = "rectangle" | "i";
const SHAPES: { id: Shape; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "i", label: "I-section" },
];
const DEFAULTS = {
  shape: "rectangle" as Shape,
  v: 50,
  b: 100,
  h: 200,
  tf: 20,
  tw: 10,
  cut: 0.5,
};

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a rectangular beam carries a shear force. Where in the cross-section is the shear stress largest?",
  options: [
    "At the top and bottom faces",
    "At the neutral axis, in the middle",
    "It is the same everywhere",
  ],
  correct: 1,
  explain:
    "It is the opposite of bending stress. Bending stress is zero at the neutral axis and largest at the faces. Shear stress is zero at the faces and largest at the neutral axis, where it is 1.5 times the average V/A. Drag the cut level to see why: the stress follows Q, the moment of the area beyond the cut.",
};

// Drawing: 0.5 px per mm, section centred at (95, 135).
const SCALE = 0.5;
const CX = 95;
const CY = 135;
const AXIS = 205; // x of the τ = 0 line
const TAU_WIDTH = 120; // drawing width given to the largest stress

export default function BeamShear(_props: { topicSlug: string }) {
  const [shape, setShape] = useState(DEFAULTS.shape);
  const [v, setV] = useState(DEFAULTS.v);
  const [b, setB] = useState(DEFAULTS.b);
  const [h, setH] = useState(DEFAULTS.h);
  const [tf, setTf] = useState(DEFAULTS.tf);
  const [tw, setTw] = useState(DEFAULTS.tw);
  const [cut, setCut] = useState(DEFAULTS.cut); // cut level as a fraction of the half depth, −1 to 1
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const section: Section =
    shape === "rectangle"
      ? { kind: "rectangle", b, h }
      : { kind: "i", b, h, tf, tw };
  const y = (cut * h) / 2;
  const i = secondMoment(section);
  const q = firstMoment(section, y);
  const width = widthAt(section, y);
  const tau = shearStress(section, v, y);
  const tauMax = shearStress(section, v, 0);
  const tauAverage = (v * 1000) / area(section);
  const points = profile(section, v);
  const peak = Math.max(...points.map(([, stress]) => stress));
  const px = (stress: number) => AXIS + (stress / peak) * TAU_WIDTH;
  const py = (level: number) => CY - level * SCALE;

  // The area beyond the cut (the part whose moment is Q), as rectangles to shade.
  const beyond: { x: number; y: number; w: number; hgt: number }[] = [];
  const top = h / 2;
  const sign = y >= 0 ? 1 : -1;
  const a = Math.abs(y);
  const strip = (from: number, to: number, w: number) => {
    if (to <= from) return;
    const upper = sign > 0 ? to : -from;
    beyond.push({
      x: CX - (w * SCALE) / 2,
      y: py(upper),
      w: w * SCALE,
      hgt: (to - from) * SCALE,
    });
  };
  if (section.kind === "rectangle") strip(a, top, b);
  else {
    const halfWeb = h / 2 - tf;
    strip(Math.max(a, halfWeb), top, b);
    strip(a, halfWeb, tw);
  }

  const outline =
    section.kind === "rectangle"
      ? `M${CX - (b * SCALE) / 2} ${py(top)} h${b * SCALE} v${h * SCALE} h${
          -b * SCALE
        } Z`
      : (() => {
          const fb = b * SCALE,
            fw = tw * SCALE,
            ft = tf * SCALE,
            hw = (h - 2 * tf) * SCALE,
            side = (fb - fw) / 2;
          return `M${CX - fb / 2} ${py(
            top
          )} h${fb} v${ft} h${-side} v${hw} h${side} v${ft} h${-fb} v${-ft} h${side} v${-hw} h${-side} Z`;
        })();

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
            aria-label={`Cross-section and its shear stress distribution. Largest stress ${fmt(
              peak
            )} megapascals. At the cut, ${fmt(tau)} megapascals.`}
          >
            <path
              d={outline}
              fill={TINT}
              stroke={INK}
              strokeWidth='2'
              strokeLinejoin='round'
            />
            {beyond.map((rect, index) => (
              <rect
                key={index}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.hgt}
                fill={AMBER}
                fillOpacity='0.55'
              />
            ))}
            {/* neutral axis */}
            <line
              x1='20'
              y1={CY}
              x2={AXIS + TAU_WIDTH + 12}
              y2={CY}
              stroke={SOFT}
              strokeDasharray='8 3 2 3'
            />
            <text x='20' y={CY - 4} fontSize='11' fill={SOFT}>
              N.A.
            </text>

            {/* the stress distribution, drawn sideways from the same heights */}
            <line
              x1={AXIS}
              y1={py(top) - 8}
              x2={AXIS}
              y2={py(-top) + 8}
              stroke={RULE}
              strokeWidth='1.5'
            />
            <polygon
              points={`${AXIS},${py(top)} ${points
                .map(([level, stress]) => `${px(stress)},${py(level)}`)
                .join(" ")} ${AXIS},${py(-top)}`}
              fill={ACCENT}
              fillOpacity='0.18'
              stroke={ACCENT}
              strokeWidth='2'
              strokeLinejoin='round'
            />
            <text x={AXIS + 4} y={py(top) - 12} fontSize='11' fill={SOFT}>
              τ (MPa), scaled to fit
            </text>
            <text
              x={px(tauMax) - 4}
              y={CY + 14}
              fontSize='11'
              fill={ACCENT}
              textAnchor='end'
            >
              max {fmt(tauMax)}
            </text>

            {/* the cut */}
            <line
              x1='20'
              y1={py(y)}
              x2={px(tau)}
              y2={py(y)}
              stroke={AMBER_TEXT}
              strokeWidth='1.5'
              strokeDasharray='5 3'
            />
            <circle
              cx={px(tau)}
              cy={py(y)}
              r='5'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <text
              x='20'
              y={py(y) + (sign > 0 ? -5 : 13)}
              fontSize='11'
              fill={AMBER_TEXT}
            >
              cut
            </text>
          </svg>
          <figcaption>
            Left: the section, with the area beyond the cut shaded. Right: the
            shear stress at each height. The dot is the stress at your cut.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments
              label='Cross-section'
              options={SHAPES}
              value={shape}
              disabled={locked}
              onChange={setShape}
            />
            <Slider
              id='shear-cut'
              label='Cut level y, from the neutral axis'
              display={`${fmt(y, 0)} mm`}
              min={-1}
              max={1}
              step={0.02}
              value={cut}
              disabled={locked}
              onChange={setCut}
            />
            <Slider
              id='shear-v'
              label='Shear force V'
              display={`${fmt(v, 0)} kN`}
              min={10}
              max={200}
              step={5}
              value={v}
              disabled={locked}
              onChange={setV}
            />
            <Slider
              id='shear-h'
              label='Depth h'
              display={`${fmt(h, 0)} mm`}
              min={100}
              max={400}
              step={10}
              value={h}
              disabled={locked}
              onChange={setH}
            />
            <Slider
              id='shear-b'
              label={shape === "i" ? "Flange width b" : "Width b"}
              display={`${fmt(b, 0)} mm`}
              min={50}
              max={200}
              step={10}
              value={b}
              disabled={locked}
              onChange={setB}
            />
            {shape === "i" && (
              <>
                <Slider
                  id='shear-tf'
                  label='Flange thickness'
                  display={`${fmt(tf, 0)} mm`}
                  min={10}
                  max={30}
                  step={1}
                  value={tf}
                  disabled={locked}
                  onChange={setTf}
                />
                <Slider
                  id='shear-tw'
                  label='Web thickness'
                  display={`${fmt(tw, 0)} mm`}
                  min={5}
                  max={20}
                  step={1}
                  value={tw}
                  disabled={locked}
                  onChange={setTw}
                />
              </>
            )}
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setV(DEFAULTS.v);
                  setB(DEFAULTS.b);
                  setH(DEFAULTS.h);
                  setTf(DEFAULTS.tf);
                  setTw(DEFAULTS.tw);
                  setCut(DEFAULTS.cut);
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
            label: "Second moment of area of the whole section, I",
            value: <b>{fmt(i / 1e6, 2)} × 10⁶ mm⁴</b>,
          },
          {
            label:
              "Q: (shaded area) × (distance of its centroid from the N.A.)",
            value: <b>{fmt(q / 1e3, 1)} × 10³ mm³</b>,
          },
          {
            label: "Shear stress at the cut, τ = V Q / (I b)",
            value: (
              <>
                {fmt(v, 0)} kN × Q / (I × {fmt(width, 0)} mm) ={" "}
                <b>{fmt(tau)} MPa</b>
              </>
            ),
          },
          {
            label: "Largest shear stress, at the neutral axis",
            value: <b>{fmt(tauMax)} MPa</b>,
          },
          {
            label: "Average shear stress, V / A",
            value: <b>{fmt(tauAverage)} MPa</b>,
          },
          section.kind === "rectangle"
            ? {
                label: "Largest ÷ average",
                value: (
                  <>
                    <b>{fmt(tauMax / tauAverage)}</b> (always 1.5 for a
                    rectangle)
                  </>
                ),
              }
            : {
                label: "Share of V carried by the web",
                value: (
                  <>
                    <b>{fmt(webShare(section) * 100, 1)} %</b> (the flanges
                    carry very little shear)
                  </>
                ),
              },
        ]}
      />
    </div>
  );
}
