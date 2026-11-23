import { AsyncLocalStorage } from 'node:async_hooks';

// The time the ledger stamps on an entry. Always the real time, except while
// the live examples are being built: they replay a stokvel's year, so each
// entry carries the day it belongs to (and the hash chain covers that date).
const storage = new AsyncLocalStorage();

export function now() {
  const at = storage.getStore();
  return at ? new Date(at) : new Date();
}

export function runAt(date, fn) {
  return storage.run(new Date(date).toISOString(), fn);
}
