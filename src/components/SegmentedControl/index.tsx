import { useId } from 'react';

import './styles.css';

interface SegmentedControlProps<T extends string> {
  label: string;                                   // accessible name
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label, options, value, onChange,
}: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="segmented-option">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}