import { useEffect, useState } from 'react';

interface HueEntry { label: string; hue: number; accent: number }

export const HUE_PRESETS = {
  sapphire: { label: 'Sapphire', hue: 265, accent: 185 },
  teal:     { label: 'Teal',     hue: 195, accent: 290 },
  emerald:  { label: 'Emerald',  hue: 155, accent: 255 },
  violet:   { label: 'Violet',   hue: 295, accent: 190 },
  amber:    { label: 'Amber',    hue: 55,  accent: 265 },
} as const satisfies Record<string, HueEntry>;

export type HueId = keyof typeof HUE_PRESETS;
export const HueKeys = Object.keys(HUE_PRESETS) as HueId[];

export interface HueSettings { hue: number; accent: number }

const DEFAULT: HueSettings = { hue: 265, accent: 185 };
const wrap = (n: number) => ((Math.round(n) % 360) + 360) % 360;

function readSaved(): HueSettings {
  try {
    const raw = localStorage.getItem('hue');
    if (raw) {
      // old format: a preset name
      if (raw in HUE_PRESETS) {
        const p = HUE_PRESETS[raw as HueId];
        return { hue: p.hue, accent: p.accent };
      }
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed?.hue) && Number.isFinite(parsed?.accent)) {
        return { hue: wrap(parsed.hue), accent: wrap(parsed.accent) };
      }
    }
  } catch {}
  return DEFAULT;
}

function applyHue({ hue, accent }: HueSettings) {
  const root = document.documentElement;
  root.style.setProperty('--hue', String(hue));
  root.style.setProperty('--hue-accent', String(accent));
}

export function useHue() {
  const [hues, setHues] = useState<HueSettings>(readSaved);

  useEffect(() => {
    applyHue(hues);
    try { localStorage.setItem('hue', JSON.stringify(hues)); } catch {}
  }, [hues]);

  const activePreset =
    HueKeys.find((k) => HUE_PRESETS[k].hue === hues.hue && HUE_PRESETS[k].accent === hues.accent) ?? null;

  return { hues, setHues, activePreset };
}