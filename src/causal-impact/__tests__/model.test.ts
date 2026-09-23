import { describe, it, expect } from "vitest";
import { estimateCausalImpact, validateTimeSeries } from "../model";

function genSeries(
  startDate: string,
  days: number,
  fn: (i: number) => number,
) {
  const start = new Date(startDate + "T00:00:00Z").getTime();
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * 86400000).toISOString().slice(0, 10),
    value: fn(i),
  }));
}

describe("estimateCausalImpact", () => {
  it("detects a positive impact when post-period jumps above a flat trend", () => {
    const pre = genSeries("2026-01-01", 20, () => 1000);
    const post = genSeries("2026-01-21", 10, () => 1200); // clear step up
    const result = estimateCausalImpact({
      series: [...pre, ...post],
      interventionDate: "2026-01-21",
    });
    expect(result.estimatedImpactAbsolute).toBeGreaterThan(0);
    expect(result.estimatedImpactRelative).toBeCloseTo(0.2, 1);
  });

  it("detects ~zero impact when post-period continues the pre-period trend", () => {
    const combined = genSeries("2026-01-01", 30, (i) => 1000 + i * 5);
    const result = estimateCausalImpact({
      series: combined,
      interventionDate: "2026-01-21",
    });
    expect(Math.abs(result.estimatedImpactRelative)).toBeLessThan(0.05);
  });

  it("throws with too few pre-period points", () => {
    const series = genSeries("2026-01-01", 4, () => 100);
    expect(() =>
      estimateCausalImpact({ series, interventionDate: "2026-01-03" }),
    ).toThrow();
  });
});

describe("validateTimeSeries", () => {
  it("flags duplicate dates", () => {
    const issues = validateTimeSeries([
      { date: "2026-01-01", value: 10 },
      { date: "2026-01-01", value: 12 },
    ]);
    expect(issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });

  it("flags invalid date formats", () => {
    const issues = validateTimeSeries([{ date: "not-a-date", value: 10 }]);
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("warns on short series", () => {
    const issues = validateTimeSeries([
      { date: "2026-01-01", value: 10 },
      { date: "2026-01-02", value: 11 },
    ]);
    expect(issues.some((i) => i.message.includes("Fewer than 10"))).toBe(
      true,
    );
  });
});
