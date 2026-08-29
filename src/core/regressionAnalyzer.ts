import type { RenderSnapshot } from './snapshotManager';
import { snapshotManager } from './snapshotManager';
import type { BudgetConfig } from './budgetManager';
import { checkBudget } from './budgetManager';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RegressionAnalysis {
  componentName: string;
  renderCountChange: number;
  renderCountPercentChange: number;
  averageDurationChange: number;
  averageDurationPercentChange: number;
  maxDurationChange: number;
  maxDurationPercentChange: number;
  confidence: ConfidenceLevel;
  evidence: string[];
  status: 'regression' | 'improvement' | 'stable' | 'insufficient data';
  suggestion?: string;
}

/**
 * Analyze regression between two snapshots or sessions.
 */
export function analyzeRegression(
  beforeSnapshot: string | RenderSnapshot,
  afterSnapshot: string | RenderSnapshot,
  budgetConfig?: BudgetConfig
): RegressionAnalysis | null {
  const before =
    typeof beforeSnapshot === 'string'
      ? snapshotManager.getSnapshot(beforeSnapshot)!
      : beforeSnapshot;
  const after =
    typeof afterSnapshot === 'string'
      ? snapshotManager.getSnapshot(afterSnapshot)!
      : afterSnapshot;

  if (!before || !after) {
    return null;
  }

  // Find matching components
  const beforeMap = new Map(
    before.components.map((c) => [c.name, c])
  );
  const afterMap = new Map(
    after.components.map((c) => [c.name, c])
  );

  const allComponentNames = new Set([
    ...before.components.map((c) => c.name),
    ...after.components.map((c) => c.name),
  ]);

  let hasRegression = false;
  let hasImprovement = false;
  let totalComponentsCompared = 0;

  for (const name of allComponentNames) {
    const beforeComp = beforeMap.get(name);
    const afterComp = afterMap.get(name);

    if (!beforeComp || !afterComp) continue;

    totalComponentsCompared++;

    const renderCountDiff = afterComp.renderCount - beforeComp.renderCount;
    const renderCountPercentChange =
      (renderCountDiff / Math.max(1, beforeComp.renderCount)) * 100;

    const averageDurationDiff = afterComp.averageDuration - beforeComp.averageDuration;
    const averageDurationPercentChange =
      (averageDurationDiff / Math.max(1, beforeComp.averageDuration)) * 100;

    const maxDurationDiff = afterComp.maxDuration - beforeComp.maxDuration;
    const maxDurationPercentChange =
      (maxDurationDiff / Math.max(1, beforeComp.maxDuration)) * 100;

    // Determine if this is a regression
    const renderIncreased = renderCountDiff > 0;
    const durationIncreased = averageDurationDiff > 0 || maxDurationDiff > 0;

    if (renderIncreased && durationIncreased) {
      hasRegression = true;
    } else if (!renderIncreased && !durationIncreased) {
      // Could be improvement if render count decreased or duration decreased
      if (renderCountDiff < 0 || averageDurationDiff < 0 || maxDurationDiff < 0) {
        hasImprovement = true;
      }
    }
  }

  // Calculate overall confidence based on sample size
  const confidence: ConfidenceLevel =
    totalComponentsCompared >= 10 ? 'high' : totalComponentsCompared >= 3 ? 'medium' : 'low';

  let status: 'regression' | 'improvement' | 'stable' | 'insufficient data' =
    'insufficient data';

  if (totalComponentsCompared < 2) {
    status = 'insufficient data';
  } else if (hasRegression && !hasImprovement) {
    status = 'regression';
  } else if (hasImprovement && !hasRegression) {
    status = 'improvement';
  } else if (hasRegression && hasImprovement) {
    status = 'stable'; // Mixed signals
  } else {
    status = 'stable';
  }

  // Generate evidence
  const evidence: string[] = [];
  if (totalComponentsCompared >= 2) {
    evidence.push(`Compared ${totalComponentsCompared} components`);
  }

  // Check budget violations
  if (budgetConfig) {
    const violations = checkBudget(budgetConfig);
    const regressionViolations = violations.filter(
      (v) => v.severity === 'warn' || v.severity === 'error'
    );
    if (regressionViolations.length > 0) {
      evidence.push(
        `${regressionViolations.length} budget violation(s) detected`
      );
    }
  }

  // Generate suggestion
  let suggestion: string | undefined;
  if (status === 'regression') {
    suggestion =
      'Investigate performance regression. Consider memoization, component splitting, or reducing calculations.';
    if (confidence === 'high') {
      suggestion += ' Review recent code changes.';
    }
  } else if (status === 'improvement') {
    suggestion = 'Performance has improved. Monitor to confirm stability.';
  }

  // Find the most affected component
  let mostAffectedComponent = '';
  let mostAffectedPercent = 0;

  for (const name of allComponentNames) {
    const beforeComp = beforeMap.get(name);
    const afterComp = afterMap.get(name);

    if (!beforeComp || !afterComp) continue;

    const renderCountDiff = afterComp.renderCount - beforeComp.renderCount;
    const renderCountPercent = Math.abs((renderCountDiff / Math.max(1, beforeComp.renderCount)) * 100);

    if (renderCountPercent > mostAffectedPercent) {
      mostAffectedPercent = renderCountPercent;
      mostAffectedComponent = name;
    }
  }

  return {
    componentName: mostAffectedComponent || 'Overall',
    renderCountChange: 0, // Will be calculated per-component
    renderCountPercentChange: 0,
    averageDurationChange: 0,
    averageDurationPercentChange: 0,
    maxDurationChange: 0,
    maxDurationPercentChange: 0,
    confidence,
    evidence,
    status,
    suggestion,
  };
}

/**
 * Detect regressions in current tracked components compared to a baseline.
 */
export function detectCurrentRegression(
  baselineSnapshot: string,
  budgetConfig?: BudgetConfig
): RegressionAnalysis[] {
  const currentSnapshot = snapshotManager.getAllSnapshots()[0];
  if (!currentSnapshot) {
    return [];
  }

  const analysis = analyzeRegression(baselineSnapshot, currentSnapshot, budgetConfig);
  if (!analysis) return [];

  // Return analysis for the most affected component
  return [analysis];
}