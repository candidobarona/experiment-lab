import "./TabNav.css";

export type TabId = "calculator" | "experiment" | "causal-impact";

const TABS: { id: TabId; label: string; num: string }[] = [
  { id: "calculator", label: "A/B Test Calculator", num: "01" },
  { id: "experiment", label: "Experiment", num: "02" },
  { id: "causal-impact", label: "Causal Impact", num: "03" },
];

export function TabNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav className="tabnav" aria-label="Experiment sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tabnav__item ${active === tab.id ? "tabnav__item--active" : ""}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span className="tabnav__num mono">{tab.num}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

export type ExperimentSubTabId = "results" | "summary" | "ppt";

const SUB_TABS: { id: ExperimentSubTabId; label: string; num: string }[] = [
  { id: "results", label: "Results", num: "2.1" },
  { id: "summary", label: "Summary", num: "2.2" },
  { id: "ppt", label: "Create PPT", num: "2.3" },
];

export function SubTabNav({
  active,
  onChange,
}: {
  active: ExperimentSubTabId;
  onChange: (tab: ExperimentSubTabId) => void;
}) {
  return (
    <nav className="subtabnav" aria-label="Experiment steps">
      {SUB_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`subtabnav__item ${active === tab.id ? "subtabnav__item--active" : ""}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span className="subtabnav__num mono">{tab.num}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
