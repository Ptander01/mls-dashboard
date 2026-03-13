# MLS Dashboard Feature Evaluation: From Data Display to Data Storytelling

**Date**: March 13, 2026
**Context**: Evaluation of brainstormed features against the existing mls-dashboard codebase (React 19 + Recharts + Three.js, 881 players, 510 matches, 30 teams, all static client-side data)

---

## The Core Thesis

The central insight driving this brainstorm is exactly right: the dashboard currently functions as a **data explorer** (it lets people look at things) but not yet as a **data narrator** (it tells people what matters). The gap is that explorers assume the user knows what questions to ask. The visual references you shared from the New York Times, FiveThirtyEight, and the climate vulnerability chart all share a common pattern: **the headline IS the insight, not a description of the chart**. Your current tab labels say "Attendance" or "Team Budget" where these references would say "Big markets don't always fill their stadiums" or "MLS teams are overpaying for goals."

This evaluation organizes every feature idea from your brainstorm into tiers, assesses each against the actual codebase, and recommends a build order.

---

## Tier 1: High Impact, Clean Fit (Build These First)

These features directly close the explorer-to-narrator gap, require no new dependencies, and integrate cleanly with the existing component architecture.

### 1.1 Computed Insight Headlines

**What it is**: Every chart panel gets a `<InsightHeadline>` component that sits above or below the chart title. It renders a single bold sentence computed from the current filtered data. When filters change, the headline recomputes. This is the most direct translation of the NYT/FiveThirtyEight approach to your dashboard.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Excellent. Pure computation over existing `filteredPlayers`, `filteredMatches`, and `filteredTeams` from `FilterContext`. No new data, no new dependencies. Each headline is a function that takes sorted/aggregated data and templates a string. |
| **Design coherence** | Perfect fit. The headline would use Space Grotesk at the section tier (24px or 20px), rendered inside the existing `NeuCard` wrapper. It sits naturally above the chart area where the current static description text already lives. |
| **Data requirements** | Already met. The Player interface has 22 stat fields including salary, the Match interface has attendance and scores, and `TEAM_BUDGETS` has DP/TAM/regular breakdowns. Every headline can be computed from what exists. |
| **Implementation** | Create an `insightEngine.ts` module in `client/src/lib/` that exports pure functions: `playerStatsHeadline(players, xAxis, yAxis)`, `teamBudgetHeadline(teams, budgets)`, `attendanceHeadline(matches, teams)`, etc. Each tab component calls the relevant function and renders the result. Estimated at 200-300 lines of analysis code plus minor integration into each tab. |

**Example outputs by tab**:

| Tab | Static title today | Computed headline example |
|---|---|---|
| Player Stats (Shots vs Goals) | "Player Comparison" | "Lionel Messi converts shots to goals at 2.1x the league average. Alonso Martinez at $700K outscores 6 players making 3x more." |
| Team Budget | "Team Salary Breakdown" | "LAFC spent $4.2M per goal — the league's worst ROI. FC Cincinnati got a goal every $890K — best in the East." |
| Attendance | "Average Home Attendance by Team" | "Atlanta United averaged 42,500 fans — nearly double the league median. 8 teams failed to fill 80% of capacity." |
| Gravitational Pull | "League-Wide Away Team Impact" | "Inter Miami generated more away attendance lift than the next 4 teams combined." |

**Verdict**: Build first. This is the single highest-leverage change for closing the display-to-narrative gap, and it's the simplest to implement.

---

### 1.2 Outlier Annotations on the Scatterplot

