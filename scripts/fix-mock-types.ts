/**
 * Script to automatically fix mock typing issues in test files
 * 
 * Replaces patterns like:
 *   mockPrisma.user.findMany.mockResolvedValue(...)
 * With:
 *   asMock(mockPrisma.user.findMany).mockResolvedValue(...)
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const TESTS_DIR = path.join(process.cwd(), '__tests__');

// Patterns to fix
const MOCK_PATTERNS = [
  /(\w+)\.(\w+)\.(\w+)\.(mockResolvedValue|mockRejectedValue|mockReturnValue|mockImplementation)/g,
];

function addImportIfNeeded(content: string): string {
  // Check if asMock import already exists
  if (content.includes("from '@/__tests__/utils/prisma-mock-helpers'")) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import .+ from .+$/gm;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    // No imports found, add at the beginning
    return `import { asMock } from '@/__tests__/utils/prisma-mock-helpers'\n\n${content}`;
  }

  // Add after the last import
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;

  return (
    content.slice(0, insertPosition) +
    `\nimport { asMock } from '@/__tests__/utils/prisma-mock-helpers'` +
    content.slice(insertPosition)
  );
}

function fixMockCalls(content: string): string {
  let fixed = content;
  let changesMade = 0;

  // Pattern: mockObject.method.mockResolvedValue -> asMock(mockObject.method).mockResolvedValue
  const pattern = /(\w+)\.(\w+)\.(\w+)\.(mockResolvedValue|mockRejectedValue|mockReturnValue|mockImplementation)/g;
  
  fixed = fixed.replace(pattern, (match, obj, prop1, prop2, mockMethod) => {
    // Don't wrap if already wrapped with asMock
    const beforeMatch = fixed.substring(Math.max(0, fixed.indexOf(match) - 10), fixed.indexOf(match));
    if (beforeMatch.includes('asMock(')) {
      return match;
    }

    changesMade++;
    return `asMock(${obj}.${prop1}.${prop2}).${mockMethod}`;
  });

  if (changesMade > 0) {
    console.log(`  Fixed ${changesMade} mock calls`);
  }

  return fixed;
}

async function processFile(filePath: string): Promise<boolean> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if file has mock calls that need fixing
    if (!content.match(/\.(mockResolvedValue|mockRejectedValue|mockReturnValue|mockImplementation)/)) {
      return false;
    }

    let fixed = content;
    
    // Fix mock calls
    fixed = fixMockCalls(fixed);
    
    // Add import if we made changes
    if (fixed !== content) {
      fixed = addImportIfNeeded(fixed);
      fs.writeFileSync(filePath, fixed, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing mock typing issues in test files...\n');

  // Find all test files
  const testFiles = await glob('__tests__/**/*.test.{ts,tsx}', {
    cwd: process.cwd(),
    absolute: true,
  });

  console.log(`Found ${testFiles.length} test files\n`);

  let filesFixed = 0;
  let filesProcessed = 0;

  for (const file of testFiles) {
    const relativePath = path.relative(process.cwd(), file);
    process.stdout.write(`Processing ${relativePath}...`);
    
    const wasFixed = await processFile(file);
    filesProcessed++;
    
    if (wasFixed) {
      filesFixed++;
      console.log(' ✅ Fixed');
    } else {
      console.log(' ⏭️  Skipped');
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Processed: ${filesProcessed} files`);
  console.log(`   Fixed: ${filesFixed} files`);
  console.log(`\nRun 'npm run type-check' to verify fixes.`);
}

main().catch(console.error);
