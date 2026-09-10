// Make a shipped fix actually reach the phone.
//
// iCamagu is a PWA, so a service worker precaches index.html and the hashed
// JS bundle. With skipWaiting + clientsClaim a new worker installs and takes
// control straight away — but the page that is already open goes on running
// the OLD bundle, because nothing reloads it. The new code only appears the
// *next* time the app is opened, which on a phone that never really closes
// can be days. Icons, prices, fixes: all shipped, none visible.
//
// So: when a new worker takes over, reload once. And because a PWA on a
// phone is usually resumed rather than launched, check for a new worker when
// the app comes back to the foreground rather than only at startup.

const HOUR = 60 * 60 * 1000;

export function watchForUpdates() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // On a first-ever install there is no previous controller and nothing
    // stale on screen — reloading there would just flash the app for no
    // reason. Only reload when we are replacing a worker that was already
    // driving this page.
    if (reloading || !navigator.serviceWorker.controller) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker.ready
    .then((registration) => {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      // Resuming the app is the moment that matters on a phone; the timer is
      // for the case where it stays open in the background for hours.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('online', check);
      setInterval(check, HOUR);
      check();
    })
    .catch(() => {});
}
