import { useState } from "react";
import Prediction from "./shared/Prediction";
import type { PredictionData } from "./shared/Prediction";
import Segments from "./shared/Segments";
import {
  ACCENT,
  AMBER,
  GOOD,
  INK,
  SOFT,
  TINT,
  WARN,
  fmt,
} from "./shared/theme";
import { AIR_TANK, classify, valueInPart } from "./systems/solver";
import type { SystemKind } from "./systems/solver";

type ExampleId = "piston" | "turbine" | "flask" | "kettle";

const EXAMPLES: {
  id: ExampleId;
  label: string;
  describe: string;
  mass: boolean;
  energy: boolean;
  why: string;
}[] = [
  {
    id: "piston",
    label: "Piston-cylinder",
    describe: "Gas trapped under a piston is heated and pushes the piston up.",
    mass: false,
    energy: true,
    why: "No gas gets in or out, but heat crosses the wall and work crosses at the piston.",
  },
  {
    id: "turbine",
    label: "Steam turbine",
    describe:
      "Steam flows in at one end, turns the shaft, and flows out at the other.",
    mass: true,
    energy: true,
    why: "Steam crosses the boundary at inlet and outlet, and shaft work leaves.",
  },
  {
    id: "flask",
    label: "Sealed insulated flask",
    describe: "Hot tea in a perfect vacuum flask with the lid screwed on.",
    mass: false,
    energy: false,
    why: "Nothing gets in or out: no mass, no heat, no work.",
  },
  {
    id: "kettle",
    label: "Kettle, lid off",
    describe: "Water boils on a stove and steam escapes from the top.",
    mass: true,
    energy: true,
    why: "Steam leaves, so mass crosses. Heat also enters from the stove.",
  },
];

const KIND_TEXT: Record<SystemKind, string> = {
  open: "an open system (a control volume)",
  closed: "a closed system (a fixed mass)",
  isolated: "an isolated system",
};

const PREDICTION: PredictionData = {
  prompt:
    "Before you touch anything: a tank of gas at 300 K is divided into two equal halves by a thin partition. Which of these is halved in each half?",
  options: ["Its temperature", "Its mass", "Its pressure"],
  correct: 1,
  explain:
    "Mass depends on how much gas there is, so it halves: it is an extensive property. Temperature and pressure are the same in every part: they are intensive. Use the divider below to check all seven properties.",
};

type Answer = boolean | null;

