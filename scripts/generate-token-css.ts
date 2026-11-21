/**
 * Writes app/tokens.css from lib/design/tokens.ts, and app/theme.css (the
 * Tailwind theme) from lib/design/tailwind-theme.ts. Run `npm run tokens:css`
 * after changing either; the tokens-css test fails until you do.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { themeStylesheet } from '../lib/design/tailwind-theme';
import { tokenStylesheet } from '../lib/design/token-stylesheet';

const app = join(__dirname, '..', 'app');
writeFileSync(join(app, 'tokens.css'), tokenStylesheet());
writeFileSync(join(app, 'theme.css'), themeStylesheet());
