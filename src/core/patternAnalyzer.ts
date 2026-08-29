import { renderStore } from './renderStore';
import type { TrackedComponent, RenderEvent } from '../types';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface PatternIssue {
  type: string;
  message: string;
  confidence: ConfidenceLevel;
  evidence: string[];
  suggestion?: string;
}

/**
 * Detect render spike pattern - component rendered far more than normal.
 */
export function detectRenderSpike(
  componentName: string,
  threshold: number,
  window: number = 10000
): PatternIssue | null {
  const recentEvents = renderStore.getAllRenderEvents()
    .filter((event) => event.componentName === componentName)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (recentEvents.length < 5) {
    return null;
  }

  // Get the normal frequency (last 50 events or all if less)
  const normalEvents = recentEvents.slice(0, 50);
  const normalCount = normalEvents.length;

  // Get events within the specified window
  const now = Date.now();
  const windowEvents = recentEvents.filter(
    (event) => now - event.timestamp <= window
  );
  const windowCount = windowEvents.length;

  if (normalCount === 0) return null;

  const ratio = windowCount / Math.max(1, normalCount);

  if (ratio > threshold / 10) {
    const confidence: ConfidenceLevel = ratio > threshold / 5 ? 'high' : 'medium';
    return {
      type: 'render-spike',
      message: `Component ${componentName} rendered ${windowCount} times in ${window / 1000}s (normal: ~${normalEvents.length} renders per ${window / 1000}s)`,
      confidence,
      evidence: [
        `Render count ratio: ${ratio.toFixed(2)}x normal`,
        `Recent renders: ${windowCount} in last ${window / 1000}s`,
      ],
      suggestion: confidence === 'high'
        ? 'Consider investigating parent re-renders or unnecessary state updates'
        : 'Review render causes and optimize if needed',
    };
  }

  return null;
}

/**
 * Detect high frequency render activity - component rendered many times in short period.
 */
export function detectHighFrequencyRender(
  componentName: string,
  renderCount: number,
  timeWindowMs: number,
  threshold: number = 10
): PatternIssue | null {
  if (renderCount < threshold) {
    return null;
  }

  const recentEvents = renderStore.getAllRenderEvents()
    .filter((event) => event.componentName === componentName)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (recentEvents.length < 2) return null;

  const firstTimestamp = recentEvents[recentEvents.length - 1].timestamp;
  const lastTimestamp = recentEvents[0].timestamp;
  const elapsed = lastTimestamp - firstTimestamp;

  if (elapsed === 0) return null;

  const rendersPerMs = renderCount / elapsed;
  const rendersPerSecond = rendersPerMs * 1000;

  if (rendersPerSecond > threshold) {
    const rendersInWindow = Math.min(renderCount, 100);
    const confidence: ConfidenceLevel = rendersPerSecond > threshold * 3 ? 'high' : 'medium';
    return {
      type: 'high-frequency',
      message: `Component ${componentName} rendered ${renderCount} times in ${(elapsed / 1000).toFixed(1)}s (${rendersPerSecond.toFixed(1)}/s)`,
      confidence,
      evidence: [
        `${renderCount} renders observed`,
        `${elapsed / 1000}s observation window`,
        `${rendersPerSecond.toFixed(1)} renders per second`,
      ],
      suggestion: confidence === 'high'
        ? 'Investigate if renders are triggered by tight loops or frequent state updates'
        : 'Monitor for render optimization opportunities',
    };
  }

  return null;
}

/**
 * Detect repeated similar render pattern - component renders with minimal prop changes.
 */
