import { useState } from "react";
import "./App.css";
import { ExperimentProvider } from "./experiments/ExperimentContext";
import { TabNav, type TabId } from "./components/TabNav";
import { CalculatorTab } from "./components/CalculatorTab";
import { ResultsTab } from "./components/ResultsTab";
import { SummaryTab } from "./components/SummaryTab";
import { PptTab } from "./components/PptTab";
import { CausalImpactTab } from "./components/CausalImpactTab";

function App() {
  const [tab, setTab] = useState<TabId>("calculator");

  return (
    <ExperimentProvider>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__top">
            <div>
              <h1 className="app-header__title">Experiment Lab</h1>
              <div className="app-header__subtitle">A/B Testing &amp; Causal Impact</div>
            </div>
          </div>
          <div className="app-header__nav-wrap">
            <TabNav active={tab} onChange={setTab} />
          </div>
        </header>

        <main className="app-main">
          {tab === "calculator" && <CalculatorTab />}
          {tab === "results" && <ResultsTab />}
          {tab === "summary" && <SummaryTab />}
          {tab === "ppt" && <PptTab />}
          {tab === "causal-impact" && <CausalImpactTab />}
        </main>

        <footer className="app-footer">
          Your data is processed locally in your browser. Nothing is sent to a server.
        </footer>
      </div>
    </ExperimentProvider>
  );
}

export default App;
