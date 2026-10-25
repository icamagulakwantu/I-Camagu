// Process-level failure handling (DB-03).
//
// After an uncaught exception Node's own docs say the process is in an
// undefined state and must not carry on serving requests. We log it, give
// Sentry a moment to send the report, then exit with code 1 so Render
// starts a clean process.

const FLUSH_TIMEOUT_MS = 2000;

export function createFatalHandler({ captureException, flush, exit = (code) => process.exit(code), log = console.error }) {
  let exiting = false;
  return async function handleFatal(kind, err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log(`${kind}:`, error.message, error.stack);
    // A second failure while we are already shutting down must not start
    // another shutdown.
    if (exiting) return;
    exiting = true;
    try {
      captureException(error);
      if (flush) {
        await Promise.race([
          flush(FLUSH_TIMEOUT_MS),
          new Promise((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS)),
        ]);
      }
    } catch (reportError) {
      log('Could not report the fatal error:', reportError?.message);
    } finally {
      exit(1);
    }
  };
}

export function installFatalHandlers(options) {
  const handleFatal = createFatalHandler(options);
  process.on('uncaughtException', (err) => handleFatal('Uncaught exception', err));
  // A rejected promise nobody caught is logged and reported but does NOT
  // stop the server: some notification sends are fire-and-forget, and
  // exiting on those could put the app in a restart loop. Revisit once
  // every background promise is known to handle its own errors.
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    (options.log || console.error)('Unhandled promise rejection:', error.message);
    options.captureException(error);
  });
  return handleFatal;
}
