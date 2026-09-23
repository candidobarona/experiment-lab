import { useExperiment } from "../experiments/ExperimentContext";
import { Field, Panel } from "./primitives";
import type { PrimaryMetric } from "../experiments/types";
import "./Summary.css";

const PRIMARY_METRICS: PrimaryMetric[] = [
  "Conversion rate",
  "Revenue",
  "Revenue per user",
  "Average order value",
  "Retention",
  "Other",
];

export function SummaryTab() {
  const { state, update } = useExperiment();
  const { summary, design, sampleSizeResult, results } = state;

  const patch = (p: Partial<typeof summary>) =>
    update({ summary: { ...summary, ...p } });

  return (
    <div>
      <h2 className="section-title">Document the experiment</h2>
      <p className="section-intro">
        A few notes to give this experiment context — everything else is
        pulled in automatically from the Calculator and Results tabs.
      </p>

      <div className="summary-grid">
        <Panel className="summary-form">
          <Field label="Experiment name">
            <input
              value={summary.experimentName}
              onChange={(e) => patch({ experimentName: e.target.value })}
              placeholder="Checkout redesign"
            />
          </Field>

          <Field label="Hypothesis">
            <textarea
              rows={3}
              value={summary.hypothesis}
              onChange={(e) => patch({ hypothesis: e.target.value })}
              placeholder="If we simplify checkout, conversion will increase because users will encounter less friction."
            />
          </Field>

          <Field label="Primary metric">
            <select
              value={summary.primaryMetric}
              onChange={(e) => patch({ primaryMetric: e.target.value as PrimaryMetric })}
            >
              {PRIMARY_METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Secondary metrics" hint="Optional">
            <input
              value={summary.secondaryMetrics ?? ""}
              onChange={(e) => patch({ secondaryMetrics: e.target.value })}
              placeholder="e.g. AOV, cart abandonment"
            />
          </Field>

          <div className="summary-form__pair">
            <Field label="Control group">
              <input
                value={summary.controlGroupName}
                onChange={(e) => patch({ controlGroupName: e.target.value })}
              />
            </Field>
            <Field label="Treatment group">
              <input
                value={summary.treatmentGroupName}
                onChange={(e) => patch({ treatmentGroupName: e.target.value })}
              />
            </Field>
          </div>

          <div className="summary-form__pair">
            <Field label="Start date" hint="Optional">
              <input
                type="date"
                value={summary.startDate ?? ""}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </Field>
            <Field label="End date" hint="Optional">
              <input
                type="date"
                value={summary.endDate ?? ""}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Target audience" hint="Optional">
            <input
              value={summary.targetAudience ?? ""}
              onChange={(e) => patch({ targetAudience: e.target.value })}
              placeholder="e.g. New users on mobile web"
            />
          </Field>

          <Field label="Expected outcome" hint="Optional">
            <textarea
              rows={2}
              value={summary.expectedOutcome ?? ""}
              onChange={(e) => patch({ expectedOutcome: e.target.value })}
            />
          </Field>
        </Panel>

        <Panel className="summary-preview">
          <div className="summary-preview__eyebrow">Pulled in automatically</div>
          <dl className="summary-preview__list">
            <div>
              <dt>Metric type</dt>
              <dd>{design.metricType === "conversion" ? "Conversion rate" : "Continuous metric"}</dd>
            </div>
            <div>
              <dt>Baseline</dt>
              <dd>
                {design.metricType === "conversion"
                  ? design.baselineRate !== undefined
                    ? `${(design.baselineRate * 100).toFixed(2)}%`
                    : "—"
                  : design.baselineMean ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Target uplift</dt>
              <dd>{(design.relativeUplift * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Sample size / group</dt>
              <dd>
                {sampleSizeResult ? sampleSizeResult.perGroup.toLocaleString() : "Not calculated yet"}
              </dd>
            </div>
            <div>
              <dt>Traffic allocation</dt>
              <dd>{design.allocation}</dd>
            </div>
            <div>
              <dt>Results entered</dt>
              <dd>
                {results.control.users && results.treatment.users
                  ? "Yes — see Results tab"
                  : "Not yet"}
              </dd>
            </div>
          </dl>
          <p className="summary-preview__note">
            This is reused automatically when generating the presentation —
            you won't need to enter it again.
          </p>
        </Panel>
      </div>
    </div>
  );
}
