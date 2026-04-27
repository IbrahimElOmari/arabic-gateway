import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

type Hsl = { h: number; s: number; l: number };

const css = fs.readFileSync('src/index.css', 'utf8');
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';

const tokens = Object.fromEntries(
  Array.from(rootBlock.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g)).map(
    ([, name, h, s, l]) => [name, { h: Number(h), s: Number(s), l: Number(l) }]
  )
) as Record<string, Hsl>;

const toRgb = ({ h, s, l }: Hsl): [number, number, number] => {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] =
    h < 60 ? [chroma, x, 0] :
    h < 120 ? [x, chroma, 0] :
    h < 180 ? [0, chroma, x] :
    h < 240 ? [0, x, chroma] :
    h < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return [r + m, g + m, b + m];
};

const luminance = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (foreground: Hsl, background: Hsl) => {
  const fg = luminance(toRgb(foreground));
  const bg = luminance(toRgb(background));
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
};

const requiredPairs: Array<[string, Hsl, Hsl, number]> = [
  ['body text', tokens.foreground, tokens.background, 4.5],
  ['card text', tokens['card-foreground'], tokens.card, 4.5],
  ['primary button', tokens['primary-foreground'], tokens.primary, 4.5],
  ['primary links', tokens.primary, tokens.background, 4.5],
  ['secondary badge', tokens['secondary-foreground'], tokens.secondary, 4.5],
  ['muted text on page', tokens['muted-foreground'], tokens.background, 4.5],
  ['muted text on cards', tokens['muted-foreground'], tokens.card, 4.5],
  ['accent hover', tokens['accent-foreground'], tokens.accent, 4.5],
  ['destructive badge', tokens['destructive-foreground'], tokens.destructive, 4.5],
  ['success trend', tokens.success, tokens.card, 4.5],
  ['warning badge', tokens['warning-foreground'], tokens.warning, 4.5],
  ['sidebar text', tokens['sidebar-foreground'], tokens['sidebar-background'], 4.5],
  ['sidebar active text', tokens['sidebar-accent-foreground'], tokens['sidebar-accent'], 4.5],
  ['sidebar hover text', tokens['sidebar-accent-foreground'], tokens['sidebar-accent'], 4.5],
  ['focus ring on page', tokens.ring, tokens.background, 3],
  ['focus ring on card', tokens.ring, tokens.card, 3],
  ['sidebar focus ring', tokens['sidebar-ring'], tokens['sidebar-background'], 3],
];

describe('light-mode color contrast tokens', () => {
  it.each(requiredPairs)('%s meets WCAG contrast target', (_name, foreground, background, minimum) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});