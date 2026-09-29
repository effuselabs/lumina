import { contrastRatio } from '@/lib/design/contrast';
import { contrastPairs, prohibitedPairs } from '@/lib/design/tokens';

/**
 * WCAG 2.1 contrast enforcement.
 *
 * Contrast used to be checked by periodic accessibility audits, whose findings
 * became documents and then specs and then, mostly, nothing. Here it is a test:
 * a token change that breaks contrast fails CI immediately, on the commit that
 * caused it.
 */

describe('design token contrast', () => {
  it('has pairs declared', () => {
    expect(contrastPairs.length).toBeGreaterThan(0);
  });

  describe.each(contrastPairs)(
    '$name',
    ({ name, foreground, background, largeText }) => {
      const required = largeText ? 3 : 4.5;

      it(`meets WCAG AA (${required}:1)`, () => {
        const ratio = contrastRatio(foreground, background);
        const rounded = Math.round(ratio * 100) / 100;

        if (ratio < required) {
          throw new Error(
            `"${name}" fails WCAG AA: ${foreground} on ${background} is ` +
              `${rounded}:1, needs ${required}:1. Adjust the token in ` +
              `lib/design/tokens.ts rather than overriding it at the call site.`
          );
        }

        expect(rounded).toBeGreaterThanOrEqual(required);
      });
    }
  );
});

describe('prohibited pairs stay prohibited', () => {
  // These are documented as failing. If a palette change ever makes one pass,
  // the note in tokens.ts is stale and should be removed rather than left to
  // mislead.
  it.each(prohibitedPairs)(
    '$foreground on $background is still below AA',
    ({ foreground, background, ratio }) => {
      const actual = contrastRatio(foreground, background);
      expect(actual).toBeLessThan(4.5);
      expect(actual).toBeCloseTo(ratio, 1);
    }
  );
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(Math.round(contrastRatio('#000000', '#FFFFFF'))).toBe(21);
  });

  it('returns 1:1 for identical colours', () => {
    expect(contrastRatio('#FFD25A', '#FFD25A')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#0B2B33', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#0B2B33'),
      10
    );
  });

  it('rejects malformed hex', () => {
    expect(() => contrastRatio('#FFF', '#FFFFFF')).toThrow(/6-digit hex/);
  });
});
