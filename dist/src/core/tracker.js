import { renderStore } from './renderStore';
const parentRenderedStack = new Set();
export function pushParentRendered(componentName) {
    parentRenderedStack.add(componentName);
}
export function popParentRendered(componentName) {
    parentRenderedStack.delete(componentName);
}
export function getParentRenderedSet() {
    return parentRenderedStack;
}
export function trackRender(componentName, duration, parentRendered, propChanges, contextChanges, isInitialMount) {
    const now = Date.now();
    const previousRender = renderStore.getComponent(componentName);
    const timeSincePrevious = previousRender?.lastRender
        ? now - previousRender.lastRender
        : undefined;
    const propChangeDetails = propChanges?.map((pc) => ({
        field: pc.field,
        previousValue: pc.previousValue,
        currentValue: pc.currentValue,
        type: pc.type,
        referenceChanged: pc.referenceChanged,
    }));
    const reasons = [];
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
            }
            else if (pc.type === 'object') {
                reasons.push({
                    type: 'object-prop-changed',
                    field: pc.field,
                    confidence: 'possible',
                });
            }
            else if (pc.type === 'array') {
                reasons.push({
                    type: 'array-prop-changed',
                    field: pc.field,
                    confidence: 'possible',
                });
            }
            else {
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
        durationSincePrevious: timeSincePrevious,
        parentRendered,
        propChanges,
        contextChanges,
        reasons,
    });
}
export function detectWhyDidRender(componentName, currentProps, previousProps, parentRendered, contextChanges = []) {
    const propChanges = [];
    const reasons = [];
    const suggestions = [];
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
            }
            else if (change.type === 'object') {
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
            }
            else if (change.type === 'array') {
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
            }
            else {
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
function compareProps(previous, current, maxDepth) {
    const changes = [];
    if (previous === current) {
        return changes;
    }
    if (maxDepth <= 0) {
        changes.push({ field: '<deep>', type: 'object', previousValue: '...', currentValue: '...', referenceChanged: true });
        return changes;
    }
    if (previous == null || current == null) {
        if (previous !== current) {
            changes.push({ field: '<null comparison>', type: 'object', previousValue: String(previous), currentValue: String(current), referenceChanged: true });
        }
        return changes;
    }
    if (Array.isArray(previous) && Array.isArray(current)) {
        if (previous !== current) {
            changes.push({ field: '<array>', type: 'array', previousValue: JSON.stringify(previous.slice(0, 3)), currentValue: JSON.stringify(current.slice(0, 3)), referenceChanged: true });
        }
        return changes;
    }
    if (typeof previous === 'function' && typeof current === 'function') {
        if (previous !== current) {
            changes.push({ field: '<function>', type: 'function', previousValue: previous.toString().slice(0, 100), currentValue: current.toString().slice(0, 100), referenceChanged: true });
        }
        return changes;
    }
    if (typeof previous !== 'object' || typeof current !== 'object') {
        changes.push({ field: String(current), type: 'primitive', previousValue: String(previous), currentValue: String(current), referenceChanged: false });
        return changes;
    }
    const prevKeys = new Set(Object.keys(previous));
    const currKeys = new Set(Object.keys(current));
    for (const key of prevKeys) {
        if (!currKeys.has(key)) {
            changes.push({ field: key, type: 'object', previousValue: String(previous[key]), currentValue: '<removed>', referenceChanged: true });
        }
    }
    for (const key of currKeys) {
        if (!prevKeys.has(key)) {
            changes.push({ field: key, type: 'object', previousValue: '<added>', currentValue: String(current[key]), referenceChanged: true });
        }
    }
    for (const key of prevKeys) {
        if (currKeys.has(key)) {
            const subChanges = compareProps(previous[key], current[key], maxDepth - 1);
            subChanges.forEach((c) => changes.push({ field: `${key}.${c.field}`, type: c.type, previousValue: c.previousValue, currentValue: c.currentValue, referenceChanged: c.referenceChanged }));
        }
    }
    return changes;
}
export { renderStore };
//# sourceMappingURL=tracker.js.map