export interface GuardrailWarning {
  id: string;
  severity: "info" | "warning";
  message: string;
}

export function evaluateGuardrails(params: {
  srmMismatch?: boolean;
  controlUsers: number;
  treatmentUsers: number;
  minRecommendedUsersPerGroup?: number;
  minimumDetectableEffectRelative?: number;
}): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];
  const minSize = params.minRecommendedUsersPerGroup ?? 355; // ~ smallest
  // sample that can ever detect a reasonably large effect with 80% power;
  // used only as a soft "this may be too small" nudge, not a hard rule.

  if (params.srmMismatch) {
    warnings.push({
      id: "srm",
      severity: "warning",
      message:
        "Traffic allocation differs materially from the expected split. Check whether users were randomly assigned.",
    });
  }

  if (
    params.controlUsers < minSize ||
    params.treatmentUsers < minSize
  ) {
    warnings.push({
      id: "small-sample",
      severity: "warning",
      message:
        "The sample may be too small to draw a reliable conclusion.",
    });
  }

  if (
    params.minimumDetectableEffectRelative !== undefined &&
    Math.abs(params.minimumDetectableEffectRelative) < 0.02
  ) {
    warnings.push({
      id: "small-mde",
      severity: "info",
      message: "Detecting a smaller effect requires substantially more users.",
    });
  }

  warnings.push({
    id: "peeking",
    severity: "info",
    message:
      "Avoid repeatedly checking results and stopping as soon as significance appears, unless your experiment uses a sequential testing method.",
  });

  return warnings;
}

export const STAT_EXPLANATIONS: Record<string, string> = {
  pValue:
    "A measure used to assess how compatible the observed difference is with the assumption that there is no real difference.",
  confidenceInterval:
    "A range that represents the uncertainty around the estimated effect.",
  power:
    "The probability of detecting an effect of the size you are looking for, if that effect really exists.",
  significance:
    "The probability of concluding there is a difference when there actually isn't one, if the experiment were repeated many times.",
  mde: "The smallest effect your experiment is designed to reliably detect.",
  srm: "Sample Ratio Mismatch: when the observed traffic split differs from what you expected, often signalling a bug in how users were assigned.",
};
