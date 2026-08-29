# 🛡️ react-render-guardian
A powerful React development tool for tracking, analyzing, and understanding component renders.

`react-render-guardian` helps developers answer important questions:

- What rendered?
- Why did it render?
- How often did it render?
- How expensive was the render?
- Which props changed?
- Which components are rendering frequently?
- Where might performance problems exist?

## ✨ Features

- 🔍 Track component renders
- 📊 Measure render count
- ⏱ Measure render duration
- 🧩 Detect prop changes
- 🔄 Detect object and function reference changes
- 🔥 Identify frequently rendered components
- ⚠️ Detect possible redundant renders
- 📈 Analyze render patterns
- 🎯 Performance budget support
- 💥 Render Blast Radius analysis
- 🖱 Interaction-based render tracking
- 📸 Performance snapshots
- 🔄 Before and after comparison
- 🚨 Possible performance regression detection
- 🧠 Rule-based performance suggestions
- 🏷 Component priority tracking
- 📋 Export performance reports
- 🖥 Developer-friendly monitoring panel
- ⚛️ React Strict Mode awareness
- 🔒 No telemetry
- 🌐 No network requests
- 🧩 TypeScript support

---

## 📦 Installation

Using npm:

```bash
npm install react-render-guardian
```

Using pnpm:

```bash
pnpm add react-render-guardian
```

Using yarn:

```bash
yarn add react-render-guardian
```

---

# 🚀 Quick Start
Wrap your application with `RenderGuardian`.

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { RenderGuardian } from "react-render-guardian";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <RenderGuardian>
      <App />
    </RenderGuardian>
  </React.StrictMode>
);
```

Once enabled, `react-render-guardian` can monitor tracked render activity during development.

---

# 🔍 Tracking Components
Wrap important components using `RenderGuardian.Track`.

```tsx
import { RenderGuardian } from "react-render-guardian";

function Dashboard() {
  return (
    <RenderGuardian.Track name="Dashboard">
      <YourDashboard />
    </RenderGuardian.Track>
  );
}
```

You can track multiple components:

```tsx
function App() {
  return (
    <RenderGuardian>
      <RenderGuardian.Track name="Header">
        <Header />
      </RenderGuardian.Track>

      <RenderGuardian.Track name="ProductList">
        <ProductList />
      </RenderGuardian.Track>

      <RenderGuardian.Track name="Sidebar">
        <Sidebar />
      </RenderGuardian.Track>
    </RenderGuardian>
  );
}
```

---

# 📊 Render Analysis
The library can collect information such as:

```text
Component: ProductList

Render Count: 24

Average Duration: 8.4ms

Maximum Duration: 19.2ms

Possible Issues:
• Frequent render activity
• Function reference changes detected
• Large object prop changed
```

The data can help you identify components that may deserve further investigation.

---

# 🧩 Why Did This Render?
`react-render-guardian` analyzes observable prop changes between tracked renders.

For example:

```text
ProductCard rendered

Possible observable changes:

• product changed
• onAddToCart function reference changed
• options object reference changed
```

The library distinguishes between observed changes and heuristic suggestions.

A changed reference does not automatically mean a render is unnecessary.

---

# 🖱 Interaction Tracking
Track render activity observed during a user interaction.

```tsx
import { trackInteraction } from "react-render-guardian";

function FilterButton() {
  const handleClick = () => {
    trackInteraction("Filter Products", () => {
      applyFilters();
    });
  };

  return (
    <button onClick={handleClick}>
      Apply Filters
    </button>
  );
}
```

Example report:

```text
Interaction: Filter Products

Observed render activity:

ProductList       1 render
ProductCard       20 renders
Sidebar           1 render

Total renders: 22
```

Interaction tracking associates render activity with a configured observation window.

Because React updates may be asynchronous, the library does not claim that every observed render was directly caused by the interaction.

---

# 💥 Render Blast Radius
The Render Blast Radius feature helps visualize how many tracked components were affected during an observed update or interaction.

Example:

```text
Interaction: Update Filters

Affected Components: 24

Total Renders: 87

Observed Render Time: 164ms
```

This can help developers investigate unexpectedly broad render activity.

---

# ⚠️ Render Pattern Detection
The library can detect configurable patterns such as:

- Render spikes
- High-frequency render activity
- Expensive render patterns
- Repeated similar render activity

Example:

```text
⚠ Render Spike

Component: ProductList

Typical recent activity:
2–5 renders

Current observed activity:
32 renders

Confidence: Medium
```

Heuristic results are reported with confidence levels:

- High
- Medium
- Low

These are signals for investigation, not guaranteed conclusions.

---

# 🎯 Performance Budgets
Define performance limits for your application.

```tsx
<RenderGuardian
  budget={{
    maxRendersPerInteraction: 30,
    maxRenderDuration: 16,
    maxAverageRenderDuration: 10,
    maxBlastRadius: 20,
    maxTotalInteractionRenderTime: 100
  }}
>
  <App />
</RenderGuardian>
```

Example warning:

```text
⚠ Render Budget Exceeded

Interaction:
Filter Products

Maximum renders:
30

Observed renders:
87
```

You can also handle violations programmatically.

```tsx
<RenderGuardian
  onBudgetExceeded={(event) => {
    console.warn("Performance budget exceeded:", event);
  }}
