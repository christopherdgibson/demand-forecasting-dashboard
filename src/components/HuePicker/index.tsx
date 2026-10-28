import { useEffect, useId, useRef, useState } from 'react';
import { HueKeys, HUE_PRESETS, type HueSettings } from '../../hooks/useHue';
import { hexToOklch, oklchToHex } from '../../utils/colorUtils';

import './styles.css';

interface HuePickerProps {
  value: HueSettings;
  activePreset: keyof typeof HUE_PRESETS | null;
  onChange: (v: HueSettings) => void;
}

export function HuePicker({ value, activePreset, onChange }: HuePickerProps) {
  const name = useId();
  const panelId = useId();
  const [custom, setCustom] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!custom) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setCustom(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCustom(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [custom]);

  const minDist = 40;
  const wrap = (n: number) => ((Math.round(n) % 360) + 360) % 360;

  function customChange(field: keyof HueSettings, newColor: number) {
    const other = field === 'hue' ? 'accent' : 'hue';
    const next = { ...value, [field]: newColor } as HueSettings;
    if (hueAccentDist(next) < minDist) next[other] = adjustDistance(newColor, value[other]);
    onChange(next);
  }

  function adjustDistance(newColor: number, other: number) {
    const diff = ((other - newColor + 540) % 360) - 180;   // signed shortest offset, -180..180
    return wrap(newColor + (diff >= 0 ? minDist : -minDist));
  }

  function hueAccentDist(v: HueSettings) {
    return Math.min((v.hue - v.accent + 360) % 360, (v.accent - v.hue + 360) % 360);
  }

  return (
    <div className="hue-picker-wrap" ref={wrapRef}>
      <div className="hue-picker" role="radiogroup" aria-label="Colour preset">
        {HueKeys.map((k) => {
          const p = HUE_PRESETS[k];
          return (
            <label key={k} className="hue-option" title={p.label}>
              <input
                type="radio"
                name={name}
                checked={activePreset === k}
                onChange={() => onChange({ hue: p.hue, accent: p.accent })}
                aria-label={p.label}
              />
              <span style={{ ['--h' as string]: p.hue, ['--ha' as string]: p.accent }} />
            </label>
          );
        })}
         <button
          type="button"
          className={`hue-custom-toggle${!activePreset ? ' active' : ''}`}
          aria-expanded={custom}
          aria-controls={panelId}
          onClick={() => setCustom((prev) => !prev)}
        >
          Customise
        </button>
      </div>

      {custom && (
        <div id={panelId} className={`hue-custom ${!activePreset ? ' active' : ''}`}>
          <HueSlider label="Brand" value={value.hue} onChange={(hue) => customChange('hue', hue)} />
          <HueSlider label="Accent" value={value.accent} onChange={(accent) => customChange('accent', accent)} />
        </div>
      )}
    </div>
  );
}


function HueSlider({ label, value, onChange }: {
  label: string; value: number; onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="hue-slider-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="hue-slider"
        type="range"
        min={0}
        max={359}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--h' as string]: value }}
      />
      <HexField hue={value} chroma={0.17} onCommit={onChange} />
      {/* <output>{value}°</output> */}
    </div>
  );
}

function HexField({ hue, chroma, onCommit }: {
  hue: number; chroma: number; onCommit: (hue: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const L = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--swatch-l')
  ) || 0.5;
  const shown = draft ?? oklchToHex(L, chroma, hue);

  const commit = () => {
    if (draft === null) return;
    const parsed = hexToOklch(draft);
    if (parsed) onCommit(Math.round(parsed.h));
    setDraft(null);
  };

  return (
    <input
      className="hue-hex"
      value={shown}
      maxLength={7}
      spellCheck={false}
      aria-label="Hex colour"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
    />
  );
}