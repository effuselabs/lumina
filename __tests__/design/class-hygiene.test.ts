/**
 * @jest-environment node
 */
import {
  buildStylesheet,
  markupClasses,
  read,
  selectorFor,
  sourceFiles,
} from './support/stylesheet';

/**
 * The guardrails from docs/visual-language.md, in place before the new look
 * so that it is built inside them (#152).
 *
 * Most rules are ratchets. The files listed under each still break it, and
 * are rebuilt in stages 2–5. Any other file that starts breaking it fails
 * here, and so does a listed file that stops, so the list can only shrink:
 * delete the file's line in the same pull request that fixes it. A file that
 * may use glass or a gradient on purpose (the glass header, the gold
 * button) is added to ALLOWED with a reason, not to a ratchet.
 */

const markup = sourceFiles(['app/**/*.tsx', 'components/**/*.tsx']);

const RULES = {
  /** Animating every property animates layout too; name what moves. */
  'transition-all': /(?<![\w-])transition-all(?![\w-])/,
  /** Motion's rule: buttons press and lift, they do not grow on hover. */
  'hover:scale': /(?<![\w-])hover:scale-\d/,
  /** Glass is for the header, the tab bar and /book's summary bar only. */
  'backdrop-*':
    /(?<![\w-])(?:[\w-]+:)*backdrop-(?:blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|filter)/,
  /** Gradients are for the gold button and the ambient light only. */
  gradient:
    /(?<![\w-])(?:[\w-]+:)*(?:bg-(?:linear|gradient|radial|conic)-|from-[a-z]|via-[a-z])/,
} as const;

type Rule = keyof typeof RULES;

/** Files that break a rule today, until their screen is rebuilt. */
const RATCHET: Record<Rule, string[]> = {
  'transition-all': [
    'app/design-system/page.tsx',
    'app/design-system/theme-test/page.tsx',
    'app/page.tsx',
    'components/appointments/appointment-block.tsx',
    'components/appointments/month-view.tsx',
    'components/appointments/undo-notification.tsx',
    'components/booking/mobile-optimized-booking.tsx',
    'components/booking/optimized-booking-interface.tsx',
    'components/booking/service-selection.tsx',
    'components/staff/employment-type-selector.tsx',
    'components/staff/staff-list.tsx',
    'components/ui/animated-counter.tsx',
    'components/ui/badge.tsx',
    'components/ui/button.tsx',
    'components/ui/card.tsx',
    'components/ui/input.tsx',
    'components/ui/progress.tsx',
    'components/ui/select.tsx',
    'components/ui/tabs.tsx',
    'components/ui/textarea.tsx',
    'components/ui/theme-switcher.tsx',
  ],
  'hover:scale': ['components/ui/badge.tsx', 'components/ui/button.tsx'],
  'backdrop-*': [
    'app/design-system/page.tsx',
    'app/page.tsx',
    'components/ui/button.tsx',
    'components/ui/dialog.tsx',
  ],
  gradient: [
    'app/design-system/buttons/page.tsx',
    'app/onboarding/page.tsx',
    'components/booking/booking-confirmation-step.tsx',
    'components/booking/booking-error-boundary.tsx',
    'components/booking/mobile-optimized-booking.tsx',
    'components/booking/optimized-booking-interface.tsx',
    'components/booking/public-booking-layout.tsx',
    'components/booking/service-selection.tsx',
    'components/booking/staff-time-selection.tsx',
    'components/clients/client-details-dialog.tsx',
    'components/dashboard/schedule-item.tsx',
    'components/onboarding/steps/address-step.tsx',
    'components/onboarding/steps/basic-info-step.tsx',
    'components/onboarding/steps/financial-model-step.tsx',
    'components/onboarding/steps/operating-hours-step.tsx',
    'components/onboarding/steps/settings-step.tsx',
    'components/staff/employment-configuration-form.tsx',
    'components/staff/staff-list.tsx',
  ],
};

/** Files allowed to use a rule's pattern on purpose, with the reason. */
const ALLOWED: Record<Rule, Record<string, string>> = {
  'transition-all': {},
  'hover:scale': {},
  'backdrop-*': {},
  gradient: {},
};

describe.each(Object.keys(RULES) as Rule[])('%s', rule => {
  const offenders = markup.filter(
    file => !(file in ALLOWED[rule]) && RULES[rule].test(read(file))
  );

  it('appears in no file that does not already use it', () => {
    expect(offenders.filter(file => !RATCHET[rule].includes(file))).toEqual([]);
  });

  it('is struck off the list once a file stops using it', () => {
    expect(RATCHET[rule].filter(file => !offenders.includes(file))).toEqual([]);
  });
});

describe('stylesheets', () => {
  it('never test for prefers-contrast: high, which no browser reports', () => {
    // The standard value is `more`. Blocks under `high` never applied.
    const css = sourceFiles(['app/**/*.css']).filter(file =>
      /prefers-contrast:\s*high/.test(read(file))
    );
    expect(css).toEqual([]);
  });
});

describe('every class written in markup', () => {
  it('exists in the built stylesheet', async () => {
    const used = markupClasses();
    const css = await buildStylesheet([...used.keys()]);
    // lucide-react tags its icons with these; they are hooks, not styles.
    const missing = [...used]
      .filter(([cls]) => !cls.startsWith('lucide'))
      .filter(([cls]) => !css.includes(selectorFor(cls)))
      .map(([cls, files]) => `${cls} (${[...new Set(files)].join(', ')})`);

    expect(missing).toEqual([]);
  }, 60_000);
});
