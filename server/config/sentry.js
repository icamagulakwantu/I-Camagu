// server/config/sentry.js
// Optional, opt-in error monitoring — off by default, exactly like
// RESEND_API_KEY/PayFast: unset SENTRY_DSN means every function here is a
// safe no-op, never a crash. Live the moment Thandu creates a free Sentry
// account and sets SENTRY_DSN, no other code change needed.
let Sentry = null;

export async function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  try {
    Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      // Errors only, not performance tracing — this app has no volume yet
      // that would make trace sampling worth the added noise/cost.
      tracesSampleRate: 0,
    });
    console.log('Sentry error monitoring initialised.');
  } catch (error) {
    console.error('Sentry failed to initialise — continuing without it:', error.message);
    Sentry = null;
  }
}

// Safe to call whether or not Sentry is configured — mirrors the
// stub-when-unconfigured pattern in config/email.js so every call site
// works unconditionally.
export function captureException(err) {
  if (Sentry) Sentry.captureException(err);
}

// Waits (up to timeoutMs) for queued reports to be sent. Used before the
// process exits after a fatal error, so the report is not lost.
export async function flush(timeoutMs = 2000) {
  if (!Sentry) return true;
  return Sentry.flush(timeoutMs);
}
