import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../experiments/ExperimentContext";
import {
  ALLOCATION_TO_CONTROL,
  type AllocationRatio,
} from "../experiments/types";
import { calculateSampleSize, estimateDurationDays } from "../statistics/sampleSize";
import { Field, Panel, BigNumber, Button } from "./primitives";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedPercent,
} from "../utils/format";
import "./Calculator.css";

type MetricCard = "conversion" | "revenue_user" | "aov" | "continuous";
type MetricUnit = "percent" | "currency" | "number";

const METRIC_CARDS: {
  id: MetricCard;
  title: string;
  example: string;
}[] = [
  {
    id: "conversion",
    title: "Conversion Rate",
    example: "e.g. 5.0%",
  },
  {
    id: "revenue_user",
    title: "Average Revenue / User",
    example: "e.g. €12.50",
  },
  { id: "aov", title: "Average Order Value", example: "e.g. €85" },
  {
    id: "continuous",
    title: "Continuous Metric",
    example: "e.g. average session duration",
  },
];

// Only "conversion" is a proportion (bounded 0-100%) and uses the
// two-proportion z-test. Revenue/user, AOV, and generic continuous
// metrics are all unbounded numeric metrics and use the two-sample
// t-test instead — they must never be formatted or calculated as a
// percentage.
const METRIC_UNIT: Record<MetricCard, MetricUnit> = {
  conversion: "percent",
  revenue_user: "currency",
  aov: "currency",
  continuous: "number",
};

const METRIC_LABEL: Record<MetricCard, string> = {
  conversion: "conversion rate",
  revenue_user: "revenue per user",
  aov: "average order value",
  continuous: "metric",
};

function formatByUnit(value: number, unit: MetricUnit): string {
  if (unit === "percent") return formatPercent(value);
  if (unit === "currency") return formatCurrency(value);
  return value.toFixed(2);
}

