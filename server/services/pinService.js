import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const hashPin = (pin) => {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
};

export const setPin = async (userId, pin) => {
  const pinHash = hashPin(pin);
  return await prisma.user.update({
    where: { id: userId },
    data: { pinHash },
  });
};

export async function verifyPin(userId, pin) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.pinHash) return { valid: false, reason: 'NO_PIN_SET' };
  return { valid: user.pinHash === hashPin(pin), reason: user.pinHash === hashPin(pin) ? null : 'INCORRECT_PIN' };
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
  setPin,
  setUserPin: setPin,
  verifyPin,
  hasPinSet,
  checkPinStatus,
};
