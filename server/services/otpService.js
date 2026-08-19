import crypto from 'crypto';
import prisma from '../config/db.js';

const OTP_EXPIRY_MINUTES = 10;

// Generates a 6-digit code and stores its hash (never the raw code) against the user
export async function createOtp(userId) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

          await prisma.otpCode.create({
              data: { userId, codeHash, expiresAt },
                });

                  return code; // the raw code — only returned so we can email it; never stored raw
                  }

                  // Verifies a submitted code against the most recent unconsumed OTP for that user
                  export async function verifyOtp(userId, submittedCode) {
                    const codeHash = crypto.createHash('sha256').update(submittedCode).digest('hex');

                      const otp = await prisma.otpCode.findFirst({
                          where: {
                                userId,
                                      codeHash,
                                            consumedAt: null,
                                                  expiresAt: { gt: new Date() },
                                                      },
                                                          orderBy: { createdAt: 'desc' },
                                                            });

                                                              if (!otp) return false;

                                                                // Mark as consumed so it can't be reused
                                                                  await prisma.otpCode.update({
                                                                      where: { id: otp.id },
                                                                          data: { consumedAt: new Date() },
                                                                            });

                                                                              return true;
                                                                              }