**What it is**: Auto-label the top 2 overperformers and top 2 underperformers relative to the regression line directly on the scatter plot, with small callout labels and optional leader lines. Exactly like the NYT climate vulnerability chart labels (Norway, Singapore, Chad, Sudan) in your reference image.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Excellent. The `linearRegression()` function already exists in `chartUtils.tsx` and computes slope, intercept, and R-squared. Computing residuals (distance from the trend line) is trivial — it's `actual_y - predicted_y` for each point. The top/bottom N by residual magnitude are the outliers. |
| **Design coherence** | Strong fit. Recharts supports custom label components on `<Scatter>`. The labels would use JetBrains Mono at caption size (12px), positioned with a small offset from the dot. Leader lines can be simple SVG `<line>` elements. The labels should use the same glassmorphism tooltip styling already defined in `index.css`. |
| **Data requirements** | Already met. The scatter plot data is already computed in `PlayerStats.tsx` with configurable X/Y axes. Residuals are computable from the same data. |
| **Implementation** | Extend the scatter plot section in `PlayerStats.tsx`. After computing the regression, sort all points by absolute residual, take the top 4 (2 positive, 2 negative), and render Recharts `<ReferenceDot>` or custom SVG labels at those positions. When the user changes axes, the outliers recompute automatically. Estimated at 80-120 lines. |

**Verdict**: Build second. This is the most visible single improvement to the Player Stats tab and directly mirrors your NYT reference.

---

### 1.3 Pre-computed Insight Cards ("Analyst's Take" Panel)

**What it is**: Each tab gets a collapsible "Key Findings" strip (or an "Analyze" button that reveals it) showing 3-4 pre-written, data-driven callouts. These are the always-fast, zero-latency narrative layer. The user sees the exploratory chart on load, then clicks "Analyze" to see the filtered-through-the-noise highlights.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Excellent. Since the 2025 season data is static, the analysis functions can be written as pure TypeScript that runs on every render (or memoized). No API calls, no latency. The callouts are structured objects: `{ icon, headline, detail, metric, direction }`. |
| **Design coherence** | Strong fit. The cards would use the existing `NeuCard` component with `variant="flat"` or a new `variant="insight"`. Each card gets a small icon (from lucide-react), a bold headline sentence, and a supporting detail line. The "Analyze" button could use the existing neumorphic button styling with a `Zap` or `TrendingUp` icon. |
| **Data requirements** | Already met. The insight computations draw from the same data the charts already consume. |
| **Implementation** | The `insightEngine.ts` module (from 1.1) would also export `playerInsights(players)`, `budgetInsights(teams, budgets)`, `attendanceInsights(matches)` functions that each return an array of 3-4 insight objects. A new `InsightPanel` component renders them. The "Analyze" toggle is a boolean state in each tab. Estimated at 300-400 lines total (engine + component). |

**Example insight cards for Team Budget tab**:
- "Alonso Martinez ($700K) scored 17 goals — more than Christian Benteke ($4.5M) and Son Heung-min ($10.4M). The 3 best value-for-money scorers all earn under $1M."
- "Designated Players scored 38% of all league goals but consumed 62% of total salary. The DP premium buys volume, not efficiency."
- "The salary gap between conferences is narrowing: Western Conference teams spent 4% more per player on average, but Eastern Conference teams scored 7% more goals."

**Verdict**: Build alongside 1.1 since they share the same analysis engine. The "Analyze" button UX pattern you described — data on load, insights on click — is the right interaction model.

---

## Tier 2: High Impact, Moderate Complexity (Build Next)

These features add significant analytical depth and are feasible within the current architecture, but require more implementation effort or a new dependency.

### 2.1 Correlation Matrix

**What it is**: A grid visualization showing pairwise Pearson correlation coefficients across all numeric player stat columns. Square size and color encode correlation strength, exactly like your automotive data reference image (blue = positive, red/salmon = negative, size = magnitude).

