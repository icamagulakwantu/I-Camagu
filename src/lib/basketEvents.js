export const BASKET_CHANGED_EVENT = 'icamagu:basket-changed';

// Notify the app shell when a basket mutation happens outside the Basket screen.
export function notifyBasketChanged() {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new Event(BASKET_CHANGED_EVENT));
}
