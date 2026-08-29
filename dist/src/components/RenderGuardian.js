import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { renderStore } from './core/renderStore';
import { consoleReporter } from './reporters/consoleReporter';
import { trackRender, pushParentRendered, } from './core/tracker';
const isDevelopment = process.env.NODE_ENV !== 'production';
export const RenderGuardian = (props) => {
    const { enabled = isDevelopment, track, ignore, maxHistory, panel, consoleReporter: consoleReporterProp, rules, onRuleViolation, reporter, logLevel = 'info', autoTrack, children, } = props;
    renderStore.configure({
        enabled,
        maxHistory,
        rules,
        onRuleViolation,
        reporter: consoleReporterProp,
        logLevel,
        autoTrack,
    });
    const renderedComponents = useRef(new Set());
    const panelRef = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    useEffect(() => {
        if (consoleReporterProp) {
            consoleReporter({
                enabled,
                rules,
                reporter: consoleReporterProp,
                logLevel,
            });
        }
    }, [consoleReporterProp, enabled, rules, logLevel]);
    // Track component renders
    useEffect(() => {
        if (!enabled)
            return;
        const handleRender = (event) => {
            if (track && !track.includes(event.componentName))
                return;
            if (ignore && ignore.includes(event.componentName))
                return;
            const duration = event.duration ?? undefined;
            const parentRendered = renderedComponents.current.has(event.componentName);
            trackRender(event.componentName, duration, parentRendered, event.propChanges, event.contextChanges, event.isInitialMount);
            renderedComponents.current.add(event.componentName);
        };
        const unsub = renderStore.subscribe(handleRender);
        return () => {
            unsub();
        };
    }, [enabled, track, ignore]);
    // Push/pop parent rendered state
    useEffect(() => {
        if (!enabled)
            return;
        return () => {
            // Track parent renders via the stack
        };
    }, [enabled]);
    const handleParentRender = (componentName) => {
        if (enabled) {
            pushParentRendered(componentName);
        }
    };
    const handleParentUnmount = (componentName) => {
        if (enabled) {
            // Don't pop - parent could render multiple times
        }
    };
    useEffect(() => {
        return () => {
            // Cleanup on unmount
        };
    }, []);
    const config = renderStore.getConfig();
    if (!enabled) {
        return _jsx(_Fragment, { children: props.children });
    }
    // Render console reporter on mount
    useEffect(() => {
        consoleReporter(config);
    }, [config]);
    return _jsx(_Fragment, { children: props.children });
};
export default RenderGuardian;
//# sourceMappingURL=RenderGuardian.js.map