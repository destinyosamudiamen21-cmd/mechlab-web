import { useState } from "react";
import * as THREE from "three";
import {
  deflectionAt,
  momentAt,
  rectangleI,
  solveDeflection,
  stiffness,
} from "./deflection/solver";
import type { BeamCase } from "./deflection/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import {
  ACCENT,
  AMBER,
  AMBER_TEXT,
  INK,
  SOFT,
  STEEL,
  fmt,
} from "./shared/theme";

const WIDTH = 50; // mm, breadth of the rectangular section
const CASES: { id: BeamCase; label: string }[] = [
  { id: "ss-point", label: "Supported, point load" },
  { id: "ss-udl", label: "Supported, spread load" },
  { id: "cant-point", label: "Cantilever, end load" },
  { id: "cant-udl", label: "Cantilever, spread load" },
];
type MaterialId = "steel" | "aluminium" | "timber";
const MATERIALS: { id: MaterialId; label: string; e: number }[] = [
  { id: "steel", label: "Steel", e: 200 },
  { id: "aluminium", label: "Aluminium", e: 70 },
  { id: "timber", label: "Timber", e: 12 },
];
const DEFAULTS = {
  kind: "ss-point" as BeamCase,
  load: 10,
  span: 2,
  h: 100,
  material: "steel" as MaterialId,
};

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a simply supported beam carries a load at mid-span. You double the span and keep everything else the same. The deflection at the middle becomes…",
  options: ["2 times larger", "4 times larger", "8 times larger"],
  correct: 2,
  explain:
    "Eight times. The deflection is P L³ / 48 E I, so it goes with the cube of the span. Depth works the other way: I = b h³ / 12, so doubling the depth cuts the deflection to one eighth. Try both sliders and watch the number.",
};

const SLICES = 40;
const BEAM = 4;
type SceneState = {
  kind: BeamCase;
  shape: number[];
  amplitude: number;
  depth: number;
};

// The beam as 40 short blocks that follow the deflection curve. Each block also tilts to the
// slope of the curve, which is what "plane sections stay plane" looks like.
const setup: SceneSetup<SceneState> = (scene) => {
  const box = new THREE.BoxGeometry(BEAM / SLICES, 1, 0.6);
  const slices = Array.from({ length: SLICES }, () => {
    const mesh = new THREE.Mesh(box, solid(0x8fa3bd, { metalness: 0.35 }));
    scene.add(mesh);
    return mesh;
  });
  const dark = solid(0x3a4658);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 1.8), dark);
  wall.position.x = -BEAM / 2 - 0.125;
  const pyramid = new THREE.ConeGeometry(0.28, 0.4, 4);
  const supports = [-BEAM / 2, BEAM / 2].map((x) => {
    const mesh = new THREE.Mesh(pyramid, dark);
    mesh.position.x = x;
    mesh.rotation.y = Math.PI / 4;
    return mesh;
  });
  scene.add(wall, ...supports);
  const point = arrow(0xf2a900, 0.05);
  point.aim(0, -1, 0);
  point.setLength(0.9);
  const spread = Array.from({ length: 9 }, () => {
    const one = arrow(0xf2a900, 0.03);
    one.aim(0, -1, 0);
    one.setLength(0.5);
    scene.add(one.object);
    return one;
  });
  scene.add(point.object);

  return (state) => {
    const cantilever = state.kind.startsWith("cant");
    const depth = state.depth;
    const node = (index: number) => -state.amplitude * state.shape[index];
    const dx = BEAM / SLICES;
    slices.forEach((mesh, index) => {
      mesh.scale.y = depth;
      mesh.position.set(
        -BEAM / 2 + (index + 0.5) * dx,
        (node(index) + node(index + 1)) / 2,
        0
      );
      mesh.rotation.z = Math.atan2(node(index + 1) - node(index), dx);
    });
    wall.visible = cantilever;
    for (const support of supports) {
      support.visible = !cantilever;
      support.position.y = -depth / 2 - 0.2;
    }
    const topAt = (fraction: number) =>
      node(Math.round(fraction * SLICES)) + depth / 2;
    const udl = state.kind.endsWith("udl");
    point.object.visible = !udl;
    const where = cantilever ? 1 : 0.5;
    point.object.position.set(-BEAM / 2 + where * BEAM, topAt(where) + 0.9, 0);
    spread.forEach((one, index) => {
      const fraction = (index + 0.5) / spread.length;
      one.object.visible = udl;
      one.object.position.set(
        -BEAM / 2 + fraction * BEAM,
        topAt(fraction) + 0.5,
        0
      );
    });
  };
};
const VIEW = {
  position: [2.6, 2.4, 8.2] as [number, number, number],
  target: [0, -0.2, 0] as [number, number, number],
};

