import { Injectable, signal, computed } from '@angular/core';
import { RunRecord } from '../models/interfaces';

const STORAGE_KEY = 'agentHubRuns';
const MAX_RUNS = 50;

@Injectable({ providedIn: 'root' })
export class RunHistoryService {
  private _runs = signal<RunRecord[]>(this.loadFromStorage());

  readonly runs = this._runs.asReadonly();

  readonly runCount = computed(() => this._runs().length);

  addRun(record: RunRecord): void {
    const updated = [record, ...this._runs()].slice(0, MAX_RUNS);
    this._runs.set(updated);
    this.persist(updated);
  }

  getLatestForAgent(agentId: string): RunRecord | undefined {
    return this._runs().find(r => r.agentId === agentId);
  }

  getById(id: string): RunRecord | undefined {
    return this._runs().find(r => r.id === id);
  }

  private loadFromStorage(): RunRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as RunRecord[];
    } catch {
      return [];
    }
  }

  private persist(runs: RunRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch {
      // Storage full — silently ignore
    }
  }
}
