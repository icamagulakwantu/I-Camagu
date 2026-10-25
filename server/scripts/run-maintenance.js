// Runs the one-off catalogue data repairs by hand:
//   node server/scripts/run-maintenance.js
// Exits with code 1 if any task failed, so a deploy step can notice.
import 'dotenv/config';
import prisma from '../config/db.js';
import { runMaintenance } from './maintenance.js';

const failed = await runMaintenance();
await prisma.$disconnect().catch(() => {});
if (failed.length) {
  console.error(`Maintenance finished with ${failed.length} failure(s): ${failed.join(', ')}`);
  process.exit(1);
}
console.log('Maintenance finished: all tasks ran.');
