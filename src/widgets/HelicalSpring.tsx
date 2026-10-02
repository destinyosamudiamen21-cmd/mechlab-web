import { useState } from "react";
import * as THREE from "three";
import { solveSpring } from "./spring/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { arrow, solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import { AMBER, INK, SOFT, fmt } from "./shared/theme";

const G = 80; // GPa, steel
const DEFAULTS = { w: 500, coil: 50, wire: 5, turns: 10 };
const MAX_SHOWN = 120; // mm, the 3D model stops stretching beyond this so it stays in view

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: you remake a spring with wire twice as thick, keeping the coil diameter and the number of coils the same. How much stiffer is it?",
  options: ["2 times", "8 times", "16 times"],
  correct: 2,
  explain:
    "Sixteen times. Stiffness k = G d⁴ / 8 D³ n, so it goes with the FOURTH power of the wire diameter. The coil diameter works the other way, cubed: a wider coil is much softer. The wire of a spring is really a long shaft being twisted, and d⁴ comes from the polar second moment of area of that shaft.",
};

type SceneState = {
  coil: number;
  wire: number;
  turns: number;
  stretch: number;
  load: number;
  unit: number;
};
const TOP = 2.9;

// A spring hanging from a plate, drawn in proportion (unit = drawing units per mm). The helix is rebuilt whenever a size changes.
const setup: SceneSetup<SceneState> = (scene) => {
  const dark = solid(0x3a4658);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.6), dark);
  plate.position.y = TOP + 0.06;
  const helix = new THREE.Mesh(
    new THREE.BufferGeometry(),
    solid(0x8fa3bd, { metalness: 0.5 })
  );
  const weight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32),
    dark
  );
  const pull = arrow(0xf2a900, 0.05);
  pull.aim(0, -1, 0);
  scene.add(plate, helix, weight, pull.object);

  return (state) => {
    const radius = (state.coil / 2) * state.unit;
    const wire = Math.max(0.02, (state.wire / 2) * state.unit);
    // Free length: coils spaced at 1.25 wire diameters. Then add the stretch.
    const length =
      (state.turns * 1.25 * state.wire + state.stretch) * state.unit;
    const steps = Math.round(state.turns * 24);
    const points = Array.from({ length: steps + 1 }, (_, index) => {
      const along = index / steps;
      const angle = along * state.turns * 2 * Math.PI;
      return new THREE.Vector3(
        radius * Math.cos(angle),
        TOP - along * length,
        radius * Math.sin(angle)
      );
    });
    helix.geometry.dispose();
    helix.geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      steps * 2,
      wire,
      8
    );
    weight.position.y = TOP - length - 0.15;
    weight.scale.x = weight.scale.z = Math.max(1, (radius * 1.2) / 0.5);
    pull.setLength(0.4 + state.load / 2000);
    pull.object.position.y = TOP - length - 0.3;
  };
};
const VIEW = {
  position: [3.4, 1.4, 10.6] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
};

