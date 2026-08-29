class RenderStore {
    constructor() {
        this.trackedComponents = new Map();
        this.renderListeners = [];
        this.config = {};
        this.componentHistorySize = 50;
        this.renderCountSinceLastReport = 0;
        this.lastReportTime = 0;
    }
    static getInstance() {
        if (!RenderStore.instance) {
            RenderStore.instance = new RenderStore();
        }
        return RenderStore.instance;
    }
    configure(config) {
        this.config = { ...this.config, ...config };
        if (this.config.maxHistory !== undefined) {
            this.componentHistorySize = this.config.maxHistory;
        }
    }
    subscribe(listener) {
        this.renderListeners.push(listener);
        return () => {
            const index = this.renderListeners.indexOf(listener);
            if (index > -1) {
                this.renderListeners.splice(index, 1);
            }
        };
    }
    trackComponent(name) {
        if (this.trackedComponents.has(name)) {
            return this.trackedComponents.get(name);
        }
        const component = {
            name,
            renderCount: 0,
            averageDuration: 0,
            maxDuration: 0,
            minDuration: Infinity,
            lastRender: 0,
            renderHistory: [],
        };
        this.trackedComponents.set(name, component);
        return component;
    }
    recordRender(name, event) {
        const component = this.trackComponent(name);
        const now = Date.now();
        const isInitialMount = component.renderCount === 0;
        const renderEvent = {
            componentName: name,
            timestamp: now,
            renderCount: component.renderCount + 1,
            isInitialMount,
            ...event,
        };
        component.renderCount += 1;
        component.lastRender = now;
        // Update duration metrics
        const duration = event.duration ?? 0;
        component.averageDuration = this.calculateAverageDuration(component, duration);
        component.maxDuration = Math.max(component.maxDuration, duration);
        component.minDuration = component.renderCount > 1
            ? Math.min(component.minDuration, duration)
            : duration;
        // Maintain history buffer (bounded)
        component.renderHistory.push(renderEvent);
        if (component.renderHistory.length > this.componentHistorySize) {
            component.renderHistory = component.renderHistory.slice(-this.componentHistorySize);
        }
        // Notify listeners
        for (const listener of this.renderListeners) {
            try {
                listener(renderEvent);
            }
            catch (e) {
                // Prevent listener errors from breaking the tracking
            }
        }
        return renderEvent;
    }
    calculateAverageDuration(component, newDuration) {
        if (component.renderCount === 1) {
            return newDuration;
        }
        return ((component.averageDuration * (component.renderCount - 1)) + newDuration) / component.renderCount;
    }
    getTrackedComponents() {
        return Array.from(this.trackedComponents.values());
    }
    getComponent(name) {
        return this.trackedComponents.get(name);
    }
    getAllRenderEvents() {
        const all = [];
        for (const component of this.trackedComponents.values()) {
            all.push(...component.renderHistory);
        }
        return all;
    }
    getRecentReasons(componentName, limit) {
        const component = this.trackedComponents.get(componentName);
        if (!component)
            return [];
        const recent = component.renderHistory.slice(-(limit || 10));
        const reasons = [];
        for (const event of recent) {
            if (event.reasons) {
                for (const reason of event.reasons) {
                    if (!reasons.some(r => r.type === reason.type)) {
                        reasons.push(reason);
                    }
                }
            }
        }
        return reasons;
    }
    clearHistory() {
        for (const component of this.trackedComponents.values()) {
            component.renderHistory = [];
            component.renderCount = 0;
            component.averageDuration = 0;
            component.maxDuration = 0;
            component.minDuration = Infinity;
            component.lastRender = 0;
        }
    }
    getConfig() {
        return this.config;
    }
}
export const renderStore = RenderStore.getInstance();
export default renderStore;
//# sourceMappingURL=renderStore.js.map