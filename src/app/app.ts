import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './components/toast/toast';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { UserSettingsService } from './services/user-settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  template: `
    <router-outlet />
    <app-toast />
  `,
  styles: [],
})
export class App {
  // Eager-Inject damit Services beim Bootstrap initialisiert werden
  // (Theme-Anwendung, Auth-Session-Hydration, UserSettings-Load).
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly settings = inject(UserSettingsService);
}
