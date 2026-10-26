import { useEffect, useState } from 'react';

import type { ThemePref } from '../types';

function applyTheme(pref: ThemePref) {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function useTheme() {
  const [activeTheme, setActiveTheme] = useState<ThemePref>(() => {
    try { return (localStorage.getItem('theme') as ThemePref) ?? 'system'; }
    catch { return 'system'; }
  });

  useEffect(() => {
    applyTheme(activeTheme);
    try {
      if (activeTheme === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', activeTheme);
    } catch {}

    if (activeTheme !== 'system') return;
    const mq = window.matchMedia('(activeThemeers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);   // follows OS changes live
    return () => mq.removeEventListener('change', onChange);
  }, [activeTheme]);

  return { activeTheme, setActiveTheme };
}
