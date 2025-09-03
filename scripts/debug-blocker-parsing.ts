#!/usr/bin/env tsx
/**
 * Debug Blocker Parsing
 * 
 * Test script to debug why blocker parsing isn't working
 */

import { promises as fs } from 'fs';
import { DailyStatusBlockerTracker } from '../lib/daily-status-blocker-tracker';

async function debugBlockerParsing() {
    console.log('🔍 Debugging blocker parsing...\n');

    try {
        // Read the daily status file directly
        const filePath = 'docs/daily-status/2025-09-02.md';
        const content = await fs.readFile(filePath, 'utf8');

        console.log('📄 File content around blocker section:');
        const lines = content.split('\n');
        const blockerStartIndex = lines.findIndex(line => line.includes('#### Test blocker for Linear integration'));

        if (blockerStartIndex >= 0) {
            console.log('Found blocker at line:', blockerStartIndex + 1);
            console.log('Blocker section:');
            for (let i = blockerStartIndex; i < Math.min(blockerStartIndex + 15, lines.length); i++) {
                console.log(`${i + 1}: "${lines[i]}"`);
            }
        } else {
            console.log('❌ Blocker section not found');
        }

        console.log('\n🧪 Testing blocker tracker parsing...');
        const tracker = new DailyStatusBlockerTracker();
        const blockers = await tracker.getBlockersFromDate(new Date('2025-09-02'));

        console.log(`Found ${blockers.length} blockers:`);
        blockers.forEach(blocker => {
            console.log(`- ${blocker.title} (${blocker.id})`);
            console.log(`  Status: ${blocker.status}, Priority: ${blocker.priority}`);
            console.log(`  Linear Issue: ${blocker.linearIssue || 'None'}`);
        });

        // Test the regex directly
        console.log('\n🔍 Testing regex directly...');
        const blockerRegex = /#### (.*?)\n\n- \*\*ID\*\*: (.*?)\n- \*\*Status\*\*: (.*?)\n- \*\*Priority\*\*: (.*?)\n- \*\*Description\*\*: (.*?)\n- \*\*Impact\*\*: (.*?)\n(?:- \*\*Assignee\*\*: (.*?)\n)?- \*\*Next Steps\*\*: (.*?)\n- \*\*Created\*\*: (.*?)\n(?:- \*\*Target Resolution\*\*: (.*?)\n)?(?:- \*\*Resolved\*\*: (.*?)\n)?(?:- \*\*Linear Issue\*\*: (.*?)\n)?(?:- \*\*Tags\*\*: (.*?)\n)?/g;

        const matches = [...content.matchAll(blockerRegex)];
        console.log(`Regex found ${matches.length} matches`);

        matches.forEach((match, index) => {
            console.log(`Match ${index + 1}:`);
            console.log(`  Title: "${match[1]}"`);
            console.log(`  ID: "${match[2]}"`);
            console.log(`  Status: "${match[3]}"`);
            console.log(`  Linear Issue: "${match[12] || 'None'}"`);
        });

    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugBlockerParsing();