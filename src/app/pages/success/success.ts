import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const CONFIG: Record<string, { title: string; message: string; color: string; icon: string }> = {
  error: {
    title: 'Hinweis übermittelt',
    message: 'Danke für die Rückmeldung. Wir prüfen das und melden uns, sobald es relevant ist.',
    color: '#60A5FA',
    icon: 'check_circle',
  },
  contact: {
    title: 'Nachricht erhalten',
    message: 'Wir haben Ihre Nachricht erhalten und melden uns in Kürze.',
    color: '#3B82F6',
    icon: 'mark_email_read',
  },
  idea: {
    title: 'Vorschlag eingereicht',
    message: 'Danke für Ihren Vorschlag. Wir prüfen das Potenzial und kommen auf Sie zu.',
    color: '#3B82F6',
    icon: 'lightbulb',
  },
};

@Component({
  selector: 'app-success',
  imports: [RouterLink],
  templateUrl: './success.html',
})
export class SuccessComponent {
  private route = inject(ActivatedRoute);
  private type = toSignal(this.route.paramMap.pipe(map(p => p.get('type') ?? 'contact')));
  config = computed(() => CONFIG[this.type() ?? 'contact'] ?? CONFIG['contact']);
}
