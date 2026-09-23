import "./TabNav.css";

export type TabId =
  | "calculator"
  | "results"
  | "summary"
  | "ppt"
  | "causal-impact";

const TABS: { id: TabId; label: string; num: string }[] = [
  { id: "calculator", label: "A/B Test Calculator", num: "01" },
  { id: "results", label: "A/B Test Results", num: "02" },
  { id: "summary", label: "Experiment Summary", num: "03" },
  { id: "ppt", label: "Create PPT", num: "04" },
  { id: "causal-impact", label: "Causal Impact", num: "05" },
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
