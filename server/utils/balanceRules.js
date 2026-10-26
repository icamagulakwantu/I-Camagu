// FIN-03: rules for comparing a stokvel's stored group balance with its books.
// No database in here, so every rule can be unit tested.
//
// Decision: the books (LedgerEntry/LedgerLine) are the official record of a
// stokvel's money. StokvelGroupLedger.totalBalance is a quick-read copy of the
// books' BANK account, kept for screens and for "is there enough money?"
// checks. Every books entry that moves BANK must move the stored balance by
// the same amount in the same transaction (see postEntryWithBalanceTx).

// How much an entry changes the group's bank money, in cents.
export function bankDeltaCents(lines) {
  return (lines || []).filter((l) => l.account === 'BANK').reduce((sum, l) => sum + l.amountCents, 0);
}

// A database DECIMAL as text ("350.50", "0.333", "-12") to whole cents.
// Never rounds: anything below a cent is cut off and flagged, so a stored
// balance that was once saved with float maths shows up as a mismatch.
export function decimalTextToCents(text) {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(text ?? '').trim());
  if (!match) throw new Error('Not a decimal amount');
  const [, sign, whole, frac = ''] = match;
  const cents = Number(whole) * 100 + Number(`${frac}00`.slice(0, 2));
  if (!Number.isSafeInteger(cents)) throw new Error('Amount is too large');
  return { cents: sign && cents ? -cents : cents, belowCent: /[1-9]/.test(frac.slice(2)) };
}

const rand = (cents) => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}R${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};

// Compares the stored balance with the books' BANK total and says, in plain
// words, whether they agree.
export function summariseBalanceCheck({ storedText, bookBankCents }) {
  const storedMissing = storedText === null || storedText === undefined;
  const stored = storedMissing ? { cents: 0, belowCent: false } : decimalTextToCents(storedText);
  const differenceCents = stored.cents - bookBankCents;
  const agrees = differenceCents === 0 && !stored.belowCent;

  let message;
  if (agrees) message = 'The stored balance matches the books.';
  else if (differenceCents > 0) message = `The stored balance is ${rand(differenceCents)} more than the books show.`;
  else if (differenceCents < 0) message = `The stored balance is ${rand(-differenceCents)} less than the books show.`;
  else message = 'The stored balance has a fraction of a cent the books do not.';

  return {
    agrees,
    storedCents: stored.cents,
    bookBankCents,
    differenceCents,
    storedHasFractionOfCent: stored.belowCent,
    storedMissing,
    message,
  };
}
