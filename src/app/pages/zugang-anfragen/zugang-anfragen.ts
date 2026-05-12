import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

const WEBHOOK_CONTACT = 'https://n8n.eom.de/webhook/kontakt_anfragen';

@Component({
  selector: 'app-zugang-anfragen',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './zugang-anfragen.html',
})
export class ZugangAnfragen {
  name = '';
  email = '';
  firma = '';
  nachricht = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  constructor(private router: Router) {}

  async submit(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);

    const payload = {
      'Name': this.name,
      'E-Mail': this.email,
      'Firma': this.firma,
      'Nachricht': this.nachricht,
      'Betreff': 'Zugang anfragen (KI-Portal)',
      'Quelle': 'registrieren',
      'submittedAt': new Date().toISOString(),
    };

    try {
      const res = await fetch(WEBHOOK_CONTACT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.router.navigate(['/login'], {
        queryParams: { msg: 'request-sent' },
      });
    } catch (err) {
      this.errorMsg.set('Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder schreiben Sie an ki@eom.de.');
      console.error('[zugang-anfragen] submit failed', err);
    } finally {
      this.loading.set(false);
    }
  }
}
