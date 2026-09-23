import { describe, it, expect } from "vitest";
import { calculateSampleSize, estimateDurationDays } from "../sampleSize";

describe("calculateSampleSize - conversion", () => {
  it("matches the well-known 5% -> 5.5% (10% relative uplift), 95%/80% case", () => {
    // This is a widely-cited reference case: baseline 5%, detecting a 10%
    // relative uplift (0.5pp absolute) at 95% confidence / 80% power
    // requires roughly ~14,700 users per group under 50/50 allocation
    // (Evan Miller / standard online-experimentation calculators agree
    // within a few hundred users depending on rounding conventions).
    const result = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.05,
      power: 0.8,
    });
    expect(result.perGroup).toBeGreaterThan(13000);
    expect(result.perGroup).toBeLessThan(16500);
    expect(result.expectedTreatmentValue).toBeCloseTo(0.055, 5);
  });

  it("requires more users for a smaller MDE", () => {
    const bigEffect = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.2,
      alpha: 0.05,
      power: 0.8,
    });
    const smallEffect = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.05,
      alpha: 0.05,
      power: 0.8,
    });
    expect(smallEffect.perGroup).toBeGreaterThan(bigEffect.perGroup);
  });

  it("requires more users for higher power", () => {
    const power80 = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.05,
      power: 0.8,
    });
    const power95 = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.05,
      power: 0.95,
    });
    expect(power95.perGroup).toBeGreaterThan(power80.perGroup);
  });

  it("requires more users for a tighter significance level", () => {
    const alpha05 = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.05,
      power: 0.8,
    });
    const alpha01 = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.01,
      power: 0.8,
    });
    expect(alpha01.perGroup).toBeGreaterThan(alpha05.perGroup);
  });

  it("scales allocation asymmetrically for unequal splits (80/20)", () => {
    const equal = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.05,
      power: 0.8,
      controlAllocation: 0.5,
    });
    const unequal = calculateSampleSize({
      metricType: "conversion",
      baselineRate: 0.05,
      relativeUplift: 0.1,
      alpha: 0.05,
      power: 0.8,
      controlAllocation: 0.8,
    });
    // Unequal allocation always needs a larger total sample than balanced
    // allocation, for the same detectable effect.
    expect(unequal.total).toBeGreaterThan(equal.total);
  });

  it("throws when baseline rate is out of bounds", () => {
    expect(() =>
      calculateSampleSize({
        metricType: "conversion",
        baselineRate: 1.2,
        relativeUplift: 0.1,
        alpha: 0.05,
        power: 0.8,
      }),
    ).toThrow();
  });
});

describe("calculateSampleSize - continuous", () => {
  it("computes a sensible sample size for a continuous metric", () => {
    const result = calculateSampleSize({
      metricType: "continuous",
      baselineMean: 100,
      baselineStdDev: 30,
      relativeUplift: 0.05,
      alpha: 0.05,
      power: 0.8,
    });
    expect(result.perGroup).toBeGreaterThan(0);
    expect(result.expectedTreatmentValue).toBeCloseTo(105, 5);
  });
});

describe("estimateDurationDays", () => {
  it("computes ceil(total / daily traffic)", () => {
    expect(estimateDurationDays(24900, 5000)).toBe(5);
    expect(estimateDurationDays(24901, 5000)).toBe(5);
    expect(estimateDurationDays(25001, 5000)).toBe(6);
  });
  it("returns null with no traffic provided", () => {
    expect(estimateDurationDays(1000, 0)).toBeNull();
  });
});