export function CalculatorTab() {
  const { state, update } = useExperiment();
  const { design } = state;
  const [metricCard, setMetricCard] = useState<MetricCard>("conversion");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const isConversion = metricCard === "conversion";
  const unit = METRIC_UNIT[metricCard];
  const metricUnitLabel = METRIC_LABEL[metricCard];

  const result = useMemo(() => {
    try {
      if (isConversion) {
        if (!design.baselineRate || design.baselineRate <= 0) return null;
        return calculateSampleSize({
          metricType: "conversion",
          baselineRate: design.baselineRate,
          relativeUplift: design.relativeUplift,
          alpha: design.alpha,
          power: design.power,
          treatmentGroups: design.groups - 1,
          controlAllocation: ALLOCATION_TO_CONTROL[design.allocation],
          twoSided: design.twoSided,
        });
      } else {
        if (!design.baselineMean || !design.baselineStdDev) return null;
        return calculateSampleSize({
          metricType: "continuous",
          baselineMean: design.baselineMean,
          baselineStdDev: design.baselineStdDev,
          relativeUplift: design.relativeUplift,
          alpha: design.alpha,
          power: design.power,
          treatmentGroups: design.groups - 1,
          controlAllocation: ALLOCATION_TO_CONTROL[design.allocation],
          twoSided: design.twoSided,
        });
      }
    } catch {
      return null;
    }
  }, [design, isConversion]);

  // Keep the shared experiment state in sync so other tabs can use it.
  useEffect(() => {
    update({ sampleSizeResult: result });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const durationDays = design.dailyEligibleUsers
    ? estimateDurationDays(result?.total ?? 0, design.dailyEligibleUsers)
    : null;

  return (
    <div>
      <h2 className="section-title">What are you measuring?</h2>
      <p className="section-intro">
        Choose the metric type, then work through a few quick questions to
        get the sample size you need for a reliable result.
      </p>

      <div className="metric-cards">
        {METRIC_CARDS.map((card) => (
          <button
            key={card.id}
            className={`metric-card ${metricCard === card.id ? "metric-card--active" : ""}`}
            onClick={() => {
              setMetricCard(card.id);
              update({
                design: {
                  ...design,
                  metricType: card.id === "conversion" ? "conversion" : "continuous",
                },
              });
            }}
          >
            <span className="metric-card__title">{card.title}</span>
            <span className="metric-card__example">{card.example}</span>
          </button>
        ))}
      </div>

      <div className="calc-grid">
        <Panel className="calc-steps">
          <StepBaseline
            metricCard={metricCard}
            unit={unit}
            design={design}
            onChange={(patch) => update({ design: { ...design, ...patch } })}
          />

          <StepUplift
            metricUnitLabel={metricUnitLabel}
            unit={unit}
            isConversion={isConversion}
            design={design}
            onChange={(patch) => update({ design: { ...design, ...patch } })}
          />

          <div className="step">
            <Field
              label="Significance level"
              tip="This means accepting a 5% probability of detecting a difference when there is actually no difference."
            >
              <select
                value={design.alpha}
                onChange={(e) =>
                  update({
                    design: { ...design, alpha: Number(e.target.value) },
                  })
                }
              >
                <option value={0.1}>90% confidence</option>
                <option value={0.05}>95% confidence (default)</option>
                <option value={0.01}>99% confidence</option>
              </select>
            </Field>
          </div>

          <div className="step">
            <Field
              label="Statistical power"
              tip="Power is the probability of detecting the expected difference if it really exists."
            >
              <select
                value={design.power}
                onChange={(e) =>
                  update({
                    design: { ...design, power: Number(e.target.value) },
                  })
                }
              >
                <option value={0.8}>80% power (default)</option>
                <option value={0.9}>90% power</option>
                <option value={0.95}>95% power</option>
              </select>
            </Field>
          </div>

          <div className="step step--groups">
            <Field label="Groups">
              <div className="group-pills">
                <span className="group-pill">Control</span>
                <span className="group-pill__vs">vs</span>
                <span className="group-pill">Treatment</span>
                {design.groups > 2 &&
                  Array.from({ length: design.groups - 2 }).map((_, i) => (
                    <span key={i} className="group-pill">
                      Treatment {i + 2}
                    </span>
                  ))}
              </div>
            </Field>
          </div>

          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "− Hide advanced options" : "+ Advanced options"}
          </button>

          {showAdvanced && (
            <div className="advanced-panel">
              <Field label="Traffic split (allocation ratio)">
                <select
                  value={design.allocation}
                  onChange={(e) =>
                    update({
                      design: {
                        ...design,
                        allocation: e.target.value as AllocationRatio,
                      },
                    })
                  }
                >
                  <option value="50/50">50 / 50</option>
                  <option value="60/40">60 / 40</option>
                  <option value="70/30">70 / 30</option>
                  <option value="80/20">80 / 20</option>
                </select>
              </Field>
              <div className="allocation-bar">
                <div
                  className="allocation-bar__control"
                  style={{
                    width: `${ALLOCATION_TO_CONTROL[design.allocation] * 100}%`,
                  }}
                >
                  Control {Math.round(ALLOCATION_TO_CONTROL[design.allocation] * 100)}%
                </div>
                <div className="allocation-bar__treatment">
                  Treatment {Math.round((1 - ALLOCATION_TO_CONTROL[design.allocation]) * 100)}%
                </div>
              </div>

              <Field label="Number of groups (including control)">
                <select
                  value={design.groups}
                  onChange={(e) =>
                    update({
                      design: { ...design, groups: Number(e.target.value) },
                    })
                  }
                >
                  <option value={2}>2 (A/B)</option>
                  <option value={3}>3 (A/B/C)</option>
                  <option value={4}>4 (A/B/C/D)</option>
                </select>
              </Field>

              <Field label="Test type">
                <select
                  value={design.twoSided ? "two" : "one"}
                  onChange={(e) =>
                    update({
                      design: { ...design, twoSided: e.target.value === "two" },
                    })
                  }
                >
                  <option value="two">Two-sided (default)</option>
                  <option value="one">One-sided</option>
                </select>
              </Field>

              <Field
                label="Daily eligible users"
                hint="Optional — used to estimate experiment duration"
              >
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 5000"
                  value={design.dailyEligibleUsers ?? ""}
                  onChange={(e) =>
                    update({
                      design: {
                        ...design,
                        dailyEligibleUsers: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                />
              </Field>
            </div>
          )}
        </Panel>

        <div className="calc-result">
          {result ? (
            <Panel className="result-panel">
              <BigNumber
                value={formatNumber(result.perGroup)}
                label="Recommended sample size — per group"
              />
              <div className="result-total">
                Total sample:{" "}
                <strong>{formatNumber(result.total)} users</strong>
              </div>

              <p className="result-explainer">
                You need approximately{" "}
                <strong>{formatNumber(result.perGroup)} users</strong> in
                each group to detect a change in {metricUnitLabel} from{" "}
                {formatByUnit(result.expectedControlValue, unit)} to{" "}
                {formatByUnit(result.expectedTreatmentValue, unit)}{" "}
                ({formatSignedPercent(design.relativeUplift)}) with{" "}
                {Math.round(design.power * 100)}% power.
              </p>

              <div className="scenario-viz">
                <div className="scenario-row">
                  <span className="scenario-row__label">Control</span>
                  <div className="scenario-bar">
                    <div
                      className="scenario-bar__fill scenario-bar__fill--control"
                      style={{ width: "60%" }}
                    />
                  </div>
                  <span className="scenario-row__value mono">
                    {formatByUnit(result.expectedControlValue, unit)}
                  </span>
                </div>
                <div className="scenario-row">
                  <span className="scenario-row__label">Treatment</span>
                  <div className="scenario-bar">
                    <div
                      className="scenario-bar__fill scenario-bar__fill--treatment"
                      style={{
                        width: `${60 * (1 + Math.abs(design.relativeUplift))}%`,
                      }}
                    />
                  </div>
                  <span className="scenario-row__value mono">
                    {formatByUnit(result.expectedTreatmentValue, unit)}
                  </span>
                </div>
              </div>

              {durationDays !== null && (
                <p className="duration-note">
                  At your current traffic, you would need approximately{" "}
                  <strong>{durationDays} days</strong> to reach the required
                  sample size.
                </p>
              )}

              <button
                className="advanced-toggle"
                onClick={() => setShowFormula((v) => !v)}
              >
                {showFormula ? "− Hide calculation details" : "Show calculation details"}
              </button>

              {showFormula && (
                <div className="formula-box mono">
                  <div>Method: {result.method}</div>
                  <div>
                    Minimum detectable effect (absolute):{" "}
                    {formatByUnit(result.minimumDetectableEffectAbsolute, unit)}
                  </div>
                  <div>Significance level: {formatPercent(design.alpha, 0)}</div>
                  <div>Power: {formatPercent(design.power, 0)}</div>
                </div>
              )}
            </Panel>
          ) : (
            <div className="empty-state">
              <h3>No experiment yet</h3>
              <p>
                Start by defining your baseline conversion and the
                improvement you want to detect.
              </p>
              <Button disabled>Calculate Sample Size</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBaseline({
  metricCard,
  unit,
  design,
  onChange,
}: {
  metricCard: MetricCard;
  unit: MetricUnit;
  design: typeof import("../experiments/types").DEFAULT_STATE.design;
  onChange: (patch: Partial<typeof design>) => void;
}) {
  if (metricCard === "conversion") {
    return (
      <div className="step">
        <Field label="What is your current conversion rate?">
          <div className="input-with-suffix">
            <input
              type="number"
              step="any"
              placeholder="5.0"
              value={
                design.baselineRate !== undefined
                  ? Number((design.baselineRate * 100).toFixed(4))
                  : ""
              }
              onChange={(e) =>
                onChange({
                  baselineRate: e.target.value
                    ? Number(e.target.value) / 100
                    : undefined,
                })
              }
            />
            <span className="input-suffix">%</span>
          </div>
        </Field>
      </div>
    );
  }

  const baselineLabel =
    metricCard === "revenue_user"
      ? "What is your current average revenue per user?"
      : metricCard === "aov"
        ? "What is your current average order value?"
        : "Current average (baseline)";

  const placeholder = unit === "currency" ? "12.50" : "180";

  return (
    <div className="step step--pair">
      <Field label={baselineLabel}>
        <div className="input-with-suffix">
          {unit === "currency" && <span className="input-prefix">€</span>}
          <input
            type="number"
            step="any"
            placeholder={placeholder}
            value={design.baselineMean ?? ""}
            onChange={(e) =>
              onChange({
                baselineMean: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </Field>
      <Field label="Standard deviation" hint="How spread out the values usually are">
        <div className="input-with-suffix">
          {unit === "currency" && <span className="input-prefix">€</span>}
          <input
            type="number"
            step="any"
            placeholder={unit === "currency" ? "8.00" : "45"}
            value={design.baselineStdDev ?? ""}
            onChange={(e) =>
              onChange({
                baselineStdDev: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </Field>
    </div>
  );
}

function StepUplift({
  metricUnitLabel,
  unit,
  isConversion,
  design,
  onChange,
}: {
  metricUnitLabel: string;
  unit: MetricUnit;
  isConversion: boolean;
  design: typeof import("../experiments/types").DEFAULT_STATE.design;
  onChange: (patch: Partial<typeof design>) => void;
}) {
  const baseline = isConversion ? design.baselineRate : design.baselineMean;
  const newValue =
    baseline !== undefined ? baseline * (1 + design.relativeUplift) : undefined;

  return (
    <div className="step">
      <Field label="What improvement do you want to detect?">
        <div className="input-with-suffix">
          <input
            type="number"
            step="any"
            placeholder="10"
            value={Number((design.relativeUplift * 100).toFixed(4))}
            onChange={(e) =>
              onChange({
                relativeUplift: e.target.value ? Number(e.target.value) / 100 : 0,
              })
            }
          />
          <span className="input-suffix">% relative</span>
        </div>
      </Field>
      {baseline !== undefined && newValue !== undefined && (
        <p className="uplift-explainer">
          This means increasing {metricUnitLabel} from{" "}
          <strong>{formatByUnit(baseline, unit)}</strong> to{" "}
          <strong>{formatByUnit(newValue, unit)}</strong> — not{" "}
          {design.relativeUplift * 100} percentage points.
        </p>
      )}
    </div>
  );
}
