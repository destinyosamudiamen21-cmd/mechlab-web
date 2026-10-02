import { useState } from "react";
import * as THREE from "three";
import {
  VOLUME_FRACTION,
  depthAt,
  rootDepth,
  surfaceStress,
  widthAt,
} from "./uniform/solver";
import type { Design } from "./uniform/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { AMBER, INK, SOFT, WARN, fmt } from "./shared/theme";

const WIDTH = 60; // mm, width at the wall
const DEFAULTS = { design: "prismatic" as Design, p: 2, length: 1, sigma: 120 };
const DESIGNS: { id: Design; label: string }[] = [
  { id: "prismatic", label: "Same section all along" },
  { id: "depth", label: "Depth varies (width fixed)" },
  { id: "width", label: "Width varies (depth fixed)" },
];

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a cantilever with the same cross-section all along carries a load at its free end. Where is the material stressed the most?",
  options: [
    "At the wall",
    "At the free end, under the load",
    "The same all along",
  ],
  correct: 0,
  explain:
    "At the wall. The bending moment is P × (distance from the load), so it is zero under the load and largest at the wall. In a beam of constant section most of the material is barely working. A beam of uniform strength removes that idle material so every section reaches the same stress.",
};

type SceneState = { design: Design };
const SLICES = 40;
const BEAM = 4;

