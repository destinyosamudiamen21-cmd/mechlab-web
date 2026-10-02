import type { ReactNode } from "react";

type SliderProps = {
  id: string;
  label: ReactNode;
  display: string; // the value as the student should read it, e.g. "9.0 bar"
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

// One slider with its label and current value. Shared by the widgets.
export default function Slider({
  id,
  label,
  display,
  min,
  max,
  step,
  value,
  disabled = false,
  onChange,
}: SliderProps) {
  return (
    <div className='slider'>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{display}</output>
      <input
        id={id}
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
