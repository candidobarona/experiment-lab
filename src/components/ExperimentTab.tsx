import { useState } from "react";
import { SubTabNav, type ExperimentSubTabId } from "./TabNav";
import { ResultsTab } from "./ResultsTab";
import { SummaryTab } from "./SummaryTab";
import { PptTab } from "./PptTab";
import "./ExperimentTab.css";

const HINTS: Record<ExperimentSubTabId, string> = {
  results:
    "Enter what happened here. This feeds the charts and conclusion used in Summary and the PPT.",
  summary:
    "Document the hypothesis and context. Design and Results are pulled in automatically.",
  ppt: "Generates a presentation from everything entered in Results and Summary — nothing new to fill in.",
};

export function ExperimentTab() {
  const [subTab, setSubTab] = useState<ExperimentSubTabId>("results");

  return (
    <div>
      <SubTabNav active={subTab} onChange={setSubTab} />
      <p className="experiment-tab__hint">{HINTS[subTab]}</p>
      {subTab === "results" && <ResultsTab />}
      {subTab === "summary" && <SummaryTab />}
      {subTab === "ppt" && <PptTab />}
    </div>
  );
}
