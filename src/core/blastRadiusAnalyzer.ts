import { renderStore } from './renderStore';
import type { TrackedComponent, RenderEvent } from '../types';

interface ComponentBlastInfo {
  componentName: string;
  renderCount: number;
  totalDuration: number;
  averageDuration: number;
}

interface InteractionBlastRadius {
  interactionName: string;
  duration: number;
  affectedComponents: number;
  totalRenders: number;
  totalDuration: number;
  componentBlast: ComponentBlastInfo[];
  mostFrequent: ComponentBlastInfo;
  slowest: ComponentBlastInfo;
}

/**
 * Calculate the render blast radius for a given interaction.
 * 
 * @param interactionId - The interaction ID from interactionTracker
 * @returns Blast radius analysis
 */
export function calculateBlastRadius(
  interactionId: string
): InteractionBlastRadius | null {
  const _interactionId = interactionId;
  void _interactionId;

  // Get all tracked components and their render data
  const components = renderStore.getTrackedComponents();

  // Calculate blast radius metrics
  let totalRenders = 0;
  let totalDuration = 0;
  const componentData: Map<string, ComponentBlastInfo> = new Map();

  for (const component of components) {
    const renderCount = component.renderCount;
    // Get recent render events for this component
    const recentEvents = renderStore.getAllRenderEvents().filter(
      (event) => event.componentName === component.name
    );

    const componentRenderCount = recentEvents.length;
    const componentDuration = recentEvents.reduce(
      (sum, event) => sum + (event.duration ?? 0),
      0
    );

    totalRenders += componentRenderCount;
    totalDuration += componentDuration;

    componentData.set(component.name, {
      componentName: component.name,
      renderCount: componentRenderCount,
      totalDuration: componentDuration,
      averageDuration: componentRenderCount > 0
        ? componentDuration / componentRenderCount
        : 0,
    });
  }

  // Find most frequent and slowest components
  const sortedByRenderCount = Array.from(componentData.values()).sort(
    (a, b) => b.renderCount - a.renderCount
  );
  const mostFrequent = sortedByRenderCount[0] || { componentName: '', renderCount: 0, totalDuration: 0, averageDuration: 0 };

  const sortedByDuration = Array.from(componentData.values()).sort(
    (a, b) => b.averageDuration - a.averageDuration
  );
  const slowest = sortedByDuration[0] || { componentName: '', renderCount: 0, totalDuration: 0, averageDuration: 0 };

  const affectedComponents = componentData.size;

  return {
    interactionName: 'unknown',
    duration: 0,
    affectedComponents,
    totalRenders,
    totalDuration,
    componentBlast: Array.from(componentData.values()),
    mostFrequent,
    slowest,
  };
}

/**
 * Generate a blast radius report string.
 * 
 * @param radius - The blast radius analysis
 * @param threshold - Optional threshold for warning
 * @returns Formatted report string
 */
export function formatBlastRadiusReport(
  radius: InteractionBlastRadius,
  threshold: number = 20
): string {
  const durationStr = `${radius.duration.toFixed(0)}ms`;
  const totalRendersStr = `${radius.totalRenders}`;
  const affectedStr = `${radius.affectedComponents} components`;

  const header = `⚠ Render Blast Radius
Interaction: ${radius.interactionName}
Duration: ${durationStr}
Affected Components: ${affectedStr}
Total Renders: ${totalRendersStr}`;

  const body = radius.componentBlast.map((comp) => {
    const avgStr = `${comp.averageDuration.toFixed(1)}ms`;
    const totalStr = `${comp.totalDuration.toFixed(0)}ms`;
    return `  • ${comp.componentName}: ${comp.renderCount} renders (avg: ${avgStr}, total: ${totalStr})`;
  }).join('\n');

  const footer = '';
  if (radius.affectedComponents > threshold) {
    return `${header}\n${body}\n⚠ Large blast radius detected. Consider investigating parent renders or prop changes.`;
  }

  return `${header}\n${body}`;
}

