import { useState } from "react";
import { deltaU, heatAlong, workAlong } from "./path/solver";
import type { PathId, PathInput } from "./path/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, INK, SOFT, fmt } from "./shared/theme";

const P1 = 600; // kPa (6 bar)
const V1 = 0.1; // m³
const GAMMA = 1.4;
const DEFAULTS = { p2Bar: 2, v2: 0.3 };

const PATHS: { id: PathId; label: string; route: string }[] = [
  {
    id: "A",
    label: "Path A",
    route: "constant pressure, then constant volume",
  },
  {
    id: "B",
    label: "Path B",
    route: "constant volume, then constant pressure",
  },
  { id: "C", label: "Path C", route: "a straight line" },
];

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a gas goes from state 1 to state 2 along three different paths. Which quantity is the same for all three?",
  options: [
    "The change in internal energy, ΔU",
    "The work done, W",
    "The heat supplied, Q",
  ],
  correct: 0,
  explain:
    "Internal energy is a property (a point function): it depends only on the two end states. Work and heat are path functions: they depend on the route. Switch paths and watch W and Q change while ΔU stays put.",
};

export default function PathFunctions(_props: { topicSlug: string }) {
  const [p2Bar, setP2Bar] = useState(DEFAULTS.p2Bar);
  const [v2, setV2] = useState(DEFAULTS.v2);
  const [path, setPath] = useState<PathId>("A");
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const input: PathInput = {
    p1: P1,
    v1: V1,
    p2: p2Bar * 100,
    v2,
    gamma: GAMMA,
  };
  const dU = deltaU(input);

  // Corner points of each path, as [volume, pressure in bar].
  const corners: Record<PathId, [number, number][]> = {
    A: [
      [V1, 6],
      [v2, 6],
      [v2, p2Bar],
    ],
    B: [
      [V1, 6],
      [V1, p2Bar],
      [v2, p2Bar],
    ],
    C: [
      [V1, 6],
      [v2, p2Bar],
    ],
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
            x={[0, 0.45]}
            y={[0, 9]}
            xTicks={[0.1, 0.2, 0.3, 0.4]}
            yTicks={[2, 4, 6, 8]}
            xLabel='V (m³)'
            yLabel='p (bar)'
            label={`Pressure-volume diagram with three paths between the same two states. Path ${path} selected.`}
          >
            {(sx, sy) => {
              const line = (points: [number, number][]) =>
                points.map(([v, p]) => `${sx(v)},${sy(p)}`).join(" ");
              const chosen = corners[path];
              const area = `${sx(chosen[0][0])},${sy(0)} ${line(chosen)} ${sx(
                chosen[chosen.length - 1][0]
              )},${sy(0)}`;
              return (
                <>
                  <polygon points={area} fill={AMBER} fillOpacity='0.3' />
                  {PATHS.filter((item) => item.id !== path).map((item) => (
                    <polyline
                      key={item.id}
                      points={line(corners[item.id])}
                      fill='none'
                      stroke={SOFT}
                      strokeWidth='1.5'
                      strokeDasharray='5 4'
                    />
                  ))}
                  <polyline
                    points={line(chosen)}
                    fill='none'
                    stroke={ACCENT}
                    strokeWidth='3'
                    strokeLinejoin='round'
                  />
                  <circle cx={sx(V1)} cy={sy(6)} r='5' fill={INK} />
                  <text
                    x={sx(V1) - 9}
                    y={sy(6) - 8}
                    fontSize='12'
                    fill={INK}
                    textAnchor='end'
                  >
                    1
                  </text>
                  <circle cx={sx(v2)} cy={sy(p2Bar)} r='5' fill={INK} />
                  <text
                    x={sx(v2) + 9}
                    y={sy(p2Bar) + 16}
                    fontSize='12'
                    fill={INK}
                  >
                    2
                  </text>
                </>
              );
            }}
          </Plot>
          <figcaption>
            Path {path}: {PATHS.find((item) => item.id === path)?.route}. The
            shaded area under it is the work, {fmt(workAlong(input, path), 1)}{" "}
            kJ.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments
              label='Path'
              options={PATHS}
              value={path}
              disabled={locked}
              columns={3}
              onChange={setPath}
            />
            <Slider
              id='path-p2'
              label={
                <>
                  p<sub>2</sub>
                </>
              }
              display={`${fmt(p2Bar, 1)} bar`}
              min={1}
              max={8}
              step={0.5}
              value={p2Bar}
              disabled={locked}
              onChange={setP2Bar}
            />
            <Slider
              id='path-v2'
              label={
                <>
                  V<sub>2</sub>
                </>
              }
              display={`${fmt(v2)} m³`}
              min={0.15}
              max={0.4}
              step={0.01}
              value={v2}
              disabled={locked}
              onChange={setV2}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setP2Bar(DEFAULTS.p2Bar);
                  setV2(DEFAULTS.v2);
                  setPath("A");
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
        <table className='data-table'>
          <tbody>
            <tr>
              <th>Path</th>
              <th>W (kJ)</th>
              <th>Q = ΔU + W (kJ)</th>
              <th>ΔU (kJ)</th>
            </tr>
            {PATHS.map((item) => (
              <tr
                key={item.id}
                className={item.id === path ? "is-selected" : undefined}
              >
                <td>{item.label}</td>
                <td>{fmt(workAlong(input, item.id), 1)}</td>
                <td>{fmt(heatAlong(input, item.id), 1)}</td>
                <td className='is-same'>{fmt(dU, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className='hint'>
        State 1 is fixed at 6 bar and 0.10 m³. ΔU = (p₂V₂ − p₁V₁) / (γ − 1) with
        γ = 1.4, the same on every row.
      </p>
    </div>
  );
}
