// Tests for Staff Authentication supporting usernames, email addresses, and case-insensitive matching
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const credsProvider = authOptions.providers[0] as any;
const nextAuthAuthorize = credsProvider.options.authorize;

const TEST_STAFF_ID = "test_staff_pemredvp";

beforeAll(async () => {
  // Ensure database has the test staff user with identifier pemredVP
  await db.staffUser.upsert({
    where: { id: TEST_STAFF_ID },
    update: {
      username: "pemredVP",
      email: null,
      name: "Arya Rizky Ardhi Pratama",
      role: "CHIEF_EDITOR",
      status: "ACTIVE",
      passwordHash: hashPassword("Arya260408"),
    },
    create: {
      id: TEST_STAFF_ID,
      username: "pemredVP",
      email: null,
      name: "Arya Rizky Ardhi Pratama",
      role: "CHIEF_EDITOR",
      status: "ACTIVE",
      passwordHash: hashPassword("Arya260408"),
    },
  });
});

afterAll(async () => {
  try {
    await db.auditEvent.deleteMany({ where: { actorId: TEST_STAFF_ID } });
    await db.staffUser.deleteMany({ where: { id: TEST_STAFF_ID } });
  } catch {}
});

describe("Staff Authentication Identifier & Password Handling", () => {
  it("authenticates exact username identifier 'pemredVP' with valid password through NextAuth authorize", async () => {
    const result = await nextAuthAuthorize({ email: "pemredVP", password: "Arya260408" });
    expect(result).not.toBeNull();
    expect(result?.username).toBe("pemredVP");
    expect(result?.name).toBe("Arya Rizky Ardhi Pratama");
    expect(result?.role).toBe("CHIEF_EDITOR");

    // Verify audit trail was created
    const audit = await db.auditEvent.findFirst({
      where: { action: "auth.login", actorId: TEST_STAFF_ID },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorLabel).toBe("pemredVP");
  });

  it("authenticates lowercase input 'pemredvp' through case-insensitive matching in NextAuth", async () => {
    const result = await nextAuthAuthorize({ email: "pemredvp", password: "Arya260408" });
    expect(result).not.toBeNull();
    expect(result?.username).toBe("pemredVP");
    expect(result?.id).toBe(TEST_STAFF_ID);
  });

  it("authenticates uppercase input 'PEMREDVP' through case-insensitive matching in NextAuth", async () => {
    const result = await nextAuthAuthorize({ email: "PEMREDVP", password: "Arya260408" });
    expect(result).not.toBeNull();
    expect(result?.username).toBe("pemredVP");
    expect(result?.id).toBe(TEST_STAFF_ID);
  });

  it("authenticates mixed-case input 'PemredVP' through case-insensitive matching in NextAuth", async () => {
    const result = await nextAuthAuthorize({ email: "PemredVP", password: "Arya260408" });
    expect(result).not.toBeNull();
    expect(result?.username).toBe("pemredVP");
    expect(result?.id).toBe(TEST_STAFF_ID);
  });

  it("rejects invalid password for 'pemredVP' and does not create audit log", async () => {
    const beforeCount = await db.auditEvent.count({ where: { action: "auth.login" } });
    const result = await nextAuthAuthorize({ email: "pemredVP", password: "WrongPassword999!" });
    expect(result).toBeNull();
    const afterCount = await db.auditEvent.count({ where: { action: "auth.login" } });
    expect(afterCount).toBe(beforeCount);
  });

  it("rejects non-existent staff identifier", async () => {
    const result = await nextAuthAuthorize({ email: "nonexistent_editor_99", password: "AnyPassword123!" });
    expect(result).toBeNull();
  });

  it("rejects blank or empty credentials safely", async () => {
    expect(await nextAuthAuthorize(null as any)).toBeNull();
    expect(await nextAuthAuthorize({ email: "", password: "" })).toBeNull();
    expect(await nextAuthAuthorize({ email: "pemredVP", password: "" })).toBeNull();
    expect(await nextAuthAuthorize({ email: "", password: "Arya260408" })).toBeNull();
  });
});
