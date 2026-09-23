import type PptxGenJS from "pptxgenjs";
import type { ExperimentState } from "../experiments/types";
import { formatDate } from "../utils/format";

// Design tokens mirrored from the app's visual identity, expressed as hex
// for PptxGenJS (which does not read CSS custom properties).
const COLORS = {
  ink: "14181C",
  paper: "F7F6F2",
  panel: "FFFFFF",
  line: "DAD6CC",
  accent: "2B6E5E",
  accentSoft: "E4EFEC",
  accent2: "C4622D",
  negative: "B23A3A",
  muted: "6B6B63",
};

const FONT_DISPLAY = "Georgia";
const FONT_UI = "Calibri";

export async function generateExperimentPptx(
  state: ExperimentState,
): Promise<PptxGenJS> {
  const { default: PptxGenJSCtor } = await import("pptxgenjs");
  const pptx = new PptxGenJSCtor();
  pptx.defineLayout({ name: "LAB_16x9", width: 13.33, height: 7.5 });
  pptx.layout = "LAB_16x9";

  const { summary, design, sampleSizeResult, results, analyzed } = state;

  const experimentName =
    summary.experimentName || results.experimentName || "Untitled experiment";

  slideTitle(pptx, experimentName, summary);
  slideWhy(pptx, summary);
  slideDesign(pptx, design, sampleSizeResult, summary);
  slideResults(pptx, results, analyzed);
  slideStatistics(pptx, analyzed);
  slideWhatHappened(pptx, results, analyzed);
  slideNextSteps(pptx);

  return pptx;
}

function baseSlide(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  return slide;
}

function eyebrow(slide: PptxGenJS.Slide, text: string) {
  slide.addText(text.toUpperCase(), {
    x: 0.6,
    y: 0.5,
    w: 8,
    h: 0.4,
    fontFace: FONT_UI,
    fontSize: 12,
    color: COLORS.accent,
    charSpacing: 1,
    bold: true,
  });
}

function footer(slide: PptxGenJS.Slide, pageLabel: string) {
  slide.addText(pageLabel, {
    x: 0.6,
    y: 7.05,
    w: 6,
    h: 0.3,
    fontFace: FONT_UI,
    fontSize: 9,
    color: COLORS.muted,
  });
}

function slideTitle(
  pptx: PptxGenJS,
  experimentName: string,
  summary: ExperimentState["summary"],
) {
  const slide = baseSlide(pptx);
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    fill: { color: COLORS.ink },
  });
  slide.addText("EXPERIMENT LAB", {
    x: 0.7,
    y: 0.6,
    w: 6,
    h: 0.4,
    fontFace: FONT_UI,
    fontSize: 12,
    color: COLORS.accentSoft,
    charSpacing: 2,
    bold: true,
  });
  slide.addText(experimentName, {
    x: 0.7,
    y: 2.6,
    w: 11.9,
    h: 1.8,
    fontFace: FONT_DISPLAY,
    fontSize: 44,
    color: "FFFFFF",
    bold: true,
  });
  if (summary.hypothesis) {
    slide.addText(summary.hypothesis, {
      x: 0.7,
      y: 4.3,
      w: 10.5,
      h: 1.2,
      fontFace: FONT_UI,
      fontSize: 16,
      color: COLORS.line,
      italic: true,
    });
  }
  const dateStr =
    summary.startDate || summary.endDate
      ? `${formatDate(summary.startDate)} — ${formatDate(summary.endDate)}`
      : new Date().toISOString().slice(0, 10);
  slide.addText(dateStr, {
    x: 0.7,
    y: 6.6,
    w: 6,
    h: 0.4,
    fontFace: FONT_UI,
    fontSize: 12,
    color: COLORS.muted,
  });
}

