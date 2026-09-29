/**
 * Writes app/tokens.css from lib/design/tokens.ts. Run `npm run tokens:css`
 * after changing a token; the tokens-css test fails until you do.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tokenStylesheet } from '../lib/design/token-stylesheet';

writeFileSync(join(__dirname, '..', 'app', 'tokens.css'), tokenStylesheet());
