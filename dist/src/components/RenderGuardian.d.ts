import React from 'react';
export interface RenderGuardianProps {
    enabled?: boolean;
    track?: string[];
    ignore?: string[];
    maxHistory?: number;
    panel?: boolean;
    consoleReporter?: boolean;
    rules?: {
        maxRenders?: number;
        maxAverageRenderTime?: number;
        maxRenderTime?: number;
        warnOnFunctionPropChanges?: boolean;
        warnOnPossibleRedundantRenders?: boolean;
    };
    onRuleViolation?: (event: {
        componentName: string;
        message: string;
    }) => void;
    reporter?: 'console' | 'json' | 'summary';
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'verbose';
    autoTrack?: boolean;
    children: React.ReactNode;
}
export declare const RenderGuardian: React.FC<RenderGuardianProps>;
export default RenderGuardian;
//# sourceMappingURL=RenderGuardian.d.ts.map