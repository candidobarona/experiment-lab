import { normalInvCdf, pValueTwoSided } from "./normalDist";

export interface ConversionGroupData {
  name: string;
  users: number;
  conversions: number;
}

export interface ConversionTestResult {
  controlRate: number;
  treatmentRate: number;
  absoluteUplift: number;
  relativeUplift: number;
  zStatistic: number;
  pValue: number;
  significant: boolean;
  confidenceIntervalAbsolute: [number, number];
  confidenceLevel: number;
  standardError: number;
  method: string;
}

/**
 * Two-proportion z-test comparing a control and treatment conversion rate.
 * Uses the unpooled standard error for the confidence interval (Wald
 * interval on the difference of proportions), which is the standard
 * approach for reporting an effect size and its uncertainty.
 */
export function testConversionRates(
  control: ConversionGroupData,
  treatment: ConversionGroupData,
  alpha: number = 0.05,
): ConversionTestResult {
  if (control.users <= 0 || treatment.users <= 0) {
    throw new Error("Both groups must have at least 1 user");
  }
  if (
    control.conversions < 0 ||
    treatment.conversions < 0 ||
    control.conversions > control.users ||
    treatment.conversions > treatment.users
  ) {
    throw new Error("Conversions cannot be negative or exceed users");
  }

  const p1 = control.conversions / control.users;
  const p2 = treatment.conversions / treatment.users;

  const absoluteUplift = p2 - p1;
  const relativeUplift = p1 === 0 ? NaN : absoluteUplift / p1;

  // Pooled SE for the z-statistic / p-value (standard hypothesis test).
  const pPooled =
    (control.conversions + treatment.conversions) /
    (control.users + treatment.users);
  const sePooled = Math.sqrt(
    pPooled * (1 - pPooled) * (1 / control.users + 1 / treatment.users),
  );
  const zStatistic = sePooled === 0 ? 0 : absoluteUplift / sePooled;
  const pValue = pValueTwoSided(zStatistic);

  // Unpooled SE for the confidence interval on the observed difference.
  const seUnpooled = Math.sqrt(
    (p1 * (1 - p1)) / control.users + (p2 * (1 - p2)) / treatment.users,
  );
  const zCrit = normalInvCdf(1 - alpha / 2);
  const ciLower = absoluteUplift - zCrit * seUnpooled;
  const ciUpper = absoluteUplift + zCrit * seUnpooled;

  return {
    controlRate: p1,
    treatmentRate: p2,
    absoluteUplift,
    relativeUplift,
    zStatistic,
    pValue,
    significant: pValue < alpha,
    confidenceIntervalAbsolute: [ciLower, ciUpper],
    confidenceLevel: 1 - alpha,
    standardError: seUnpooled,
    method: "Two-proportion z-test",
  };
}

export interface ContinuousGroupData {
  name: string;
  users: number;
  mean: number;
  stdDev: number;
}

export interface ContinuousTestResult {
  controlMean: number;
  treatmentMean: number;
  absoluteUplift: number;
  relativeUplift: number;
  tStatistic: number;
  pValue: number;
  significant: boolean;
  confidenceIntervalAbsolute: [number, number];
  confidenceLevel: number;
  standardError: number;
  degreesOfFreedom: number;
  method: string;
}

/**
 * Welch's two-sample t-test for comparing means of a continuous metric
 * with potentially unequal variances/sample sizes. Uses a normal
 * approximation for the critical value, which is accurate for the sample
 * sizes typical of online experiments (n well over ~30 per group).
 */
export function testContinuousMetric(
  control: ContinuousGroupData,
  treatment: ContinuousGroupData,
  alpha: number = 0.05,
): ContinuousTestResult {
  if (control.users <= 1 || treatment.users <= 1) {
    throw new Error("Both groups need at least 2 users");
  }

  const absoluteUplift = treatment.mean - control.mean;
  const relativeUplift =
    control.mean === 0 ? NaN : absoluteUplift / control.mean;

  const varControl = Math.pow(control.stdDev, 2) / control.users;
  const varTreatment = Math.pow(treatment.stdDev, 2) / treatment.users;
  const se = Math.sqrt(varControl + varTreatment);

  const tStatistic = se === 0 ? 0 : absoluteUplift / se;

  // Welch-Satterthwaite degrees of freedom.
  const df =
    Math.pow(varControl + varTreatment, 2) /
    (Math.pow(varControl, 2) / (control.users - 1) +
      Math.pow(varTreatment, 2) / (treatment.users - 1));

  // Normal approximation to the p-value / critical value (valid for
  // moderate-to-large samples, which this tool targets).
  const pValue = pValueTwoSided(tStatistic);
  const zCrit = normalInvCdf(1 - alpha / 2);
  const ciLower = absoluteUplift - zCrit * se;
  const ciUpper = absoluteUplift + zCrit * se;

  return {
    controlMean: control.mean,
    treatmentMean: treatment.mean,
    absoluteUplift,
    relativeUplift,
    tStatistic,
    pValue,
    significant: pValue < alpha,
    confidenceIntervalAbsolute: [ciLower, ciUpper],
    confidenceLevel: 1 - alpha,
    standardError: se,
    degreesOfFreedom: df,
    method: "Welch's two-sample t-test (normal approximation)",
  };
}

/**
 * Sample Ratio Mismatch check: compares observed traffic split to the
 * expected split using a simple chi-square goodness-of-fit test.
 */
export interface SrmResult {
  observedRatio: number;
  expectedRatio: number;
  chiSquare: number;
  pValue: number;
  mismatchDetected: boolean;
}

export function checkSampleRatioMismatch(
  controlUsers: number,
  treatmentUsers: number,
  expectedControlAllocation: number = 0.5,
): SrmResult {
  const total = controlUsers + treatmentUsers;
  const expectedControl = total * expectedControlAllocation;
  const expectedTreatment = total * (1 - expectedControlAllocation);

  const chiSquare =
    Math.pow(controlUsers - expectedControl, 2) / expectedControl +
    Math.pow(treatmentUsers - expectedTreatment, 2) / expectedTreatment;

  // Chi-square with 1 df: p-value via relation to the normal distribution
  // (chi-square_1 = Z^2), so p = 2 * (1 - Phi(sqrt(chiSquare))).
  const z = Math.sqrt(chiSquare);
  const pValue = pValueTwoSided(z);

  return {
    observedRatio: total > 0 ? controlUsers / total : 0,
    expectedRatio: expectedControlAllocation,
    chiSquare,
    pValue,
    // SRM convention: flag when p < 0.001 (very strict, since SRM checks
    // are meant to catch instrumentation/randomization bugs, not to be a
    // routine significance test).
    mismatchDetected: pValue < 0.001,
  };
}
