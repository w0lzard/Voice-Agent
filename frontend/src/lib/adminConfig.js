// ─── Admin Access Configuration ──────────────────────────────────────────────
//
// ONLY the email defined here can access the admin panel and /admins route.
// Change AUTHORIZED_ADMIN_EMAIL to your real admin email before deploying.
//
// TODO (backend integration): Replace client-side check with a server-side
// role check, e.g. JWT claims from /v1/admin/auth/login or a "role: admin"
// field on the user object returned by /v1/auth/me.
// When ready, simply remove this file and let the backend decide.

export const AUTHORIZED_ADMIN_EMAIL = 'admin@voiceai.com';

// Demo password used on the admin login page (frontend-only, no backend yet)
export const ADMIN_PASSWORD = 'admin123';

/**
 * Returns true only if `email` matches the single authorised admin.
 * All admin-route guards call this — never compare emails inline.
 *
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
export function isAuthorizedAdmin(email) {
    return (
        typeof email === 'string' &&
        email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()
    );
}
