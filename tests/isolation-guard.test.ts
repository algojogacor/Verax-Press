// Verification of test database isolation guard
import { describe, it, expect } from "bun:test";
import { assertApprovedTestDatabase } from "./lib/test-db";

describe("Database Safety & Isolation Guards", () => {
  it("strictly rejects production Turso connection URLs", () => {
    expect(() =>
      assertApprovedTestDatabase("libsql://verax-prod-org.turso.io")
    ).toThrow("SAFETY FATAL");
    expect(() =>
      assertApprovedTestDatabase("https://verax-press.turso.io")
    ).toThrow("SAFETY FATAL");
  });

  it("strictly rejects development custom.db SQLite file", () => {
    expect(() =>
      assertApprovedTestDatabase("file:../db/custom.db")
    ).toThrow("SAFETY FATAL");
    expect(() =>
      assertApprovedTestDatabase("file:./db/custom.db")
    ).toThrow("SAFETY FATAL");
  });

  it("strictly rejects URLs missing the required test keyword", () => {
    expect(() =>
      assertApprovedTestDatabase("file:./db/production.db")
    ).toThrow("SAFETY FATAL");
    expect(() =>
      assertApprovedTestDatabase("file:./db/development.db")
    ).toThrow("SAFETY FATAL");
  });

  it("accepts dedicated isolated test database targets", () => {
    expect(() =>
      assertApprovedTestDatabase("file:../db/isolated-test.db")
    ).not.toThrow();
    expect(() =>
      assertApprovedTestDatabase("file:./db/unit-test.db")
    ).not.toThrow();
  });
});
