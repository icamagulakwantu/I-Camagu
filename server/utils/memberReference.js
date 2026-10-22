import prisma from '../config/db.js';
import { generateUniqueReference } from './referenceGenerator.js';

// STK-XXX-### is a per-account code, not a per-transaction one: a member
// keeps the SAME code across every one of their own contributions (that
// stability is what lets reconciliationService match a recurring bank
// narration back to them). Checked globally so two different stokvels'
// first members can't both land on STK-THA-001. A genuine collision falls
// back to a random suffix instead of silently colliding.
export async function generateReferenceCode(firstName, sequenceNumber) {
  const initials = (firstName || 'MEM').slice(0, 3).toUpperCase().padEnd(3, 'X');
  const number = String(sequenceNumber).padStart(3, '0');
  const base = `STK-${initials}-${number}`;
  const exists = async (code) => !!(await prisma.stokvelMember.findFirst({ where: { referenceCode: code } }));
  if (!(await exists(base))) return base;
  return generateUniqueReference(`STK-${initials}`, exists);
}