>
  <App />
</RenderGuardian>
```

---

# 📸 Performance Snapshots
Create a snapshot of the current render activity.

```tsx
import { createRenderSnapshot } from "react-render-guardian";

const snapshot = createRenderSnapshot("dashboard-baseline");
```

Snapshots can be used to record metrics such as:

- Render count
- Average render duration
- Maximum render duration
- Component statistics

Example:

```json
{
  "schemaVersion": 1,
  "name": "dashboard-baseline",
  "components": [
    {
      "name": "ProductList",
      "renderCount": 42,
      "averageDuration": 12.4
    }
  ]
}
```

---

# 🔄 Compare Performance
Compare two snapshots to identify changes.

```tsx
import { compareSnapshots } from "react-render-guardian";

const result = compareSnapshots(
  baselineSnapshot,
  currentSnapshot,
  {
    regressionThreshold: 20,
    improvementThreshold: 20
  }
);
```

Possible statuses include:

- Improved
- Stable
- Possible Regression
- Needs More Data

Example:

```text
ProductCard

Before:
67 renders
Average duration: 12ms

After:
120 renders
Average duration: 18ms

Status:
Possible Regression
```

---

# 🚨 Regression Detection
The library can analyze snapshots and detect possible performance regressions.

Example:

```text
⚠ Possible Performance Regression

Component: UserTable

Render Count:
24 → 58

Average Duration:
8ms → 19ms

Confidence:
High
```

Regression detection is configurable and should be treated as an investigation signal.

---

# 🏷 Component Priority
Mark important components with a priority level.

```tsx
<RenderGuardian.Track
  name="Checkout"
  priority="critical"
>
  <Checkout />
</RenderGuardian.Track>
```

Supported priorities:

```text
low
normal
high
critical
```

This can help you focus analysis on performance-sensitive components.

---

# 🔥 Hot Components
The development panel can highlight components with significant render activity.

Example:

```text
Hot Components

1. ProductCard
   Renders: 120

2. UserTable
   Average Duration: 21ms

3. Dashboard
   Large interaction impact detected
```

---

# 🧠 Smart Suggestions
`react-render-guardian` uses rule-based analysis to provide investigation suggestions.

Example:

```text
Possible repeated render activity

Confidence: Medium

Evidence:

• Frequent recent renders observed
• Minimal observable prop changes
• Related parent activity detected

Suggestion:

Consider investigating state ownership,
prop references, and component boundaries.
```

The library avoids blindly recommending `React.memo`, `useMemo`, or `useCallback`.

---

# 📋 Reports
Generate performance reports for debugging and analysis.

Possible formats include:

- JSON
- Console summary
- Text report
- CSV

Example:

```text
React Render Guardian Report

Components tracked: 42
Total renders: 286
Average render duration: 6.4ms

Possible issues: 5
Budget violations: 2
Possible regressions: 1
```

---

# ⚙️ Configuration
Example configuration:

```tsx
<RenderGuardian
  enabled={true}
  maxHistory={100}
  maxInteractions={50}
  maxTrackedComponents={500}
>
  <App />
</RenderGuardian>
```

For larger applications, consider limiting stored history to reduce memory usage.

---

# ⚛️ React Strict Mode
React Strict Mode may introduce additional development behavior.

Because of this, development render activity may differ from production behavior.

`react-render-guardian` treats Strict Mode measurements carefully and should not be used to automatically conclude that every additional development render is a performance issue.

---

# 🔒 Privacy
`react-render-guardian` is designed with privacy in mind.

- No telemetry
- No analytics
- No network requests
- No external tracking
- No user data collection

All analysis happens locally inside your application environment.

---

# ⚡ Performance Considerations
Performance monitoring itself should not create significant application overhead.

The library supports bounded tracking and configurable analysis.

For production applications, disable the guardian when monitoring is not needed.

```tsx
<RenderGuardian enabled={import.meta.env.DEV}>
  <App />
</RenderGuardian>
```

---

# 🧪 Testing
Testing integration can be used to assert render behavior.

Example concept:

```tsx
expectRender(ProductList)
  .during(() => {
    fireEvent.click(button);
  })
  .toRenderLessThan(5);
```

Example failure:

```text
Render Performance Test Failed

Component:
ProductList

Expected:
Less than 5 renders

Observed:
12 renders
```

---

# 🛣 Roadmap
Future improvements may include:

- Advanced interaction correlation
- Improved render hierarchy visualization
- Snapshot import and export
- Performance regression reports
- Vitest integration
- Jest integration
- CLI performance checks
- CI performance budgets
- Additional report formats
- Improved development panel filtering
- Memoization instrumentation helpers

---

# 🤝 Contributing
Contributions, bug reports, feature requests, and suggestions are welcome.

If you find an issue:

1. Open an issue
2. Describe the problem clearly
3. Include reproduction steps
4. Provide relevant React and package versions when possible

---

# 📄 License
MIT

---

# ⭐ Support
If `react-render-guardian` helps you understand and improve React render performance, consider giving the project a star on GitHub.

---
Built to help React developers understand:

**What rendered. Why it rendered. How expensive it was. And what to investigate next.**
