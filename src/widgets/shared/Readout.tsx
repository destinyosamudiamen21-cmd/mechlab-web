import type { ReactNode } from "react";

export type ReadoutRow = { label: ReactNode; value: ReactNode };

// The formula panel: each row is a formula (label) and its result with the student's numbers (value).
export default function Readout({ rows }: { rows: ReadoutRow[] }) {
  return (
    <dl className='readout'>
      {rows.map((row, index) => (
        <div key={index}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
