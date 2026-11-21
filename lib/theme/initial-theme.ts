/**
 * Which theme a page opens in (P3, #155).
 *
 * - The marketing home page is light: it has no dark design yet.
 * - /book follows the client's phone, whatever a staff member chose on the
 *   same device, because it is the salon's page shown to its clients.
 * - Everywhere else opens dark, unless the person picked light (or "system")
 *   with the toggle, which is remembered per device under `lumina-theme`.
 *
 * The same rule runs twice: in the inline script below, before the first
 * paint, so nothing flashes; and in Providers, which keeps it after that.
 */
export type ResolvedTheme = 'light' | 'dark';
export type StoredTheme = ResolvedTheme | 'system';

export const THEME_STORAGE_KEY = 'lumina-theme';
export const DEFAULT_THEME: StoredTheme = 'dark';

export function initialTheme(
  pathname: string,
  stored: string | null,
  systemPrefersDark: boolean
): ResolvedTheme {
  const system: ResolvedTheme = systemPrefersDark ? 'dark' : 'light';
  if (pathname === '/') return 'light';
  if (pathname === '/book' || pathname.startsWith('/book/')) return system;
  // 'dark' is DEFAULT_THEME, written out: the inline script below is this
  // function's own source, run on its own, so it may not refer outward.
  const choice =
    stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'dark';
  return choice === 'system' ? system : choice;
}
