import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

export function validatePinFormat(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

export const setPin = async (userId, pin) => {
  if (!validatePinFormat(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  const pinHash = await hashPin(pin);
  return prisma.user.update({
    where: { id: userId },
    data: { pinHash },
  });
};

export async function verifyPin(userId, pin) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.pinHash) return { valid: false, reason: 'NO_PIN_SET' };
  const valid = await bcrypt.compare(String(pin), user.pinHash);
  return { valid, reason: valid ? null : 'INCORRECT_PIN' };
}

export const hasPinSet = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  });
  return Boolean(user?.pinHash);
};

export const checkPinStatus = async (userId) => {
  const isSet = await hasPinSet(userId);
  return { isPinSet: isSet };
};

export default {
  hashPin,
  validatePinFormat,
  setPin,
  setUserPin: setPin,
  verifyPin,
  hasPinSet,
  checkPinStatus,
};
