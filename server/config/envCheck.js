// Surfaces missing environment variables at boot, in Render's deploy logs,
// instead of as a confusing runtime error the first time a real user hits
// the affected feature (e.g. "Could not send the code" with no obvious
// cause). Never logs values — only whether each var is present.

const REQUIRED = [
  { name: 'DATABASE_URL', breaks: 'the entire app — Prisma cannot connect' },
  { name: 'JWT_ACCESS_SECRET', breaks: 'all login and session handling' },
  { name: 'JWT_REFRESH_SECRET', breaks: 'staying logged in across sessions' },
];

const OPTIONAL = [
  { name: 'APP_URL', breaks: 'password reset links (must be the public HTTPS origin)' },
  { name: 'RESEND_API_KEY', breaks: 'OTP login codes and password reset emails' },
  { name: 'GOOGLE_CLIENT_ID', breaks: 'Google sign-in (server-side token verification)' },
  { name: 'ID_ENCRYPTION_KEY', breaks: 'identity verification (ID number submission)' },
  { name: 'SUPABASE_URL', breaks: 'Supabase Storage (ceremony photo uploads)' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', breaks: 'Supabase Storage (ceremony photo uploads)' },
  { name: 'SUPABASE_STORAGE_BUCKET', breaks: 'Supabase Storage (ceremony photo uploads)' },
  // Free at sentry.io — create a project, set this to its DSN. Until then
  // the app runs exactly as before; nothing breaks, there's just no
  // dashboard visibility into server errors beyond Render's own logs.
  { name: 'SENTRY_DSN', breaks: 'error monitoring (falls back to Render logs only)' },
];

// Retained in the presence-only health report for deployment parity checks,
// but intentionally excluded from boot warnings: the 2026 no-custody policy
// disables online checkout in code regardless of whether these credentials exist.
const STATUS_ONLY = [
  { name: 'PAYFAST_MERCHANT_ID' },
  { name: 'PAYFAST_MERCHANT_KEY' },
];

export function checkRequiredEnvVars() {
  const missingRequired = REQUIRED.filter((v) => !process.env[v.name]);
  const missingOptional = OPTIONAL.filter((v) => !process.env[v.name]);

  if (missingRequired.length > 0) {
    console.error('FATAL — missing required environment variables:');
    for (const v of missingRequired) console.error(`  ✗ ${v.name} — breaks ${v.breaks}`);
  }
  if (missingOptional.length > 0) {
    console.warn('Missing optional environment variables (app will run, but these features are broken):');
    for (const v of missingOptional) console.warn(`  ⚠ ${v.name} — breaks ${v.breaks}`);
  }
  if (missingRequired.length === 0 && missingOptional.length === 0) {
    console.log('All known environment variables are set.');
  }
}

// Presence only — never values. Safe to expose unauthenticated since login
// itself may be the thing broken when this is needed.
export function envStatus() {
  const status = {};
  for (const v of [...REQUIRED, ...OPTIONAL, ...STATUS_ONLY]) {
    status[v.name] = !!process.env[v.name];
  }
  return status;
}
