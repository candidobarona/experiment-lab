import { describe, it, expect } from "vitest";
import {
  testConversionRates,
  testContinuousMetric,
  checkSampleRatioMismatch,
} from "../hypothesisTesting";

describe("testConversionRates", () => {
  it("detects a significant positive result", () => {
    const result = testConversionRates(
      { name: "Control", users: 10000, conversions: 500 },
      { name: "Treatment", users: 10000, conversions: 575 },
    );
    expect(result.significant).toBe(true);
    expect(result.absoluteUplift).toBeCloseTo(0.0075, 6);
    expect(result.relativeUplift).toBeCloseTo(0.15, 3);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("does not flag a non-significant small difference", () => {
    const result = testConversionRates(
      { name: "Control", users: 500, conversions: 25 },
      { name: "Treatment", users: 500, conversions: 27 },
    );
    expect(result.significant).toBe(false);
  });

  it("detects a significant negative result (treatment worse)", () => {
    const result = testConversionRates(
      { name: "Control", users: 20000, conversions: 1200 },
      { name: "Treatment", users: 20000, conversions: 1000 },
    );
    expect(result.significant).toBe(true);
    expect(result.absoluteUplift).toBeLessThan(0);
  });

  it("handles 0 conversions in both groups without throwing", () => {
    const result = testConversionRates(
      { name: "Control", users: 100, conversions: 0 },
      { name: "Treatment", users: 100, conversions: 0 },
    );
    expect(result.zStatistic).toBe(0);
    expect(result.significant).toBe(false);
  });

  it("handles 100% conversion in both groups without throwing", () => {
    const result = testConversionRates(
      { name: "Control", users: 100, conversions: 100 },
      { name: "Treatment", users: 100, conversions: 100 },
    );
    expect(result.absoluteUplift).toBe(0);
  });

  it("handles identical groups as non-significant with zero uplift", () => {
    const result = testConversionRates(
      { name: "Control", users: 5000, conversions: 250 },
      { name: "Treatment", users: 5000, conversions: 250 },
    );
    expect(result.absoluteUplift).toBe(0);
    expect(result.significant).toBe(false);
  });

  it("works with very small samples", () => {
    const result = testConversionRates(
      { name: "Control", users: 10, conversions: 1 },
      { name: "Treatment", users: 10, conversions: 3 },
    );
    expect(result.significant).toBe(false); // too small to reach significance
  });

  it("works with very large samples", () => {
    const result = testConversionRates(
      { name: "Control", users: 2_000_000, conversions: 100_000 },
      { name: "Treatment", users: 2_000_000, conversions: 101_000 },
    );
    expect(result.significant).toBe(true);
  });

  it("throws on invalid inputs (conversions > users)", () => {
    expect(() =>
      testConversionRates(
        { name: "Control", users: 100, conversions: 150 },
        { name: "Treatment", users: 100, conversions: 50 },
      ),
    ).toThrow();
  });
});

describe("testContinuousMetric", () => {
  it("detects a significant improvement in a continuous metric", () => {
    const result = testContinuousMetric(
      { name: "Control", users: 5000, mean: 100, stdDev: 20 },
      { name: "Treatment", users: 5000, mean: 105, stdDev: 20 },
    );
    expect(result.significant).toBe(true);
    expect(result.absoluteUplift).toBeCloseTo(5, 6);
  });

  it("does not flag a small difference with high variance as significant", () => {
    const result = testContinuousMetric(
      { name: "Control", users: 50, mean: 100, stdDev: 80 },
      { name: "Treatment", users: 50, mean: 103, stdDev: 80 },
    );
    expect(result.significant).toBe(false);
  });
});

describe("checkSampleRatioMismatch", () => {
  it("does not flag a balanced 50/50 split", () => {
    const result = checkSampleRatioMismatch(10000, 10000, 0.5);
    expect(result.mismatchDetected).toBe(false);
  });

  it("flags a strongly skewed split vs expected 50/50", () => {
    const result = checkSampleRatioMismatch(12000, 8000, 0.5);
    expect(result.mismatchDetected).toBe(true);
  });

  it("does not flag a skewed split when it matches the expected allocation", () => {
    const result = checkSampleRatioMismatch(8000, 2000, 0.8);
    expect(result.mismatchDetected).toBe(false);
  });
});
