import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The home page claimed a 24% revenue increase, 8.5 hours saved weekly and
 * 89% client retention — twice — and quoted "Sarah Chen, Owner, Bloom Beauty
 * Salon". There are no customers yet, so none of it came from anywhere (#128).
 * The page may say what Lumina does; it may not report results nobody
 * measured, or quote people who do not exist.
 */
describe('the home page', () => {
  const source = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');

  it('reports no results', () => {
    expect(source).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(source).not.toMatch(/\d+(\.\d+)?\s*(hrs|hours)\b/i);
    expect(source).not.toMatch(/StatCard/);
  });

  it('quotes no customers', () => {
    expect(source).not.toMatch(/<blockquote/);
    expect(source).not.toMatch(/Sarah Chen|Bloom Beauty/);
    expect(source).not.toMatch(/Proven Results|Real results from/);
  });
});
