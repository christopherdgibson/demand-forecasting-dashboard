import { useId } from 'react';
import { HueNames, HUE_PRESETS } from '../../hooks/useHue';

import type { HueKey } from '../../hooks/useHue';
import './styles.css';

interface HuePickerProps {
  value: HueKey;
  onChange: (id: HueKey) => void;
}

export function HuePicker({ value, onChange }: HuePickerProps) {
  const name = useId();

  return (
    <div className="hue-picker" role="radiogroup" aria-label="Accent colour">
      {HueNames.map((p) => (
        <label key={p} className="hue-option" title={HUE_PRESETS[p].label}>
          <input
            type="radio"
            name={name}
            value={p}
            checked={value === p}
            onChange={() => onChange(p)}
            aria-label={HUE_PRESETS[p].label}
          />
          <span style={{ ['--h' as string]: HUE_PRESETS[p].hue, ['--a' as string]: HUE_PRESETS[p].accent }} />
        </label>
      ))}
    </div>
  );
}