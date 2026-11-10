import { describe, expect, it } from "bun:test";
import {
  TRANSITION_RULES,
  allowedTransitionsFrom,
  canExecuteRule,
  getRule,
} from "../src/lib/domain/workflow";

describe("Workflow State Machine (Tahap A / TA §7.1)", () => {
  it("allows DRAFT to be submitted for review by Author", () => {
    const rule = getRule("SUBMIT_REVIEW", "DRAFT");
    expect(rule).toBeDefined();
    expect(rule?.to).toBe("PENDING_REVIEW");
    expect(canExecuteRule(rule!, "INTERNAL_AUTHOR", true)).toBe(true);
    expect(canExecuteRule(rule!, "INTERNAL_AUTHOR", false)).toBe(false);
  });

  it("prevents direct DRAFT to PUBLISHED jump", () => {
    const rule = getRule("PUBLISH", "DRAFT");
    expect(rule).toBeUndefined();
  });

  it("allows Editor to advance PENDING_REVIEW to FACT_CHECK", () => {
    const rule = getRule("START_FACT_CHECK", "PENDING_REVIEW");
    expect(rule).toBeDefined();
    expect(rule?.to).toBe("FACT_CHECK");
    expect(canExecuteRule(rule!, "EDITOR", false)).toBe(true);
    expect(canExecuteRule(rule!, "INTERNAL_AUTHOR", true)).toBe(false);
  });

  it("enforces Chief-only execution on PUBLISH from PENDING_APPROVAL", () => {
    const rule = getRule("PUBLISH", "PENDING_APPROVAL");
    expect(rule).toBeDefined();
    expect(rule?.gate).toBe("PUBLISH");
    expect(canExecuteRule(rule!, "CHIEF_EDITOR", false)).toBe(true);
    expect(canExecuteRule(rule!, "EDITOR", false)).toBe(false);
    expect(canExecuteRule(rule!, "INTERNAL_AUTHOR", true)).toBe(false);
    expect(canExecuteRule(rule!, "VOLUNTEER", false)).toBe(false);
  });

  it("correctly lists allowed transitions from each state", () => {
    const draftTransitions = allowedTransitionsFrom("DRAFT");
    const actions = draftTransitions.map((t) => t.action);
    expect(actions).toContain("SUBMIT_REVIEW");
    expect(actions).toContain("WITHDRAW");
    expect(actions).not.toContain("PUBLISH");
  });
});
