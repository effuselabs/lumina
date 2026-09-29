import { readFileSync } from 'fs';
import { join } from 'path';
import { tokenStylesheet } from '@/lib/design/token-stylesheet';

/**
 * Stylesheets take their colours from lib/design/tokens.ts, through the
 * custom properties generated into app/tokens.css.
 *
 * globals.css used to write its own hex, and it drifted: tokens.ts said info
 * was #0284C7 while every `text-info` rendered #2563EB, and the
 * design-system page, rendering from tokens.ts, showed a colour users never
 * saw. Generating the properties removes the second copy; these tests keep it
 * removed.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

describe('app/tokens.css', () => {
  it('is what `npm run tokens:css` generates from tokens.ts', () => {
    expect(read('app/tokens.css')).toBe(tokenStylesheet());
  });
});

describe.each(['app/globals.css', 'app/booking-mobile.css'])('%s', path => {
  it('holds no hex colour of its own', () => {
    expect(read(path).match(HEX) ?? []).toEqual([]);
  });
});
