import { normalInvCdf } from "./normalDist";

export type MetricType = "conversion" | "continuous";

export interface SampleSizeInput {
  metricType: MetricType;
  /** Conversion rate as a proportion 0-1 (conversion metric only). */
  baselineRate?: number;
  /** Mean of the continuous metric (continuous metric only). */
  baselineMean?: number;
  /** Standard deviation of the continuous metric (continuous metric only). */
  baselineStdDev?: number;
  /** Relative uplift the user wants to detect, e.g. 0.10 for +10%. */
  relativeUplift: number;
  /** Significance level, e.g. 0.05 for 95% confidence. */
  alpha: number;
  /** Statistical power, e.g. 0.8 for 80% power. */
  power: number;
  /** Number of variants excluding control, default 1 (A/B). */
  treatmentGroups?: number;
  /** Share of traffic allocated to control, 0-1. Default 0.5. */
  controlAllocation?: number;
  twoSided?: boolean;
}

export interface SampleSizeResult {
  /** Required sample size per group, using the smallest-allocation group. */
  perGroup: number;
  /** Total sample size across all groups. */
  total: number;
  /** Per-group sample size for control specifically. */
  controlGroupSize: number;
  /** Per-group sample size for each treatment (assumed equal). */
  treatmentGroupSize: number;
  expectedControlValue: number;
  expectedTreatmentValue: number;
  minimumDetectableEffectAbsolute: number;
  method: string;
}

/**
 * Sample size for a two-proportion z-test comparing a control conversion
 * rate to a treatment conversion rate that differs by a relative uplift.
 *
 * Standard formula (equal-variance approximation), e.g. Kohavi et al.,
 * "Trustworthy Online Controlled Experiments":
 *
 *   n = (z_(1-alpha/2) * sqrt(2*p*(1-p)) + z_(1-beta) * sqrt(p1*(1-p1)+p2*(1-p2)))^2 / (p1-p2)^2
 *
 * where p = (p1+p2)/2 is the pooled proportion.
 */
export function sampleSizeConversion(
  input: SampleSizeInput,
): SampleSizeResult {
  const {
    baselineRate,
    relativeUplift,
    alpha,
    power,
    treatmentGroups = 1,
    controlAllocation = 0.5,
    twoSided = true,
  } = input;

  if (baselineRate === undefined) {
    throw new Error("baselineRate is required for conversion metric");
  }
  if (baselineRate <= 0 || baselineRate >= 1) {
    throw new Error("baselineRate must be strictly between 0 and 1");
  }

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + relativeUplift);

  if (p2 <= 0 || p2 >= 1) {
    throw new Error(
      "The expected treatment rate must stay strictly between 0% and 100%. Reduce the expected uplift.",
    );
  }

  const zAlpha = twoSided ? normalInvCdf(1 - alpha / 2) : normalInvCdf(1 - alpha);
  const zBeta = normalInvCdf(power);

  const pooled = (p1 + p2) / 2;
  const numerator =
    zAlpha * Math.sqrt(2 * pooled * (1 - pooled)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const denominator = Math.abs(p2 - p1);

  const nEqualAllocation = Math.pow(numerator / denominator, 2);

  return finalizeSampleSize({
    nEqualAllocation,
    controlAllocation,
    treatmentGroups,
    expectedControlValue: p1,
    expectedTreatmentValue: p2,
    minimumDetectableEffectAbsolute: Math.abs(p2 - p1),
    method:
      "Two-proportion z-test (pooled variance), standard sample-size formula for comparing two conversion rates.",
  });
}

/**
 * Sample size for a two-sample t-test (normal approximation) comparing
 * means of a continuous metric, given the metric's standard deviation.
 *
 *   n = 2 * (z_(1-alpha/2) + z_(1-beta))^2 * sigma^2 / delta^2
 */
export function sampleSizeContinuous(
  input: SampleSizeInput,
): SampleSizeResult {
  const {
    baselineMean,
    baselineStdDev,
    relativeUplift,
    alpha,
    power,
    treatmentGroups = 1,
    controlAllocation = 0.5,
    twoSided = true,
  } = input;

  if (baselineMean === undefined || baselineStdDev === undefined) {
    throw new Error(
      "baselineMean and baselineStdDev are required for continuous metric",
    );
  }
  if (baselineStdDev <= 0) {
    throw new Error("baselineStdDev must be positive");
  }

  const mean1 = baselineMean;
  const mean2 = baselineMean * (1 + relativeUplift);
  const delta = Math.abs(mean2 - mean1);

  const zAlpha = twoSided ? normalInvCdf(1 - alpha / 2) : normalInvCdf(1 - alpha);
  const zBeta = normalInvCdf(power);

  const nEqualAllocation =
    (2 * Math.pow(zAlpha + zBeta, 2) * Math.pow(baselineStdDev, 2)) /
    Math.pow(delta, 2);

  return finalizeSampleSize({
    nEqualAllocation,
    controlAllocation,
    treatmentGroups,
    expectedControlValue: mean1,
    expectedTreatmentValue: mean2,
    minimumDetectableEffectAbsolute: delta,
    method:
      "Two-sample t-test (normal approximation), standard sample-size formula for comparing two means.",
  });
}

function finalizeSampleSize(params: {
  nEqualAllocation: number;
  controlAllocation: number;
  treatmentGroups: number;
  expectedControlValue: number;
  expectedTreatmentValue: number;
  minimumDetectableEffectAbsolute: number;
  method: string;
}): SampleSizeResult {
  const {
    nEqualAllocation,
    controlAllocation,
    treatmentGroups,
    expectedControlValue,
    expectedTreatmentValue,
    minimumDetectableEffectAbsolute,
    method,
  } = params;

  // nEqualAllocation is the size each group would need under 50/50
  // allocation between one control and one treatment. When allocation is
  // unequal, the smaller-allocation group needs proportionally more total
  // users to reach the same effective sample size. We scale conservatively
  // using the harmonic-mean adjustment for two-group unequal allocation.
  const treatmentAllocation = (1 - controlAllocation) / treatmentGroups;
  const adjustment =
    0.25 / (controlAllocation * (1 - controlAllocation));
  const perComparisonGroup = Math.ceil(nEqualAllocation);

  const controlGroupSize = Math.ceil(
    perComparisonGroup * adjustment * controlAllocation,
  );
  const treatmentGroupSize = Math.ceil(
    perComparisonGroup * adjustment * treatmentAllocation,
  );

  const total = controlGroupSize + treatmentGroupSize * treatmentGroups;

  return {
    perGroup: Math.max(controlGroupSize, treatmentGroupSize),
    total,
    controlGroupSize,
    treatmentGroupSize,
    expectedControlValue,
    expectedTreatmentValue,
    minimumDetectableEffectAbsolute,
    method,
  };
}

export function calculateSampleSize(input: SampleSizeInput): SampleSizeResult {
  if (input.metricType === "conversion") {
    return sampleSizeConversion(input);
  }
  return sampleSizeContinuous(input);
}

/** Estimated days to reach the required total sample, given daily traffic. */
export function estimateDurationDays(
  totalSampleSize: number,
  dailyEligibleUsers: number,
): number | null {
  if (!dailyEligibleUsers || dailyEligibleUsers <= 0) return null;
  return Math.ceil(totalSampleSize / dailyEligibleUsers);
}
