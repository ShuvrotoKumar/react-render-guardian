import type { RenderStats, PropChange, GuardianSuggestion } from '../types';
import { RenderReason } from '../types';
import { trackRender, detectWhyDidRender } from '../core/tracker';
export interface UseRenderTrackerOptions {
    componentName?: string;
    enableWhyDidRender?: boolean;
    maxWhyDidRenderHistory?: number;
}
export declare function useRenderTracker(Component?: React.ComponentType<any>, options?: UseRenderTrackerOptions): {
    stats: RenderStats;
    whyDidRender: () => {
        reasons: RenderReason[];
        propChanges: PropChange[];
        suggestions: GuardianSuggestion[];
    };
    getRecentReasons: (limit: number) => RenderReason[];
    renderCount: number;
    totalRenders: number;
};
export { trackRender, detectWhyDidRender };
//# sourceMappingURL=useRenderTracker.d.ts.map