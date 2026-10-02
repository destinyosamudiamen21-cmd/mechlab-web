import { useState } from "react";
import * as THREE from "three";
import { solveChannel } from "./shearcentre/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import {
  ACCENT,
  AMBER,
  AMBER_TEXT,
  INK,
  SOFT,
  clamp,
  fmt,
} from "./shared/theme";

const DEFAULTS = { x: 0, v: 5, b: 100, h: 200, t: 8 };
const LENGTH = 1; // m
const SHOWN_TWIST = 5; // the 3D model shows the twist this many times larger

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a channel (C-shaped) beam sticks out from a wall. A vertical load hangs from its end, exactly in line with the web. Does the beam twist?",
  options: [
    "No. The load is in line with the web, so it only bends",
    "Yes. It twists as well as bends",
    "Only if the load is very large",
  ],
  correct: 1,
  explain:
    "It twists. The shear flowing along the two flanges makes a couple, and a load on the web does nothing to balance it. Only a load through the shear centre, a point OUTSIDE the channel behind the web, bends the beam without twisting. Drag the load position until the twist disappears.",
};

type SceneState = {
  b: number;
  h: number;
  t: number;
  e: number;
  x: number;
  twist: number;
};

const SLICES = 24;
const BEAM = 3.4; // drawn length
const UNIT = 0.008; // drawing units per mm

// A channel cantilever built from thin slices. Each slice turns about the shear centre line,
// a little more than the one before it, which is what twisting looks like.
const setup: SceneSetup<SceneState> = (scene) => {
  const steel = solid(0x8fa3bd, { metalness: 0.35 });
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 3.2, 0.2),
    solid(0x3a4658)
  );
  wall.position.set(0.2, 0, -0.1);
  scene.add(wall);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const slices = Array.from({ length: SLICES }, (_, index) => {
    const group = new THREE.Group(); // sits on the shear centre line
    const web = new THREE.Mesh(box, steel);
    const top = new THREE.Mesh(box, steel);
    const bottom = new THREE.Mesh(box, steel);
    group.add(web, top, bottom);
    group.position.z = ((index + 0.5) * BEAM) / SLICES;
    scene.add(group);
    return { group, web, top, bottom };
  });

  const load = arrow(0x16202e, 0.05); // the hanging load stays vertical while the beam turns
  load.aim(0, -1, 0);
  load.setLength(0.9);
  scene.add(load.object);
  const arm = new THREE.Mesh(box, solid(0x3a4658));
  const centre = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 12),
    solid(0xf2a900)
  );
  const end = new THREE.Group(); // the bracket and the shear centre marker, fixed to the free end
  end.add(arm, centre);
  end.position.z = BEAM;
  scene.add(end);
  // The line the beam twists about: the shear centres of all the sections.
  const axis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, BEAM, 8),
    solid(0xf2a900)
  );
  axis.rotation.x = Math.PI / 2;
  axis.position.z = BEAM / 2;
  scene.add(axis);

  return (state) => {
    const b = state.b * UNIT,
      h = state.h * UNIT,
      t = Math.max(0.03, state.t * UNIT),
      e = state.e * UNIT;
    const depth = BEAM / SLICES;
    slices.forEach(({ group, web, top, bottom }, index) => {
      const along = (index + 0.5) / SLICES;
      // The children are placed relative to the shear centre, which is e behind the web.
      web.scale.set(t, h + t, depth);
      web.position.set(e, 0, 0);
      top.scale.set(b, t, depth);
      top.position.set(e + b / 2, h / 2, 0);
      bottom.scale.set(b, t, depth);
      bottom.position.set(e + b / 2, -h / 2, 0);
      group.position.x = -e;
      group.rotation.z = -state.twist * along;
    });
    axis.position.x = -e;
    // The bracket turns with the end of the beam.
    end.position.x = -e;
    end.rotation.z = -state.twist;
    const x = state.x * UNIT + e; // load position measured from the shear centre
    const y = h / 2 + 0.08;
    const left = Math.min(x, e),
      right = Math.max(x, e + b);
    arm.scale.set(right - left + 0.04, 0.04, 0.06);
    arm.position.set((left + right) / 2, y, 0);
    // Where the load's point on the bracket has moved to after the turn.
    const turn = -state.twist;
    load.object.position.set(
      -e + x * Math.cos(turn) - y * Math.sin(turn),
      x * Math.sin(turn) + y * Math.cos(turn) + 0.9,
      BEAM
    );
  };
};
const VIEW = {
  position: [5.6, 2.4, 6.6] as [number, number, number],
  target: [0.3, 0, 1.6] as [number, number, number],
};

