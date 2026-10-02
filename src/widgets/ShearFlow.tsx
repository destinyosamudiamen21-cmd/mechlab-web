import { useState } from "react";
import { flangeFlow, solveShearFlow, webFlow } from "./shearflow/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, AMBER_TEXT, INK, SOFT, fmt } from "./shared/theme";

const DEFAULTS = { v: 60, b: 150, h: 280, tf: 15, tw: 8 };

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: in an I-beam, shear flows along the top flange from both tips towards the web. Where they meet the web, how does the flow at the top of the web compare with the flow arriving from ONE side of the flange?",
  options: ["The same", "Twice as much", "Half as much"],
  correct: 1,
  explain:
    "Shear flow behaves like water in pipes: what arrives at a junction must leave it. Two equal streams arrive, one from each half of the flange, so the web starts with twice the flow of either. It then keeps growing down to the neutral axis.",
};

// Drawing: section centred at (150, 135), 0.42 px per mm. The largest flow is drawn 44 px thick.
const SCALE = 0.42;
const CX = 150;
const CY = 135;
const THICK = 44;

function Arrow({
  x,
  y,
  dx,
  dy,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
}) {
  // A short arrow centred on (x, y) pointing along (dx, dy), a unit direction.
  const tail = [x - dx * 11, y - dy * 11];
  const tip = [x + dx * 11, y + dy * 11];
  const side = [-dy * 4.5, dx * 4.5];
  return (
    <g>
      <line
        x1={tail[0]}
        y1={tail[1]}
        x2={tip[0] - dx * 5}
        y2={tip[1] - dy * 5}
        stroke={INK}
        strokeWidth='2'
      />
      <path
        d={`M${tip[0]} ${tip[1]} L${tip[0] - dx * 8 + side[0]} ${
          tip[1] - dy * 8 + side[1]
        } L${tip[0] - dx * 8 - side[0]} ${tip[1] - dy * 8 - side[1]} Z`}
        fill={INK}
      />
    </g>
  );
}

