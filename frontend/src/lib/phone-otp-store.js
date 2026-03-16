/**
 * Server-side OTP store for phone-based login.
 * Module-level Map persists across requests within the same Node.js process.
 * Entries expire after 5 minutes (enforced on verify and lazily pruned on send).
 */
export const otpStore = new Map(); // phone → { otp: string, expiresAt: number }
