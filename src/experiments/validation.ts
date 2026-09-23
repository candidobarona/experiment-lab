import type { RawGroupInput } from "./types";
import type { MetricType } from "../statistics/sampleSize";

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateGroupInput(
  group: RawGroupInput,
  metricType: MetricType,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (group.users === null || group.users === undefined || group.users <= 0) {
    issues.push({ field: "users", message: `${group.name}: users is required` });
  }

  if (metricType === "conversion") {
    if (
      group.conversions === null ||
      group.conversions === undefined ||
      group.conversions < 0
    ) {
      issues.push({
        field: "conversions",
        message: `${group.name}: conversions is required`,
      });
    } else if (group.users && group.conversions > group.users) {
      issues.push({
        field: "conversions",
        message: `${group.name}: conversions cannot exceed users`,
      });
    }
  } else {
    if (group.mean === null || group.mean === undefined) {
      issues.push({ field: "mean", message: `${group.name}: mean is required` });
    }
    if (
      group.stdDev === null ||
      group.stdDev === undefined ||
      group.stdDev <= 0
    ) {
      issues.push({
        field: "stdDev",
        message: `${group.name}: standard deviation is required`,
      });
    }
  }

  return issues;
}

/** Auto-computed conversion rate, or null if inputs are incomplete. */
export function computedConversionRate(group: RawGroupInput): number | null {
  if (!group.users || group.conversions === null || group.conversions === undefined) {
    return null;
  }
  return group.conversions / group.users;
}