function slideWhy(pptx: PptxGenJS, summary: ExperimentState["summary"]) {
  const slide = baseSlide(pptx);
  eyebrow(slide, "01 — Why did we run this test?");
  slide.addText("Business context & hypothesis", {
    x: 0.6,
    y: 1.0,
    w: 11,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.ink,
    bold: true,
  });

  slide.addText("Hypothesis", {
    x: 0.6,
    y: 2.1,
    w: 5,
    h: 0.35,
    fontFace: FONT_UI,
    fontSize: 12,
    bold: true,
    color: COLORS.accent,
  });
  slide.addText(summary.hypothesis || "No hypothesis recorded.", {
    x: 0.6,
    y: 2.5,
    w: 6,
    h: 2,
    fontFace: FONT_UI,
    fontSize: 15,
    color: COLORS.ink,
  });

  slide.addText("Expected outcome", {
    x: 0.6,
    y: 4.6,
    w: 5,
    h: 0.35,
    fontFace: FONT_UI,
    fontSize: 12,
    bold: true,
    color: COLORS.accent,
  });
  slide.addText(summary.expectedOutcome || "—", {
    x: 0.6,
    y: 5.0,
    w: 6,
    h: 1.3,
    fontFace: FONT_UI,
    fontSize: 15,
    color: COLORS.ink,
  });

  slide.addShape("rect", {
    x: 7.4,
    y: 1.9,
    w: 5.3,
    h: 4.6,
    fill: { color: COLORS.panel },
    line: { color: COLORS.line, width: 1 },
  });
  const rows: [string, string][] = [
    ["Primary metric", summary.primaryMetric],
    ["Secondary metrics", summary.secondaryMetrics || "—"],
    ["Target audience", summary.targetAudience || "—"],
    ["Control", summary.controlGroupName],
    ["Treatment", summary.treatmentGroupName],
  ];
  let y = 2.2;
  for (const [label, value] of rows) {
    slide.addText(label, {
      x: 7.7,
      y,
      w: 2.2,
      h: 0.4,
      fontFace: FONT_UI,
      fontSize: 11,
      color: COLORS.muted,
    });
    slide.addText(value, {
      x: 10.0,
      y,
      w: 2.5,
      h: 0.4,
      fontFace: FONT_UI,
      fontSize: 11,
      color: COLORS.ink,
      bold: true,
      align: "right",
    });
    y += 0.75;
  }
  footer(slide, "Experiment Lab");
}

function slideDesign(
  pptx: PptxGenJS,
  design: ExperimentState["design"],
  sampleSizeResult: ExperimentState["sampleSizeResult"],
  summary: ExperimentState["summary"],
) {
  const slide = baseSlide(pptx);
  eyebrow(slide, "02 — Experiment design");
  slide.addText("How the test was set up", {
    x: 0.6,
    y: 1.0,
    w: 11,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.ink,
    bold: true,
  });

  if (sampleSizeResult) {
    slide.addText(sampleSizeResult.perGroup.toLocaleString(), {
      x: 0.6,
      y: 2.0,
      w: 4,
      h: 1.1,
      fontFace: FONT_DISPLAY,
      fontSize: 54,
      color: COLORS.accent,
      bold: true,
    });
    slide.addText("recommended sample size per group", {
      x: 0.6,
      y: 3.05,
      w: 4,
      h: 0.5,
      fontFace: FONT_UI,
      fontSize: 12,
      color: COLORS.muted,
    });
  }

  const cards: [string, string][] = [
    ["Control", summary.controlGroupName],
    ["Treatment", summary.treatmentGroupName],
    ["Traffic allocation", design.allocation],
    [
      "Sample size (total)",
      sampleSizeResult ? sampleSizeResult.total.toLocaleString() : "—",
    ],
    [
      "Primary metric",
      design.metricType === "conversion" ? "Conversion rate" : "Continuous metric",
    ],
    ["Significance / power", `${Math.round((1 - design.alpha) * 100)}% / ${Math.round(design.power * 100)}%`],
  ];

  let x = 5.1;
  let y = 2.0;
  cards.forEach(([label, value], i) => {
    slide.addShape("rect", {
      x,
      y,
      w: 3.9,
      h: 1.5,
      fill: { color: COLORS.panel },
      line: { color: COLORS.line, width: 1 },
    });
    slide.addText(label.toUpperCase(), {
      x: x + 0.2,
      y: y + 0.15,
      w: 3.5,
      h: 0.35,
      fontFace: FONT_UI,
      fontSize: 9,
      color: COLORS.muted,
      charSpacing: 1,
    });
    slide.addText(String(value), {
      x: x + 0.2,
      y: y + 0.5,
      w: 3.5,
      h: 0.8,
      fontFace: FONT_UI,
      fontSize: 15,
      color: COLORS.ink,
      bold: true,
    });
    if (i % 2 === 0) {
      x += 4.1;
    } else {
      x -= 4.1;
      y += 1.7;
    }
  });

  footer(slide, "Experiment Lab");
}

