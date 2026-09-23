# Experiment Lab

A lightweight, single-page tool for Product, Marketing, Growth, Data
Analytics and BI teams to design, analyze, and present experiments —
from **experiment setup → statistical analysis → clear result →
presentation** — without needing a statistician on hand.

Everything runs client-side. No backend, no external APIs, no tracking.
Your data never leaves your browser.

## What it solves

Running a trustworthy A/B test means getting several things right: how
many users you need, whether a result is actually significant, and how
to explain it to people who aren't statisticians. Most teams either
under-power their tests, misread noise as a win, or spend hours turning
results into a deck. Experiment Lab collapses that into five tabs, each
requiring the smallest amount of input possible.

## Features

| Tab | What it does |
|---|---|
| **A/B Test Calculator** | Enter a baseline and the uplift you want to detect; get the required sample size per group, total sample, and (optionally) estimated experiment duration. |
| **A/B Test Results** | Enter users and conversions per group; get an automatic significance test, uplift, confidence interval, charts, and plain-language interpretation — including guardrails like Sample Ratio Mismatch. |
| **Experiment Summary** | Document the hypothesis and context. Reuses everything already entered in the other tabs — nothing is typed twice. |
| **Create PPT** | Generates a 7-slide, presentation-ready `.pptx` from all of the above, built and downloaded entirely in your browser. |
| **Causal Impact** | For changes you can't A/B test (pricing, global rollouts): upload a daily time series, pick an intervention date, and get an estimated counterfactual and impact. |

## How to calculate sample size

For a **conversion rate** metric, the calculator uses the standard
two-proportion z-test sample-size formula (see Kohavi et al.,
*Trustworthy Online Controlled Experiments*):

```
n = (z_(1-α/2) · √(2p̄(1-p̄)) + z_(1-β) · √(p₁(1-p₁) + p₂(1-p₂)))² / (p₁ - p₂)²
```

where `p₁` is the baseline rate, `p₂` is the baseline rate adjusted by
your target relative uplift, and `p̄` is the pooled rate. Unequal traffic
allocations (e.g. 80/20) require a larger *total* sample to reach the
same statistical power as a balanced 50/50 split — the calculator
accounts for this automatically.

For a **continuous metric** (e.g. average session duration, revenue per
user), it uses the standard two-sample t-test approximation:

```
n = 2 · (z_(1-α/2) + z_(1-β))² · σ² / δ²
```

where `σ` is the metric's standard deviation and `δ` is the absolute
difference you want to detect.

## How to analyze results

Results are analyzed with a **two-proportion z-test** (conversion
metrics) or **Welch's two-sample t-test** (continuous metrics). The app
never labels a group the "winner" just because its raw number is
higher — it checks statistical significance first, and uses careful
language either way:

- Significant improvement → *"Treatment shows a statistically
  significant improvement."*
- Not significant → *"No statistically significant difference
  detected."* (never *"there is no difference"* — absence of evidence
  isn't evidence of absence)
- Significant decrease → *"Treatment shows a statistically significant
  decrease."*

### Guardrails

- **Sample Ratio Mismatch (SRM):** flags when the observed traffic
  split differs materially from what was expected, which often signals
  a randomization or instrumentation bug.
- **Small sample warning:** flags when a group is too small to draw a
  reliable conclusion.
- **Small MDE note:** reminds you that detecting very small effects
  requires substantially more users.
- **Peeking warning:** a standing reminder not to stop a test the
  moment it looks significant, unless you're using a sequential-testing
  method.

## Interpreting p-values and confidence intervals

- **p-value** — a measure of how compatible the observed difference is
  with the assumption that there is no real difference. It is *not* the
  probability that the treatment works.
- **Confidence interval** — a range representing the uncertainty around
  the estimated effect. If it crosses 0%, the effect could plausibly be
  zero.
- **Statistical power** — the probability of detecting an effect of the
  size you're looking for, if it really exists.
