/**
 * WCAG 2.1 contrast, computed from token values.
 *
 * Shared by the contrast test, which fails CI when a token pair drops below
 * AA, and by the design-system page, which states each colour's contrast. That
 * page used to state it by hand, and the claims were wrong: it listed Lumina
 * Gold as "4.5:1 on white (WCAG AA)" when the real figure is about 1.5:1.
 */

/** Relative luminance per WCAG 2.1, from an #rrggbb string. */
export function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
  }

  const channels = [0, 2, 4].map(offset => {
    const srgb = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  const [r, g, b] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1:1 to 21:1. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
