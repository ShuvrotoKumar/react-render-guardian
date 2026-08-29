import { RenderEvent, RenderReason, TrackedComponent, RenderGuardianConfig } from '../types/types';
type RenderEventListener = (event: RenderEvent) => void;
declare class RenderStore {
    private static instance;
    private trackedComponents;
    private renderListeners;
    private config;
    private componentHistorySize;
    private renderCountSinceLastReport;
    private lastReportTime;
    private constructor();
    static getInstance(): RenderStore;
    configure(config: Partial<RenderGuardianConfig>): void;
    subscribe(listener: RenderEventListener): () => void;
    trackComponent(name: string): TrackedComponent;
    recordRender(name: string, event: Omit<RenderEvent, 'componentName' | 'renderCount' | 'timestamp' | 'isInitialMount'>): RenderEvent;
    private calculateAverageDuration;
    getTrackedComponents(): TrackedComponent[];
    getComponent(name: string): TrackedComponent | undefined;
    getAllRenderEvents(): RenderEvent[];
    getRecentReasons(componentName: string, limit?: number): RenderReason[];
    clearHistory(): void;
    getConfig(): RenderGuardianConfig;
}
export declare const renderStore: RenderStore;
export default renderStore;
//# sourceMappingURL=renderStore.d.ts.map