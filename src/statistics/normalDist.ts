/**
 * Standard normal distribution helpers.
 *
 * We implement these directly (rather than pulling in a large stats
 * dependency) so the whole statistics layer stays small, auditable,
 * and dependency-free. All formulas are standard textbook results.
 */

/** Standard normal cumulative distribution function, P(Z <= z). */
export function normalCdf(z: number): number {
  // Abramowitz & Stegun approximation (7.1.26), accurate to ~1.5e-7.
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}

/** Standard normal probability density function. */
export function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/**
 * Inverse standard normal CDF (quantile function), P(Z <= z) = p.
 * Uses the Acklam algorithm, accurate to ~1.15e-9 relative error.
 */
export function normalInvCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error("normalInvCdf: p must be strictly between 0 and 1");
  }

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

/** Two-sided critical z-value for a given significance level (alpha). */
export function zCritTwoSided(alpha: number): number {
  return normalInvCdf(1 - alpha / 2);
}

/** One-sided critical z-value for a given significance level (alpha). */
export function zCritOneSided(alpha: number): number {
  return normalInvCdf(1 - alpha);
}

/** Two-sided p-value from a z statistic. */
export function pValueTwoSided(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

/** One-sided p-value from a z statistic (testing z > 0). */
export function pValueOneSided(z: number): number {
  return 1 - normalCdf(z);
}
