import { describe, expect, it } from "vitest";
import { planMinMaxAnswerTxs } from "./dataFeedTxPlan";

describe("planMinMaxAnswerTxs", () => {
  it("lowers min then max when both move down", () => {
    const txs = planMinMaxAnswerTxs(100n, 200n, 50n, 80n);
    expect(txs.map((t) => [t.kind, t.value])).toEqual([
      ["setMinExpectedAnswer", 50n],
      ["setMaxExpectedAnswer", 80n],
    ]);
  });

  it("narrows band when both bounds move up (valid sequence from planner)", () => {
    const txs = planMinMaxAnswerTxs(100n, 200n, 150n, 160n);
    expect(txs.map((t) => [t.kind, t.value])).toEqual([
      ["setMinExpectedAnswer", 150n],
      ["setMaxExpectedAnswer", 160n],
    ]);
  });

  it("returns empty when already at target", () => {
    expect(planMinMaxAnswerTxs(10n, 20n, 10n, 20n)).toEqual([]);
  });
});
