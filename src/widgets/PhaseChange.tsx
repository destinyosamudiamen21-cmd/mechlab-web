import { useState } from "react";
import * as THREE from "three";
import { Q_TO_BOIL, Q_TO_DRY, V_F, V_G, stateAfter } from "./phase/solver";
import type { Phase } from "./phase/solver";
import Plot from "./shared/Plot";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Scene3D, { solid } from "./shared/Scene3D";
import type { SceneSetup } from "./shared/Scene3D";
import Slider from "./shared/Slider";
import { ACCENT, AMBER, INK, SOFT, fmt } from "./shared/theme";

const PHASE_TEXT: Record<Phase, string> = {
  liquid: "Compressed (subcooled) liquid: all water, warming up",
  wet: "Wet steam: liquid and vapour together, boiling at constant temperature",
  superheated: "Superheated steam: all vapour, getting hotter",
};

// The saturation dome, drawn from standard saturation data so its shape is right.
// It is a picture, not a table: read real values from your steam tables.
const DOME: [number, number][] = [
  [0.001012, 50],
  [0.001044, 100],
  [0.001091, 150],
  [0.001157, 200],
  [0.001251, 250],
  [0.001404, 300],
  [0.00174, 350],
  [0.003155, 374],
  [0.008813, 350],
  [0.02167, 300],
  [0.05013, 250],
  [0.1274, 200],
  [0.3928, 150],
  [1.673, 100],
  [12.03, 50],
];

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: water is boiling in an open pot at 1 atm. You turn the flame up. What happens to the temperature of the water while it is still boiling?",
  options: ["It stays at 100 °C", "It rises above 100 °C", "It falls a little"],
  correct: 0,
  explain:
    "While liquid and vapour exist together at a fixed pressure, the temperature is fixed at the saturation temperature. Extra heat makes more steam, not hotter water. Drag the heat slider through the boiling region and watch T.",
};

type SceneState = { liquid: number; vapour: number };

// Liquid and vapour columns under a piston. Heights are a sketch: real steam at 1 atm
// takes about 1600 times the volume of the water it came from.
const setup: SceneSetup<SceneState> = (scene) => {
  const metal = solid(0x3a4658, { metalness: 0.4 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 2.9), metal);
  base.position.y = -0.07;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 3.3, 48, 1, true),
    solid(0x9fc3ff, { opacity: 0.2 })
  );
  tube.position.y = 1.65;
  tube.renderOrder = 3;
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.97, 0.97, 1, 48),
    solid(0x1f6feb, { opacity: 0.8 })
  );
  liquid.renderOrder = 1;
  const vapour = new THREE.Mesh(
    new THREE.CylinderGeometry(0.97, 0.97, 1, 48),
    solid(0xdfe9f7, { opacity: 0.55 })
  );
  vapour.renderOrder = 2;
  const piston = new THREE.Mesh(
    new THREE.CylinderGeometry(0.97, 0.97, 0.16, 48),
    metal.clone()
  );
  const weight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.3, 32),
    metal.clone()
  );
  scene.add(base, tube, liquid, vapour, piston, weight);

  return (state) => {
    const liquidHeight = Math.max(0.001, state.liquid);
    const vapourHeight = Math.max(0.001, state.vapour);
    liquid.visible = state.liquid > 0.002;
    vapour.visible = state.vapour > 0.002;
    liquid.scale.y = liquidHeight;
    liquid.position.y = liquidHeight / 2;
    vapour.scale.y = vapourHeight;
    vapour.position.y = state.liquid + vapourHeight / 2;
    piston.position.y = state.liquid + state.vapour + 0.08;
    weight.position.y = state.liquid + state.vapour + 0.31;
  };
};
const VIEW = {
  position: [5.4, 4.0, 6.4] as [number, number, number],
  target: [0, 1.6, 0] as [number, number, number],
};

