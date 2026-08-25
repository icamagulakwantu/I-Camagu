import { Resend } from 'resend';

// A missing key must never crash the whole server at boot — every route
// would go down over an email problem, not just the ones that send mail.
// Fall back to a stub with the same shape the SDK returns on failure, so
// every existing call site (`const { error } = await resend.emails.send(...)`)
// keeps working without modification.
const stub = {
  emails: {
    send: async () => ({
      data: null,
      error: { message: 'RESEND_API_KEY is not configured' },
    }),
  },
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : stub;

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set — emails will fail gracefully instead of crashing the server.');
}

export default resend;
