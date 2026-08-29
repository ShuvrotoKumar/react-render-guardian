import { renderStore } from './renderStore';
import type { TrackedComponent, RenderEvent } from '../types';

const STORAGE_KEY = 'react-render-guardian-snapshots';
const SCHEMA_VERSION = 1;

export interface SnapshotComponent {
  name: string;
  renderCount: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
}

export interface RenderSnapshot {
  name: string;
  createdAt: number;
  schemaVersion: number;
  components: SnapshotComponent[];
  totalRenders: number;
  averageDuration: number;
  maxDuration: number;
}

export interface SnapshotStore {
  snapshots: RenderSnapshot[];
  addSnapshot(name: string): RenderSnapshot;
  getSnapshot(name: string): RenderSnapshot | undefined;
  getAllSnapshots(): RenderSnapshot[];
  removeSnapshot(name: string): boolean;
  renameSnapshot(oldName: string, newName: string): boolean;
  clearSnapshots(): void;
  importSnapshot(data: unknown): RenderSnapshot | null;
  exportSnapshot(name: string): RenderSnapshot | null;
  validateSnapshot(data: unknown): data is RenderSnapshot;
}

class SnapshotManager implements SnapshotStore {
  snapshots: RenderSnapshot[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate and migrate snapshots
        if (Array.isArray(parsed)) {
          this.snapshots = parsed
            .filter(this.validateSnapshot)
            .map((s) => ({
              ...s,
              createdAt: s.createdAt ?? Date.now(),
              schemaVersion: s.schemaVersion ?? SCHEMA_VERSION,
            }));
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshots));
    } catch (e) {
      // Ignore storage errors
    }
  }

  addSnapshot(name: string): RenderSnapshot {
    // Remove existing snapshot with same name
    this.removeSnapshot(name);

    const component = renderStore.getTrackedComponents()[0];
    const components: SnapshotComponent[] = renderStore
      .getTrackedComponents()
      .map((c) => ({
        name: c.name,
        renderCount: c.renderCount,
        averageDuration: c.averageDuration,
        maxDuration: c.maxDuration,
        minDuration: c.minDuration === Infinity ? 0 : c.minDuration,
      }));

    const totalRenders = components.reduce(
      (sum, c) => sum + c.renderCount,
      0
    );
    const averageDuration =
      totalRenders > 0
        ? components.reduce((sum, c) => sum + c.averageDuration * c.renderCount, 0) /
          totalRenders
        : 0;
    const maxDuration = Math.max(
      ...components.map((c) => c.maxDuration),
      0
    );

    const snapshot: RenderSnapshot = {
      name,
      createdAt: Date.now(),
      schemaVersion: SCHEMA_VERSION,
      components,
      totalRenders,
      averageDuration: Math.round(averageDuration * 100) / 100,
      maxDuration: Math.round(maxDuration * 100) / 100,
    };

    this.snapshots.push(snapshot);
    this.saveToStorage();
    return snapshot;
  }

  getSnapshot(name: string): RenderSnapshot | undefined {
    return this.snapshots.find((s) => s.name === name);
  }

  getAllSnapshots(): RenderSnapshot[] {
    return [...this.snapshots];
  }

  removeSnapshot(name: string): boolean {
    const index = this.snapshots.findIndex((s) => s.name === name);
    if (index === -1) return false;

    this.snapshots.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  renameSnapshot(oldName: string, newName: string): boolean {
    const snapshot = this.getSnapshot(oldName);
    if (!snapshot) return false;

    snapshot.name = newName;
    const removed = this.removeSnapshot(oldName);
    if (!removed) return false;

    this.addSnapshot(newName);
    return true;
  }

  clearSnapshots(): void {
    this.snapshots = [];
    this.saveToStorage();
  }

  importSnapshot(data: unknown): RenderSnapshot | null {
    if (!this.validateSnapshot(data)) {
      return null;
    }

    const snapshot = data as RenderSnapshot;
    // Ensure schema version is set
    snapshot.schemaVersion = snapshot.schemaVersion ?? SCHEMA_VERSION;
    snapshot.createdAt = snapshot.createdAt ?? Date.now();

    // Remove existing snapshot with same name and add new one
    this.removeSnapshot(snapshot.name);
    this.snapshots.push(snapshot);
    this.saveToStorage();
    return snapshot;
  }

  exportSnapshot(name: string): RenderSnapshot | null {
    const snapshot = this.getSnapshot(name);
    return snapshot || null;
  }

  validateSnapshot(data: unknown): data is RenderSnapshot {
    if (
      typeof data !== 'object' ||
      data === null ||
      !('name' in data) ||
      !('createdAt' in data) ||
      !('schemaVersion' in data) ||
      !('components' in data) ||
      !('totalRenders' in data) ||
      !('averageDuration' in data) ||
      !('maxDuration' in data)
    ) {
      return false;
    }

    const s = data as Record<string, unknown>;

    // Validate types
    if (
      typeof s.name !== 'string' ||
      typeof s.createdAt !== 'number' ||
      typeof s.schemaVersion !== 'number' ||
      !Array.isArray(s.components) ||
      typeof s.totalRenders !== 'number' ||
      typeof s.averageDuration !== 'number' ||
      typeof s.maxDuration !== 'number'
    ) {
      return false;
    }

    // Validate components array
    for (const component of s.components) {
      if (
        typeof component !== 'object' ||
        component === null ||
        !('name' in component) ||
        !('renderCount' in component) ||
        !('averageDuration' in component) ||
        !('maxDuration' in component) ||
        !('minDuration' in component)
      ) {
        return false;
      }

      const c = component as Record<string, unknown>;
      if (
        typeof c.name !== 'string' ||
        typeof c.renderCount !== 'number' ||
        typeof c.averageDuration !== 'number' ||
        typeof c.maxDuration !== 'number' ||
        typeof c.minDuration !== 'number'
      ) {
        return false;
      }
    }

    return true;
  }
}

export const snapshotManager = new SnapshotManager();
