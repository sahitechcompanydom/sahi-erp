/**
 * Generate a random 8-character alphanumeric password (lowercase + digits).
 */
export function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function getTempPasswordExpiresAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 12);
  return d.toISOString();
}