| Dimension | Assessment |
|---|---|
| **Feasibility** | Good. Pearson correlation is straightforward to implement in pure TypeScript (no library needed for a simple r calculation). With 15 numeric columns (excluding id, name, team, position, nationality), you get a 15x15 matrix — 105 unique pairs. The computation is O(n * k^2) where n=881 and k=15, which runs in milliseconds. |
| **Design coherence** | This is where it gets interesting. Your reference image uses flat squares on a white grid. For your neumorphic design system, the suggestion in your notes to make each cell a **raised 3D tile with height encoding correlation strength** is excellent and would be visually distinctive. However, implementing that as a custom SVG/CSS grid rather than a Recharts chart means it's a fully custom component. The color scale (blue-to-red diverging) maps naturally to your existing cyan/coral accent colors. |
| **Data requirements** | Already met. All 15 numeric fields are on the Player interface. |
| **Subgroup filtering** | This is the killer feature within the feature. Show the full-population matrix, then let the user filter to a position or conference and watch cells change color. The delta between subgroup and population is often more interesting than either alone. This hooks directly into your existing `FilterContext` — when `positionFilter` changes, the matrix recomputes. |
| **Implementation** | A new `CorrelationMatrix` component, likely 400-600 lines. The computation layer is ~100 lines (Pearson r for all pairs). The rendering layer is the bulk — a CSS Grid or SVG grid with 225 cells, each styled with size + color + optional 3D extrusion. The "Pattern Highlights" panel below the matrix (auto-surfacing the 3-4 most notable correlations in plain English) reuses the `insightEngine.ts` pattern. |
| **Where it lives** | Bottom of the Player Stats tab, below the player table. Or as a sub-tab within Player Stats. |

**Likely findings that would surface**:
- Salary correlates strongly with goals (obvious) but weakly with shot accuracy (teams overpay for volume)
- Tackles and fouls are more correlated than expected ("hard workers" foul more)
- Minutes correlates with salary more than goals (teams pay for availability, not output)
- Crosses and assists have a weaker correlation than expected (crossing isn't the primary assist method in MLS)

**Verdict**: Build as the analytical centerpiece of the Player Stats tab. The subgroup filter interaction is genuinely novel for a public-facing MLS dashboard.

---

### 2.2 Salary Prediction Regression (Residual Analysis)

**What it is**: A multiple linear regression model that predicts what a player "should" earn based on their statistical profile (goals, assists, minutes, position, age). The interesting output is the **residuals** — players with large positive residuals are "overpaid" relative to their stats, large negative residuals are "underpaid." This is essentially what football analytics firms sell.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Good, with a caveat. Simple linear regression is already implemented. Multiple linear regression requires solving a system of normal equations (matrix inversion). This is doable in pure TypeScript but benefits from a small library. **`simple-statistics`** (12KB gzipped, zero dependencies) provides `linearRegressionLine`, `rSquared`, and matrix operations. Alternatively, you can implement OLS manually in ~80 lines. |
| **Design coherence** | The output visualization is a scatter plot of predicted salary vs actual salary, with a 45-degree "fair value" line. Points above the line are overpaid, below are underpaid. This reuses the existing `Extruded3DDot` component and scatter plot infrastructure. A ranked table of "Most Overpaid" and "Most Underpaid" players sits beside it. |
| **Data requirements** | Met, with one limitation. The Player interface has salary, goals, assists, minutes, age, position — all the predictors you'd want. The limitation is that 47 players have `salary: 0` (likely minimum-salary or homegrown players where exact figures aren't public). These should be excluded from the regression or assigned the league minimum ($65,500). |
| **Implementation** | ~200 lines for the regression engine, ~300 lines for the visualization component. The regression runs once on mount (or when filters change) and produces a ranked list of residuals. |

**Verdict**: Build as a feature within the Team Budget tab or as a shared insight between Player Stats and Team Budget. The "Most Overpaid / Most Underpaid" ranking is inherently compelling and shareable.

---

### 2.3 Polynomial Regression Toggle on Scatterplot

**What it is**: Add a toggle on the existing scatter plot to switch between linear and polynomial (quadratic) fit. This reveals curved relationships that a linear trendline misses — most notably, Age vs Goals peaks around 27-29, which is quadratic, not linear.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Excellent. Quadratic regression (degree-2 polynomial) is a straightforward extension of the existing `linearRegression()` function. It requires solving a 3x3 system of normal equations. The R-squared calculation is identical. |
| **Design coherence** | Minimal UI change — just a small toggle button next to the existing TREND button. The curve renders as a Recharts `<Line>` with sampled points along the polynomial. |
| **Implementation** | ~60 lines for the polynomial regression function, ~30 lines for the toggle UI and curve rendering. Very clean addition. |