export default function HelicalSpring(_props: { topicSlug: string }) {
  const [w, setW] = useState(DEFAULTS.w);
  const [coil, setCoil] = useState(DEFAULTS.coil);
  const [wire, setWire] = useState(DEFAULTS.wire);
  const [turns, setTurns] = useState(DEFAULTS.turns);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const result = solveSpring({ w, coil, wire, turns, g: G });
  const offChart = result.deflection > 200;
  // The straight line W = k δ, stopped where it leaves the chart.
  const lineEnd = Math.min(200, 1000 / result.stiffness);
  const shown = Math.min(result.deflection, 200);
  // Zoom so the longest this spring can get still fits the picture. Loading it does not change the zoom.
  const unit = Math.min(0.035, 4.6 / (turns * 1.25 * wire + MAX_SHOWN));

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
            x={[0, 200]}
            y={[0, 1000]}
            xTicks={[50, 100, 150, 200]}
            yTicks={[250, 500, 750, 1000]}
            xLabel='deflection δ (mm)'
            yLabel='load W (N)'
            label={`Load against deflection: a straight line of slope ${fmt(
              result.stiffness
            )} newtons per millimetre. Now ${fmt(w, 0)} newtons gives ${fmt(
              result.deflection,
              1
            )} millimetres.`}
          >
            {(sx, sy) => (
              <>
                {/* the area under the line up to the current load is the energy stored */}
                <polygon
                  points={`${sx(0)},${sy(0)} ${sx(shown)},${sy(
                    shown * result.stiffness
                  )} ${sx(shown)},${sy(0)}`}
                  fill={AMBER}
                  fillOpacity='0.3'
                />
                <line
                  x1={sx(0)}
                  y1={sy(0)}
                  x2={sx(lineEnd)}
                  y2={sy(lineEnd * result.stiffness)}
                  stroke={INK}
                  strokeWidth='2.5'
                />
                {!offChart && (
                  <>
                    <line
                      x1={sx(0)}
                      y1={sy(w)}
                      x2={sx(result.deflection)}
                      y2={sy(w)}
                      stroke={SOFT}
                      strokeDasharray='4 4'
                    />
                    <line
                      x1={sx(result.deflection)}
                      y1={sy(w)}
                      x2={sx(result.deflection)}
                      y2={sy(0)}
                      stroke={SOFT}
                      strokeDasharray='4 4'
                    />
                    <circle
                      cx={sx(result.deflection)}
                      cy={sy(w)}
                      r='6'
                      fill={AMBER}
                      stroke={INK}
                      strokeWidth='1.5'
                    />
                  </>
                )}
                <text
                  x={sx(196)}
                  y={sy(60)}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='end'
                >
                  shaded area = energy stored
                </text>
              </>
            )}
          </Plot>
          <figcaption>
            A spring obeys W = k δ: a straight line whose slope is the stiffness
            k. A steeper line is a stiffer spring.
            {offChart && (
              <span className='caption-strong'>
                {" "}
                This spring stretches {fmt(result.deflection, 0)} mm, off the
                right of the chart.
              </span>
            )}
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{
                coil,
                wire,
                turns,
                stretch: Math.min(result.deflection, MAX_SHOWN),
                load: w,
                unit,
              }}
              view={VIEW}
              label='The spring hanging from a plate with the load pulling it down'
            />
            <figcaption>
              The spring, drawn in proportion
              {result.deflection > MAX_SHOWN
                ? ` (stretch shown up to ${MAX_SHOWN} mm)`
                : ""}
              . Drag to turn it.
            </figcaption>
          </figure>
          <div className='controls'>
            <Slider
              id='spring-w'
              label='Load W'
              display={`${fmt(w, 0)} N`}
              min={50}
              max={1000}
              step={10}
              value={w}
              disabled={locked}
              onChange={setW}
            />
            <Slider
              id='spring-wire'
              label='Wire diameter d'
              display={`${fmt(wire, 1)} mm`}
              min={2}
              max={10}
              step={0.5}
              value={wire}
              disabled={locked}
              onChange={setWire}
            />
            <Slider
              id='spring-coil'
              label='Mean coil diameter D'
              display={`${fmt(coil, 0)} mm`}
              min={20}
              max={80}
              step={2}
              value={coil}
              disabled={locked}
              onChange={setCoil}
            />
            <Slider
              id='spring-n'
              label='Number of coils n'
              display={fmt(turns, 0)}
              min={4}
              max={15}
              step={1}
              value={turns}
              disabled={locked}
              onChange={setTurns}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => {
                  setW(DEFAULTS.w);
                  setCoil(DEFAULTS.coil);
                  setWire(DEFAULTS.wire);
                  setTurns(DEFAULTS.turns);
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
            label: "Torque twisting the wire, T = W D / 2",
            value: (
              <>
                {fmt(w, 0)} × {fmt(coil, 0)} / 2 ={" "}
                <b>{fmt(result.torque / 1000, 2)} N m</b>
              </>
            ),
          },
          {
            label: "Shear stress in the wire, τ = 8 W D / π d³",
            value: <b>{fmt(result.shear, 1)} MPa</b>,
          },
          {
            label: "Deflection, δ = 8 W D³ n / G d⁴",
            value: <b>{fmt(result.deflection, 1)} mm</b>,
          },
          {
            label: "Stiffness, k = W / δ = G d⁴ / 8 D³ n",
            value: <b>{fmt(result.stiffness)} N/mm</b>,
          },
          {
            label: "Energy stored, U = ½ W δ",
            value: <b>{fmt(result.energy)} J</b>,
          },
          {
            label: `Spring index C = D / d = ${fmt(
              result.index,
              1
            )}. With Wahl's correction (× ${fmt(result.wahl, 3)})`,
            value: (
              <>
                <b>{fmt(result.shearCorrected, 1)} MPa</b> at the inside of the
                coil
              </>
            ),
          },
        ]}
      />
      <p className='hint'>
        Close-coiled spring of steel wire, G = {G} GPa. The simple formulas
        treat the wire as a straight shaft in torsion; Wahl's factor corrects
        for its curvature.
      </p>
    </div>
  );
}
