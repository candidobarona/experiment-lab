import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { Field, Panel, BigNumber, GuardrailBanner, Button } from "./primitives";
import {
  estimateCausalImpact,
  validateTimeSeries,
  type TimeSeriesPoint,
  type CausalImpactResult,
} from "../causal-impact/model";
import { parseTimeSeriesCsv } from "../utils/csv";
import { formatNumber, formatSignedPercent } from "../utils/format";
import "./CausalImpactTab.css";

export function CausalImpactTab() {
  const [whatChanged, setWhatChanged] = useState("");
  const [interventionDate, setInterventionDate] = useState("");
  const [metricName, setMetricName] = useState("Revenue");
  const [series, setSeries] = useState<TimeSeriesPoint[]>([]);
  const [csvIssues, setCsvIssues] = useState<ReturnType<typeof validateTimeSeries>>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseTimeSeriesCsv(text);
    setSeries(parsed);
    setCsvIssues(validateTimeSeries(parsed));
    setFileName(file.name);
  };

  const result: CausalImpactResult | null = useMemo(() => {
    if (series.length === 0 || !interventionDate) return null;
    try {
      return estimateCausalImpact({ series, interventionDate });
    } catch {
      return null;
    }
  }, [series, interventionDate]);

  const chartData = useMemo(() => {
    if (!result) return [];
    const pre = result.prePeriod.map((p) => ({
      date: p.date,
      observed: p.value,
      counterfactual: null as number | null,
    }));
    const post = result.postPeriod.map((p, i) => ({
      date: p.date,
      observed: p.value,
      counterfactual: result.counterfactualSeries[i]?.value ?? null,
    }));
    return [...pre, ...post];
  }, [result]);

  return (
    <div>
      <h2 className="section-title">Estimate impact without an A/B test</h2>
      <p className="section-intro">
        For changes that rolled out to everyone — pricing, global product
        changes, business decisions — estimate what would have happened
        without the change, and compare it to what actually happened.
      </p>

      <div className="ci-grid">
        <Panel className="ci-wizard">
          <Field label="What changed?">
            <input
              value={whatChanged}
              onChange={(e) => setWhatChanged(e.target.value)}
              placeholder="e.g. New pricing launched"
            />
          </Field>

          <Field label="When did it change?">
            <input
              type="date"
              value={interventionDate}
              onChange={(e) => setInterventionDate(e.target.value)}
            />
          </Field>

          <Field label="What metric are you measuring?">
            <input
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              placeholder="e.g. Revenue"
            />
          </Field>

          <Field
            label="Upload data (CSV)"
            hint="Format: date,value — one row per day, covering both the pre- and post-period"
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </Field>
          {fileName && (
            <p className="ci-filename mono">
              {fileName} — {series.length} rows loaded
            </p>
          )}

          {csvIssues.map((issue, i) => (
            <GuardrailBanner
              key={i}
              severity={issue.severity === "error" ? "warning" : "info"}
            >
              {issue.message}
            </GuardrailBanner>
          ))}

          <p className="ci-privacy-note">
            Your data is processed locally in your browser.
          </p>
        </Panel>

        <div>
          {result ? (
            <Panel>
              <BigNumber
                value={formatSignedPercent(result.estimatedImpactRelative)}
                label="Estimated causal impact"
                tone={result.estimatedImpactAbsolute >= 0 ? "positive" : "negative"}
              />
              <div className="ci-secondary-stats">
                <div>
                  <div className="ci-secondary-stats__label">Absolute impact</div>
                  <div className="ci-secondary-stats__value mono">
                    {formatNumber(result.estimatedImpactAbsolute)}
                  </div>
                </div>
                <div>
                  <div className="ci-secondary-stats__label">
                    {Math.round(result.confidenceLevel * 100)}% credible interval
                  </div>
                  <div className="ci-secondary-stats__value mono">
                    [{formatSignedPercent(result.confidenceIntervalRelative[0])},{" "}
                    {formatSignedPercent(result.confidenceIntervalRelative[1])}]
                  </div>
                </div>
              </div>

              <div className="ci-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      axisLine={{ stroke: "var(--line)" }}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine
                      x={interventionDate}
                      stroke="var(--accent-2)"
                      strokeDasharray="4 4"
                      label={{ value: "Intervention", fontSize: 11, fill: "var(--accent-2)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="observed"
                      name="Observed"
                      stroke="var(--ink)"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="counterfactual"
                      name="Counterfactual"
                      stroke="var(--accent)"
                      strokeDasharray="5 4"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="ci-explainer">
                After the intervention, {metricName.toLowerCase()} was{" "}
                {result.estimatedImpactAbsolute >= 0 ? "higher" : "lower"} than
                the model's estimated counterfactual — an estimated causal
                impact of {formatSignedPercent(result.estimatedImpactRelative)}.
                This is an estimate, not proof of causality, and depends on
                the pre-period trend continuing as it would have without the
                change.
              </p>
              <p className="ci-method mono">Method: {result.method}</p>
            </Panel>
          ) : (
            <div className="empty-state">
              <h3>No data yet</h3>
              <p>Upload a CSV and set the intervention date to estimate impact.</p>
              <Button disabled>Estimate impact</Button>
            </div>
          )}
        </div>
      </div>

      <MethodComparison />
    </div>
  );
}

function MethodComparison() {
  return (
    <Panel className="method-comparison">
      <h3 className="method-comparison__title">Which method should I use?</h3>
      <div className="method-comparison__grid">
        <div>
          <div className="method-comparison__name">A/B Test</div>
          <p>Use when you can randomly split users into control and treatment.</p>
        </div>
        <div>
          <div className="method-comparison__name">Causal Impact</div>
          <p>
            Use when you cannot create a randomized control group and need
            to estimate what would have happened without the intervention.
          </p>
        </div>
      </div>
    </Panel>
  );
}
