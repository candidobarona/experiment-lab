import { describe, it, expect } from "vitest";
import { normalCdf, normalInvCdf, zCritTwoSided } from "../normalDist";

describe("normalCdf", () => {
  it("returns 0.5 at z=0", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });
  it("matches known value at z=1.96", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });
  it("matches known value at z=-1.96", () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
});

describe("normalInvCdf", () => {
  it("round-trips with normalCdf", () => {
    const p = 0.975;
    const z = normalInvCdf(p);
    expect(normalCdf(z)).toBeCloseTo(p, 5);
  });
  it("matches the well-known 1.96 for 97.5th percentile", () => {
    expect(normalInvCdf(0.975)).toBeCloseTo(1.96, 2);
  });
});

describe("zCritTwoSided", () => {
  it("is ~1.96 for alpha=0.05 (95% confidence)", () => {
    expect(zCritTwoSided(0.05)).toBeCloseTo(1.96, 2);
  });
  it("is ~2.576 for alpha=0.01 (99% confidence)", () => {
    expect(zCritTwoSided(0.01)).toBeCloseTo(2.576, 2);
  });
});
