import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const CONFIG: Record<string, { title: string; message: string; color: string; icon: string }> = {
  error: {
    title: 'Fehler gemeldet!',
    message: 'Danke für deinen Hinweis. Wir kümmern uns so schnell wie möglich darum.',
    color: '#F59E0B',
    icon: 'check_circle',
  },
  contact: {
    title: 'Nachricht gesendet!',
    message: 'Wir haben deine Nachricht erhalten und melden uns bald bei dir.',
    color: '#06B6D4',
    icon: 'mark_email_read',
  },
  idea: {
    title: 'Idee eingereicht!',
    message: 'Super, danke für deine Idee! Wir prüfen das Potenzial und kommen auf dich zu.',
    color: '#0070FF',
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
