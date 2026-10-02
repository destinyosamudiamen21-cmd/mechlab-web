import { useState } from "react";
import {
  heatSupplied,
  kinetic,
  nozzleExitVelocity,
  shaftWork,
} from "./sfee/solver";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Readout from "./shared/Readout";
import Segments from "./shared/Segments";
import Slider from "./shared/Slider";
import { ACCENT, GOOD, INK, SOFT, TINT, WARN, fmt } from "./shared/theme";

type DeviceId = "compressor" | "turbine" | "nozzle" | "heater" | "throttle";

type Device = {
  id: DeviceId;
  label: string;
  finds: string; // what the equation is solved for
  note: string;
  h1: number;
  h2: number;
  c1: number;
  c2: number;
  q: number;
  flow: number;
  hRange: [number, number];
};

// Each device is the same equation with different terms switched off.
const DEVICES: Device[] = [
  {
    id: "compressor",
    label: "Compressor",
    finds: "work input",
    note: "Exam 2013/14 Q5(a): 0.6 kg/s of air, cooled by a water jacket. Work goes in, heat comes out.",
    h1: 270,
    h2: 319,
    c1: 6,
    c2: 4.5,
    q: -83.3,
    flow: 0.6,
    hRange: [100, 500],
  },
  {
    id: "turbine",
    label: "Turbine",
    finds: "work output",
    note: "Exam 2013/14 Q5(b): 0.1 kg/s of air, no heat transfer. The enthalpy drop becomes shaft work.",
    h1: 425.6,
    h2: 286.4,
    c1: 0,
    c2: 0,
    q: 0,
    flow: 0.1,
    hRange: [100, 500],
  },
  {
    id: "nozzle",
    label: "Nozzle",
    finds: "exit velocity",
    note: "No work, no heat. The enthalpy drop becomes kinetic energy, so the fluid speeds up.",
    h1: 3000,
    h2: 2950,
    c1: 30,
    c2: 0,
    q: 0,
    flow: 1,
    hRange: [2700, 3100],
  },
  {
    id: "heater",
    label: "Boiler",
    finds: "heat supplied",
    note: "No work. The heat supplied goes into raising the enthalpy of the fluid.",
    h1: 200,
    h2: 2800,
    c1: 5,
    c2: 5,
    q: 0,
    flow: 1,
    hRange: [100, 3100],
  },
  {
    id: "throttle",
    label: "Throttle",
    finds: "exit enthalpy",
    note: "A valve or porous plug: no work, no heat, velocities about equal. So h₂ = h₁, whatever the pressure drop.",
    h1: 2800,
    h2: 2800,
    c1: 10,
    c2: 10,
    q: 0,
    flow: 1,
    hRange: [2700, 3100],
  },
];

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: steam is throttled through a partly closed valve from 10 bar to 1 bar. Which property is the same on both sides of the valve?",
  options: ["Its pressure", "Its enthalpy", "Its temperature"],
  correct: 1,
  explain:
    "A throttle does no work, is too quick for heat transfer, and barely changes the velocity. The steady flow energy equation then leaves h₁ = h₂. That is what “throttled” means in an exam question. Pick Throttle below to see the equation collapse.",
};

