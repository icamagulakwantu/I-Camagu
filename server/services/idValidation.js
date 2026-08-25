// Validates a South African 13-digit ID number: YYMMDD SSSS C A Z
// (date of birth, gender sequence, citizenship, 8 = A, checksum).
// Reference: https://en.wikipedia.org/wiki/South_African_identity_card#Number_format
export function validateSaIdNumber(idNumber) {
  const digits = String(idNumber || '').trim();
  if (!/^\d{13}$/.test(digits)) return { valid: false, reason: 'ID number must be exactly 13 digits' };

  const year = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const day = parseInt(digits.slice(4, 6), 10);
  if (month < 1 || month > 12) return { valid: false, reason: 'Invalid birth month in ID number' };
  const century = year <= new Date().getFullYear() % 100 ? 2000 : 1900;
  const daysInMonth = new Date(century + year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return { valid: false, reason: 'Invalid birth day in ID number' };

  // Luhn-style checksum over all 13 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(digits[12], 10)) return { valid: false, reason: 'ID number checksum is invalid' };

  return { valid: true };
}