function slideResults(
  pptx: PptxGenJS,
  results: ExperimentState["results"],
  analyzed: ExperimentState["analyzed"],
) {
  const slide = baseSlide(pptx);
  eyebrow(slide, "03 — Results");
  slide.addText("Control vs. Treatment", {
    x: 0.6,
    y: 1.0,
    w: 11,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.ink,
    bold: true,
  });

  const c = analyzed?.conversionResult;
  if (c) {
    slide.addChart(
      pptx.ChartType.bar,
      [
        {
          name: "Conversion rate",
          labels: [results.control.name, results.treatment.name],
          values: [c.controlRate * 100, c.treatmentRate * 100],
        },
      ],
      {
        x: 0.6,
        y: 1.9,
        w: 6.2,
        h: 4.4,
        chartColors: [COLORS.muted, COLORS.accent2],
        showValue: true,
        dataLabelFormatCode: '0.00"%"',
        showLegend: false,
        catAxisLabelColor: COLORS.ink,
        valAxisLabelColor: COLORS.ink,
      },
    );

    const upliftColor = c.absoluteUplift >= 0 ? COLORS.accent : COLORS.negative;
    slide.addText(
      `${c.absoluteUplift >= 0 ? "+" : ""}${(c.relativeUplift * 100).toFixed(1)}%`,
      {
        x: 7.2,
        y: 2.3,
        w: 5.4,
        h: 1.3,
        fontFace: FONT_DISPLAY,
        fontSize: 56,
        color: upliftColor,
        bold: true,
      },
    );
    slide.addText("relative uplift", {
      x: 7.2,
      y: 3.5,
      w: 5.4,
      h: 0.4,
      fontFace: FONT_UI,
      fontSize: 13,
      color: COLORS.muted,
    });

    slide.addText(
      `Control: ${(c.controlRate * 100).toFixed(2)}%    Treatment: ${(c.treatmentRate * 100).toFixed(2)}%`,
      {
        x: 7.2,
        y: 4.3,
        w: 5.4,
        h: 0.5,
        fontFace: FONT_UI,
        fontSize: 13,
        color: COLORS.ink,
      },
    );
    slide.addText(
      `Sample: ${results.control.users?.toLocaleString()} vs ${results.treatment.users?.toLocaleString()} users`,
      {
        x: 7.2,
        y: 4.8,
        w: 5.4,
        h: 0.5,
        fontFace: FONT_UI,
        fontSize: 13,
        color: COLORS.muted,
      },
    );
  } else {
    slide.addText("No results entered yet.", {
      x: 0.6,
      y: 2.5,
      w: 8,
      h: 0.6,
      fontFace: FONT_UI,
      fontSize: 16,
      color: COLORS.muted,
    });
  }

  footer(slide, "Experiment Lab");
}