export default function SystemsExplorer(_props: { topicSlug: string }) {
  const [predicted, setPredicted] = useState<number | null>(null);
  const [exampleId, setExampleId] = useState<ExampleId>("piston");
  const [mass, setMass] = useState<Answer>(null);
  const [energy, setEnergy] = useState<Answer>(null);
  const [parts, setParts] = useState("1");
  const locked = predicted === null;

  const example = EXAMPLES.find((item) => item.id === exampleId) ?? EXAMPLES[0];
  const answered = mass !== null && energy !== null;
  const truth = classify(example.mass, example.energy);
  const said = answered ? classify(mass, energy) : null;
  const right = said === truth;
  const count = Number(parts);

  function choose(id: ExampleId) {
    setExampleId(id);
    setMass(null);
    setEnergy(null);
  }

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
            viewBox='0 0 360 230'
            role='img'
            aria-label={`${example.label} with its system boundary drawn as a dashed line`}
          >
            <rect
              x='90'
              y='50'
              width='180'
              height='130'
              rx='10'
              fill={TINT}
              stroke={INK}
              strokeWidth='2'
            />
            <rect
              x='74'
              y='34'
              width='212'
              height='162'
              rx='16'
              fill='none'
              stroke={ACCENT}
              strokeWidth='2'
              strokeDasharray='7 5'
            />
            <text
              x='180'
              y='112'
              fontSize='15'
              fontWeight='600'
              fill={INK}
              textAnchor='middle'
            >
              {example.label}
            </text>
            <text x='180' y='132' fontSize='12' fill={SOFT} textAnchor='middle'>
              the system
            </text>
            <text
              x='180'
              y='26'
              fontSize='12'
              fill={ACCENT}
              textAnchor='middle'
            >
              boundary
            </text>
            {answered && example.mass && (
              <g stroke={INK} strokeWidth='2.5' fill={INK}>
                <line x1='20' y1='90' x2='84' y2='90' />
                <path d='M84 90 l-10 -6 v12 z' />
                <line x1='270' y1='150' x2='334' y2='150' />
                <path d='M340 150 l-10 -6 v12 z' />
                <text x='20' y='80' fontSize='12' stroke='none'>
                  mass in
                </text>
                <text x='296' y='140' fontSize='12' stroke='none'>
                  mass out
                </text>
              </g>
            )}
            {answered && example.energy && (
              <g stroke={WARN} strokeWidth='2.5' fill={WARN}>
                <line x1='150' y1='222' x2='150' y2='190' />
                <path d='M150 184 l-6 10 h12 z' />
                <text x='160' y='216' fontSize='12' stroke='none'>
                  Q (heat)
                </text>
                <line x1='270' y1='80' x2='334' y2='80' />
                <path d='M340 80 l-10 -6 v12 z' />
                <text x='296' y='70' fontSize='12' stroke='none'>
                  W (work)
                </text>
              </g>
            )}
            {answered && !example.mass && !example.energy && (
              <text
                x='180'
                y='216'
                fontSize='12'
                fill={SOFT}
                textAnchor='middle'
              >
                nothing crosses the boundary
              </text>
            )}
          </svg>
          <figcaption>{example.describe}</figcaption>
        </figure>

        <div className='widget-side'>
          <div className='controls'>
            <Segments
              label='Example'
              options={EXAMPLES}
              value={exampleId}
              disabled={locked}
              onChange={choose}
            />
            <div className='toggle-row'>
              <span>Does mass cross the boundary?</span>
              <Segments
                label='Mass crosses'
                options={[
                  { id: "yes", label: "Yes" },
                  { id: "no", label: "No" },
                ]}
                value={mass === null ? "" : mass ? "yes" : "no"}
                disabled={locked}
                onChange={(id) => setMass(id === "yes")}
              />
            </div>
            <div className='toggle-row'>
              <span>Does energy (heat or work) cross?</span>
              <Segments
                label='Energy crosses'
                options={[
                  { id: "yes", label: "Yes" },
                  { id: "no", label: "No" },
                ]}
                value={energy === null ? "" : energy ? "yes" : "no"}
                disabled={locked}
                onChange={(id) => setEnergy(id === "yes")}
              />
            </div>
            {said && (
              <p className={right ? "feedback good" : "feedback"}>
                <strong>{right ? "Correct." : "Not quite."}</strong> Your
                answers describe {KIND_TEXT[said]}.{" "}
                {right
                  ? example.why
                  : `This one is ${KIND_TEXT[truth]}. ${example.why}`}
              </p>
            )}
            {locked && (
              <p className='hint'>
                Answer the question above to unlock the controls.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className='controls'>
        <div className='toggle-row'>
          <span>Divide the tank of air into equal parts</span>
          <Segments
            label='Number of parts'
            options={[
              { id: "1", label: "Whole" },
              { id: "2", label: "2 parts" },
              { id: "4", label: "4 parts" },
            ]}
            value={parts}
            disabled={locked}
            columns={3}
            onChange={setParts}
          />
        </div>
        <svg
          viewBox='0 0 360 60'
          role='img'
          aria-label={`A tank divided into ${count} equal parts`}
        >
          <rect
            x='20'
            y='8'
            width='320'
            height='44'
            rx='6'
            fill={TINT}
            stroke={INK}
            strokeWidth='2'
          />
          {Array.from({ length: count - 1 }, (_, index) => (
            <line
              key={index}
              x1={20 + (320 * (index + 1)) / count}
              y1='8'
              x2={20 + (320 * (index + 1)) / count}
              y2='52'
              stroke={INK}
              strokeWidth='2'
            />
          ))}
          <rect
            x='20'
            y='8'
            width={320 / count}
            height='44'
            rx='6'
            fill={AMBER}
            fillOpacity='0.35'
          />
        </svg>
      </div>

      <div className='table-wrap'>
        <table className='data-table'>
          <tbody>
            <tr>
              <th>Property</th>
              <th>Whole tank</th>
              <th>One part</th>
              <th>Kind</th>
            </tr>
            {AIR_TANK.map((row) => (
              <tr key={row.symbol}>
                <td>
                  {row.name}, {row.symbol} ({row.unit})
                </td>
                <td>{fmt(row.whole, row.whole < 10 ? 3 : 1)}</td>
                <td>{fmt(valueInPart(row, count), row.whole < 10 ? 3 : 1)}</td>
                <td
                  style={{
                    color: row.extensive ? WARN : GOOD,
                    fontFamily: "inherit",
                  }}
                >
                  {row.extensive ? "extensive" : "intensive"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className='hint'>
        The tank holds 2 kg of air at 300 K and 200 kPa. An extensive property
        divided by mass becomes intensive: V / m is the specific volume v.
      </p>
    </div>
  );
}
