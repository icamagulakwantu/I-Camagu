import { describe, it, expect, vi } from 'vitest';
import { createFatalHandler } from './processHandlers.js';

// DB-03: after an uncaught error the server used to log and keep running in
// an unknown state. It must now report the error and exit so Render restarts it.
describe('createFatalHandler', () => {
  it('reports the error, flushes, then exits with code 1', async () => {
    const order = [];
    const handle = createFatalHandler({
      captureException: () => order.push('capture'),
      flush: async () => { order.push('flush'); },
      exit: (code) => order.push(`exit:${code}`),
      log: () => {},
    });
    await handle('Uncaught exception', new Error('boom'));
    expect(order).toEqual(['capture', 'flush', 'exit:1']);
  });

  it('still exits when reporting itself fails', async () => {
    const exit = vi.fn();
    const handle = createFatalHandler({
      captureException: () => { throw new Error('sentry down'); },
      exit,
      log: () => {},
    });
    await handle('Uncaught exception', new Error('boom'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('turns a non-Error rejection into an Error and exits only once', async () => {
    const captured = [];
    const exit = vi.fn();
    const handle = createFatalHandler({ captureException: (e) => captured.push(e), exit, log: () => {} });
    await handle('Unhandled promise rejection', 'plain string');
    await handle('Unhandled promise rejection', 'second');
    expect(captured[0]).toBeInstanceOf(Error);
    expect(captured).toHaveLength(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
