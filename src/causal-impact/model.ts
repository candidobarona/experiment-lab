import { normalInvCdf } from "../statistics/normalDist";

export interface TimeSeriesPoint {
  date: string; // ISO date, YYYY-MM-DD
  value: number;
}

export interface CausalImpactInput {
  series: TimeSeriesPoint[];
  interventionDate: string; // YYYY-MM-DD, first date considered "post"
  confidenceLevel?: number; // default 0.95
}

export interface CausalImpactResult {
  prePeriod: TimeSeriesPoint[];
  postPeriod: TimeSeriesPoint[];
  observedTotal: number;
  counterfactualTotal: number;
  counterfactualSeries: { date: string; value: number }[];
  estimatedImpactAbsolute: number;
  estimatedImpactRelative: number;
  confidenceIntervalAbsolute: [number, number];
  confidenceIntervalRelative: [number, number];
  confidenceLevel: number;
  method: string;
}

/**
 * Simplified causal-impact estimate.
 *
 * This is NOT a full Bayesian Structural Time Series model (that requires
 * MCMC and a much heavier dependency). Instead we fit an ordinary
 * least-squares linear trend to the pre-period and project it forward as
 * the counterfactual, which is a standard and well-understood approach
 * for "what would have happened without the intervention" when a
 * reasonable trend exists and no BSTS library is available client-side.
 *
 * The confidence interval is derived from the residual standard error of
 * the pre-period fit, propagated forward — wider than a true BSTS
 * interval would be in many cases, which is appropriately conservative
 * for a simplified method. The UI must present this as an estimate with
 * clearly stated limitations, never as proof of causality.
 */
export function estimateCausalImpact(
  input: CausalImpactInput,
): CausalImpactResult {
  const { series, interventionDate, confidenceLevel = 0.95 } = input;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const prePeriod = sorted.filter((p) => p.date < interventionDate);
  const postPeriod = sorted.filter((p) => p.date >= interventionDate);

  if (prePeriod.length < 3) {
    throw new Error(
      "At least 3 pre-period observations are needed to estimate a counterfactual trend.",
    );
  }
  if (postPeriod.length < 1) {
    throw new Error("At least 1 post-period observation is required.");
  }

  // Fit OLS linear trend: value = a + b * t, t = day index within pre-period.
  const t0 = dateToIndex(prePeriod[0].date);
  const xs = prePeriod.map((p) => dateToIndex(p.date) - t0);
  const ys = prePeriod.map((p) => p.value);
  const n = xs.length;

  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;

  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - xMean) * (xs[i] - xMean);
    sxy += (xs[i] - xMean) * (ys[i] - yMean);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;

  // Residual standard error from the pre-period fit.
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += Math.pow(ys[i] - predicted, 2);
  }
  const residualStdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Project counterfactual for the post period.
  const counterfactualSeries = postPeriod.map((p) => {
    const x = dateToIndex(p.date) - t0;
    return { date: p.date, value: intercept + slope * x };
  });

  const observedTotal = postPeriod.reduce((s, p) => s + p.value, 0);
  const counterfactualTotal = counterfactualSeries.reduce(
    (s, p) => s + p.value,
    0,
  );

  const estimatedImpactAbsolute = observedTotal - counterfactualTotal;
  const estimatedImpactRelative =
    counterfactualTotal === 0
      ? NaN
      : estimatedImpactAbsolute / counterfactualTotal;

  // Propagate uncertainty: standard error of the summed counterfactual
  // scales roughly with sqrt(number of post-period points) times the
  // per-point residual standard error. This is a simplifying assumption
  // appropriate for a lightweight, dependency-free estimator.
  const m = postPeriod.length;
  const seTotal = residualStdError * Math.sqrt(m);
  const z = normalInvCdf(1 - (1 - confidenceLevel) / 2);

  const ciLower = estimatedImpactAbsolute - z * seTotal;
  const ciUpper = estimatedImpactAbsolute + z * seTotal;

  const ciLowerRelative =
    counterfactualTotal === 0 ? NaN : ciLower / counterfactualTotal;
  const ciUpperRelative =
    counterfactualTotal === 0 ? NaN : ciUpper / counterfactualTotal;

  return {
    prePeriod,
    postPeriod,
    observedTotal,
    counterfactualTotal,
    counterfactualSeries,
    estimatedImpactAbsolute,
    estimatedImpactRelative,
    confidenceIntervalAbsolute: [ciLower, ciUpper],
    confidenceIntervalRelative: [ciLowerRelative, ciUpperRelative],
    confidenceLevel,
    method:
      "Linear-trend counterfactual (OLS on the pre-period, projected forward). A simplified, dependency-free approximation of causal-impact / BSTS-style methods.",
  };
}

function dateToIndex(dateStr: string): number {
  return Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 86400000);
}

export interface CsvValidationIssue {
  severity: "error" | "warning";
  message: string;
}

/** Validates a parsed date/value time series for common data problems. */
export function validateTimeSeries(
  series: TimeSeriesPoint[],
): CsvValidationIssue[] {
  const issues: CsvValidationIssue[] = [];

  if (series.length === 0) {
    issues.push({ severity: "error", message: "No rows found in the file." });
    return issues;
  }

  const seenDates = new Set<string>();
  const duplicates = new Set<string>();
  for (const p of series) {
    if (seenDates.has(p.date)) duplicates.add(p.date);
    seenDates.add(p.date);
    if (Number.isNaN(p.value)) {
      issues.push({
        severity: "error",
        message: `Missing or invalid value for date ${p.date}.`,
      });
    }
    if (Number.isNaN(Date.parse(p.date))) {
      issues.push({
        severity: "error",
        message: `Invalid date format: "${p.date}". Expected YYYY-MM-DD.`,
      });
    }
  }

  if (duplicates.size > 0) {
    issues.push({
      severity: "warning",
      message: `Duplicate dates found: ${[...duplicates].join(", ")}.`,
    });
  }

  const sorted = [...series]
    .filter((p) => !Number.isNaN(Date.parse(p.date)))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length >= 2) {
    const gaps: string[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = dateToIndex(sorted[i - 1].date);
      const curr = dateToIndex(sorted[i].date);
      if (curr - prev > 1) {
        gaps.push(sorted[i].date);
      }
    }
    if (gaps.length > 0) {
      issues.push({
        severity: "warning",
        message: `Possible gaps in the daily series before: ${gaps.slice(0, 5).join(", ")}${gaps.length > 5 ? "…" : ""}.`,
      });
    }
  }

  if (series.length < 10) {
    issues.push({
      severity: "warning",
      message:
        "Fewer than 10 observations found. Causal impact estimates are more reliable with a longer pre-period.",
    });
  }

  return issues;
}