// 2D drawing of the section: 0.55 px per mm, web centre-line at x = 170.
const SCALE = 0.55;
const WEB = 170;
const CY = 140;

export default function ShearCentre(_props: { topicSlug: string }) {
  const [x, setX] = useState(DEFAULTS.x);
  const [v, setV] = useState(DEFAULTS.v);
  const [b, setB] = useState(DEFAULTS.b);
  const [h, setH] = useState(DEFAULTS.h);
  const [t, setT] = useState(DEFAULTS.t);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const result = solveChannel({ b, h, tf: t, tw: t, v, x, length: LENGTH });
  const shownTwist =
    (clamp(result.twist * SHOWN_TWIST, -60, 60) * Math.PI) / 180;
  const noTwist = Math.abs(result.twist) < 0.05;

  const top = CY - (h / 2) * SCALE;
  const bottom = CY + (h / 2) * SCALE;
  const tip = WEB + b * SCALE;
  const centreX = WEB - result.e * SCALE;
  const loadX = WEB + x * SCALE;
  const wall = Math.max(3, t * SCALE);

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
            aria-label={`Channel section. The shear centre is ${fmt(
              result.e,
              1
            )} millimetres behind the web. The load is ${fmt(
              Math.abs(x + result.e),
              1
            )} millimetres from it, giving a twist of ${fmt(
              result.twist,
              2
            )} degrees.`}
          >
            {/* the channel */}
            <path
              d={`M${tip} ${top} H${WEB} V${bottom} H${tip}`}
              fill='none'
              stroke={INK}
              strokeWidth={wall}
              strokeLinejoin='miter'
            />
            {/* shear flow directions: in along the top flange, down the web, out along the bottom flange */}
            <path
              d={`M${tip - 8} ${top + wall / 2 + 9} H${WEB + 22}`}
              stroke={ACCENT}
              strokeWidth='2'
              fill='none'
            />
            <path
              d={`M${WEB + 16} ${top + wall / 2 + 9} l9 -5 v10 z`}
              fill={ACCENT}
            />
            <path
              d={`M${WEB + 22} ${bottom - wall / 2 - 9} H${tip - 14}`}
              stroke={ACCENT}
              strokeWidth='2'
              fill='none'
            />
            <path
              d={`M${tip - 8} ${bottom - wall / 2 - 9} l-9 -5 v10 z`}
              fill={ACCENT}
            />
            <path
              d={`M${WEB + wall / 2 + 9} ${CY - 22} V${CY + 16}`}
              stroke={ACCENT}
              strokeWidth='2'
              fill='none'
            />
            <path
              d={`M${WEB + wall / 2 + 9} ${CY + 22} l-5 -9 h10 z`}
              fill={ACCENT}
            />
            <text
              x={tip + 8}
              y={top + wall / 2 + 13}
              fontSize='11'
              fill={ACCENT}
            >
              F = {fmt(result.flangeForce)} kN
            </text>
            <text
              x={tip + 8}
              y={bottom - wall / 2 - 5}
              fontSize='11'
              fill={ACCENT}
            >
              F
            </text>

            {/* centroid and shear centre */}
            <line
              x1='30'
              y1={CY}
              x2='330'
              y2={CY}
              stroke={SOFT}
              strokeDasharray='8 3 2 3'
            />
            <circle
              cx={WEB + result.centroid * SCALE}
              cy={CY}
              r='3.5'
              fill={SOFT}
            />
            <text
              x={WEB + result.centroid * SCALE + 4}
              y={CY + 15}
              fontSize='11'
              fill={SOFT}
            >
              G
            </text>
            <circle
              cx={centreX}
              cy={CY}
              r='6'
              fill={AMBER}
              stroke={INK}
              strokeWidth='1.5'
            />
            <text
              x={centreX}
              y={CY + 22}
              fontSize='12'
              fontWeight='600'
              fill={AMBER_TEXT}
              textAnchor='middle'
            >
              S
            </text>
            <path
              d={`M${centreX} ${bottom + 22} H${WEB} M${centreX} ${
                bottom + 17
              } v10 M${WEB} ${bottom + 17} v10`}
              stroke={AMBER_TEXT}
              strokeWidth='1.2'
              fill='none'
            />
            <text
              x={(centreX + WEB) / 2}
              y={bottom + 38}
              fontSize='11'
              fill={AMBER_TEXT}
              textAnchor='middle'
            >
              e = {fmt(result.e, 1)}
            </text>

            {/* the load */}
            <line
              x1={loadX}
              y1={top - 44}
              x2={loadX}
              y2={top - 14}
              stroke={INK}
              strokeWidth='2.5'
            />
            <path d={`M${loadX} ${top - 6} l-6 -11 h12 z`} fill={INK} />
            <text
              x={loadX}
              y={top - 50}
              fontSize='12'
              fontWeight='600'
              fill={INK}
              textAnchor='middle'
            >
              V = {fmt(v, 1)} kN
            </text>
            <line
              x1={loadX}
              y1={top - 6}
              x2={loadX}
              y2={bottom + 8}
              stroke={INK}
              strokeDasharray='2 4'
              strokeOpacity='0.5'
            />
            <text
              x='352'
              y='262'
              fontSize='12'
              fontWeight='600'
              fill={noTwist ? "#1a7f37" : INK}
              textAnchor='end'
            >
              {noTwist
                ? "no twist: load through S"
                : `twists ${fmt(Math.abs(result.twist), 2)}° ${
                    result.twist > 0 ? "clockwise" : "anticlockwise"
                  }`}
            </text>
          </svg>
          <figcaption>
            Looking at the end of the beam. S is the shear centre, G the
            centroid. The blue arrows are the shear in the walls: the two flange
            forces F form a couple that the load must balance.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{ b, h, t, e: result.e, x, twist: shownTwist }}
              view={VIEW}
              label='Channel cantilever twisting under an end load'
            />
            <figcaption>
              The beam from the side (drag to turn). Twist is drawn{" "}
              {SHOWN_TWIST} times larger. The amber line runs through the shear
              centres: the beam turns about it.
            </figcaption>
          </figure>
          <div className='controls'>
            <Slider
              id='sc-x'
              label='Load position, from the web'
              display={`${fmt(x, 1)} mm`}
              min={-80}
              max={150}
              step={0.5}
              value={x}
              disabled={locked}
              onChange={setX}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setX(0)}
              >
                Through the web
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setX(Math.round(result.centroid * 2) / 2)}
              >
                Through G
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setX(-result.e)}
              >
                Through S
              </button>
            </div>
            <Slider
              id='sc-v'
              label='Load V'
              display={`${fmt(v, 1)} kN`}
              min={1}
              max={10}
              step={0.5}
              value={v}
              disabled={locked}
              onChange={setV}
            />
            <Slider
              id='sc-b'
              label='Flange width b'
              display={`${fmt(b, 0)} mm`}
              min={50}
              max={150}
              step={5}
              value={b}
              disabled={locked}
              onChange={setB}
            />
            <Slider
              id='sc-h'
              label='Web height h'
              display={`${fmt(h, 0)} mm`}
              min={100}
              max={300}
              step={10}
              value={h}
              disabled={locked}
              onChange={setH}
            />
            <Slider
              id='sc-t'
              label='Wall thickness t'
              display={`${fmt(t, 0)} mm`}
              min={4}
              max={12}
              step={1}
              value={t}
              disabled={locked}
              onChange={setT}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setX(DEFAULTS.x);
                  setV(DEFAULTS.v);
                  setB(DEFAULTS.b);
                  setH(DEFAULTS.h);
                  setT(DEFAULTS.t);
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
              "Shear centre, e = 3b² / (h + 6b)   (same thickness all round)",
            value: (
              <>
                3 × {fmt(b, 0)}² / ({fmt(h, 0)} + 6 × {fmt(b, 0)}) ={" "}
                <b>{fmt(result.e, 1)} mm</b> behind the web
              </>
            ),
          },
          {
            label: "Force in each flange, F = V b² h t / 4I",
            value: (
              <>
                <b>{fmt(result.flangeForce)} kN</b>, and F × h = V × e
              </>
            ),
          },
          {
            label: "Twisting moment, T = V × (distance from S)",
            value: (
              <>
                {fmt(v, 1)} × {fmt(Math.abs(x + result.e), 1)} mm ={" "}
                <b>{fmt(Math.abs(result.torque), 1)} N m</b>
              </>
            ),
          },
          {
            label: "Torsion constant of the open section, J = Σ b t³ / 3",
            value: <b>{fmt(result.j / 1e3, 1)} × 10³ mm⁴</b>,
          },
          {
            label: "Twist at the free end, θ = T L / G J",
            value: (
              <>
                <b>{fmt(Math.abs(result.twist), 2)}°</b> over {LENGTH} m of
                steel (G = 80 GPa)
              </>
            ),
          },
          {
            label: "Centroid G, from the web",
            value: (
              <>
                <b>{fmt(result.centroid, 1)} mm</b> on the flange side. Loading
                through G still twists the beam.
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
