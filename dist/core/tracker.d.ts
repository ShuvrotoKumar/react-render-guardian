import { renderStore } from './renderStore';
import { RenderEvent, RenderReason, PropChange, GuardianSuggestion } from '../types/types';
export declare function pushParentRendered(componentName: string): void;
export declare function popParentRendered(componentName: string): void;
export declare function getParentRenderedSet(): Set<string>;
export declare function trackRender(componentName: string, duration?: number, parentRendered?: boolean, propChanges?: {
    field?: string;
    type?: 'primitive' | 'object' | 'array' | 'function';
}[], contextChanges?: string[], isInitialMount?: boolean): RenderEvent;
export declare function detectWhyDidRender(componentName: string, currentProps: unknown, previousProps: unknown, parentRendered: boolean, contextChanges?: string[]): {
    reasons: RenderReason[];
    propChanges: PropChange[];
    suggestions: GuardianSuggestion[];
};
export { renderStore };
//# sourceMappingURL=tracker.d.ts.map