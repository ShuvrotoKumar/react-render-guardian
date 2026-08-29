import { renderStore } from './renderStore';
import {
  RenderEvent,
  RenderReason,
  PropChange,
  GuardianIssue,
  GuardianSuggestion,
  RuleViolation,
  RenderStats,
  TrackedComponent,
  RenderGuardianConfig,
} from '../types/types';

type ProfilerId = string | number;

const parentRenderedStack: Set<string> = new Set();

export function pushParentRendered(componentName: string): void {
  parentRenderedStack.add(componentName);
}

export function popParentRendered(componentName: string): void {
  parentRenderedStack.delete(componentName);
}

export function getParentRenderedSet(): Set<string> {
  return parentRenderedStack;
}

export function trackRender(
  componentName: string,
  duration?: number,
  parentRendered?: boolean,
  propChanges?: { field?: string; type?: 'primitive' | 'object' | 'array' | 'function' }[],
  contextChanges?: string[],
  isInitialMount?: boolean
): RenderEvent {
  const now = Date.now();
  const previousRender = renderStore.getComponent(componentName);
  const timeSincePrevious = previousRender?.lastRender
    ? now - previousRender.lastRender
    : undefined;

  const propChangeDetails = propChanges?.map((pc) => ({
    field: pc.field,
    previousValue: pc.field
      ? previousRender?.renderHistory.at(-1)?.propChanges?.find(
          (pc2) => pc2.field === pc.field
        )?.previousValue
      : undefined,
    currentValue: pc.field,
    type: pc.type,
    referenceChanged: true,
  }));

  const reasons: RenderReason[] = [];

  if (isInitialMount) {
    reasons.push({ type: 'initial-mount', confidence: 'confirmed' });
  }

  if (parentRendered) {
    reasons.push({ type: 'parent-rendered', confidence: 'confirmed' });
  }

  if (propChanges && propChanges.length > 0) {
    for (const pc of propChanges) {
      if (pc.type === 'function') {
        reasons.push({
          type: 'function-prop-changed',
          field: pc.field,
          confidence: 'possible',
        });
      } else if (pc.type === 'object') {
        reasons.push({
          type: 'object-prop-changed',
          field: pc.field,
          confidence: 'possible',
        });
      } else if (pc.type === 'array') {
        reasons.push({
          type: 'array-prop-changed',
          field: pc.field,
          confidence: 'possible',
        });
      } else {
        reasons.push({
          type: 'prop-changed',
          field: pc.field,
          confidence: 'possible',
        });
      }
    }
  }

  if (contextChanges && contextChanges.length > 0) {
    for (const ctx of contextChanges) {
      reasons.push({
        type: 'context-changed',
        contextName: ctx,
        confidence: 'possible',
      });
    }
  }

  if (!propChanges || propChanges.length === 0) {
    reasons.push({
      type: 'unknown',
      details: 'No prop changes detected',
    });
  }

  return renderStore.recordRender(componentName, {
    duration,
    durationSincePrevious,
    parentRendered,
    propChanges: propChanges,
    contextChanges,
    reasons,
  });
}

export function detectWhyDidRender(
  componentName: string,
  currentProps: unknown,
  previousProps: unknown,
  parentRendered: boolean,
  contextChanges: string[] = []
): { reasons: RenderReason[]; propChanges: PropChange[]; suggestions: GuardianSuggestion[] } {
  const propChanges: PropChange[] = [];
  const reasons: RenderReason[] = [];
  const suggestions: GuardianSuggestion[] = [];

  if (renderStore.getComponent(componentName)?.renderCount === 1 && !currentProps) {
    reasons.push({ type: 'initial-mount', confidence: 'confirmed' });
    return { reasons, propChanges, suggestions };
  }

  if (parentRendered) {
    reasons.push({ type: 'parent-rendered', confidence: 'confirmed' });
    suggestions.push({
      id: 'parent-render',
      componentName,
      message: 'Parent component re-rendered',
      priority: 'medium',
      action: 'Investigate parent re-render causes',
    });
  }

  if (currentProps && previousProps) {
    const changes = compareProps(previousProps, currentProps, 3);

    for (const change of changes) {
      propChanges.push(change);

      if (change.type === 'function') {
        reasons.push({
          type: 'function-prop-changed',
          field: change.field,
          confidence: 'possible',
        });

        suggestions.push({
          id: 'function-prop',
          componentName,
          message: `Function prop ${change.field} changed identity`,
          priority: 'medium',
          action: 'Consider useCallback to stabilize reference',
        });
      } else if (change.type === 'object') {
        reasons.push({
          type: 'object-prop-changed',
          field: change.field,
          confidence: 'possible',
        });

        suggestions.push({
          id: 'object-prop',
          componentName,
          message: `Object prop ${change.field} reference changed`,
          priority: 'medium',
          action: 'Consider useMemo or flattening the object',
        });
      } else if (change.type === 'array') {
        reasons.push({
          type: 'array-prop-changed',
          field: change.field,
          confidence: 'possible',
        });

        suggestions.push({
          id: 'array-prop',
          componentName,
          message: `Array prop ${change.field} reference changed`,
          priority: 'medium',
          action: 'Consider useMemo or flat arrays',
        });
      } else {
        reasons.push({
          type: 'prop-changed',
          field: change.field,
          confidence: 'possible',
        });
      }
    }
  }

  if (contextChanges.length > 0) {
    for (const ctx of contextChanges) {
      reasons.push({
        type: 'context-changed',
        contextName: ctx,
        confidence: 'possible',
      });
    }
  }

  if (propChanges.length === 0 && parentRendered) {
    reasons.push({
      type: 'unknown',
      details: 'Component rendered but no prop or context changes detected - parent render likely cause',
    });
  }

  return { reasons, propChanges, suggestions };
}

function compareProps(
  previous: unknown,
  current: unknown,
  maxDepth: number
): { field: string; type: 'primitive' | 'object' | 'array' | 'function'; }[] {
  const changes: { field: string; type: 'primitive' | 'object' | 'array' | 'function'; }[] = [];

  if (previous === current) {
    return changes;
  }

  if (maxDepth <= 0) {
    changes.push({ field: '<deep>', type: 'object' });
    return changes;
  }

  if (previous == null || current == null) {
    if (previous !== current) {
      changes.push({ field: '<null comparison>', type: 'object' });
    }
    return changes;
  }

  if (Array.isArray(previous) && Array.isArray(current)) {
    if (previous !== current) {
      changes.push({ field: '<array>', type: 'array' });
    }
    return changes;
  }

  if (typeof previous === 'function' && typeof current === 'function') {
    if (previous !== current) {
      changes.push({ field: '<function>', type: 'function' });
    }
    return changes;
  }

  if (typeof previous !== 'object' || typeof current !== 'object') {
    changes.push({ field: String(current), type: 'primitive' });
    return changes;
  }

  const prevKeys = new Set(Object.keys(previous));
  const currKeys = new Set(Object.keys(current));

  for (const key of prevKeys) {
    if (!currKeys.has(key)) {
      changes.push({ field: key, type: 'object' });
    }
  }

  for (const key of currKeys) {
    if (!prevKeys.has(key)) {
      changes.push({ field: key, type: 'object' });
    }
  }

  for (const key of prevKeys) {
    if (currKeys.has(key)) {
      const subChanges = compareProps(
        (previous as Record<string, unknown>)[key],
        (current as Record<string, unknown>)[key],
        maxDepth - 1
      );
      subChanges.forEach((c) => changes.push({ field: `${key}.${c.field}`, type: c.type }));
    }
  }

  return changes;
}

export { renderStore };