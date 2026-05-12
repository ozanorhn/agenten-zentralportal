import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ThemePreference } from '../models/interfaces';
import { UserSettingsService } from './user-settings.service';

const STORAGE_KEY = 'theme-preference';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveDark(pref: ThemePreference): boolean {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return systemPrefersDark();
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly settingsSvc = inject(UserSettingsService);

  private readonly _preference = signal<ThemePreference>(this.loadPref());
  readonly preference = this._preference.asReadonly();

  readonly isDark = computed(() => resolveDark(this._preference()));

  constructor() {
    this.applyClass(this.isDark());

    effect(() => {
      const fromDb = this.settingsSvc.settings()?.theme;
      if (fromDb && fromDb !== this._preference()) {
        this._preference.set(fromDb);
        this.persistPref(fromDb);
        this.applyClass(resolveDark(fromDb));
      }
    });

    effect(() => {
      this.applyClass(this.isDark());
    });

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener?.('change', () => {
        if (this._preference() === 'system') {
          this.applyClass(this.isDark());
        }
      });
    }
  }

  async setPreference(pref: ThemePreference): Promise<void> {
    this._preference.set(pref);
    this.persistPref(pref);
    this.applyClass(resolveDark(pref));
    await this.settingsSvc.update({ theme: pref });
  }

  async toggle(): Promise<void> {
    const next: ThemePreference = this.isDark() ? 'light' : 'dark';
    await this.setPreference(next);
  }

  private applyClass(dark: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', dark);
  }

  private loadPref(): ThemePreference {
    if (typeof localStorage === 'undefined') return 'system';
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
    const legacy = localStorage.getItem('theme');
    if (legacy === 'dark') return 'dark';
    if (legacy === 'light') return 'light';
    return 'system';
  }

  private persistPref(pref: ThemePreference): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, pref);
  }
}
