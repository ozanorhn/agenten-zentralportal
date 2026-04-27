import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _isDark = signal(true);

  readonly isDark = this._isDark.asReadonly();

  constructor() {
    const saved = localStorage.getItem('theme');
    const startDark = saved ? saved === 'dark' : true;
    this._isDark.set(startDark);
    this.applyClass(startDark);
  }

  toggle(): void {
    const next = !this._isDark();
    this._isDark.set(next);
    this.applyClass(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  private applyClass(dark: boolean): void {
    document.documentElement.classList.toggle('dark', dark);
  }
}
