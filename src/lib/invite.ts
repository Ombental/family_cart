/**
 * Shared invite utilities used by both US-01 (group creation) and US-00c (join flow).
 */

const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
const INVITE_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Generate a short, user-friendly invite code (6 alphanumeric chars).
 * Excludes ambiguous characters (0, O, 1, I).
 */
export function generateInviteCode(): string {
  let code = "";
  const array = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS[array[i] % INVITE_CODE_CHARS.length];
  }
  return code;
}

/**
 * Returns a Date set to now + 48 hours, for invite expiration.
 */
export function getInviteExpiration(): Date {
  return new Date(Date.now() + INVITE_DURATION_MS);
}

/**
 * Check whether an invite expiration timestamp is still valid.
 */
export function isInviteValid(expiresAt: Date): boolean {
  return Date.now() < expiresAt.getTime();
}
