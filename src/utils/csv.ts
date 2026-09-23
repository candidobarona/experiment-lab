import type { TimeSeriesPoint } from "../causal-impact/model";

/** Minimal CSV parser for the `date,value` format used by Causal Impact. */
export function parseTimeSeriesCsv(text: string): TimeSeriesPoint[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const firstCols = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const hasHeader = firstCols.includes("date") && firstCols.includes("value");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const [date, value] = line.split(",").map((c) => c.trim());
    return { date, value: Number(value) };
  });
}
