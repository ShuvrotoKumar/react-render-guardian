export interface RenderGuardianConfig {
    enabled?: boolean;
    track?: string[];
    ignore?: string[];
    maxHistory?: number;
    panel?: boolean;
    consoleReporter?: boolean;
    rules?: RenderRules;
    onRuleViolation?: (event: RuleViolation) => void;
    reporter?: 'console' | 'json' | 'summary';
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'verbose';
    autoTrack?: boolean;
}
export interface RenderRules {
    maxRenders?: number;
    maxAverageRenderTime?: number;
    maxRenderTime?: number;
    warnOnFunctionPropChanges?: boolean;
    warnOnPossibleRedundantRenders?: boolean;
}
export interface RenderEvent {
    componentName: string;
    timestamp: number;
    renderCount: number;
    duration?: number;
    durationSincePrevious?: number;
    isInitialMount: boolean;
    parentRendered?: boolean;
    propChanges?: PropChange[];
    contextChanges?: string[];
    reasons: RenderReason[];
}
export type RenderReason = {
    type: 'initial-mount';
    confidence: 'confirmed';
} | {
    type: 'prop-changed';
    field?: string;
    confidence: 'confirmed' | 'possible';
} | {
    type: 'function-prop-changed';
    field: string;
    confidence: 'confirmed' | 'possible';
} | {
    type: 'object-prop-changed';
    field?: string;
    confidence: 'confirmed' | 'possible';
} | {
    type: 'array-prop-changed';
    field?: string;
    confidence: 'confirmed' | 'possible';
} | {
    type: 'state-changed';
    field?: string;
    confidence: 'confirmed' | 'possible';
} | {
    type: 'context-changed';
    contextName: string;
    confidence: 'confirmed' | 'possible';
} | {
    type: 'parent-rendered';
    confidence: 'confirmed' | 'possible';
} | {
    type: 'unknown';
    details: string;
};
export interface PropChange {
    field: string;
    previousValue: unknown;
    currentValue: unknown;
    type: 'primitive' | 'object' | 'array' | 'function';
    referenceChanged: boolean;
}
export interface GuardianIssue {
    id: string;
    componentName: string;
    message: string;
    severity: 'info' | 'warn' | 'error';
    source?: 'props' | 'context' | 'parent' | 'state' | 'unknown';
    details?: unknown;
}
export interface GuardianSuggestion {
    id: string;
    componentName: string;
    message: string;
    action?: string;
    priority: 'low' | 'medium' | 'high';
}
export interface RuleViolation {
    rule: keyof RenderRules;
    componentName: string;
    currentValue: number | boolean;
    threshold: number | boolean;
    message: string;
}
export interface RenderStats {
    componentName: string;
    renderCount: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    recentReasons: RenderReason[];
    possibleIssues: GuardianIssue[];
}
export interface TrackedComponent {
    name: string;
    renderCount: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    lastRender: number;
    renderHistory: RenderEvent[];
}
//# sourceMappingURL=types.d.ts.map