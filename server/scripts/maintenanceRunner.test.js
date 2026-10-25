import { describe, it, expect } from 'vitest';
import { runTasks } from './maintenanceRunner.js';

describe('runTasks', () => {
  it('runs tasks in order and keeps going after a failure', async () => {
    const ran = [];
    const failed = await runTasks([
      ['first', async () => { ran.push('first'); }],
      ['second', async () => { ran.push('second'); throw new Error('bad'); }],
      ['third', async () => { ran.push('third'); }],
    ], () => {});
    expect(ran).toEqual(['first', 'second', 'third']);
    expect(failed).toEqual(['second']);
  });

  it('returns no failures when everything runs', async () => {
    expect(await runTasks([['only', async () => {}]], () => {})).toEqual([]);
  });
});
