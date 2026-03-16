/**
 * Server-side OTP store for phone-based login.
 * Anchored to globalThis so it is shared across all route bundles in the same
 * Node.js process (Next.js compiles each route.js independently, making plain
 * module-level variables invisible across routes).
 */
if (!globalThis._phoneOtpStore) {
    globalThis._phoneOtpStore = new Map();
}
export const otpStore = globalThis._phoneOtpStore; // phone → { otp: string, expiresAt: number }
