#!/usr/bin/env tsx
/**
 * Test Regex
 * 
 * Test the blocker regex with a simple example
 */

async function testRegex() {
    console.log('🧪 Testing blocker regex...\n');

    // The exact regex from the blocker tracker
    const blockerRegex = /#### (.*?)\n\n- \*\*ID\*\*: (.*?)\n- \*\*Status\*\*: (.*?)\n- \*\*Priority\*\*: (.*?)\n- \*\*Description\*\*: (.*?)\n- \*\*Impact\*\*: (.*?)\n(?:- \*\*Assignee\*\*: (.*?)\n)?- \*\*Next Steps\*\*: (.*?)\n- \*\*Created\*\*: (.*?)\n(?:- \*\*Target Resolution\*\*: (.*?)\n)?(?:- \*\*Resolved\*\*: (.*?)\n)?(?:- \*\*Linear Issue\*\*: (.*?)\n)?(?:- \*\*Tags\*\*: (.*?)\n)?/g;

    // Test with a simple example that should match
    const testContent = `#### Test blocker

- **ID**: BLOCK-2025-09-02-1234
- **Status**: new
- **Priority**: high
- **Description**: This is a test
- **Impact**: Testing
- **Next Steps**: Fix it
- **Created**: September 2, 2025
- **Linear Issue**: LUM-123
`;

    console.log('Test content:');
    console.log(testContent);
    console.log('\nTesting regex...');

    const matches = [...testContent.matchAll(blockerRegex)];
    console.log(`Found ${matches.length} matches`);

    if (matches.length > 0) {
        matches.forEach((match, index) => {
            console.log(`\nMatch ${index + 1}:`);
            console.log(`  Title: "${match[1]}"`);
            console.log(`  ID: "${match[2]}"`);
            console.log(`  Status: "${match[3]}"`);
            console.log(`  Priority: "${match[4]}"`);
            console.log(`  Linear Issue: "${match[12] || 'None'}"`);
        });
    } else {
        console.log('❌ No matches found');

        // Test parts of the regex
        console.log('\nTesting individual parts...');

        const titleRegex = /#### (.*?)\n\n/;
        const titleMatch = testContent.match(titleRegex);
        console.log(`Title match: ${titleMatch ? 'YES' : 'NO'}`);
        if (titleMatch) console.log(`  Title: "${titleMatch[1]}"`);

        const idRegex = /- \*\*ID\*\*: (.*?)\n/;
        const idMatch = testContent.match(idRegex);
        console.log(`ID match: ${idMatch ? 'YES' : 'NO'}`);
        if (idMatch) console.log(`  ID: "${idMatch[1]}"`);
    }
}

testRegex();