// 2D drawing: the beam runs from x = 40 to x = 320.
const X0 = 40;
const X1 = 320;

export default function BeamDeflection(_props: { topicSlug: string }) {
  const [kind, setKind] = useState(DEFAULTS.kind);
  const [load, setLoad] = useState(DEFAULTS.load);
  const [span, setSpan] = useState(DEFAULTS.span);
  const [h, setH] = useState(DEFAULTS.h);
  const [material, setMaterial] = useState(DEFAULTS.material);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const e = (MATERIALS.find((item) => item.id === material) ?? MATERIALS[0]).e;
  const i = rectangleI(WIDTH, h);
  const input = { kind, load, span, e, i };
  const result = solveDeflection(input);
  const cantilever = kind.startsWith("cant");
  const udl = kind.endsWith("udl");
  const unit = udl ? "kN/m" : "kN";

  // Both curves as fractions of their largest value, so the drawing always fits.
  const stations = Array.from(
    { length: SLICES + 1 },
    (_, index) => index / SLICES
  );
  const shape = stations.map((s) => deflectionAt(input, s * span) / result.max);
  const moments = stations.map(
    (s) => momentAt(input, s * span) / result.moment
  );
  const px = (s: number) => X0 + s * (X1 - X0);
  const amplitude = 1.1 * (1 - Math.exp(-result.max / 20)); // how far the 3D model sags (not to scale)
  const sag = 12 + 30 * (1 - Math.exp(-result.max / 20)); // and the 2D sketch
  const maxX = px(result.maxAt / span);

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
            aria-label={`Loading diagram, bending moment diagram and deflected shape. Largest moment ${fmt(
              result.moment,
              1
            )} kilonewton metres, largest deflection ${fmt(
              result.max
            )} millimetres.`}
          >
            {/* 1: the beam and its load */}
            <rect x={X0} y='46' width={X1 - X0} height='8' fill={STEEL} />
            {cantilever ? (
              <path
                d='M40 22 V78 M40 26 l-8 8 M40 38 l-8 8 M40 50 l-8 8 M40 62 l-8 8 M40 74 l-8 8'
                stroke={INK}
                strokeWidth='2'
                fill='none'
              />
            ) : (
              <>
                <path
                  d={`M${X0} 54 l-9 14 h18 z`}
                  fill='none'
                  stroke={INK}
                  strokeWidth='1.8'
                />
                <path
                  d={`M${X1} 54 l-9 14 h18 z`}
                  fill='none'
                  stroke={INK}
                  strokeWidth='1.8'
                />
              </>
            )}
            {udl ? (
              <>
                <line
                  x1={X0}
                  y1='24'
                  x2={X1}
                  y2='24'
                  stroke={AMBER_TEXT}
                  strokeWidth='1.5'
                />
                {Array.from({ length: 11 }, (_, index) => {
                  const x = X0 + (index * (X1 - X0)) / 10;
                  return (
                    <path
                      key={index}
                      d={`M${x} 24 V40 M${x} 45 l-3.5 -7 h7 z`}
                      stroke={AMBER_TEXT}
                      strokeWidth='1.5'
                      fill={AMBER_TEXT}
                    />
                  );
                })}
                <text
                  x='180'
                  y='18'
                  fontSize='12'
                  fontWeight='600'
                  fill={AMBER_TEXT}
                  textAnchor='middle'
                >
                  w = {fmt(load, 0)} kN/m
                </text>
              </>
            ) : (
              <>
                <path
                  d={`M${cantilever ? X1 : 180} 14 V38 M${
                    cantilever ? X1 : 180
                  } 45 l-5 -10 h10 z`}
                  stroke={AMBER_TEXT}
                  strokeWidth='2.5'
                  fill={AMBER_TEXT}
                />
                <text
                  x={cantilever ? X1 - 8 : 188}
                  y='22'
                  fontSize='12'
                  fontWeight='600'
                  fill={AMBER_TEXT}
                  textAnchor={cantilever ? "end" : "start"}
                >
                  P = {fmt(load, 0)} kN
                </text>
              </>
            )}
            <text x='180' y='84' fontSize='11' fill={SOFT} textAnchor='middle'>
              L = {fmt(span, 1)} m
            </text>

            {/* 2: bending moment diagram */}
            <text x='8' y='112' fontSize='11' fill={SOFT}>
              M
            </text>
            <polygon
              points={`${X0},118 ${stations
                .map((s, index) => `${px(s)},${118 + moments[index] * 44}`)
                .join(" ")} ${X1},118`}
              fill={ACCENT}
              fillOpacity='0.18'
              stroke={ACCENT}
              strokeWidth='1.5'
            />
            <line
              x1={X0}
              y1='118'
              x2={X1}
              y2='118'
              stroke={INK}
              strokeWidth='1.2'
            />
            <text
              x={cantilever ? X0 + 8 : 180}
              y='176'
              fontSize='11'
              fill={ACCENT}
              textAnchor={cantilever ? "start" : "middle"}
            >
              largest {fmt(result.moment, 1)} kN m
            </text>

            {/* 3: the deflected shape */}
            <text x='8' y='200' fontSize='11' fill={SOFT}>
              y
            </text>
            <line
              x1={X0}
              y1='204'
              x2={X1}
              y2='204'
              stroke={SOFT}
              strokeDasharray='5 4'
            />
            <polyline
              points={stations
                .map((s, index) => `${px(s)},${204 + shape[index] * sag}`)
                .join(" ")}
              fill='none'
              stroke={INK}
              strokeWidth='3'
              strokeLinecap='round'
            />
            <circle
              cx={maxX}
              cy={204 + sag}
              r='5'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <text
              x={maxX}
              y={204 + sag + 19}
              fontSize='12'
              fontWeight='600'
              fill={AMBER_TEXT}
              textAnchor={cantilever ? "end" : "middle"}
            >
              {fmt(result.max)} mm
            </text>
          </svg>
          <figcaption>
            Top: the loading. Middle: the bending moment along the beam. Bottom:
            the deflected shape (not to scale), with the largest deflection
            marked.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{ kind, shape, amplitude, depth: 0.12 + (h / 300) * 0.4 }}
              view={VIEW}
              label='The beam bending under its load'
            />
            <figcaption>
              The same beam in 3D, sag exaggerated. Drag to turn it.
            </figcaption>
          </figure>
          <div className='controls'>
            <Segments
              label='Beam and load'
              options={CASES}
              value={kind}
              disabled={locked}
              columns={1}
              onChange={setKind}
            />
            <Slider
              id='defl-load'
              label={udl ? "Spread load w" : "Point load P"}
              display={`${fmt(load, 0)} ${unit}`}
              min={1}
              max={50}
              step={1}
              value={load}
              disabled={locked}
              onChange={setLoad}
            />
            <Slider
              id='defl-span'
              label='Span L'
              display={`${fmt(span, 1)} m`}
              min={1}
              max={6}
              step={0.5}
              value={span}
              disabled={locked}
              onChange={setSpan}
            />
            <Slider
              id='defl-h'
              label='Depth of section h'
              display={`${fmt(h, 0)} mm`}
              min={50}
              max={300}
              step={10}
              value={h}
              disabled={locked}
              onChange={setH}
            />
            <Segments
              label='Material'
              options={MATERIALS}
              value={material}
              disabled={locked}
              columns={3}
              onChange={setMaterial}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setLoad(DEFAULTS.load);
                  setSpan(DEFAULTS.span);
                  setH(DEFAULTS.h);
                  setMaterial(DEFAULTS.material);
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
            label: `Second moment of area, I = b h³ / 12  (b = ${WIDTH} mm)`,
            value: <b>{fmt(i / 1e6, 2)} × 10⁶ mm⁴</b>,
          },
          {
            label: `Flexural rigidity, E I  (E = ${e} GPa)`,
            value: <b>{fmt(stiffness(e, i), 0)} kN m²</b>,
          },
          {
            label: `Largest deflection = ${result.formula}`,
            value: (
              <>
                <b>{fmt(result.max)} mm</b>{" "}
                {cantilever ? "at the free end" : "at mid-span"}
              </>
            ),
          },
          {
            label: "Largest bending moment",
            value: <b>{fmt(result.moment, 1)} kN m</b>,
          },
          {
            label: cantilever
              ? "Slope at the free end"
              : "Slope at each support",
            value: <b>{fmt(result.slope, 3)}°</b>,
          },
          {
            label: "Span ÷ deflection",
            value: (
              <>
                <b>{fmt((span * 1000) / result.max, 0)}</b> (floors are often
                limited to about 360)
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