- **Relative vs. absolute uplift** — relative uplift is the percentage
  change from the baseline (5% → 5.5% is a *10% relative* uplift);
  absolute uplift is the raw difference (*0.5 percentage points*). The
  app keeps these visually and verbally distinct, since confusing them
  is one of the most common experimentation mistakes.

## Causal Impact — a simplified approximation

When you can't randomize (pricing changes, global feature rollouts,
business decisions), Causal Impact estimates what *would have*
happened without the change, and compares it to what actually
happened.

This implementation fits an ordinary least-squares linear trend to your
pre-intervention data and projects it forward as the counterfactual —
a standard, well-understood technique, but a **simplified
approximation** of full Bayesian Structural Time Series (BSTS) methods
(e.g. Google's `CausalImpact` R package), which require MCMC sampling
and a much heavier dependency than a static, client-side app can
reasonably ship. The confidence interval is derived from the pre-period
residual error and is intentionally conservative.

**Limitations to keep in mind:**
- Assumes the pre-period trend would have continued linearly.
- Does not control for seasonality, external shocks, or a control
  market/segment (a true BSTS or difference-in-differences approach
  with a control group will be more robust for high-stakes decisions).
- Works best with a reasonably long, clean, daily pre-period (10+
  observations, ideally 30+).
- Reports an **estimated** causal impact — never proof of causality.

## A/B Test vs. Causal Impact — which should I use?

- **A/B Test:** use when you can randomly split users into control and
  treatment.
- **Causal Impact:** use when you can't create a randomized control
  group and need to estimate what would have happened without the
  intervention.

Neither is universally better — they answer the same question under
different constraints.

## Privacy

All calculations — sample sizing, significance testing, causal impact
modeling, and PowerPoint generation — run **locally in your browser**.
Uploaded CSVs and entered results (which may include revenue,
conversions, or other business-sensitive numbers) are never sent to a
server. There is no analytics or tracking bundled into the app.

## Statistical methods reference

| Situation | Method |
|---|---|
| Sample size, conversion rate | Two-proportion z-test sample-size formula |
| Sample size, continuous metric | Two-sample t-test (normal approximation) |
| Results, conversion rate | Two-proportion z-test (pooled SE for the test, unpooled SE for the CI) |
| Results, continuous metric | Welch's two-sample t-test (normal approximation to the critical value) |
| Sample Ratio Mismatch | Chi-square goodness-of-fit test (1 df) |
| Causal Impact | OLS linear-trend counterfactual (simplified BSTS approximation) |

All formulas are implemented directly in `/src/statistics` and
`/src/causal-impact` — no black-box statistics dependency — and are
covered by unit tests in `__tests__/` directories alongside the code,
including known reference cases and edge cases (0 conversions, 100%
conversion, identical groups, very small/very large samples).

## Project structure

```
src/
  statistics/        Sample size, hypothesis testing, guardrails, normal distribution
  experiments/       Experiment domain model, validation, shared React state
  causal-impact/     Counterfactual model, CSV validation
  ppt/               PowerPoint generation (PptxGenJS)
  components/        UI — one file per tab, plus shared primitives
  utils/             Formatting, CSV parsing
```

## Development

Requires Node 20+.

```bash
npm install
npm run dev       # local dev server
npm run test      # run the statistics/causal-impact test suite
npm run build     # type-check and produce a production build in dist/
npm run preview   # preview the production build locally
```

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy.yml` builds and deploys `dist/`
to GitHub Pages automatically on every push to `main`. To use it:

1. Push this repository to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. If your repository name isn't `experiment-lab`, update the `base`
   path in `vite.config.ts` to match (`base: '/<your-repo-name>/'`).

You can also build and deploy manually:

```bash
npm run build
# then push the contents of dist/ to a gh-pages branch,
# or serve dist/ from any static host
```

## Tech stack

React, TypeScript, Vite · Recharts (charts) · PptxGenJS (PowerPoint
generation, lazy-loaded) · Vitest (tests) · no backend, no external
statistics library — the statistics layer is implemented and tested
directly in this repository.
