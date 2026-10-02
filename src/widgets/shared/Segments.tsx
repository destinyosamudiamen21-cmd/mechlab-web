type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  label: string; // read out by screen readers, e.g. "Process"
  options: Option<T>[];
  value: T;
  disabled?: boolean;
  columns?: 1 | 2 | 3; // buttons per row (2 unless stated)
  onChange: (id: T) => void;
};

const COLUMN_CLASS = { 1: "segments one", 2: "segments", 3: "segments three" };

// A row of buttons where exactly one is selected (a process, a cross-section, a beam type).
export default function Segments<T extends string>({
  label,
  options,
  value,
  disabled = false,
  columns = 2,
  onChange,
}: Props<T>) {
  return (
    <div className={COLUMN_CLASS[columns]} role='group' aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          className='segment'
          aria-pressed={value === option.id}
          disabled={disabled}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
