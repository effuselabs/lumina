import { DEFAULT_THEME, initialTheme } from '@/lib/theme/initial-theme';
import { initialThemeScript } from '@/lib/theme/initial-theme-script';

describe('the theme a page opens in', () => {
  it('opens the dashboard dark until someone picks otherwise', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(initialTheme('/dashboard/salon', null, false)).toBe('dark');
    expect(initialTheme('/auth/signin', null, false)).toBe('dark');
  });

  it('keeps what the person picked on this device', () => {
    expect(initialTheme('/dashboard/salon', 'light', true)).toBe('light');
    expect(initialTheme('/dashboard/salon', 'system', false)).toBe('light');
    expect(initialTheme('/dashboard/salon', 'system', true)).toBe('dark');
    expect(initialTheme('/dashboard/salon', 'nonsense', false)).toBe('dark');
  });

  it('follows the phone on /book, whatever staff picked on the device', () => {
    expect(initialTheme('/book/abc', 'dark', false)).toBe('light');
    expect(initialTheme('/book/abc', 'light', true)).toBe('dark');
    expect(initialTheme('/booking/abc', null, false)).toBe('dark');
  });

  it('keeps the home page light', () => {
    expect(initialTheme('/', 'dark', true)).toBe('light');
  });

  it('applies the same rule before the first paint', () => {
    const run = (pathname: string, stored: string | null, dark: boolean) => {
      const classes = new Set<string>();
      const root = {
        classList: {
          add: (c: string) => classes.add(c),
          remove: (...cs: string[]) => cs.forEach(c => classes.delete(c)),
        },
        setAttribute: () => {},
        style: {} as Record<string, string>,
      };
      new Function(
        'location',
        'localStorage',
        'matchMedia',
        'document',
        initialThemeScript
      )({ pathname }, { getItem: () => stored }, () => ({ matches: dark }), {
        documentElement: root,
      });
      return [...classes];
    };

    expect(run('/dashboard/salon', null, false)).toEqual(['dark']);
    expect(run('/book/abc', 'dark', false)).toEqual(['light']);
    expect(run('/', null, true)).toEqual(['light']);
  });
});
