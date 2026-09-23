import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_STATE, type ExperimentState } from "../experiments/types";

interface ExperimentContextValue {
  state: ExperimentState;
  update: (patch: Partial<ExperimentState>) => void;
  setState: React.Dispatch<React.SetStateAction<ExperimentState>>;
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExperimentState>(DEFAULT_STATE);

  const update = (patch: Partial<ExperimentState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  return (
    <ExperimentContext.Provider value={{ state, update, setState }}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment(): ExperimentContextValue {
  const ctx = useContext(ExperimentContext);
  if (!ctx) {
    throw new Error("useExperiment must be used within ExperimentProvider");
  }
  return ctx;
}