function slideStatistics(
  pptx: PptxGenJS,
  analyzed: ExperimentState["analyzed"],
) {
  const slide = baseSlide(pptx);
  eyebrow(slide, "04 — Statistical analysis");
  slide.addText("Is the difference real?", {
    x: 0.6,
    y: 1.0,
    w: 11,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.ink,
    bold: true,
  });

  const c = analyzed?.conversionResult;
  if (c) {
    const stats: [string, string][] = [
      ["Absolute uplift", `${c.absoluteUplift >= 0 ? "+" : ""}${(c.absoluteUplift * 100).toFixed(2)} pp`],
      ["Relative uplift", `${c.relativeUplift >= 0 ? "+" : ""}${(c.relativeUplift * 100).toFixed(1)}%`],
      ["p-value", c.pValue.toFixed(4)],
      [
        `${Math.round(c.confidenceLevel * 100)}% confidence interval`,
        `[${(c.confidenceIntervalAbsolute[0] * 100).toFixed(2)} pp, ${(c.confidenceIntervalAbsolute[1] * 100).toFixed(2)} pp]`,
      ],
      ["Statistically significant", c.significant ? "Yes" : "No"],
      ["Method", c.method],
    ];

    let y = 2.0;
    for (const [label, value] of stats) {
      slide.addText(label, {
        x: 0.6,
        y,
        w: 4,
        h: 0.6,
        fontFace: FONT_UI,
        fontSize: 14,
        color: COLORS.muted,
      });
      slide.addText(value, {
        x: 4.8,
        y,
        w: 7.8,
        h: 0.6,
        fontFace: FONT_UI,
        fontSize: 14,
        bold: true,
        color: COLORS.ink,
      });
      slide.addShape("line", {
        x: 0.6,
        y: y + 0.55,
        w: 12,
        h: 0,
        line: { color: COLORS.line, width: 0.75 },
      });
      y += 0.75;
    }
  } else {
    slide.addText("No results entered yet.", {
      x: 0.6,
      y: 2.5,
      w: 8,
      h: 0.6,
      fontFace: FONT_UI,
      fontSize: 16,
      color: COLORS.muted,
    });
  }

  footer(slide, "Experiment Lab");
}

function slideWhatHappened(
  pptx: PptxGenJS,
  results: ExperimentState["results"],
  analyzed: ExperimentState["analyzed"],
) {
  const slide = baseSlide(pptx);
  eyebrow(slide, "05 — What happened?");
  slide.addText("Summary", {
    x: 0.6,
    y: 1.0,
    w: 11,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.ink,
    bold: true,
  });

  const c = analyzed?.conversionResult;
  const text = c
    ? `The ${results.treatment.name || "Treatment"} group ${
        c.absoluteUplift >= 0 ? "increased" : "decreased"
      } conversion from ${(c.controlRate * 100).toFixed(2)}% to ${(c.treatmentRate * 100).toFixed(2)}%, a ${
        c.relativeUplift >= 0 ? "+" : ""
      }${(c.relativeUplift * 100).toFixed(1)}% relative change. ${
        c.significant
          ? `The difference is statistically significant at the ${Math.round(c.confidenceLevel * 100)}% confidence level.`
          : "The experiment did not detect a statistically significant difference — this does not prove the two groups are identical."
      }`
    : "No results entered yet.";

  slide.addText(text, {
    x: 0.6,
    y: 2.3,
    w: 11.5,
    h: 2.2,
    fontFace: FONT_DISPLAY,
    fontSize: 22,
    color: COLORS.ink,
    lineSpacing: 32,
  });

  footer(slide, "Experiment Lab");
}

function slideNextSteps(pptx: PptxGenJS) {
  const slide = baseSlide(pptx);
  eyebrow(slide, "06 — Next steps");
  slide.addText("Questions to consider", {
    x: 0.6,
    y: 1.0,
    w: 11,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.ink,
    bold: true,
  });

  const questions = [
    "Is the result consistent across key segments?",
    "Are there guardrail metrics that changed?",
    "Was the experiment sufficiently powered?",
    "Are there implementation risks to rolling this out?",
  ];

  let y = 2.3;
  for (const q of questions) {
    slide.addShape("rect", {
      x: 0.6,
      y: y + 0.08,
      w: 0.12,
      h: 0.12,
      fill: { color: COLORS.accent2 },
    });
    slide.addText(q, {
      x: 1.0,
      y,
      w: 10.8,
      h: 0.6,
      fontFace: FONT_UI,
      fontSize: 17,
      color: COLORS.ink,
    });
    y += 0.85;
  }

  footer(slide, "Experiment Lab");
}
