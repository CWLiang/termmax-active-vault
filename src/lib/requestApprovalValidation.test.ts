import { describe, expect, it } from "vitest";
import {
  parsePositiveRate18OrError,
  parseRequestIdOrNull,
  parseRequestIdsOrError,
} from "@/lib/requestApprovalValidation";

describe("requestApprovalValidation", () => {
  it("parses valid request ids", () => {
    expect(parseRequestIdOrNull("42")).toBe(42n);
    expect(parseRequestIdsOrError(["1", "2", "3"])).toEqual({
      ok: true,
      requestIds: [1n, 2n, 3n],
    });
  });

  it("rejects invalid request ids", () => {
    expect(parseRequestIdOrNull("")).toBeNull();
    expect(parseRequestIdOrNull("abc")).toBeNull();
    expect(parseRequestIdsOrError(["1", "bad", "3"])).toEqual({
      ok: false,
      invalidId: "bad",
    });
  });

  it("parses positive rate with grouping", () => {
    const parsed = parsePositiveRate18OrError("1,234.5");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rate).toBe(1234500000000000000000n);
    }
  });

  it("rejects invalid or non-positive rate", () => {
    expect(parsePositiveRate18OrError("abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parsePositiveRate18OrError("0")).toEqual({ ok: false, reason: "non_positive" });
    expect(parsePositiveRate18OrError("-1")).toEqual({ ok: false, reason: "non_positive" });
  });
});
