import type { MetricType, SampleSizeResult } from "../statistics/sampleSize";
import type {
  ConversionTestResult,
  ContinuousTestResult,
} from "../statistics/hypothesisTesting";

export type AllocationRatio = "50/50" | "60/40" | "70/30" | "80/20";

export const ALLOCATION_TO_CONTROL: Record<AllocationRatio, number> = {
  "50/50": 0.5,
  "60/40": 0.6,
  "70/30": 0.7,
  "80/20": 0.8,
};

export interface ExperimentDesign {
  metricType: MetricType;
  baselineRate?: number; // conversion
  baselineMean?: number; // continuous
  baselineStdDev?: number; // continuous
  relativeUplift: number; // e.g. 0.1 for +10%
  alpha: number; // e.g. 0.05
  power: number; // e.g. 0.8
  groups: number; // total groups including control, default 2
  allocation: AllocationRatio;
  dailyEligibleUsers?: number;
  twoSided: boolean;
}

export const DEFAULT_DESIGN: ExperimentDesign = {
  metricType: "conversion",
  baselineRate: 0.05,
  relativeUplift: 0.1,
  alpha: 0.05,
  power: 0.8,
  groups: 2,
  allocation: "50/50",
  twoSided: true,
};

export interface RawGroupInput {
  name: string;
  users: number | null;
  // Conversion metric:
  conversions?: number | null;
  // Continuous metric:
  mean?: number | null;
  stdDev?: number | null;
}

export interface ExperimentResults {
  experimentName?: string;
  metricType: MetricType;
  control: RawGroupInput;
  treatment: RawGroupInput;
  expectedAllocation: AllocationRatio;
}

export interface AnalyzedResults {
  metricType: MetricType;
  conversionResult?: ConversionTestResult;
  continuousResult?: ContinuousTestResult;
}

export type PrimaryMetric =
  | "Conversion rate"
  | "Revenue"
  | "Revenue per user"
  | "Average order value"
  | "Retention"
  | "Other";

export interface ExperimentSummary {
  experimentName: string;
  hypothesis: string;
  primaryMetric: PrimaryMetric;
  secondaryMetrics?: string;
  controlGroupName: string;
  treatmentGroupName: string;
  startDate?: string;
  endDate?: string;
  targetAudience?: string;
  expectedOutcome?: string;
}

/** Everything the app knows about the current experiment, shared across tabs. */
export interface ExperimentState {
  design: ExperimentDesign;
  sampleSizeResult: SampleSizeResult | null;
  results: ExperimentResults;
  analyzed: AnalyzedResults | null;
  summary: ExperimentSummary;
}

export const DEFAULT_STATE: ExperimentState = {
  design: DEFAULT_DESIGN,
  sampleSizeResult: null,
  results: {
    metricType: "conversion",
    control: { name: "Control", users: null, conversions: null },
    treatment: { name: "Treatment", users: null, conversions: null },
    expectedAllocation: "50/50",
  },
  analyzed: null,
  summary: {
    experimentName: "",
    hypothesis: "",
    primaryMetric: "Conversion rate",
    controlGroupName: "Control",
    treatmentGroupName: "Treatment",
  },
};
