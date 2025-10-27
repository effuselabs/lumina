/**
 * Script to fix common TypeScript errors in test files
 * 
 * Fixes:
 * 1. Implicit 'any' types on common callback parameters
 * 2. Missing type annotations on arrow functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

function fixImplicitAnyTypes(content: string): { content: string; changes: number } {
  let fixed = content;
  let changes = 0;

  // Fix: (callback) => ... to (callback: any) => ...
  const callbackPattern = /\(callback\)(\s*=>)/g;
  fixed = fixed.replace(callbackPattern, (match, arrow) => {
    changes++;
    return `(callback: any)${arrow}`;
  });
  
  // Fix: callback => ... to (callback: any) => ... (without parens)
  const callbackNoParensPattern = /(?<![a-zA-Z0-9_])callback(\s*=>)/g;
  fixed = fixed.replace(callbackNoParensPattern, (match, arrow) => {
    changes++;
    return `(callback: any)${arrow}`;
  });

  // Fix: (error) => ... to (error: any) => ... (in catch blocks and callbacks)
  const errorPattern = /\(error\)(\s*=>)/g;
  fixed = fixed.replace(errorPattern, (match, arrow) => {
    changes++;
    return `(error: any)${arrow}`;
  });
  
  // Fix: error => ... to (error: any) => ... (without parens)
  const errorNoParensPattern = /(?<![a-zA-Z0-9_])error(\s*=>)/g;
  fixed = fixed.replace(errorNoParensPattern, (match, arrow) => {
    changes++;
    return `(error: any)${arrow}`;
  });

  // Fix: (result) => ... to (result: any) => ... (with or without parens)
  const resultPattern = /\(result\)(\s*=>)/g;
  fixed = fixed.replace(resultPattern, (match, arrow) => {
    changes++;
    return `(result: any)${arrow}`;
  });
  
  // Fix: result => ... to (result: any) => ... (without parens)
  const resultNoParensPattern = /(?<![a-zA-Z0-9_])result(\s*=>)/g;
  fixed = fixed.replace(resultNoParensPattern, (match, arrow) => {
    changes++;
    return `(result: any)${arrow}`;
  });

  // Fix: (item) => ... to (item: any) => ...
  const itemPattern = /\(item\)(\s*=>)/g;
  fixed = fixed.replace(itemPattern, (match, arrow) => {
    changes++;
    return `(item: any)${arrow}`;
  });

  // Fix: (key) => ... to (key: any) => ...
  const keyPattern = /\(key\)(\s*=>)/g;
  fixed = fixed.replace(keyPattern, (match, arrow) => {
    changes++;
    return `(key: any)${arrow}`;
  });

  // Fix: (apt) => ... to (apt: any) => ...
  const aptPattern = /\(apt\)(\s*=>)/g;
  fixed = fixed.replace(aptPattern, (match, arrow) => {
    changes++;
    return `(apt: any)${arrow}`;
  });

  // Fix: (staff) => ... to (staff: any) => ...
  const staffPattern = /\(staff\)(\s*=>)/g;
  fixed = fixed.replace(staffPattern, (match, arrow) => {
    changes++;
    return `(staff: any)${arrow}`;
  });

  // Fix: (service) => ... to (service: any) => ...
  const servicePattern = /\(service\)(\s*=>)/g;
  fixed = fixed.replace(servicePattern, (match, arrow) => {
    changes++;
    return `(service: any)${arrow}`;
  });

  // Fix: (client) => ... to (client: any) => ...
  const clientPattern = /\(client\)(\s*=>)/g;
  fixed = fixed.replace(clientPattern, (match, arrow) => {
    changes++;
    return `(client: any)${arrow}`;
  });

  // Fix: (value) => ... to (value: any) => ...
  const valuePattern = /\(value\)(\s*=>)/g;
  fixed = fixed.replace(valuePattern, (match, arrow) => {
    changes++;
    return `(value: any)${arrow}`;
  });

  // Fix: (data) => ... to (data: any) => ...
  const dataPattern = /\(data\)(\s*=>)/g;
  fixed = fixed.replace(dataPattern, (match, arrow) => {
    changes++;
    return `(data: any)${arrow}`;
  });

  // Fix: (req, res, ctx) => ... to (req: any, res: any, ctx: any) => ...
  const reqResCtxPattern = /\(req,\s*res,\s*ctx\)(\s*=>)/g;
  fixed = fixed.replace(reqResCtxPattern, (match, arrow) => {
    changes++;
    return `(req: any, res: any, ctx: any)${arrow}`;
  });

  // Fix: (monitor) => ... to (monitor: any) => ...
  const monitorPattern = /\(monitor\)(\s*=>)/g;
  fixed = fixed.replace(monitorPattern, (match, arrow) => {
    changes++;
    return `(monitor: any)${arrow}`;
  });
  
  // Fix: monitor => ... to (monitor: any) => ... (without parens)
  const monitorNoParensPattern = /(?<![a-zA-Z0-9_])monitor(\s*=>)/g;
  fixed = fixed.replace(monitorNoParensPattern, (match, arrow) => {
    changes++;
    return `(monitor: any)${arrow}`;
  });

  // Fix: (warning) => ... to (warning: any) => ...
  const warningPattern = /\(warning\)(\s*=>)/g;
  fixed = fixed.replace(warningPattern, (match, arrow) => {
    changes++;
    return `(warning: any)${arrow}`;
  });
  
  // Fix: warning => ... to (warning: any) => ... (without parens)
  const warningNoParensPattern = /(?<![a-zA-Z0-9_])warning(\s*=>)/g;
  fixed = fixed.replace(warningNoParensPattern, (match, arrow) => {
    changes++;
    return `(warning: any)${arrow}`;
  });

  // Fix: (_, j) => ... to (_: any, j: any) => ...
  const underscoreJPattern = /\(_,\s*j\)(\s*=>)/g;
  fixed = fixed.replace(underscoreJPattern, (match, arrow) => {
    changes++;
    return `(_: any, j: any)${arrow}`;
  });

  return { content: fixed, changes };
}

async function processFile(filePath: string): Promise<number> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const { content: fixed, changes } = fixImplicitAnyTypes(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixed, 'utf-8');
      return changes;
    }

    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return 0;
  }
}

async function main() {
  console.log('🔧 Fixing implicit any types in test files...\n');

  // Find all test files
  const testFiles = await glob('__tests__/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    absolute: true,
  });

  console.log(`Found ${testFiles.length} test files\n`);

  let totalChanges = 0;
  let filesFixed = 0;

  for (const file of testFiles) {
    const relativePath = path.relative(process.cwd(), file);
    const changes = await processFile(file);
    
    if (changes > 0) {
      filesFixed++;
      totalChanges += changes;
      console.log(`✅ ${relativePath}: Fixed ${changes} implicit any types`);
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total changes: ${totalChanges}`);
  console.log(`\nRun 'npm run type-check' to verify fixes.`);
}

main().catch(console.error);
