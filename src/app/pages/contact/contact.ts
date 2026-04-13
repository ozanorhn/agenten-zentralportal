import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

const WEBHOOK_CONTACT = 'https://n8n.eom.de/webhook/kontakt';

@Component({
  selector: 'app-contact',
  imports: [FormsModule, RouterLink],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class ContactComponent {
  name = '';
  email = '';
  betreff = '';
  nachricht = '';
  loading = signal(false);

  constructor(private router: Router) {}

  async submit() {
    this.loading.set(true);

    const payload = {
      'Name': this.name,
      'E-Mail': this.email,
      'Betreff': this.betreff,
      'Nachricht': this.nachricht,
      'submittedAt': new Date().toISOString()
    };

    try {
      await fetch(WEBHOOK_CONTACT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.router.navigate(['/success', 'contact']);
    } catch (err) {
      alert('Es gab ein Problem beim Senden. Bitte versuche es erneut.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }
}
