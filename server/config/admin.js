// icamagulakwantu@gmail.com is kept as a fallback so admin access isn't lost
// if the new i-camagu.co.za mailbox isn't logged into yet — remove it once
// admin@i-camagu.co.za is confirmed working in production.
export const ADMIN_EMAILS = ['admin@i-camagu.co.za', 'icamagulakwantu@gmail.com'];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}