// The cantilever as 40 slices. Each slice is sized by the chosen design and coloured by how hard
// it is working: grey = idle, amber = at the allowable stress.
const setup: SceneSetup<SceneState> = (scene) => {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 2.4, 2.4),
    solid(0x3a4658)
  );
  wall.position.x = -BEAM / 2 - 0.125;
  scene.add(wall);
  const box = new THREE.BoxGeometry(BEAM / SLICES, 1, 1);
  const slices = Array.from({ length: SLICES }, (_, index) => {
    const mesh = new THREE.Mesh(box, solid(0xf2a900));
    mesh.position.x = -BEAM / 2 + ((index + 0.5) * BEAM) / SLICES;
    scene.add(mesh);
    return mesh;
  });
  const load = arrow(0x16202e, 0.05);
  load.aim(0, -1, 0);
  load.setLength(0.9);
  scene.add(load.object);

  const idle = new THREE.Color(0xc9d2de);
  const working = new THREE.Color(0xf2a900);
  // A stand-in beam with easy numbers: only the proportions matter for the picture.
  const shape = { p: 1, length: 1, b: 1, sigma: 6000000 };
  return (state) => {
    slices.forEach((mesh, index) => {
      const fromWall = (index + 0.5) / SLICES;
      const x = 1 - fromWall; // the solver measures from the free end
      const depth = depthAt(state.design, shape, x) / rootDepth(shape);
      const width = widthAt(state.design, shape, x);
      mesh.scale.set(
        1,
        Math.max(0.03, depth * 0.9),
        Math.max(0.03, width * 1.1)
      );
      const used = surfaceStress(state.design, shape, x) / shape.sigma;
      mesh.material.color.copy(idle).lerp(working, Math.min(1, used));
    });
    const tipDepth = state.design === "depth" ? 0.05 : 0.45;
    load.object.position.set(BEAM / 2 - 0.05, tipDepth + 0.95, 0);
  };
};
const VIEW = {
  position: [3.2, 3.0, 7.4] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export default function UniformStrength(_props: { topicSlug: string }) {
  const [design, setDesign] = useState(DEFAULTS.design);
  const [p, setP] = useState(DEFAULTS.p);
  const [length, setLength] = useState(DEFAULTS.length);
  const [sigma, setSigma] = useState(DEFAULTS.sigma);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const input = { p, length, b: WIDTH, sigma };
  const h0 = rootDepth(input);
  const fullVolume = (WIDTH * h0 * length * 1000) / 1000; // cm³
  const fraction = VOLUME_FRACTION[design];
  const stations = Array.from({ length: 41 }, (_, index) => index / 40); // 0 at the free end, 1 at the wall
  const curve = (which: Design) =>
    stations.map(
      (s) => [s, surfaceStress(which, input, s * length)] as [number, number]
    );

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
            x={[0, 1]}
            y={[0, 200]}
            xTicks={[0.25, 0.5, 0.75, 1]}
            yTicks={[50, 100, 150, 200]}
            xLabel='position: free end (0) to wall (1)'
            yLabel='surface stress (MPa)'
            label={`Bending stress along the beam. The allowable stress is ${fmt(
              sigma,
              0
            )} megapascals.`}
          >
            {(sx, sy) => {
              const line = (points: [number, number][]) =>
                points.map(([s, stress]) => `${sx(s)},${sy(stress)}`).join(" ");
              return (
                <>
                  <line
                    x1={sx(0)}
                    y1={sy(sigma)}
                    x2={sx(1)}
                    y2={sy(sigma)}
                    stroke={WARN}
                    strokeDasharray='5 4'
                  />
                  <text
                    x={sx(0.02)}
                    y={sy(sigma) - 6}
                    fontSize='11'
                    fill={WARN}
                  >
                    allowable stress
                  </text>
                  <polygon
                    points={`${sx(0)},${sy(0)} ${line(curve(design))} ${sx(
                      1
                    )},${sy(0)}`}
                    fill={AMBER}
                    fillOpacity='0.3'
                  />
                  {design !== "prismatic" && (
                    <polyline
                      points={line(curve("prismatic"))}
                      fill='none'
                      stroke={SOFT}
                      strokeWidth='1.5'
                      strokeDasharray='4 4'
                    />
                  )}
                  <polyline
                    points={line(curve(design))}
                    fill='none'
                    stroke={INK}
                    strokeWidth='2.5'
                  />
                  {design !== "prismatic" && (
                    <text
                      x={sx(0.5)}
                      y={sy(sigma / 2) + 16}
                      fontSize='11'
                      fill={SOFT}
                    >
                      constant section
                    </text>
                  )}
                </>
              );
            }}
          </Plot>
          <figcaption>
            Stress at the top surface along the beam. Under the dashed limit the
            material is not fully used. A beam of uniform strength sits on the
            limit all the way.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{ design }}
              view={VIEW}
              label='Cantilever shaped by the chosen design, coloured by how hard each part is working'
            />
            <figcaption>
              Amber: working at the allowable stress. Grey: idle material. Drag
              to turn it and look from above.
            </figcaption>
          </figure>
          <div className='controls'>
            <Segments
              label='Design'
              options={DESIGNS}
              value={design}
              disabled={locked}
              columns={1}
              onChange={setDesign}
            />
            <Slider
              id='us-p'
              label='End load P'
              display={`${fmt(p, 1)} kN`}
              min={0.5}
              max={5}
              step={0.1}
              value={p}
              disabled={locked}
              onChange={setP}
            />
            <Slider
              id='us-l'
              label='Length L'
              display={`${fmt(length, 2)} m`}
              min={0.5}
              max={2}
              step={0.05}
              value={length}
              disabled={locked}
              onChange={setLength}
            />
            <Slider
              id='us-s'
              label='Allowable stress σ'
              display={`${fmt(sigma, 0)} MPa`}
              min={60}
              max={180}
              step={5}
              value={sigma}
              disabled={locked}
              onChange={setSigma}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setP(DEFAULTS.p);
                  setLength(DEFAULTS.length);
                  setSigma(DEFAULTS.sigma);
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
            label: "Depth needed at the wall, h = √(6PL / bσ)",
            value: (
              <>
                √(6 × {fmt(p, 1)} kN × {fmt(length, 2)} m / ({WIDTH} mm ×{" "}
                {fmt(sigma, 0)})) = <b>{fmt(h0, 1)} mm</b>
              </>
            ),
          },
          design === "depth"
            ? {
                label:
                  "Depth at x from the free end, h = √(6Px / bσ): a parabola",
                value: (
                  <>
                    at mid-length{" "}
                    <b>{fmt(depthAt("depth", input, length / 2), 1)} mm</b> (h ÷
                    √2)
                  </>
                ),
              }
            : design === "width"
            ? {
                label:
                  "Width at x from the free end, b = 6Px / h²σ: a triangle",
                value: (
                  <>
                    at mid-length{" "}
                    <b>{fmt(widthAt("width", input, length / 2), 1)} mm</b>{" "}
                    (half of {WIDTH})
                  </>
                ),
              }
            : {
                label:
                  "Stress at x from the free end, σ = 6Px / bh²: a straight line",
                value: (
                  <>
                    at mid-length{" "}
                    <b>
                      {fmt(surfaceStress("prismatic", input, length / 2), 1)}{" "}
                      MPa
                    </b>
                    , half the limit
                  </>
                ),
              },
          {
            label: "Material used",
            value: (
              <>
                <b>{fmt(fullVolume * fraction, 0)} cm³</b> (
                {design === "prismatic"
                  ? "the whole block"
                  : design === "depth"
                  ? "two thirds of the constant beam"
                  : "half of the constant beam"}
                )
              </>
            ),
          },
          {
            label: "Material saved",
            value: <b>{fmt((1 - fraction) * 100, 0)} %</b>,
          },
        ]}
      />
      <p className='hint'>
        Width at the wall is {WIDTH} mm. A real beam keeps some depth at the tip
        to carry the shear force. The width-varying design, cut into strips and
        stacked, is the leaf spring of a lorry.
      </p>
    </div>
  );
}
