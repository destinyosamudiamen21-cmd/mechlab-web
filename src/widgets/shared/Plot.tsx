import type { ReactNode } from "react";
import { RULE, SOFT } from "./theme";

// Every graph uses the same drawing area, so axes and labels line up across widgets.
export const PLOT = {
  width: 360,
  height: 270,
  left: 46,
  right: 12,
  top: 14,
  bottom: 38,
};

export type Scale = (value: number) => number;

// Maps a real value (MPa, m³, K...) to a position on the drawing.
export function linear(d0: number, d1: number, r0: number, r1: number): Scale {
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

type PlotProps = {
  x: [number, number]; // range of real values along the bottom
  y: [number, number]; // range of real values up the side
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
  label: string; // description for screen readers
  height?: number;
  wide?: boolean; // fill the column even inside the side panel, where drawings are normally kept small
  edgeAxes?: boolean; // draw the axes at the left and bottom edges even when zero is in range
  xTickFormat?: (value: number) => string;
  yTickFormat?: (value: number) => string;
  children: (sx: Scale, sy: Scale) => ReactNode;
};

export default function Plot({
  x,
  y,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  label,
  height = PLOT.height,
  wide = false,
  edgeAxes = false,
  xTickFormat = String,
  yTickFormat = String,
  children,
}: PlotProps) {
  const sx = linear(x[0], x[1], PLOT.left, PLOT.width - PLOT.right);
  const sy = linear(y[0], y[1], height - PLOT.bottom, PLOT.top);
  // Axes sit at zero when zero is in range, otherwise at the edge of the plot.
  // (A range may be given backwards, e.g. [600, -600], to make an axis point the other way.)
  const hasZero = (range: [number, number]) =>
    Math.min(...range) <= 0 && Math.max(...range) >= 0;
  const axisY = !edgeAxes && hasZero(y) ? sy(0) : height - PLOT.bottom;
  const axisX = !edgeAxes && hasZero(x) ? sx(0) : PLOT.left;

  return (
    <svg
      viewBox={`0 0 ${PLOT.width} ${height}`}
      className={wide ? "wide" : undefined}
      role='img'
      aria-label={label}
    >
      <line
        x1={PLOT.left}
        y1={axisY}
        x2={PLOT.width - PLOT.right}
        y2={axisY}
        stroke={RULE}
        strokeWidth='1.5'
      />
      <line
        x1={axisX}
        y1={PLOT.top}
        x2={axisX}
        y2={height - PLOT.bottom}
        stroke={RULE}
        strokeWidth='1.5'
      />
      {children(sx, sy)}
      {xTicks.map((tick) => (
        <g key={`x${tick}`}>
          <line
            x1={sx(tick)}
            y1={axisY}
            x2={sx(tick)}
            y2={axisY + 5}
            stroke={SOFT}
          />
          <text
            x={sx(tick)}
            y={axisY + 17}
            fontSize='11'
            fill={SOFT}
            textAnchor='middle'
            stroke='#fff'
            strokeWidth='3'
            paintOrder='stroke'
          >
            {xTickFormat(tick)}
          </text>
        </g>
      ))}
      {yTicks.map((tick) => (
        <g key={`y${tick}`}>
          <line
            x1={axisX - 5}
            y1={sy(tick)}
            x2={axisX}
            y2={sy(tick)}
            stroke={SOFT}
          />
          <text
            x={axisX - 8}
            y={sy(tick) + 4}
            fontSize='11'
            fill={SOFT}
            textAnchor='end'
            stroke='#fff'
            strokeWidth='3'
            paintOrder='stroke'
          >
            {yTickFormat(tick)}
          </text>
        </g>
      ))}
      <text
        x={PLOT.width - PLOT.right}
        y={height - 6}
        fontSize='12'
        fill={SOFT}
        textAnchor='end'
      >
        {xLabel}
      </text>
      <text x={PLOT.left + 6} y={PLOT.top + 2} fontSize='12' fill={SOFT}>
        {yLabel}
      </text>
    </svg>
  );
}
