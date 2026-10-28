const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb   = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklch(input: string) {
  let s = input.trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;

  const n = parseInt(s, 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const z = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * z;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * z;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * z;

  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

export function oklchToHex(L: number, C: number, h: number) {
  const A = C * Math.cos(h * Math.PI / 180);
  const B = C * Math.sin(h * Math.PI / 180);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const z = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * z,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * z,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * z,
  ].map((v) => Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255));

  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}