import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

/**
 * Returns the 32-byte encryption key derived from APP_ENCRYPTION_KEY env var.
 * APP_ENCRYPTION_KEY should be a 64-char hex string (32 bytes) — generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex) throw new Error("APP_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return key;
}

/**
 * Encrypts a plaintext string. Output format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * Used to store CAS PDF passwords at rest (CASUpload.passwordEncrypted).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypts a string produced by encrypt(). Throws if the format is invalid
 * or authentication fails (tampered/corrupted data).
 */
export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload format");

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
