// Validate a weekly price-check file before it is committed:
//   node server/scripts/check-price-file.js server/data/price-checks/2026-11-30.json
import { readFileSync } from 'node:fs';
import { validateCheckFile } from './apply-price-checks.js';

const path = process.argv[2];
if (!path) { console.error('Usage: node server/scripts/check-price-file.js <file>'); process.exit(2); }
const problems = validateCheckFile(JSON.parse(readFileSync(path, 'utf8')));
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('OK');
