import { Injectable, signal } from '@angular/core';

const CREDIT_KEY = 'agentHubCredits';
const INITIAL_CREDITS = 3;

@Injectable({ providedIn: 'root' })
export class CreditService {
  private readonly _credits = signal<number>(this.loadCredits());
  readonly credits = this._credits.asReadonly();

  readonly showPaywall = signal<boolean>(false);

  private loadCredits(): number {
    const stored = localStorage.getItem(CREDIT_KEY);
    return stored !== null ? parseInt(stored, 10) : INITIAL_CREDITS;
  }

  useCredit(): boolean {
    const current = this._credits();
    if (current <= 0) {
      this.showPaywall.set(true);
      return false;
    }
    const next = current - 1;
    this._credits.set(next);
    localStorage.setItem(CREDIT_KEY, String(next));
    if (next === 0) {
      // pre-emptively note credits exhausted, paywall shown on NEXT click
    }
    return true;
  }

  dismissPaywall(): void {
    this.showPaywall.set(false);
  }
}
