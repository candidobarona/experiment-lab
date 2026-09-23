import { useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ErrorBar,
} from "recharts";
import { useExperiment } from "../experiments/ExperimentContext";
import { Field, Panel, GuardrailBanner } from "./primitives";
import {
  testConversionRates,
  checkSampleRatioMismatch,
} from "../statistics/hypothesisTesting";
import { evaluateGuardrails } from "../statistics/guardrails";
import { computedConversionRate } from "../experiments/validation";
import {
  formatNumber,
  formatPercent,
  formatPercentagePoints,
  formatSignedPercent,
} from "../utils/format";
import { ALLOCATION_TO_CONTROL } from "../experiments/types";
import "./Results.css";

export function ResultsTab() {
  const { state, update } = useExperiment();
  const { results } = state;

  const controlRate = computedConversionRate(results.control);
  const treatmentRate = computedConversionRate(results.treatment);

  const analysis = useMemo(() => {
    const { control, treatment } = results;
    if (
      !control.users ||
      !treatment.users ||
      control.conversions === null ||
      control.conversions === undefined ||
      treatment.conversions === null ||
      treatment.conversions === undefined
    ) {
      return null;
    }
    try {
      return testConversionRates(
        { name: control.name, users: control.users, conversions: control.conversions },
        { name: treatment.name, users: treatment.users, conversions: treatment.conversions },
      );
    } catch {
      return null;
    }
  }, [results]);

  const srm = useMemo(() => {
    if (!results.control.users || !results.treatment.users) return null;
    return checkSampleRatioMismatch(
      results.control.users,
      results.treatment.users,
      ALLOCATION_TO_CONTROL[results.expectedAllocation],
    );
  }, [results]);

  const guardrails = useMemo(() => {
    if (!results.control.users || !results.treatment.users) return [];
    return evaluateGuardrails({
      srmMismatch: srm?.mismatchDetected,
      controlUsers: results.control.users,
      treatmentUsers: results.treatment.users,
      minimumDetectableEffectRelative: analysis?.relativeUplift,
    });
  }, [results, srm, analysis]);

  useEffect(() => {
    update({
      analyzed: analysis
        ? { metricType: "conversion", conversionResult: analysis }
        : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  const chartData = analysis
    ? [
        {
          name: results.control.name || "Control",
          rate: analysis.controlRate * 100,
        },
        {
          name: results.treatment.name || "Treatment",
          rate: analysis.treatmentRate * 100,
        },
      ]
    : [];

  return (
    <div>
      <h2 className="section-title">What happened?</h2>
      <p className="section-intro">
        Enter your results and get an automatic, statistically sound read on
        whether the treatment made a difference.
      </p>

      <div className="results-grid">
        <Panel>
          <Field label="Experiment name" hint="Optional">
            <input
              value={results.experimentName ?? ""}
              onChange={(e) =>
                update({
                  results: { ...results, experimentName: e.target.value },
                })
              }
              placeholder="e.g. Checkout redesign"
            />
          </Field>

          <div className="group-input-grid">
            <GroupInputCard
              title="Control"
              group={results.control}
              rate={controlRate}
              onChange={(g) => update({ results: { ...results, control: g } })}
            />
            <GroupInputCard
              title="Treatment"
              group={results.treatment}
              rate={treatmentRate}
              onChange={(g) =>
                update({ results: { ...results, treatment: g } })
              }
            />
          </div>

          <div className="expected-split">
            <Field label="Expected traffic split">
              <select
                value={results.expectedAllocation}
                onChange={(e) =>
                  update({
                    results: {
                      ...results,
                      expectedAllocation: e.target.value as typeof results.expectedAllocation,
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
          </div>
        </Panel>

        <div>
          {analysis ? (
            <>
              {guardrails.map((g) => (
                <GuardrailBanner key={g.id} severity={g.severity}>
                  {g.message}
                </GuardrailBanner>
              ))}

              <Panel className="verdict-panel">
                <VerdictHeadline analysis={analysis} />

                <div className="verdict-numbers">
                  <div>
                    <div className="verdict-numbers__label">Relative uplift</div>
                    <div className="verdict-numbers__value mono">
                      {formatSignedPercent(analysis.relativeUplift)}
                    </div>
                  </div>
                  <div>
                    <div className="verdict-numbers__label">Absolute uplift</div>
                    <div className="verdict-numbers__value mono">
                      {formatPercentagePoints(analysis.absoluteUplift)}
                    </div>
                  </div>
                  <div>
                    <div className="verdict-numbers__label">p-value</div>
                    <div className="verdict-numbers__value mono">
                      {analysis.pValue.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="verdict-numbers__label">
                      {Math.round(analysis.confidenceLevel * 100)}% CI
                    </div>
                    <div className="verdict-numbers__value mono">
                      [{formatPercentagePoints(analysis.confidenceIntervalAbsolute[0])},{" "}
                      {formatPercentagePoints(analysis.confidenceIntervalAbsolute[1])}]
                    </div>
                  </div>
                </div>

                <div className="chart-block">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" width={40} />
                      <RTooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "var(--muted)" : "var(--accent-2)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-block">
                  <div className="chart-block__label">
                    Confidence interval on the difference (0% = no effect)
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart
                      layout="vertical"
                      data={[
                        {
                          name: "Difference",
                          value: analysis.absoluteUplift * 100,
                          low:
                            (analysis.confidenceIntervalAbsolute[1] -
                              analysis.confidenceIntervalAbsolute[0]) *
                            50,
                        },
                      ]}
                      margin={{ top: 8, right: 20, left: 20, bottom: 0 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 11 }} unit="pp" />
                      <YAxis type="category" dataKey="name" hide />
                      <ReferenceLine x={0} stroke="var(--negative)" strokeDasharray="4 4" />
                      <Bar dataKey="value" fill="var(--accent)" radius={4} barSize={18}>
                        <ErrorBar
                          dataKey="low"
                          width={6}
                          stroke="var(--ink)"
                          direction="x"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <InterpretationBlock analysis={analysis} />
              </Panel>
            </>
          ) : (
            <div className="empty-state">
              <h3>No results yet</h3>
              <p>Enter users and conversions for both groups to see the analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerdictHeadline({
  analysis,
}: {
  analysis: ReturnType<typeof testConversionRates>;
}) {
  if (!analysis.significant) {
    return (
      <div className="verdict-headline verdict-headline--neutral">
        No statistically significant difference detected.
      </div>
    );
  }
  if (analysis.absoluteUplift > 0) {
    return (
      <div className="verdict-headline verdict-headline--positive">
        Treatment shows a statistically significant improvement.
      </div>
    );
  }
  return (
    <div className="verdict-headline verdict-headline--negative">
      Treatment shows a statistically significant decrease.
    </div>
  );
}

function InterpretationBlock({
  analysis,
}: {
  analysis: ReturnType<typeof testConversionRates>;
}) {
  const businessImpact = analysis.significant
    ? Math.round(analysis.absoluteUplift * 100000)
    : null;

  return (
    <div className="interpretation">
      <div className="interpretation__title">What happened?</div>
      <p>
        The Treatment group {analysis.absoluteUplift >= 0 ? "increased" : "decreased"}{" "}
        conversion from {formatPercent(analysis.controlRate)} to{" "}
        {formatPercent(analysis.treatmentRate)}, representing a{" "}
        {formatSignedPercent(analysis.relativeUplift)} relative{" "}
        {analysis.absoluteUplift >= 0 ? "uplift" : "change"}.{" "}
        {analysis.significant
          ? `The difference is statistically significant at the ${Math.round(analysis.confidenceLevel * 100)}% confidence level.`
          : "This does not prove that the two groups are identical — it means the experiment did not detect a statistically significant difference."}
      </p>
      {businessImpact !== null && (
        <>
          <div className="interpretation__title">Business interpretation</div>
          <p>
            If this result is representative of future users, the treatment
            could generate approximately{" "}
            <strong>{formatNumber(Math.abs(businessImpact))} additional conversions</strong>{" "}
            per 100,000 users.
          </p>
        </>
      )}
    </div>
  );
}

function GroupInputCard({
  title,
  group,
  rate,
  onChange,
}: {
  title: string;
  group: { name: string; users: number | null; conversions?: number | null };
  rate: number | null;
  onChange: (g: typeof group) => void;
}) {
  return (
    <div className="group-card">
      <div className="group-card__title">{title}</div>
      <Field label="Name">
        <input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
        />
      </Field>
      <Field label="Users">
        <input
          type="number"
          min={0}
          value={group.users ?? ""}
          onChange={(e) =>
            onChange({
              ...group,
              users: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </Field>
      <Field label="Conversions">
        <input
          type="number"
          min={0}
          value={group.conversions ?? ""}
          onChange={(e) =>
            onChange({
              ...group,
              conversions: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </Field>
      {rate !== null && (
        <div className="group-card__rate mono">
          Conversion rate: {formatPercent(rate)}
        </div>
      )}
    </div>
  );
}
