#!/usr/bin/env tsx
/**
 * Test File Content
 * 
 * Test the regex with the actual file content
 */

import { promises as fs } from 'fs';

async function testFileContent() {
    console.log('🧪 Testing with actual file content...\n');

    try {
        const content = await fs.readFile('docs/daily-status/2025-09-02.md', 'utf8');

        // Extract just the blocker section
        const lines = content.split('\n');
        const startIndex = lines.findIndex(line => line.includes('#### Test CLI blocker'));
        const endIndex = lines.findIndex((line, index) => index > startIndex && line.startsWith('### '));

        if (startIndex >= 0 && endIndex >= 0) {
            const blockerSection = lines.slice(startIndex, endIndex).join('\n');
            console.log('Extracted blocker section:');
            console.log('---START---');
            console.log(blockerSection);
            console.log('---END---');

            // Test the regex
            const blockerRegex = /#### (.*?)\n\n- \*\*ID\*\*: (.*?)\n- \*\*Status\*\*: (.*?)\n- \*\*Priority\*\*: (.*?)\n- \*\*Description\*\*: (.*?)\n- \*\*Impact\*\*: (.*?)\n(?:- \*\*Assignee\*\*: (.*?)\n)?- \*\*Next Steps\*\*: (.*?)\n- \*\*Created\*\*: (.*?)\n(?:- \*\*Target Resolution\*\*: (.*?)\n)?(?:- \*\*Resolved\*\*: (.*?)\n)?(?:- \*\*Linear Issue\*\*: (.*?)\n)?(?:- \*\*Tags\*\*: (.*?)\n)?/g;

            const matches = [...blockerSection.matchAll(blockerRegex)];
            console.log(`\nFound ${matches.length} matches in extracted section`);

            if (matches.length === 0) {
                console.log('\n🔍 Debugging character by character...');
                const expectedStart = '#### Test CLI blocker\n\n- **ID**:';
                const actualStart = blockerSection.substring(0, expectedStart.length);

                console.log('Expected start:', JSON.stringify(expectedStart));
                console.log('Actual start:  ', JSON.stringify(actualStart));

                for (let i = 0; i < Math.min(expectedStart.length, actualStart.length); i++) {
                    if (expectedStart[i] !== actualStart[i]) {
                        console.log(`Difference at position ${i}:`);
                        console.log(`  Expected: "${expectedStart[i]}" (${expectedStart.charCodeAt(i)})`);
                        console.log(`  Actual:   "${actualStart[i]}" (${actualStart.charCodeAt(i)})`);
                        break;
                    }
                }
            }
        } else {
            console.log('❌ Could not find blocker section');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testFileContent();