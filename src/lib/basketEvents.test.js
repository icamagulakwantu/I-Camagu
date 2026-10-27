import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASKET_CHANGED_EVENT, notifyBasketChanged } from './basketEvents.js';

describe('notifyBasketChanged', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('dispatches a shared basket-change event in the browser', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    notifyBasketChanged();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(BASKET_CHANGED_EVENT);
  });
  it('is safe when no browser window exists', () => {
    vi.stubGlobal('window', undefined);
    expect(() => notifyBasketChanged()).not.toThrow();
  });
});
