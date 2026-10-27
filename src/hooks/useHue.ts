import { useEffect, useState } from 'react';

interface HueEntry {
  label: string;
  hue: number;
  accent: number;
}

export const HUE_PRESETS  = {
  sapphire: {label: 'Sapphire', hue: 265, accent: 185 },
  teal: {label: 'Teal', hue: 195, accent: 290 },
  emerald: {label: 'Emerald', hue: 155, accent: 255 },
  violet: {label: 'Violet', hue: 295, accent: 190 },
  amber: {label: 'Amber', hue: 55, accent: 265 },
 } as const satisfies Record<string, HueEntry>;

export type HueKey = keyof typeof HUE_PRESETS;
export const HueNames = Object.keys(HUE_PRESETS) as HueKey[];

function applyHue(id: HueKey) {
  const p = HUE_PRESETS[id];
  const root = document.documentElement;
  root.style.setProperty('--hue', String(p.hue));
  root.style.setProperty('--hue-accent', String(p.accent));
}

export function useHue() {
  const isHueKey = (v: unknown): v is HueKey => typeof v === 'string' && v in HUE_PRESETS;
  const [activeHue, setActiveHue] = useState<HueKey>(() => {
    try {
      const saved = localStorage.getItem('hue');
      return isHueKey(saved) ? saved : 'sapphire';
    } catch {
      return 'sapphire';
    }
  });

  useEffect(() => {
    applyHue(activeHue);
    try {
      localStorage.setItem('hue', activeHue);
    } catch {}
  }, [activeHue]);

  return { activeHue, setActiveHue };
}