export function detectRepeatedSimilarRender(
  componentName: string,
  recentRenderCount: number = 20,
  maxObservableChanges: number = 2
): PatternIssue | null {
  const recentEvents = renderStore.getAllRenderEvents()
    .filter((event) => event.componentName === componentName)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, recentRenderCount);

  if (recentEvents.length < 5) {
    return null;
  }

  let observableChangeCount = 0;

  for (const event of recentEvents) {
    if (event.reasons) {
      const hasPropChange = event.reasons.some(
        (reason) => reason.type.startsWith('prop-') || reason.type === 'context-changed'
      );
      if (hasPropChange) {
        observableChangeCount++;
      }
    }
  }

  const changeRatio = observableChangeCount / Math.max(1, recentEvents.length);

  if (changeRatio < (1 - maxObservableChanges / recentRenderCount)) {
    const confidence: ConfidenceLevel = changeRatio < 0.1 ? 'high' : 'medium';
    return {
      type: 'repeated-render',
      message: `Component ${componentName} rendered ${recentEvents.length} times with minimal observable prop changes (${observableChangeCount} events with changes)`,
      confidence,
      evidence: [
        `${observableChangeCount}/${recentEvents.length} renders had observable changes`,
        `Change ratio: ${changeRatio.toFixed(2)}`,
      ],
      suggestion: confidence === 'high'
        ? 'Investigate parent renders, context subscriptions, or consider React.memo'
        : 'Review if memoization would help reduce unnecessary renders',
    };
  }

  return null;
}

/**
 * Detect expensive render pattern - component has high average render duration.
 */
export function detectExpensiveRender(
  componentName: string,
  thresholdMs: number = 16,
  sampleSize: number = 20
): PatternIssue | null {
  const recentEvents = renderStore.getAllRenderEvents()
    .filter((event) => event.componentName === componentName)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, sampleSize);

  if (recentEvents.length < 5) {
    return null;
  }

  const totalDuration = recentEvents.reduce(
    (sum, event) => sum + (event.duration ?? 0),
    0
  );
  const averageDuration = totalDuration / recentEvents.length;
  const maxDuration = Math.max(...recentEvents.map((e) => e.duration ?? 0));

  if (averageDuration > thresholdMs) {
    const confidence: ConfidenceLevel = averageDuration > thresholdMs * 2 ? 'high' : 'medium';
    return {
      type: 'expensive-render',
      message: `Component ${componentName} has average render duration of ${averageDuration.toFixed(1)}ms (max: ${maxDuration.toFixed(1)}ms)`,
      confidence,
      evidence: [
        `${averageDuration.toFixed(1)}ms average render duration`,
        `${maxDuration.toFixed(1)}ms maximum render duration`,
        `${recentEvents.length} renders sampled`,
      ],
      suggestion: confidence === 'high'
        ? 'Consider memoization, splitting component, or reducing calculations'
        : 'Profile and investigate optimization opportunities',
    };
  }

  return null;
}

/**
 * Detect all patterns for a component.
 */
export function detectAllPatterns(
  componentName: string,
  config: {
    renderSpikeThreshold?: number;
    highFrequencyThreshold?: number;
    expensiveRenderThreshold?: number;
    renderWindowMs?: number;
  } = {}
): PatternIssue[] {
  const {
    renderSpikeThreshold = 3,
    highFrequencyThreshold = 10,
    expensiveRenderThreshold = 16,
    renderWindowMs = 10000,
  } = config;

  const issues: PatternIssue[] = [];

  const spike = detectRenderSpike(componentName, renderSpikeThreshold, renderWindowMs);
  if (spike) issues.push(spike);

  // Need to get render count for this component
  const component = renderStore.getTrackedComponents().find(
    (c) => c.name === componentName
  );
  const renderCount = component ? component.renderCount : 0;

  const recentEvents = renderStore.getAllRenderEvents()
    .filter((event) => event.componentName === componentName)
    .sort((a, b) => b.timestamp - a.timestamp);

  const timeWindow = recentEvents.length > 0
    ? recentEvents[0].timestamp - recentEvents[recentEvents.length - 1].timestamp
    : 10000;

  const highFreq = detectHighFrequencyRender(
    componentName,
    renderCount,
    timeWindow,
    highFrequencyThreshold
  );
  if (highFreq) issues.push(highFreq);

  const repeated = detectRepeatedSimilarRender(componentName);
  if (repeated) issues.push(repeated);

  const expensive = detectExpensiveRender(componentName, expensiveRenderThreshold);
  if (expensive) issues.push(expensive);

return issues;
}

