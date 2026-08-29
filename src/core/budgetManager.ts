import { renderStore } from './renderStore';
import type { TrackedComponent, RenderEvent } from '../types';

export type ComponentPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical';

export interface RenderBudget {
  maxRendersPerInteraction?: number;
  maxRenderDuration?: number;
  maxAverageRenderDuration?: number;
  maxBlastRadius?: number;
  maxTotalInteractionRenderTime?: number;
}

export interface BudgetViolation {
  id: string;
  componentName: string;
  rule: keyof RenderBudget;
  threshold: number | undefined;
  actual: number | undefined;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

export interface BudgetConfig {
  maxRendersPerInteraction?: number;
  maxRenderDuration?: number;
  maxAverageRenderDuration?: number;
  maxBlastRadius?: number;
  maxTotalInteractionRenderTime?: number;
  onViolation?: (violation: BudgetViolation) => void;
}

export function checkBudget(
  config: BudgetConfig,
  interactionId?: string
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  const now = Date.now();

  // Check render budgets based on tracked data
  const components = renderStore.getTrackedComponents();

  // Check maxRendersPerInteraction
  if (config.maxRendersPerInteraction !== undefined) {
    // Get recent interaction data (simplified - would use interactionTracker data)
    const recentEvents = renderStore.getAllRenderEvents().filter(
      (event) => event.timestamp > now - 60000 // last minute
    );

    const componentRenderCounts: Map<string, number> = new Map();
    for (const event of recentEvents) {
      componentRenderCounts.set(
        event.componentName,
        (componentRenderCounts.get(event.componentName) || 0) + 1
      );
    }

    for (const [componentName, count] of componentRenderCounts) {
      if (count > config.maxRendersPerInteraction) {
        violations.push({
          id: `budget-renders-${componentName}`,
          componentName,
          rule: 'maxRendersPerInteraction',
          threshold: config.maxRendersPerInteraction,
          actual: count,
          severity: 'warn',
          message: `Component ${componentName} rendered ${count} times, exceeds max of ${config.maxRendersPerInteraction}`,
        });
      }
    }
  }

  // Check maxRenderDuration
  if (config.maxRenderDuration !== undefined) {
    for (const component of components) {
      if (component.maxDuration > config.maxRenderDuration) {
        violations.push({
          id: `budget-maxduration-${component.name}`,
          componentName: component.name,
          rule: 'maxRenderDuration',
          threshold: config.maxRenderDuration,
          actual: component.maxDuration,
          severity: 'warn',
          message: `Component ${component.name} max render duration ${component.maxDuration.toFixed(
            1
          )}ms exceeds budget of ${config.maxRenderDuration}ms`,
        });
      }
    }
  }

  // Check maxAverageRenderDuration
  if (config.maxAverageRenderDuration !== undefined) {
    for (const component of components) {
      if (component.averageDuration > config.maxAverageRenderDuration) {
        violations.push({
          id: `budget-avgduration-${component.name}`,
          componentName: component.name,
          rule: 'maxAverageRenderDuration',
          threshold: config.maxAverageRenderDuration,
          actual: component.averageDuration,
          severity: 'warn',
          message: `Component ${component.name} average render duration ${component.averageDuration.toFixed(
            1
          )}ms exceeds budget of ${config.maxAverageRenderDuration}ms`,
        });
      }
    }
  }

  // Check maxBlastRadius
  if (config.maxBlastRadius !== undefined) {
    // Simplified blast radius check
    const totalComponents = components.length;
    if (totalComponents > config.maxBlastRadius) {
      violations.push({
        id: `budget-blastradius`,
        componentName: 'System',
        rule: 'maxBlastRadius',
        threshold: config.maxBlastRadius,
        actual: totalComponents,
        severity: 'info',
        message: `Total tracked components (${totalComponents}) exceeds max blast radius of ${config.maxBlastRadius}`,
      });
    }
  }

  // Check maxTotalInteractionRenderTime
  if (config.maxTotalInteractionRenderTime !== undefined) {
    const totalDuration = renderStore
      .getAllRenderEvents()
      .reduce((sum, event) => sum + (event.duration ?? 0), 0);

    if (totalDuration > config.maxTotalInteractionRenderTime) {
      violations.push({
        id: `budget-totalduration`,
        componentName: 'System',
        rule: 'maxTotalInteractionRenderTime',
        threshold: config.maxTotalInteractionRenderTime,
        actual: totalDuration,
        severity: 'warn',
        message: `Total observed render time ${totalDuration.toFixed(
          0
        )}ms exceeds budget of ${config.maxTotalInteractionRenderTime}ms`,
      });
    }
  }

  // Call onViolation callback if provided
  for (const violation of violations) {
    config.onViolation?.(violation);
  }

return violations;
}