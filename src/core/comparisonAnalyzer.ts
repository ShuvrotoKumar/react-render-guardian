import { snapshotManager } from './snapshotManager';
import type { RenderSnapshot, SnapshotComponent } from './snapshotManager';

export interface ComparisonResult {
  name: string;
  before: RenderSnapshot;
  after: RenderSnapshot;
  totalRendersDiff: number;
  averageDurationDiff: number;
  maxDurationDiff: number;
  renderActivityChange: number;
  status: 'improved' | 'stable' | 'possible regression' | 'needs more data';
  componentComparisons: ComponentComparison[];
}

export interface ComponentComparison {
  name: string;
  beforeRenderCount: number;
  afterRenderCount: number;
  renderCountDiff: number;
  renderCountPercentChange: number;
  beforeAverageDuration: number;
  afterAverageDuration: number;
  averageDurationDiff: number;
  averageDurationPercentChange: number;
  beforeMaxDuration: number;
  afterMaxDuration: number;
  maxDurationDiff: number;
  maxDurationPercentChange: number;
  status: 'improved' | 'stable' | 'regression' | 'unknown' | 'added' | 'removed';
}

export function compareSnapshots(
  beforeName: string,
  afterName: string,
  options: {
    regressionThreshold?: number;
    improvementThreshold?: number;
  } = {}
): ComparisonResult | null {
  const before = snapshotManager.getSnapshot(beforeName);
  const after = snapshotManager.getSnapshot(afterName);

  if (!before || !after) {
    return null;
  }

  const regressionThreshold = options.regressionThreshold ?? 20;
  const improvementThreshold = options.improvementThreshold ?? 20;

  // Calculate total renders diff
  const totalRendersDiff = after.totalRenders - before.totalRenders;
  const renderActivityChange = ((after.totalRenders - before.totalRenders) / Math.max(1, before.totalRenders)) * 100;

  // Calculate average duration diff
  const averageDurationDiff = after.averageDuration - before.averageDuration;
  const averageDurationPercentChange =
    ((after.averageDuration - before.averageDuration) / Math.max(1, before.averageDuration)) * 100;

  // Calculate max duration diff
  const maxDurationDiff = after.maxDuration - before.maxDuration;

  // Compare components
  const componentComparisons = compareComponents(before.components, after.components, regressionThreshold, improvementThreshold);

  // Determine overall status
  let status: 'improved' | 'stable' | 'possible regression' | 'needs more data' = 'stable';

  const significantRenderChange = Math.abs(renderActivityChange) >= improvementThreshold;
  const significantDurationChange = Math.abs(averageDurationDiff) >= improvementThreshold;

  if (renderActivityChange > regressionThreshold && averageDurationDiff > 0) {
    status = 'possible regression';
  } else if (renderActivityChange < -improvementThreshold && averageDurationDiff < 0) {
    status = 'improved';
  } else if (significantRenderChange || significantDurationChange) {
    if (renderActivityChange > 0 && averageDurationDiff > 0) {
      status = 'possible regression';
    } else if (renderActivityChange < 0 && averageDurationDiff < 0) {
      status = 'improved';
    } else {
      status = 'stable';
    }
  }

  return {
    name: 'Snapshot Comparison',
    before,
    after,
    totalRendersDiff,
    averageDurationDiff,
    maxDurationDiff,
    renderActivityChange,
    status,
    componentComparisons,
  };
}

function compareComponents(
  beforeComponents: SnapshotComponent[],
  afterComponents: SnapshotComponent[],
  regressionThreshold: number,
  improvementThreshold: number
): ComponentComparison[] {
  const comparisons: ComponentComparison[] = [];

  // Create maps for lookup
  const beforeMap = new Map(
    beforeComponents.map((c) => [c.name, c])
  );
  const afterMap = new Map(
    afterComponents.map((c) => [c.name, c])
  );

  // Get all component names (union of before and after)
  const allComponentNames = new Set(
    beforeComponents.map((c) => c.name)
    .concat(afterComponents.map((c) => c.name))
  );

  for (const name of allComponentNames) {
    const beforeComp = beforeMap.get(name);
    const afterComp = afterMap.get(name);

    let renderCountDiff = 0;
    let renderCountPercentChange = 0;
    let averageDurationDiff = 0;
    let averageDurationPercentChange = 0;
    let maxDurationDiff = 0;
    let maxDurationPercentChange = 0;
    let status: 'improved' | 'stable' | 'regression' | 'unknown' | 'added' | 'removed' = 'stable';

    if (beforeComp && afterComp) {
      renderCountDiff = afterComp.renderCount - beforeComp.renderCount;
      if (beforeComp.renderCount > 0) {
        renderCountPercentChange = (renderCountDiff / beforeComp.renderCount) * 100;
      }

      averageDurationDiff = afterComp.averageDuration - beforeComp.averageDuration;
      if (beforeComp.averageDuration > 0) {
        averageDurationPercentChange = (averageDurationDiff / beforeComp.averageDuration) * 100;
      }

      maxDurationDiff = afterComp.maxDuration - beforeComp.maxDuration;
      if (beforeComp.maxDuration > 0) {
        maxDurationPercentChange = (maxDurationDiff / beforeComp.maxDuration) * 100;
      }

      // Determine status
      if (renderCountPercentChange > regressionThreshold && averageDurationDiff > 0) {
        status = 'regression';
      } else if (renderCountPercentChange < -improvementThreshold && averageDurationDiff < 0) {
        status = 'improved';
      } else {
        status = 'stable';
      }
    } else if (beforeComp && !afterComp) {
      // Component removed
      renderCountDiff = -beforeComp.renderCount;
      renderCountPercentChange = -100;
      averageDurationDiff = -beforeComp.averageDuration;
      averageDurationPercentChange = -100;
      maxDurationDiff = -beforeComp.maxDuration;
      maxDurationPercentChange = -100;
      status = 'removed';
    } else if (!beforeComp && afterComp) {
      // Component added
      renderCountDiff = afterComp.renderCount;
      renderCountPercentChange = 100;
      averageDurationDiff = afterComp.averageDuration;
      averageDurationPercentChange = 100;
      maxDurationDiff = afterComp.maxDuration;
      maxDurationPercentChange = 100;
      status = 'added';
    }

    comparisons.push({
      name,
      beforeRenderCount: beforeComp?.renderCount ?? 0,
      afterRenderCount: afterComp?.renderCount ?? 0,
      renderCountDiff,
      renderCountPercentChange,
      beforeAverageDuration: beforeComp?.averageDuration ?? 0,
      afterAverageDuration: afterComp?.averageDuration ?? 0,
      averageDurationDiff,
      averageDurationPercentChange,
      beforeMaxDuration: beforeComp?.maxDuration ?? 0,
      afterMaxDuration: afterComp?.maxDuration ?? 0,
      maxDurationDiff,
      maxDurationPercentChange,
      status,
    });
  }

  return comparisons;
}

const allComponentNames = new Set();

