// src/lib/whatsapp.js
export function shareToWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

export function whatsappLinkTo(phoneNumber, text) {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}