export default function ShearFlow(_props: { topicSlug: string }) {
  const [v, setV] = useState(DEFAULTS.v);
  const [b, setB] = useState(DEFAULTS.b);
  const [h, setH] = useState(DEFAULTS.h);
  const [tf, setTf] = useState(DEFAULTS.tf);
  const [tw, setTw] = useState(DEFAULTS.tw);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const input = { v, b, h, tf, tw };
  const result = solveShearFlow(input);
  const size = (flow: number) => (flow / result.webMax) * THICK;

  const halfB = (b / 2) * SCALE;
  const halfH = (h / 2) * SCALE;
  const topY = CY - halfH;
  const bottomY = CY + halfH;
  const junction = size(result.flangeJunction);
  // The web's parabola, drawn to the right of the web.
  const webCurve = Array.from({ length: 31 }, (_, index) => {
    const y = h / 2 - (h * index) / 30;
    return `${CX + size(webFlow(input, y))},${CY - y * SCALE}`;
  }).join(" ");

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
            aria-label={`Shear flow round an I-section. ${fmt(
              result.flangeJunction,
              1
            )} newtons per millimetre arrives from each half flange, ${fmt(
              result.webTop,
              1
            )} at the top of the web, ${fmt(
              result.webMax,
              1
            )} at the neutral axis.`}
          >
            {/* how much flow: the thickness of the blue band, measured square to the wall */}
            <polygon
              points={`${CX - halfB},${topY} ${CX},${
                topY - junction
              } ${CX},${topY}`}
              fill={ACCENT}
              fillOpacity='0.22'
              stroke={ACCENT}
            />
            <polygon
              points={`${CX + halfB},${topY} ${CX},${
                topY - junction
              } ${CX},${topY}`}
              fill={ACCENT}
              fillOpacity='0.22'
              stroke={ACCENT}
            />
            <polygon
              points={`${CX - halfB},${bottomY} ${CX},${
                bottomY + junction
              } ${CX},${bottomY}`}
              fill={ACCENT}
              fillOpacity='0.22'
              stroke={ACCENT}
            />
            <polygon
              points={`${CX + halfB},${bottomY} ${CX},${
                bottomY + junction
              } ${CX},${bottomY}`}
              fill={ACCENT}
              fillOpacity='0.22'
              stroke={ACCENT}
            />
            <polygon
              points={`${CX},${topY} ${webCurve} ${CX},${bottomY}`}
              fill={ACCENT}
              fillOpacity='0.22'
              stroke={ACCENT}
            />

            {/* the section itself, drawn along its centre-lines */}
            <line
              x1={CX - halfB}
              y1={topY}
              x2={CX + halfB}
              y2={topY}
              stroke={INK}
              strokeWidth={Math.max(3, tf * SCALE)}
            />
            <line
              x1={CX - halfB}
              y1={bottomY}
              x2={CX + halfB}
              y2={bottomY}
              stroke={INK}
              strokeWidth={Math.max(3, tf * SCALE)}
            />
            <line
              x1={CX}
              y1={topY}
              x2={CX}
              y2={bottomY}
              stroke={INK}
              strokeWidth={Math.max(2.5, tw * SCALE)}
            />

            {/* which way it flows */}
            <Arrow x={CX - halfB * 0.55} y={topY + 16} dx={1} dy={0} />
            <Arrow x={CX + halfB * 0.55} y={topY + 16} dx={-1} dy={0} />
            <Arrow x={CX - 14} y={CY} dx={0} dy={1} />
            <Arrow x={CX - halfB * 0.55} y={bottomY - 16} dx={-1} dy={0} />
            <Arrow x={CX + halfB * 0.55} y={bottomY - 16} dx={1} dy={0} />

            <text
              x={CX + size(result.webMax) + 6}
              y={CY + 4}
              fontSize='11'
              fill={ACCENT}
            >
              {fmt(result.webMax, 1)} N/mm
            </text>
            <text
              x={CX + size(result.webTop) + 6}
              y={topY + 14}
              fontSize='11'
              fill={ACCENT}
            >
              {fmt(result.webTop, 1)}
            </text>
            <text
              x={CX}
              y={topY - junction - 6}
              fontSize='11'
              fill={ACCENT}
              textAnchor='middle'
            >
              {fmt(result.flangeJunction, 1)} from each side
            </text>
            <circle
              cx={CX}
              cy={topY}
              r='5'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <text
              x='352'
              y='262'
              fontSize='11'
              fill={AMBER_TEXT}
              textAnchor='end'
            >
              amber dot: the junction
            </text>
            <text x='8' y='262' fontSize='11' fill={SOFT}>
              V acts downwards
            </text>
          </svg>
          <figcaption>
            Blue band: the size of the shear flow q at each point, drawn square
            to the wall. Arrows: its direction. It starts from zero at the
            flange tips, merges at the web, and leaves through the bottom
            flange.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Slider
              id='flow-v'
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
              id='flow-b'
              label='Flange width b'
              display={`${fmt(b, 0)} mm`}
              min={80}
              max={250}
              step={10}
              value={b}
              disabled={locked}
              onChange={setB}
            />
            <Slider
              id='flow-h'
              label='Depth h (between flange centres)'
              display={`${fmt(h, 0)} mm`}
              min={150}
              max={400}
              step={10}
              value={h}
              disabled={locked}
              onChange={setH}
            />
            <Slider
              id='flow-tf'
              label='Flange thickness'
              display={`${fmt(tf, 0)} mm`}
              min={8}
              max={25}
              step={1}
              value={tf}
              disabled={locked}
              onChange={setTf}
            />
            <Slider
              id='flow-tw'
              label='Web thickness'
              display={`${fmt(tw, 0)} mm`}
              min={5}
              max={20}
              step={1}
              value={tw}
              disabled={locked}
              onChange={setTw}
            />
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
                Thin-walled I = t<sub>w</sub>h³/12 + 2 b t<sub>f</sub> (h/2)²
              </>
            ),
            value: <b>{fmt(result.i / 1e6, 2)} × 10⁶ mm⁴</b>,
          },
          {
            label: "Shear flow, q = V Q / I  (force per mm of wall)",
            value: <>shear stress is q ÷ wall thickness</>,
          },
          {
            label: (
              <>
                Arriving from one half flange, q = V t<sub>f</sub> (b/2)(h/2) /
                I
              </>
            ),
            value: <b>{fmt(result.flangeJunction, 1)} N/mm</b>,
          },
          {
            label: "Top of the web: two streams merge",
            value: (
              <>
                2 × {fmt(result.flangeJunction, 1)} ={" "}
                <b>{fmt(result.webTop, 1)} N/mm</b>
              </>
            ),
          },
          {
            label: "Largest, at the neutral axis",
            value: (
              <>
                <b>{fmt(result.webMax, 1)} N/mm</b>, so τ ={" "}
                {fmt(result.webMax / tw, 1)} MPa in the web
              </>
            ),
          },
          {
            label: "Flow in the web added up over its height",
            value: (
              <>
                <b>{fmt(result.webForce, 1)} kN</b> = V. The web carries the
                shear force.
              </>
            ),
          },
          {
            label: "Sideways force in each half flange",
            value: (
              <>
                <b>{fmt(result.flangeForce, 2)} kN</b>. Left and right halves
                cancel.
              </>
            ),
          },
          {
            label: "Halfway along a flange",
            value: (
              <>
                {fmt(flangeFlow(input, b / 4), 1)} N/mm: half the junction
                value, a straight line
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
