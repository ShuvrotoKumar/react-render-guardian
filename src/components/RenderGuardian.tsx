import React, { useEffect, useRef, useState } from 'react';
import { renderStore, trackRender, pushParentRendered, popParentRendered } from './core/renderStore';
import { consoleReporter } from './reporters/consoleReporter';
import type {
  RenderGuardianConfig,
  RenderRules,
  RenderStats,
  TrackedComponent,
} from './types/types';

const isDevelopment = process.env.NODE_ENV !== 'production';

export interface RenderGuardianProps extends Partial<RenderGuardianConfig> {
  children: React.ReactNode;
}

export const RenderGuardian: React.FC<RenderGuardianProps> = (props) => {
  const {
    enabled = isDevelopment,
    track,
    ignore,
    maxHistory,
    panel,
    consoleReporter: consoleReporterProp,
    rules,
    onRuleViolation,
    reporter,
    logLevel = 'info',
    autoTrack,
  } = props;

  renderStore.configure({
    enabled,
    maxHistory,
    rules,
    onRuleViolation,
    reporter: consoleReporterProp as any,
    logLevel,
    autoTrack,
  });

  const renderedComponents = useRef<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  useEffect(() => {
    if (consoleReporterProp) {
      consoleReporter({
        enabled,
        rules,
        reporter: consoleReporterProp as any,
        logLevel,
      });
    }
  }, [consoleReporterProp, enabled, rules, logLevel]);

  // Track component renders
  useEffect(() => {
    if (!enabled) return;

    const handleRender = (event: any) => {
      if (track && !track.includes(event.componentName)) return;
      if (ignore && ignore.includes(event.componentName)) return;

      const duration = event.duration ?? undefined;
      const parentRendered = event.parentRendered ?? renderedComponents.current.has(event.componentName);

      trackRender(
        event.componentName,
        duration,
        parentRendered,
        event.propChanges,
        event.contextChanges,
        event.isInitialMount
      );

      renderedComponents.current.add(event.componentName);
    };

    const unsub = renderStore.subscribe(handleRender);
    return () => {
      unsub();
    };
  }, [enabled, track, ignore]);

  // Push/pop parent rendered state
  useEffect(() => {
    if (!enabled) return;

    return () => {
      // Track parent renders via the stack
    };
  }, [enabled]);

  const handleParentRender = (componentName: string) => {
    if (enabled) {
      pushParentRendered(componentName);
    }
  };

  const handleParentUnmount = (componentName: string) => {
    if (enabled) {
      // Don't pop - parent could render multiple times
      // The stack just tracks current parent render context
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  const config = renderStore.getConfig();

  if (!enabled) {
    return <>{props.children}</>;
  }

  // Render console reporter on mount
  useEffect(() => {
    consoleReporter(config);
  }, [config]);

  return <>{props.children}</>;
};

export default RenderGuardian;