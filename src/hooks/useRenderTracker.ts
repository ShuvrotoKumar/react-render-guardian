import { useEffect, useRef, useCallback } from 'react';
import { renderStore, TrackedComponent, RenderReason } from '../types/types';
import { trackRender, detectWhyDidRender } from '../core/tracker';

export interface UseRenderTrackerOptions {
  componentName?: string;
  enableWhyDidRender?: boolean;
  maxWhyDidRenderHistory?: number;
}

export function useRenderTracker(
  Component?: React.ComponentType<any>,
  options: UseRenderTrackerOptions = {}
) {
  const componentName = Component?.name || options.componentName || 'AnonymousComponent';
  const enableWhyDidRender = options.enableWhyDidRender ?? true;
  const maxWhyDidRenderHistory = options.maxWhyDidRenderHistory ?? 10;

  const renderCountRef = useRef(0);
  const durationRef = useRef< number[] >([]);
  const lastRenderRef = useRef(Date.now());
  const whyDidRenderHistoryRef = useRef<RenderReason[][]>([]);

  useEffect(() => {
    return renderStore.subscribe((event) => {
      if (event.componentName !== componentName) return;

      renderCountRef.current += 1;

      if (event.duration !== undefined) {
        durationRef.current.push(event.duration);
        if (durationRef.current.length > maxWhyDidRenderHistory * 2) {
          durationRef.current = durationRef.current.slice(-maxWhyDidRenderHistory);
        }
      }

      const timeSincePrevious = event.durationSincePrevious;
      lastRenderRef.current = event.timestamp;

      if (enableWhyDidRender && event.reasons) {
        whyDidRenderHistoryRef.current.push(event.reasons);
        if (whyDidRenderHistoryRef.current.length > maxWhyDidRenderHistory) {
          whyDidRenderHistoryRef.current = whyDidRenderHistoryRef.current.slice(-maxWhyDidRenderHistory);
        }
      }
    });
  }, [componentName, enableWhyDidRender, maxWhyDidRenderHistory]);

  // Track the render when component mounts/updates
  useEffect(() => {
    renderStore.trackComponent(componentName);

    if (renderCountRef.current === 1) {
      const renderEvent = renderStore.recordRender(componentName, {
        duration: 0,
        durationSincePrevious: undefined,
        parentRendered: false,
        propChanges: [],
        contextChanges: [],
        reasons: [{ type: 'initial-mount', confidence: 'confirmed' }],
      });

      if (enableWhyDidRender) {
        whyDidRenderHistoryRef.current.push(renderEvent.reasons);
      }
    }
  }, [Component]);

  const stats: RenderStats = {
    componentName,
    renderCount: renderCountRef.current,
    averageDuration:
      durationRef.current.length > 0
        ? durationRef.current.reduce((a, b) => a + b, 0) / durationRef.current.length
        : 0,
    maxDuration:
      durationRef.current.length > 0
        ? Math.max(...durationRef.current)
        : 0,
    minDuration:
      durationRef.current.length > 0
        ? Math.min(...durationRef.current)
        : 0,
    recentReasons: whyDidRenderHistoryRef.current.length > 0
      ? whyDidRenderHistoryRef.current[whyDidRenderHistoryRef.current.length - 1]
      : [],
    possibleIssues: [],
  };

  const whyDidRender = useCallback(() => {
    const component = renderStore.getComponent(componentName);
    if (!component) return { reasons: [], propChanges: [], suggestions: [] };

    // Get previous props from the last render event
    const lastRender = component.renderHistory.at(-1);
    const previousReasons = lastRender?.reasons || [];

    return {
      reasons: previousReasons,
      propChanges: [],
      suggestions: [],
    };
  }, [componentName]);

  const getRecentReasons = useCallback((limit: number): RenderReason[] => {
    return renderStore.getRecentReasons(componentName, limit);
  }, [componentName]);

  return {
    stats,
    whyDidRender,
    getRecentReasons,
    renderCount: renderCountRef.current,
    totalRenders: renderCountRef.current,
  };
}

export { trackRender, detectWhyDidRender };