import { encrypt, decrypt } from "@/lib/crypto";

const TEST_KEY = "0".repeat(64); // 32 bytes of zeros, valid hex, test-only

describe("crypto encrypt/decrypt", () => {
  const originalEnv = process.env.APP_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.APP_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    process.env.APP_ENCRYPTION_KEY = originalEnv;
  });

  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "MyCASPassword123";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "ABCD1234";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("throws on tampered ciphertext (auth tag mismatch)", () => {
    const encrypted = encrypt("secret");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -2)}00`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on invalid payload format", () => {
    expect(() => decrypt("not-a-valid-payload")).toThrow("Invalid encrypted payload format");
  });

  it("throws when APP_ENCRYPTION_KEY is missing", () => {
    delete process.env.APP_ENCRYPTION_KEY;
    expect(() => encrypt("test")).toThrow("APP_ENCRYPTION_KEY is not configured");
    process.env.APP_ENCRYPTION_KEY = TEST_KEY;
  });

  it("throws when APP_ENCRYPTION_KEY is wrong length", () => {
    process.env.APP_ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("test")).toThrow("64-character hex string");
    process.env.APP_ENCRYPTION_KEY = TEST_KEY;
  });
});
