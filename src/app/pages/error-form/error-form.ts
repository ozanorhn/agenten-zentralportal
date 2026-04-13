import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

const WEBHOOK_ERROR = 'https://n8n.eom.de/webhook/fehler-melden';

@Component({
  selector: 'app-error-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './error-form.html',
  styleUrl: './error-form.scss',
})
export class ErrorFormComponent {
  fehlerbeschreibung = '';
  betroffenerProzess = '';
  dringlichkeit = signal('');
  loading = signal(false);
  dringlichkeitOptions = [
    { label: '🔴 Jetzt' },
    { label: '🟡 Morgen' },
    { label: '🟢 Irgendwann' }
  ];

  constructor(private router: Router) {}

  selectDringlichkeit(value: string) {
    this.dringlichkeit.set(value);
  }

  async submit() {
    if (!this.dringlichkeit()) {
      alert('Bitte wähle die Dringlichkeit aus.');
      return;
    }

    this.loading.set(true);

    const payload = {
      'Fehlerbeschreibung': this.fehlerbeschreibung,
      'Betroffener Prozess': this.betroffenerProzess,
      'Dringlichkeit': this.dringlichkeit(),
      'submittedAt': new Date().toISOString()
    };

    try {
      await fetch(WEBHOOK_ERROR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.router.navigate(['/success', 'error']);
    } catch (err) {
      alert('Es gab ein Problem beim Senden. Bitte versuche es erneut.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }
}
