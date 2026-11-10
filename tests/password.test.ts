import { describe, expect, it } from "bun:test";
import { hashPassword, verifyPassword } from "../src/lib/password";

describe("Password Security (scrypt / timing-safe)", () => {
  it("generates unique salt hashes for the same password", () => {
    const pw = "VeraxSecretPass!2026";
    const hash1 = hashPassword(pw);
    const hash2 = hashPassword(pw);

    expect(hash1).not.toBe(hash2);
    expect(hash1.startsWith("scrypt$")).toBe(true);
    expect(hash2.startsWith("scrypt$")).toBe(true);
  });

  it("verifies valid passwords correctly", () => {
    const pw = "EditorSecurePass#99";
    const hash = hashPassword(pw);

    expect(verifyPassword(pw, hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("handles malformed or invalid hash formats safely without throwing", () => {
    expect(verifyPassword("pw", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("pw", "")).toBe(false);
    expect(verifyPassword("pw", "scrypt$16384$8$1$bad$bad")).toBe(false);
  });
});