export default function PhaseChange(_props: { topicSlug: string }) {
  const [heat, setHeat] = useState(0);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  const state = stateAfter(heat);
  const x = state.x ?? (state.phase === "liquid" ? 0 : 1);
  // Sketch heights: the liquid column shrinks as it boils away, the vapour column grows.
  const liquid = 0.6 * (1 - x);
  const vapour =
    state.phase === "liquid"
      ? 0
      : 0.3 +
        1.7 * x +
        (state.phase === "superheated"
          ? 0.5 * Math.min(1, (state.t - 100) / 300)
          : 0);

  const logV = (v: number) => Math.log10(v);
  // The constant-pressure line the water follows: up the liquid side, across the dome, then up again.
  const path: [number, number][] = [
    [V_F, 20],
    [V_F, 100],
    [V_G, 100],
    ...[150, 200, 300, 400, 460].map((t): [number, number] => [
      (V_G * (t + 273.15)) / 373.15,
      t,
    ]),
  ];

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
            x={[-3.3, 1.2]}
            y={[0, 480]}
            xTicks={[-3, -2, -1, 0, 1]}
            yTicks={[100, 200, 300, 400]}
            xLabel='specific volume v (m³/kg), log scale'
            yLabel='T (°C)'
            edgeAxes
            xTickFormat={(exponent) => String(10 ** exponent)}
            label={`Temperature against specific volume for water at 1 atm. Now: ${
              PHASE_TEXT[state.phase]
            }.`}
          >
            {(sx, sy) => (
              <>
                <polyline
                  points={DOME.map(([v, t]) => `${sx(logV(v))},${sy(t)}`).join(
                    " "
                  )}
                  fill='none'
                  stroke={SOFT}
                  strokeWidth='1.5'
                  strokeDasharray='5 4'
                />
                <polyline
                  points={path
                    .map(([v, t]) => `${sx(logV(v))},${sy(t)}`)
                    .join(" ")}
                  fill='none'
                  stroke={INK}
                  strokeWidth='2'
                />
                <text
                  x={sx(-2.2)}
                  y={sy(250)}
                  fontSize='12'
                  fill={SOFT}
                  textAnchor='middle'
                >
                  wet region
                </text>
                <text
                  x={sx(-3.05)}
                  y={sy(210)}
                  fontSize='12'
                  fill={SOFT}
                  textAnchor='start'
                  transform={`rotate(-90 ${sx(-3.05)} ${sy(210)})`}
                >
                  liquid
                </text>
                <text
                  x={sx(0.75)}
                  y={sy(250)}
                  fontSize='12'
                  fill={SOFT}
                  textAnchor='middle'
                >
                  superheated
                </text>
                <text
                  x={sx(logV(0.003155))}
                  y={sy(388)}
                  fontSize='11'
                  fill={SOFT}
                  textAnchor='middle'
                >
                  critical point
                </text>
                <line
                  x1={sx(logV(state.v))}
                  y1={sy(state.t)}
                  x2={sx(logV(state.v))}
                  y2={sy(0)}
                  stroke={ACCENT}
                  strokeDasharray='4 4'
                />
                <circle
                  cx={sx(logV(state.v))}
                  cy={sy(state.t)}
                  r='6'
                  fill={AMBER}
                  stroke={INK}
                  strokeWidth='1.5'
                />
              </>
            )}
          </Plot>
          <figcaption>
            <span className='caption-strong'>{PHASE_TEXT[state.phase]}.</span>{" "}
            The dashed dome separates liquid, wet steam and superheated steam.
            The solid line is heating at 1 atm.
          </figcaption>
        </figure>

        <div className='widget-side'>
          <figure className='widget-figure'>
            <Scene3D
              setup={setup}
              state={{ liquid, vapour }}
              view={VIEW}
              label='Water and steam under a weighted piston'
            />
            <figcaption>
              Blue is liquid, pale is vapour. The weighted piston keeps the
              pressure at 1 atm. Heights are a sketch: real steam takes about
              1600 times the volume.
            </figcaption>
          </figure>
          <div className='controls'>
            <Slider
              id='phase-heat'
              label='Heat added, per kg'
              display={`${fmt(heat, 0)} kJ`}
              min={0}
              max={3300}
              step={10}
              value={heat}
              disabled={locked}
              onChange={setHeat}
            />
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setHeat(Math.round(Q_TO_BOIL))}
              >
                Start of boiling
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() =>
                  setHeat(Math.round(Q_TO_BOIL + (Q_TO_DRY - Q_TO_BOIL) / 2))
                }
              >
                Half boiled
              </button>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => setHeat(0)}
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
          { label: "Temperature", value: <b>{fmt(state.t, 1)} °C</b> },
          {
            label: "Dryness fraction, x = mass of vapour / total mass",
            value:
              state.x === null ? (
                "not defined outside the wet region"
              ) : (
                <b>{fmt(state.x, 3)}</b>
              ),
          },
          {
            label: (
              <>
                Specific volume
                {state.phase === "wet" ? (
                  <>
                    , v = v<sub>f</sub> + x(v<sub>g</sub> − v<sub>f</sub>)
                  </>
                ) : null}
              </>
            ),
            value: <b>{fmt(state.v, state.v < 0.1 ? 5 : 3)} m³/kg</b>,
          },
          {
            label: (
              <>
                Specific enthalpy
                {state.phase === "wet" ? (
                  <>
                    , h = h<sub>f</sub> + x h<sub>fg</sub>
                  </>
                ) : null}
              </>
            ),
            value: <b>{fmt(state.h, 1)} kJ/kg</b>,
          },
        ]}
      />
      <p className='hint'>
        Saturation values at 1 atm: v<sub>f</sub> = 0.001044, v<sub>g</sub> =
        1.673 m³/kg, h<sub>f</sub> = 419.0, h<sub>fg</sub> = 2257.0 kJ/kg. The
        superheated part uses c<sub>p</sub> ≈ 2.0 kJ/kg K, an approximation. For
        exam work, read values from your steam tables.
      </p>
    </div>
  );
}
