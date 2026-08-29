import React, { useEffect, useRef } from 'react';
import {
  RenderEvent,
  RenderReason,
  TrackedComponent,
} from '../types';
import { renderStore } from './renderStore';

type InteractionId = string;
type InteractionName = string;

interface InteractionWindow {
  start: number;
  end: number;
  renders: RenderEvent[];
  componentRenderCounts: Map<string, number>;
  totalRenderCount: number;
  totalRenderDuration: number;
}

const interactionWindows = new Map<InteractionId, InteractionWindow>();

/**
 * Track an interaction and collect render data within the interaction window.
 *
 * @param name - The interaction name/identifier
 * @param callback - The function to track renders within
 * @param options - Interaction window configuration
 * @returns Render data collected during the interaction
 */
export function trackInteraction(
  name: InteractionName,
  callback: () => void,
  options: {
    windowMs?: number; // Duration of interaction window in ms (default: 2000)
    maxRenders?: number; // Max renders to track (default: 200)
  } = {}
) {
  const { windowMs = 2000, maxRenders = 200 } = options;
  const interactionId = `${name}-${Date.now()}`;

  const windowStart = Date.now();
  const windowEnd = windowStart + windowMs;

  // Set up a timeout to close the interaction window
  const timeoutId = setTimeout(() => {
    closeInteractionWindow(interactionId);
  }, windowMs);

  try {
    callback();
  } finally {
    // Ensure window is closed even if callback throws
    clearTimeout(timeoutId);
    closeInteractionWindow(interactionId);
  }

  return getInteractionData(interactionId);
}

/**
 * Close an interaction window and finalize the data.
 */
function closeInteractionWindow(interactionId: InteractionId): void {
  const window = interactionWindows.get(interactionId);
  if (window) {
    window.end = Date.now();
  }
}

/**
 * Get the interaction data after the window has closed.
 */
function getInteractionData(interactionId: InteractionId): {
  name: string;
  duration: number;
  start: number;
  end: number;
  componentRenderCounts: Map<string, number>;
  totalRenderCount: number;
  totalRenderDuration: number;
  renderEvents: RenderEvent[];
} | null {
  const window = interactionWindows.get(interactionId);
  if (!window) return null;

  interactionWindows.delete(interactionId);

  return {
    name: interactionId.split('-')[0] || 'unknown',
    duration: window.end - window.start,
    start: window.start,
    end: window.end,
    componentRenderCounts: window.componentRenderCounts,
    totalRenderCount: window.totalRenderCount,
    totalRenderDuration: window.totalRenderDuration,
    renderEvents: window.renders,
  };
}

/**
 * Subscribe to render events and collect them for the active interaction window.
 * Returns an unsubscribe function.
 */
export function useInteractionTracker(
  interactionName: string,
  options: {
    windowMs?: number;
    maxRenders?: number;
  } = {}
) {
  // Ensure React is in scope; this hook is meant to be used inside a React component
  const { windowMs = 2000, maxRenders = 200 } = options;
  const renderedComponents = new Set<string>();
  const renderDurations = new Map<string, number[]>();
  const renderCountRef = useRef(0);
  const interactionRef = useRef<{
    name: string;
    start: number;
    end: number;
    componentRenderCounts: Map<string, number>;
    totalRenderCount: number;
    totalRenderDuration: number;
    renderEvents: RenderEvent[];
  } | null>(null);

  // Set up interaction window
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      finalizeInteraction();
    }, windowMs);

    const interaction: typeof interactionRef.current = {
      name: interactionName,
      start: Date.now(),
      end: Date.now() + windowMs,
      componentRenderCounts: new Map(),
      totalRenderCount: 0,
      totalRenderDuration: 0,
      renderEvents: [],
    };
    interactionRef.current = interaction;

    return () => {
      clearTimeout(timeoutId);
      finalizeInteraction();
    };
  }, [interactionName, windowMs]);

  const finalizeInteraction = () => {
    if (!interactionRef.current) return;

    const interaction = interactionRef.current;
    interaction.end = Date.now();

    interactionWindows.set(
      `${interaction.name}-${interaction.start}`,
      {
        start: interaction.start,
        end: interaction.end,
        renders: interaction.renderEvents,
        componentRenderCounts: interaction.componentRenderCounts,
        totalRenderCount: interaction.totalRenderCount,
        totalRenderDuration: interaction.totalRenderDuration,
      }
    );

    interactionRef.current = null;
  };

  // Subscribe to render store events
  useEffect(() => {
    if (!interactionRef.current) return;

    const unsub = renderStore.subscribe((event: RenderEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      // Check if this render falls within the interaction window
      if (event.timestamp >= interaction.start && event.timestamp <= interaction.end) {
        // Track component render
        interaction.componentRenderCounts.set(
          event.componentName,
          (interaction.componentRenderCounts.get(event.componentName) || 0) + 1
        );
        interaction.totalRenderCount += 1;
        interaction.totalRenderDuration += (event.duration ?? 0);

        // Store render event (bounded)
        if (interaction.renderEvents.length < maxRenders) {
          interaction.renderEvents.push(event);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [maxRenders]);

  return {
    interactionName,
    getRenderCounts: (): Map<string, number> =>
      interactionRef.current?.componentRenderCounts || new Map(),
    getTotalRenderCount: (): number =>
      interactionRef.current?.totalRenderCount || 0,
    getTotalRenderDuration: (): number =>
      interactionRef.current?.totalRenderDuration || 0,
    getInteractionDuration: (): number => {
      const interaction = interactionRef.current;
      return interaction ? interaction.end - interaction.start : 0;
    },
    clear: () => {
      interactionRef.current = null;
      interactionWindows.clear();
    },
  };
}

