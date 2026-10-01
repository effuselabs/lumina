import { act, render } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/components/theme-provider';

/**
 * The theme follows the stored setting, then the OS, and a page may force
 * one theme without touching the setting (the marketing home page is
 * light-only until it has a dark design).
 */

function setSystemDark(dark: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: dark && query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

const html = () => document.documentElement;

let setTheme: (theme: 'light' | 'dark' | 'system') => void = () => {};
function Capture() {
  setTheme = useTheme().setTheme;
  return null;
}

// jest.setup.ts stubs localStorage with bare jest.fn()s; back them with a
// map so the provider's reads see its writes.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  jest
    .mocked(localStorage.getItem)
    .mockImplementation(key => store.get(key) ?? null);
  jest
    .mocked(localStorage.setItem)
    .mockImplementation((key, value) => void store.set(key, String(value)));
  html().className = '';
  setSystemDark(false);
});

describe('ThemeProvider', () => {
  it('follows the OS when nothing is stored', () => {
    setSystemDark(true);
    render(
      <ThemeProvider defaultTheme="system" enableTransitions={false}>
        <span />
      </ThemeProvider>
    );
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('prefers the stored setting to the OS', () => {
    setSystemDark(true);
    localStorage.setItem('lumina-theme', 'light');
    render(
      <ThemeProvider defaultTheme="system" enableTransitions={false}>
        <span />
      </ThemeProvider>
    );
    expect(html().classList.contains('light')).toBe(true);
  });

  it('renders a forced theme without changing the setting', () => {
    localStorage.setItem('lumina-theme', 'dark');
    const { rerender } = render(
      <ThemeProvider
        defaultTheme="system"
        enableTransitions={false}
        forcedTheme="light"
      >
        <Capture />
      </ThemeProvider>
    );
    expect(html().classList.contains('light')).toBe(true);
    expect(localStorage.getItem('lumina-theme')).toBe('dark');

    // Leaving the forced page brings the setting back.
    rerender(
      <ThemeProvider defaultTheme="system" enableTransitions={false}>
        <Capture />
      </ThemeProvider>
    );
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('persists a choice made with setTheme', () => {
    render(
      <ThemeProvider defaultTheme="system" enableTransitions={false}>
        <Capture />
      </ThemeProvider>
    );
    act(() => setTheme('dark'));
    expect(html().classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('lumina-theme')).toBe('dark');
  });
});
