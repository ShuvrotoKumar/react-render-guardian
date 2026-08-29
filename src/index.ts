export { renderStore } from './core/renderStore';
export {
  trackRender,
  detectWhyDidRender,
  pushParentRendered,
  popParentRendered,
  getParentRenderedSet,
} from './core/tracker';
export { useRenderTracker } from './hooks/useRenderTracker';
export { consoleReporter } from './reporters/consoleReporter';
export * from './core/interactionTracker';
export { calculateBlastRadius, formatBlastRadiusReport } from './core/blastRadiusAnalyzer';
export { detectAllPatterns } from './core/patternAnalyzer';
export { snapshotManager } from './core/snapshotManager';
export { compareSnapshots } from './core/comparisonAnalyzer';
export { checkBudget } from './core/budgetManager';
export type { RenderBudget, BudgetViolation, BudgetConfig, ComponentPriority } from './core/budgetManager';
export { analyzeRegression, detectCurrentRegression } from './core/regressionAnalyzer';
export type { ConfidenceLevel } from './core/regressionAnalyzer';

export type {
  RenderGuardianConfig,
  RenderEvent,
  RenderReason,
  PropChange,
  GuardianIssue,
  GuardianSuggestion,
  RuleViolation,
  RenderStats,
  TrackedComponent,
  RenderRules,
} from './types';