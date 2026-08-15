import { useCallback, useEffect, useState } from 'react';

export type AccentId = 'orange' | 'crimson' | 'gold' | 'emerald' | 'cyan' | 'violet' | 'magenta';
export type GradientStyleId = 'fire' | 'sunset' | 'neon' | 'mono' | 'aurora';

export const ACCENTS: { id: AccentId; label: string; hue: number; sat: number; light: number; swatch: string }[] = [
  { id: 'orange', label: 'Inferno Orange', hue: 22, sat: 100, light: 52, swatch: '#ff5c0a' },
  { id: 'crimson', label: 'Blood Crimson', hue: 352, sat: 90, light: 52, swatch: '#f4143f' },
  { id: 'gold', label: 'Booyah Gold', hue: 42, sat: 100, light: 52, swatch: '#ffb703' },
  { id: 'emerald', label: 'Loot Emerald', hue: 152, sat: 80, light: 44, swatch: '#14b877' },
  { id: 'cyan', label: 'Cyber Cyan', hue: 190, sat: 95, light: 48, swatch: '#06b6d4' },
  { id: 'violet', label: 'Void Violet', hue: 265, sat: 85, light: 60, swatch: '#8b5cf6' },
  { id: 'magenta', label: 'Neon Magenta', hue: 320, sat: 90, light: 55, swatch: '#ec4899' },
];

export const GRADIENTS: { id: GradientStyleId; label: string; description: string }[] = [
  { id: 'fire', label: 'Fire', description: 'Classic hot blend' },
  { id: 'sunset', label: 'Sunset', description: 'Soft warm fade' },
  { id: 'neon', label: 'Neon', description: 'High-contrast glow' },
  { id: 'mono', label: 'Mono', description: 'Single-tone minimal' },
  { id: 'aurora', label: 'Aurora', description: 'Wide spectrum sweep' },
];

export type AccentPrefs = { accent: AccentId; gradient: GradientStyleId };
export const ACCENT_DEFAULTS: AccentPrefs = { accent: 'orange', gradient: 'fire' };
const KEY = 'ffid-accent';

export const loadAccentPrefs = (): AccentPrefs => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...ACCENT_DEFAULTS, ...JSON.parse(raw) } : ACCENT_DEFAULTS;
  } catch {
    return ACCENT_DEFAULTS;
  }
};

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

export const applyAccentPrefs = (prefs: AccentPrefs) => {
  const a = ACCENTS.find((x) => x.id === prefs.accent) ?? ACCENTS[0];
  const root = document.documentElement;
  const { hue: h, sat: s, light: l } = a;

  root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
  root.style.setProperty('--primary-glow', `${(h + 12) % 360} ${s}% ${Math.min(l + 8, 70)}%`);
  root.style.setProperty('--ring', `${h} ${s}% ${l}%`);

  const alt = (deg: number, dl = 4) => hsl((h + deg + 360) % 360, s, Math.min(l + dl, 72));
  let primary: string;
  let fire: string;
  switch (prefs.gradient) {
    case 'sunset':
      primary = `linear-gradient(135deg, ${alt(-14, -6)}, ${alt(26, 10)})`;
      fire = `linear-gradient(135deg, ${alt(-28, -8)}, ${hsl(h, s, l)}, ${alt(34, 12)})`;
      break;
    case 'neon':
      primary = `linear-gradient(135deg, ${hsl(h, 100, l)}, ${alt(60, 8)})`;
      fire = `linear-gradient(135deg, ${alt(-60, 6)}, ${hsl(h, 100, l)}, ${alt(70, 10)})`;
      break;
    case 'mono':
      primary = `linear-gradient(135deg, ${hsl(h, s, Math.max(l - 12, 20))}, ${hsl(h, s, l)})`;
      fire = `linear-gradient(135deg, ${hsl(h, s, Math.max(l - 18, 16))}, ${hsl(h, s, l)}, ${hsl(h, s, Math.min(l + 12, 72))})`;
      break;
    case 'aurora':
      primary = `linear-gradient(135deg, ${alt(-90, 6)}, ${hsl(h, s, l)}, ${alt(90, 10)})`;
      fire = `linear-gradient(135deg, ${alt(-120, 6)}, ${hsl(h, s, l)}, ${alt(120, 12)})`;
      break;
    default:
      primary = `linear-gradient(135deg, ${hsl(h, s, l)}, ${alt(13, 6)})`;
      fire = `linear-gradient(135deg, ${alt(-22, 3)}, ${hsl(h, s, l)}, ${alt(23, 3)})`;
  }
  root.style.setProperty('--gradient-primary', primary);
  root.style.setProperty('--gradient-fire', fire);
  root.style.setProperty('--gradient-glow', `radial-gradient(circle at 50% 0%, hsl(${h} ${s}% ${l}% / 0.25), transparent 60%)`);
};

export const resetAccentPrefs = () => {
  const root = document.documentElement;
  ['--primary', '--primary-glow', '--ring', '--gradient-primary', '--gradient-fire', '--gradient-glow'].forEach((v) =>
    root.style.removeProperty(v),
  );
};

/** Applies the saved accent theme app-wide. */
export const useThemeAccent = () => {
  const [prefs, setPrefs] = useState<AccentPrefs>(ACCENT_DEFAULTS);

  useEffect(() => {
    const p = loadAccentPrefs();
    setPrefs(p);
    applyAccentPrefs(p);
  }, []);

  const update = useCallback((next: Partial<AccentPrefs>) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      localStorage.setItem(KEY, JSON.stringify(merged));
      applyAccentPrefs(merged);
      return merged;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setPrefs(ACCENT_DEFAULTS);
    resetAccentPrefs();
  }, []);

  return { prefs, update, reset };
};

export const ThemeAccentSync = () => {
  useThemeAccent();
  return null;
};

export default useThemeAccent;
