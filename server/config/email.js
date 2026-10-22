import { Resend } from 'resend';

// Who emails come from. Resend's test address (onboarding@resend.dev) only
// delivers to the Resend account owner, so real members never got their
// login codes. Once the i-camagu.co.za domain is verified in Resend, set the
// EMAIL_FROM secret on Render, e.g.  iCamagu <no-reply@i-camagu.co.za>
export const FROM_ADDRESS = process.env.EMAIL_FROM || 'onboarding@resend.dev';

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

// Every send goes out from EMAIL_FROM when it is set, so no call site has to
// change when the real domain is switched on.
if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
  const originalSend = resend.emails.send.bind(resend.emails);
  resend.emails.send = (message, ...rest) => originalSend({ ...message, from: process.env.EMAIL_FROM }, ...rest);
}

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set — emails will fail gracefully instead of crashing the server.');
} else if (!process.env.EMAIL_FROM) {
  console.warn('EMAIL_FROM is not set — emails are sent from onboarding@resend.dev, which only reaches the Resend account owner.');
}

export default resend;
