import { cssVariablesBlock } from './tokens';

/** The full contents of app/tokens.css. */
export function tokenStylesheet(): string {
  return [
    '/* Generated from lib/design/tokens.ts by `npm run tokens:css`. Do not edit. */',
    cssVariablesBlock(),
    '',
  ].join('\n');
}
