export const ADMIN_EMAILS = ['icamagulakwantu@gmail.com'];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}
