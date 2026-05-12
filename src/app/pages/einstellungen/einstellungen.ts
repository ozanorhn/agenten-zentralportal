import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { UserSettingsService } from '../../services/user-settings.service';

type SettingsTab = 'profil' | 'benachrichtigungen';

@Component({
  selector: 'app-einstellungen',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './einstellungen.html',
})
export class Einstellungen {
  readonly auth = inject(AuthService);
  readonly settings = inject(UserSettingsService);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<SettingsTab>('profil');

  readonly fullName = signal<string>('');
  readonly savingName = signal(false);

  readonly password = signal('');
  readonly passwordConfirm = signal('');
  readonly savingPassword = signal(false);

  readonly notifyInApp = computed(() => this.settings.settings()?.notify_in_app ?? true);
  readonly notifyEmail = computed(() => this.settings.settings()?.notify_email ?? false);

  constructor() {
    queueMicrotask(() => {
      const current = this.auth.profile()?.full_name ?? '';
      this.fullName.set(current);
    });
  }

  setTab(t: SettingsTab): void {
    this.activeTab.set(t);
  }

  async saveName(): Promise<void> {
    const name = this.fullName().trim();
    if (!name) {
      this.toast.show('Bitte geben Sie einen Anzeigenamen ein.', 'error');
      return;
    }
    this.savingName.set(true);
    const { error } = await this.auth.updateFullName(name);
    this.savingName.set(false);
    if (error) {
      this.toast.show(`Speichern fehlgeschlagen: ${error}`, 'error');
    } else {
      this.toast.show('Anzeigename gespeichert.', 'success');
    }
  }

  async changePassword(): Promise<void> {
    const pw = this.password();
    const confirm = this.passwordConfirm();
    if (pw.length < 8) {
      this.toast.show('Das Passwort muss mindestens 8 Zeichen lang sein.', 'error');
      return;
    }
    if (pw !== confirm) {
      this.toast.show('Die Passwörter stimmen nicht überein.', 'error');
      return;
    }
    this.savingPassword.set(true);
    const { supabase } = await import('../../core/supabase.client');
    const { error } = await supabase.auth.updateUser({ password: pw });
    this.savingPassword.set(false);
    if (error) {
      this.toast.show(`Passwort konnte nicht geändert werden: ${error.message}`, 'error');
      return;
    }
    this.password.set('');
    this.passwordConfirm.set('');
    this.toast.show('Passwort aktualisiert.', 'success');
  }

  async toggleInApp(value: boolean): Promise<void> {
    const { error } = await this.settings.update({ notify_in_app: value });
    if (error) this.toast.show(`Speichern fehlgeschlagen: ${error}`, 'error');
  }

  async toggleEmail(value: boolean): Promise<void> {
    const { error } = await this.settings.update({ notify_email: value });
    if (error) this.toast.show(`Speichern fehlgeschlagen: ${error}`, 'error');
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