**Verdict**: Quick win. Build alongside the outlier annotations (1.2) since they both enhance the scatter plot.

---

## Tier 3: Analytically Rich, Higher Complexity (Build When Foundation is Solid)

These features are genuinely interesting from a statistical perspective but require more careful implementation and UI design.

### 3.1 Hypothesis Tests (t-test, ANOVA, Chi-square, Mann-Whitney)

**What it is**: A suite of statistical tests that answer specific questions about the data:

| Test | Question | Data Available? |
|---|---|---|
| Welch's t-test: DP vs non-DP efficiency | Do Designated Players actually outperform per dollar? | Yes — `TEAM_BUDGETS` has DP counts, and salary thresholds can identify DPs |
| ANOVA: Position salary distributions | Are goalkeeper salaries more tightly clustered than forward salaries? | Yes — position + salary fields |
| Chi-square: Yellow cards by position | Are defensive midfielders statistically more likely to get carded? | Yes — position + yellowCards fields |
| Mann-Whitney U: East vs West performance | Does the competitive imbalance narrative show up in player stats? | Yes — conference (via team) + all stat fields |
| Paired t-test: Home vs away attendance | Is the home attendance advantage statistically significant? | Yes — 510 matches with home/away teams and attendance |

| Dimension | Assessment |
|---|---|
| **Feasibility** | Good. All these tests are implementable in pure TypeScript. The `simple-statistics` library covers t-tests and basic distributions. For Mann-Whitney and Chi-square, you'd need ~50-80 lines each of custom implementation (or use `jstat`, ~30KB). |
| **Design coherence** | This is the main challenge. Statistical test results (p-values, test statistics, confidence intervals) need careful presentation to be accessible. The "Statistical Lab" panel concept from your notes — with plain-English interpretations alongside the numbers — is the right approach. Each test result should have: the question, the answer in one sentence, the p-value with a visual significance indicator, and a brief methodology note. |
| **Implementation** | ~400-500 lines for the test suite, ~300 lines for the UI panel. The Shapiro-Wilk normality test (which should run first to validate assumptions) is the most complex to implement from scratch (~100 lines). |

**Verdict**: Build as a dedicated "Statistical Lab" section, either at the bottom of Player Stats or as its own sub-view. The plain-English interpretation layer is critical — without it, this becomes intimidating rather than insightful.

---

### 3.2 K-Means Clustering (Player Archetypes)

