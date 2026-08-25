// Mirrors server/config/admin.js — used only to gate admin-only UI on the
// frontend; the server independently enforces the same check on every
// admin route, so this is a display concern, not the real access control.
const ADMIN_EMAILS = ['admin@i-camagu.co.za', 'icamagulakwantu@gmail.com'];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}