export default function SteadyFlow(_props: { topicSlug: string }) {
  const [deviceId, setDeviceId] = useState<DeviceId>("compressor");
  const [values, setValues] = useState(DEVICES[0]);
  const [predicted, setPredicted] = useState<number | null>(null);
  const locked = predicted === null;

  function choose(id: DeviceId) {
    const device = DEVICES.find((item) => item.id === id) ?? DEVICES[0];
    setDeviceId(id);
    setValues(device);
  }
  const change = (key: "h1" | "h2" | "c1" | "q" | "flow") => (value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Solve for the one unknown of this device.
  const { h1, c1, flow } = values;
  let { h2, c2, q } = values;
  let w = 0;
  if (deviceId === "nozzle") {
    h2 = Math.min(h2, h1); // a nozzle cannot gain enthalpy
    c2 = nozzleExitVelocity(h1, h2, c1);
  } else if (deviceId === "heater") {
    q = heatSupplied(h1, h2, c1, c2);
  } else if (deviceId === "throttle") {
    h2 = h1;
  } else {
    w = shaftWork({ h1, h2, c1, c2, q });
  }

  // Energy entering and leaving, per kg. The two totals must match.
  const entering = [
    { name: "h₁", value: h1, color: ACCENT },
    { name: "C₁²/2", value: kinetic(c1), color: GOOD },
    { name: "heat in", value: Math.max(0, q), color: WARN },
    { name: "work in", value: Math.max(0, -w), color: INK },
  ];
  const leaving = [
    { name: "h₂", value: h2, color: ACCENT },
    { name: "C₂²/2", value: kinetic(c2), color: GOOD },
    { name: "heat out", value: Math.max(0, -q), color: WARN },
    { name: "work out", value: Math.max(0, w), color: INK },
  ];
  const total = entering.reduce((sum, item) => sum + item.value, 0);
  const stack = (items: typeof entering, y: number) => {
    let x = 70;
    return items
      .filter((item) => item.value > 0)
      .map((item) => {
        const width = (item.value / total) * 270;
        const node = (
          <g key={item.name}>
            <rect
              x={x}
              y={y}
              width={width}
              height='26'
              fill={item.color}
              fillOpacity='0.85'
              stroke='#fff'
            />
            {width > 46 && (
              <text
                x={x + width / 2}
                y={y + 17}
                fontSize='11'
                fill='#fff'
                textAnchor='middle'
              >
                {item.name}
              </text>
            )}
          </g>
        );
        x += width;
        return node;
      });
  };

  const device = DEVICES.find((item) => item.id === deviceId) ?? DEVICES[0];
  const power = flow * w;

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
            viewBox='0 0 360 250'
            role='img'
            aria-label={`${device.label}: energy entering and leaving per kilogram`}
          >
            {/* the device, with the control volume drawn round it */}
            <rect
              x='110'
              y='18'
              width='140'
              height='88'
              rx='10'
              fill='none'
              stroke={ACCENT}
              strokeWidth='1.5'
              strokeDasharray='6 4'
            />
            {deviceId === "compressor" && (
              <path
                d='M140 30 L220 44 L220 76 L140 90 Z'
                fill={TINT}
                stroke={INK}
                strokeWidth='2'
              />
            )}
            {deviceId === "turbine" && (
              <path
                d='M140 44 L220 30 L220 90 L140 76 Z'
                fill={TINT}
                stroke={INK}
                strokeWidth='2'
              />
            )}
            {deviceId === "nozzle" && (
              <path
                d='M135 34 L225 50 L225 70 L135 86 Z'
                fill={TINT}
                stroke={INK}
                strokeWidth='2'
              />
            )}
            {deviceId === "heater" && (
              <rect
                x='140'
                y='36'
                width='80'
                height='48'
                rx='6'
                fill={TINT}
                stroke={INK}
                strokeWidth='2'
              />
            )}
            {deviceId === "throttle" && (
              <path
                d='M150 40 L210 80 L210 40 L150 80 Z'
                fill={TINT}
                stroke={INK}
                strokeWidth='2'
              />
            )}
            <line
              x1='30'
              y1='60'
              x2='134'
              y2='60'
              stroke={INK}
              strokeWidth='2.5'
            />
            <path d='M136 60 l-10 -6 v12 z' fill={INK} />
            <line
              x1='226'
              y1='60'
              x2='326'
              y2='60'
              stroke={INK}
              strokeWidth='2.5'
            />
            <path d='M332 60 l-10 -6 v12 z' fill={INK} />
            <text x='34' y='48' fontSize='12' fill={INK}>
              1: in
            </text>
            <text x='296' y='48' fontSize='12' fill={INK}>
              2: out
            </text>
            <text x='34' y='80' fontSize='11' fill={SOFT}>
              {fmt(c1, 0)} m/s
            </text>
            <text x='326' y='80' fontSize='11' fill={SOFT} textAnchor='end'>
              {fmt(c2, 0)} m/s
            </text>
            {Math.abs(w) > 0.05 && (
              <text
                x='180'
                y='124'
                fontSize='12'
                fill={INK}
                textAnchor='middle'
              >
                {w > 0 ? "shaft work out" : "shaft work in"}
              </text>
            )}
            {Math.abs(q) > 0.05 && (
              <text
                x='180'
                y='10'
                fontSize='12'
                fill={WARN}
                textAnchor='middle'
              >
                {q > 0 ? "heat in" : "heat out"}
              </text>
            )}

            {/* energy accounts: what goes in must come out */}
            <text x='8' y='166' fontSize='12' fontWeight='600' fill={INK}>
              In
            </text>
            {stack(entering, 148)}
            <text x='8' y='212' fontSize='12' fontWeight='600' fill={INK}>
              Out
            </text>
            {stack(leaving, 194)}
            <text x='340' y='240' fontSize='11' fill={SOFT} textAnchor='end'>
              each bar totals {fmt(total, 1)} kJ per kg
            </text>
          </svg>
          <figcaption>{device.note}</figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments
              label='Device'
              options={DEVICES}
              value={deviceId}
              disabled={locked}
              columns={3}
              onChange={choose}
            />
            <Slider
              id='sfee-h1'
              label={
                <>
                  Inlet enthalpy h<sub>1</sub>
                </>
              }
              display={`${fmt(h1, 0)} kJ/kg`}
              min={device.hRange[0]}
              max={device.hRange[1]}
              step={5}
              value={h1}
              disabled={locked}
              onChange={change("h1")}
            />
            {deviceId !== "throttle" && (
              <Slider
                id='sfee-h2'
                label={
                  <>
                    Exit enthalpy h<sub>2</sub>
                  </>
                }
                display={`${fmt(h2, 0)} kJ/kg`}
                min={device.hRange[0]}
                max={device.hRange[1]}
                step={5}
                value={h2}
                disabled={locked}
                onChange={change("h2")}
              />
            )}
            {deviceId === "nozzle" && (
              <Slider
                id='sfee-c1'
                label={
                  <>
                    Inlet velocity C<sub>1</sub>
                  </>
                }
                display={`${fmt(c1, 0)} m/s`}
                min={0}
                max={100}
                step={5}
                value={c1}
                disabled={locked}
                onChange={change("c1")}
              />
            )}
            {(deviceId === "compressor" || deviceId === "turbine") && (
              <>
                <Slider
                  id='sfee-q'
                  label='Heat to the fluid, q'
                  display={`${fmt(q, 1)} kJ/kg`}
                  min={-100}
                  max={0}
                  step={0.1}
                  value={q}
                  disabled={locked}
                  onChange={change("q")}
                />
                <Slider
                  id='sfee-flow'
                  label='Mass flow rate'
                  display={`${fmt(flow, 1)} kg/s`}
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={flow}
                  disabled={locked}
                  onChange={change("flow")}
                />
              </>
            )}
            <div className='control-buttons'>
              <button
                className='button button-quiet'
                disabled={locked}
                onClick={() => choose(deviceId)}
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
                The equation, per kg: h<sub>1</sub> + C<sub>1</sub>²/2 + q = h
                <sub>2</sub> + C<sub>2</sub>²/2 + w
              </>
            ),
            value: (
              <>
                This device finds the <b>{device.finds}</b>
              </>
            ),
          },
          {
            label: "Kinetic energy, C²/2000 in kJ/kg",
            value: (
              <>
                in <b>{fmt(kinetic(c1), 3)}</b>, out{" "}
                <b>{fmt(kinetic(c2), 3)}</b> kJ/kg
              </>
            ),
          },
          deviceId === "nozzle"
            ? {
                label: (
                  <>
                    Exit velocity, C<sub>2</sub> = √[C<sub>1</sub>² + 2000(h
                    <sub>1</sub> − h<sub>2</sub>)]
                  </>
                ),
                value: <b>{fmt(c2, 1)} m/s</b>,
              }
            : deviceId === "heater"
            ? {
                label: (
                  <>
                    Heat supplied, q = h<sub>2</sub> − h<sub>1</sub>
                  </>
                ),
                value: <b>{fmt(q, 1)} kJ/kg</b>,
              }
            : deviceId === "throttle"
            ? {
                label: "Throttling",
                value: (
                  <>
                    h<sub>2</sub> = h<sub>1</sub> = <b>{fmt(h2, 0)} kJ/kg</b>
                  </>
                ),
              }
            : {
                label: (
                  <>
                    Shaft work, w = (h<sub>1</sub> − h<sub>2</sub>) + (C
                    <sub>1</sub>² − C<sub>2</sub>²)/2000 + q
                  </>
                ),
                value: (
                  <>
                    <b>{fmt(w, 2)} kJ/kg</b> (
                    {w >= 0 ? "done by the fluid" : "put into the fluid"})
                  </>
                ),
              },
          deviceId === "compressor" || deviceId === "turbine"
            ? {
                label: "Power = mass flow × w",
                value: (
                  <b>
                    {fmt(Math.abs(power), 2)} kW{" "}
                    {power >= 0 ? "developed" : "required"}
                  </b>
                ),
              }
            : { label: "Shaft work", value: "none: this device has no shaft" },
        ]}
      />
    </div>
  );
}