**What it is**: Instead of using official position labels (FW/MF/DF/GK), let the data define natural clusters. With 15 numeric variables, k-means might find 6-8 archetypes that cut across positions: "high-volume low-efficiency shooter," "defensive contributor with minimal attacking output," "expensive veteran with declining minutes," etc.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Moderate. K-means is implementable in pure TypeScript (~150 lines for Lloyd's algorithm with k-means++ initialization). The main challenge is feature normalization — salary ranges from $0 to $12M while shot accuracy ranges from 0-100%, so z-score normalization is required before clustering. |
| **Design coherence** | The output visualization is a scatter plot in PCA-reduced space (see 3.3) with cluster coloring, plus a table showing each archetype's defining characteristics. This could replace or augment the existing position-coloring toggle on the scatter plot. |
| **Data requirements** | Met. All 15 numeric fields are available. Players with very few minutes (< 200) should probably be excluded to avoid noise. |
| **Implementation** | ~200 lines for k-means + normalization, ~100 lines for archetype labeling (auto-generating descriptions from which variables are highest in each cluster), ~200 lines for visualization. |

**Verdict**: Genuinely novel for a public-facing MLS dashboard. Build after the correlation matrix, since the matrix helps validate which variables are redundant before clustering.

---

### 3.3 PCA (Principal Component Analysis)

**What it is**: Reduce the 15 numeric variables to 2-3 principal components and plot every player in that reduced space. Similar players cluster together even across positions. The axes become interpretable — PC1 might be "attacking output," PC2 "defensive contribution."

| Dimension | Assessment |
|---|---|
| **Feasibility** | Moderate-to-hard. PCA requires eigenvalue decomposition of the covariance matrix. This is doable in pure TypeScript but is the most mathematically complex feature in the entire brainstorm. Libraries like `ml-pca` (~8KB) handle this cleanly. |
| **Design coherence** | The output is a 2D scatter plot — which maps perfectly to the existing scatter plot infrastructure with `Extruded3DDot`. The axes would be labeled with the interpreted component names. |
| **Implementation** | ~100 lines with a library, ~300 lines without. The interpretation layer (naming the components based on their loadings) is the harder UX problem. |

**Verdict**: Build alongside or after clustering, since PCA provides the natural 2D space for visualizing cluster results.

---

### 3.4 Benford's Law Check on Attendance

**What it is**: Test whether the leading-digit distribution of attendance figures follows Benford's Law. Deviations suggest the numbers may be rounded or manipulated — a known issue in sports attendance reporting.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Excellent. Benford's Law is trivial to implement (~30 lines). Extract the leading digit of each attendance figure, compute the observed frequency distribution, compare to the expected Benford distribution, and run a Chi-square goodness-of-fit test. |
| **Design coherence** | A small bar chart comparing observed vs expected leading-digit frequencies, with a headline like "MLS attendance figures show patterns inconsistent with natural data — suggesting some teams may round up their numbers." This is a perfect Easter egg insight for the Attendance tab. |
| **Data requirements** | Met. 510 matches with attendance figures. |
| **Implementation** | ~80 lines total. This is the best effort-to-delight ratio in the entire brainstorm. |

**Verdict**: Build as a small Easter egg on the Attendance tab. Low effort, high novelty.

---

## Tier 4: Ambitious / Requires External Services (Plan Carefully)

### 4.1 Live LLM-Powered "Ask the Analyst" Chat Panel

**What it is**: A persistent chat panel where users ask questions in plain English, and an LLM (Claude or GPT) answers using the current tab's dataset as context.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Feasible but architecturally significant. The dashboard is currently a pure static frontend with zero API calls. Adding an LLM chat panel requires either: (a) calling the OpenAI API directly from the browser (exposes the API key in client-side code — acceptable for a portfolio project but not production), or (b) adding a thin backend proxy. The Manus sandbox has `OPENAI_API_KEY` available, and the project already has an Express server stub in `server/index.ts`. |
| **Design coherence** | A slide-out panel from the right side, using the existing glassmorphism styling. Chat bubbles in `NeuCard` variants. The input field uses the existing neumorphic input styling. |
| **Cost consideration** | Each query sends the relevant data slice as context. With 881 players at ~100 tokens each, a full dataset context is ~88K tokens. This is expensive per query. Smarter approaches: only send the current tab's aggregated data (much smaller), or pre-compute summaries that fit in ~4K tokens. |
| **Implementation** | ~400 lines for the chat component, ~100 lines for the API integration, ~200 lines for the context serialization (converting the current tab's data + filters into a compact prompt). |

**Verdict**: Build last, as the "power user escape hatch" after the pre-computed insight layer is solid. The pre-computed insights handle 80% of the narrative need; the LLM handles the long tail of open-ended questions. Consider using `gpt-4.1-nano` for cost efficiency since the queries are relatively simple given good context.

---

### 4.2 Ridge/Lasso Regression for Feature Importance

**What it is**: With 15+ correlated variables, Ridge regression handles multicollinearity and produces ranked coefficients answering "which stats actually matter most for salary after controlling for everything else?" Lasso zeroes out irrelevant variables entirely.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Hard in pure client-side TypeScript. Ridge/Lasso require iterative optimization (coordinate descent for Lasso, matrix inversion with regularization for Ridge). While implementable, the code complexity is high and debugging is difficult without a numerical computing environment. |
| **Alternative** | Run the analysis once in Python, export the results as a static JSON object, and render them in the dashboard. This is the pragmatic approach — the season data doesn't change, so the model doesn't need to run client-side. |
| **Implementation** | Python script: ~50 lines with scikit-learn. Client-side rendering: ~150 lines for a coefficient importance bar chart. |

**Verdict**: Run offline in Python, bake results into the dashboard as static data. Don't try to implement the optimization algorithm in TypeScript.

---

### 4.3 Survival Analysis (Career Longevity)

**What it is**: Model which player characteristics predict sustained high-minute seasons.

| Dimension | Assessment |
|---|---|
| **Feasibility** | Not feasible with current data. Survival analysis requires longitudinal data (multiple seasons per player). Your dataset is a single-season cross-section — you have each player's 2025 stats but not their career trajectory. You'd need historical season data to model career curves. |

**Verdict**: Skip unless you add multi-season data in the future.

---

## Recommended Build Order

The following sequence maximizes impact while building on each previous layer:

| Phase | Feature | Effort | Cumulative Value |
|---|---|---|---|
| **Phase 1** | `insightEngine.ts` — analysis functions + computed headlines (1.1) | 2-3 hours | Headlines transform every tab from descriptive to narrative |
| **Phase 2** | Outlier annotations on scatter plot (1.2) + polynomial toggle (2.3) | 2 hours | Player Stats tab becomes the NYT-quality reference |
| **Phase 3** | "Analyze" button + Insight Cards panel (1.3) | 2-3 hours | Every tab gets the explore-then-analyze interaction pattern |
| **Phase 4** | Correlation matrix with subgroup filtering (2.1) | 4-5 hours | Adds genuine analytical depth; the 3D tile treatment is a design showcase |
| **Phase 5** | Salary residual analysis (2.2) + Benford's Law Easter egg (3.4) | 3-4 hours | "Most Overpaid/Underpaid" is the most shareable single feature |
| **Phase 6** | Hypothesis tests — Statistical Lab (3.1) | 4-5 hours | Positions the dashboard as analytically serious |
| **Phase 7** | K-means clustering + PCA visualization (3.2 + 3.3) | 5-6 hours | The "player archetypes" feature is genuinely novel |
| **Phase 8** | LLM "Ask the Analyst" panel (4.1) | 3-4 hours | Power user escape hatch; only worth building after Phases 1-3 |

---

## Technical Dependencies Summary

| Feature | New npm packages needed | Can use pure TypeScript? |
|---|---|---|
| Insight headlines (1.1) | None | Yes |
| Outlier annotations (1.2) | None | Yes |
| Insight cards (1.3) | None | Yes |
| Correlation matrix (2.1) | None | Yes |
| Salary regression (2.2) | Optional: `simple-statistics` (12KB) | Yes, but cleaner with library |
| Polynomial regression (2.3) | None | Yes |
| Hypothesis tests (3.1) | Optional: `jstat` (30KB) or `simple-statistics` | Possible but tedious |
| K-means clustering (3.2) | None | Yes |
| PCA (3.3) | Optional: `ml-pca` (8KB) | Hard without library |
| Benford's Law (3.4) | None | Yes |
| LLM chat (4.1) | `openai` (or raw fetch) | N/A (API call) |
| Ridge/Lasso (4.2) | Run in Python offline | N/A |

---

## Design Pattern: The "Analyze" Button Interaction

Based on your description, here is the recommended UX pattern that would apply consistently across all tabs:

**Default state (on load)**: The user sees the exploratory chart with its standard title. The data is fully interactive — filters, tooltips, sorting all work as they do today. A small neumorphic "Analyze" button (with a `Zap` icon) sits in the chart header area.

**Analyzed state (after click)**: The chart title morphs into the computed insight headline (e.g., "Player Stats" becomes "Messi converts shots at 2.1x the league average"). The insight cards panel slides in below or beside the chart. Outlier annotations appear on the scatter plot. The "Analyze" button becomes "Explore" to toggle back.

**Filter-reactive**: When the user changes filters in analyzed mode, both the headline and the insight cards recompute. If the user filters to Western Conference only, the headline updates: "Among Western clubs, Colorado Rapids had the best salary efficiency."

This pattern preserves the clean exploratory experience for users who just want to browse, while giving the narrative layer to users who want conclusions.
