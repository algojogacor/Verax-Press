import { describe, expect, it } from "bun:test";
import { generateClientCredential, hashClientSecret } from "../src/lib/api-key";

describe("API Key & Credential Management", () => {
  it("generates correctly formatted client credentials", () => {
    const cred = generateClientCredential();
    expect(cred.clientId.startsWith("vrtc_")).toBe(true);
    expect(cred.secret.startsWith("vrtk_")).toBe(true);
    expect(cred.clientId.length).toBeGreaterThan(10);
    expect(cred.secret.length).toBeGreaterThan(20);
  });

  it("produces deterministic SHA-256 hash for identical secret", () => {
    const secret = "vrtk_test_secret_1234567890abcdef";
    const h1 = hashClientSecret(secret);
    const h2 = hashClientSecret(secret);

    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
