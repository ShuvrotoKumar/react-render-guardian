import { renderStore } from '../core/renderStore';
const colorMap = {
    info: 'color: #666666',
    warn: 'color: #d97706; font-weight: bold',
    error: 'color: #ff0000; font-weight: bold',
    success: 'color: #28a745',
};
const levelIconMap = {
    error: '🔥',
    warn: '⚠',
    info: 'ℹ',
    success: '✓',
};
function formatDuration(ms) {
    if (ms < 0.016) {
        return '< 16ms';
    }
    return `${ms.toFixed(1)}ms`;
}
function renderReasonToString(reason) {
    const type = reason.type;
    const field = reason.field || reason.contextName || '';
    switch (type) {
        case 'initial-mount':
            return 'Initial mount';
        case 'parent-rendered':
            return 'Parent rendered';
        case 'prop-changed':
            return `Prop changed: ${field}`;
        case 'function-prop-changed':
            return `Function prop ${field} changed`;
        case 'object-prop-changed':
            return `Object prop ${field} reference changed`;
        case 'array-prop-changed':
            return `Array prop ${field} reference changed`;
        case 'context-changed':
            return `Context changed: ${field}`;
        case 'unknown':
            return `Unknown: ${field}`;
        default:
            return String(type);
    }
}
function renderEventToString(event, config) {
    const icon = event.isInitialMount ? '🏓' : '⚡';
    const duration = event.duration !== undefined ? formatDuration(event.duration) : '?ms';
    const timeSincePrevious = event.durationSincePrevious
        ? `${formatDuration(event.durationSincePrevious)} since previous`
        : '';
    const reasonStrings = event.reasons
        .map(renderReasonToString)
        .filter((s) => s.length > 0);
    const reasonsSection = reasonStrings.length > 0
        ? `\n  Possible reasons:\n    • ${reasonStrings.join('\n    • ')}`
        : '';
    const suggestionSection = generateSuggestions(event);
    return `[Render Guardian] ${icon} ${event.componentName} rendered${reasonsSection}\n  Duration: ${duration}${timeSincePrevious !== '' ? ` (${timeSincePrevious})` : ''}${suggestionSection}`;
}
function generateSuggestions(event) {
    const suggestions = [];
    for (const reason of event.reasons) {
        switch (reason.type) {
            case 'function-prop-changed':
                suggestions.push('  Suggestion: Consider useCallback to stabilize the function reference');
                break;
            case 'object-prop-changed':
                suggestions.push('  Suggestion: Consider useMemo to memoize the object');
                break;
            case 'array-prop-changed':
                suggestions.push('  Suggestion: Consider useMemo to memoize the array or flatten it');
                break;
            case 'parent-rendered':
                suggestions.push('  Suggestion: Investigate parent re-render causes');
                break;
            case 'context-changed':
                suggestions.push('  Suggestion: Investigate context subscription changes');
                break;
            case 'unknown':
                suggestions.push('  Suggestion: Investigate parent or context updates');
                break;
            default:
                break;
        }
    }
    if (suggestions.length > 0) {
        return `\n  Suggestions:\n    • ${suggestions.join('\n    • ')}`;
    }
    return '';
}
function formatComponentStats(component, config) {
    const { renderCount, averageDuration, maxDuration, minDuration } = component;
    const threshold = config.rules?.maxAverageRenderTime;
    let statusClass = 'info';
    if (threshold && averageDuration > threshold) {
        statusClass = 'warn';
    }
    const icon = statusClass === 'warn' ? '⚠' : 'ℹ';
    const durationAvg = formatDuration(averageDuration);
    const durationMax = formatDuration(maxDuration);
    let issues = [];
    if (threshold && averageDuration > threshold) {
        issues.push(`Average render time (${durationAvg}) exceeds threshold (${formatDuration(threshold)})`);
    }
    if (renderCount > 50) {
        issues.push(`High render count: ${renderCount}`);
    }
    const issueSection = issues.length > 0
        ? `\n  Issues:\n    • ${issues.join('\n    • ')}`
        : '';
    return `${icon} ${component.name}\n  Renders: ${renderCount}\n  Average: ${durationAvg} Max: ${durationMax} Min: ${formatDuration(minDuration)}${issueSection}`;
}
export function consoleReporter(config = {}) {
    const store = renderStore;
    const trackedComponents = store.getTrackedComponents();
    if (trackedComponents.length === 0) {
        return;
    }
    const now = Date.now();
    const enabled = config.enabled !== false && process.env.NODE_ENV !== 'production';
    if (!enabled)
        return;
    console.log('%c[Render Guardian]', 'color: #007acc; font-weight: bold; font-size: 14px;');
    // Show hot components first
    const maxRenders = config.rules?.maxRenders || 20;
    const hotComponents = trackedComponents
        .filter((c) => c.renderCount > maxRenders)
        .sort((a, b) => b.renderCount - a.renderCount);
    if (hotComponents.length > 0) {
        console.log('  🔥 Hot Components:');
        for (const component of hotComponents.slice(0, 10)) {
            console.log(formatComponentStats(component, config));
        }
    }
    // Show recent events
    const recentEvents = store.getAllRenderEvents().slice(-20);
    if (recentEvents.length > 0) {
        console.log('  Recent renders:');
        for (const event of recentEvents) {
            console.log(renderEventToString(event, config));
        }
    }
    // Show rule violations
    if (config.rules) {
        for (const component of trackedComponents) {
            const violation = checkRuleViolation(component, config.rules);
            if (violation) {
                const severityColor = violation.severity === 'error' ? 'color: #ff0000' : 'color: #d97706';
                console.log(`%c⚠ ${violation.componentName}: ${violation.message}`, severityColor);
            }
        }
    }
}
function checkRuleViolation(component, rules) {
    if (rules.maxRenders !== undefined && component.renderCount > rules.maxRenders) {
        return {
            componentName: component.name,
            message: `Exceeded max renders threshold: ${component.renderCount} > ${rules.maxRenders}`,
            severity: 'warn',
        };
    }
    if (rules.maxAverageRenderTime !== undefined && component.averageDuration > rules.maxAverageRenderTime) {
        return {
            componentName: component.name,
            message: `Average render time exceeds threshold`,
            severity: 'warn',
        };
    }
    if (rules.maxRenderTime !== undefined && component.maxDuration > rules.maxRenderTime) {
        return {
            componentName: component.name,
            message: `Max render time exceeds threshold`,
            severity: 'warn',
        };
    }
    return null;
}
export default consoleReporter;
//# sourceMappingURL=consoleReporter.js.map