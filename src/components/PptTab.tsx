import { useState } from "react";
import { useExperiment } from "../experiments/ExperimentContext";
import { Panel, Button } from "./primitives";
import { generateExperimentPptx } from "../ppt/generatePptx";
import "./PptTab.css";

export function PptTab() {
  const { state } = useExperiment();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const hasDesign = !!state.sampleSizeResult;
  const hasResults = !!state.analyzed?.conversionResult;
  const hasSummary = !!state.summary.hypothesis;

  const readiness = [
    { label: "Experiment design", ready: hasDesign, tab: "A/B Test Calculator" },
    { label: "Results analysis", ready: hasResults, tab: "A/B Test Results" },
    { label: "Hypothesis & context", ready: hasSummary, tab: "Experiment Summary" },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    setDone(false);
    try {
      const pptx = await generateExperimentPptx(state);
      const fileName = `${(state.summary.experimentName || "experiment").replace(/[^a-z0-9-_]+/gi, "-")}.pptx`;
      await pptx.writeFile({ fileName });
      setDone(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Create the presentation</h2>
      <p className="section-intro">
        Generates a ready-to-present PowerPoint from everything entered in
        the other tabs — no extra input needed.
      </p>

      <div className="ppt-grid">
        <Panel>
          <div className="ppt-readiness">
            {readiness.map((r) => (
              <div key={r.label} className="ppt-readiness__row">
                <span
                  className={`ppt-readiness__dot ${r.ready ? "ppt-readiness__dot--ready" : ""}`}
                />
                <span className="ppt-readiness__label">{r.label}</span>
                <span className="ppt-readiness__status">
                  {r.ready ? "Ready" : `Add in ${r.tab}`}
                </span>
              </div>
            ))}
          </div>

          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "Create Experiment Presentation"}
          </Button>

          {done && (
            <p className="ppt-done">
              Your presentation downloaded. It includes the experiment
              overview, design, results, statistical analysis, and
              suggested next steps.
            </p>
          )}

          <p className="ppt-note">
            The presentation is built and downloaded entirely in your
            browser — nothing is sent to a server.
          </p>
        </Panel>

        <Panel className="ppt-preview">
          <div className="ppt-preview__eyebrow">Deck structure</div>
          <ol className="ppt-preview__list">
            <li>Experiment — name, hypothesis, date</li>
            <li>Why did we run this test? — context & expected outcome</li>
            <li>Experiment design — groups, allocation, sample size</li>
            <li>Results — control vs. treatment chart</li>
            <li>Statistical analysis — uplift, p-value, confidence interval</li>
            <li>What happened? — plain-language summary</li>
            <li>Next steps — neutral questions, no invented recommendations</li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}
