import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blockt den Zugang NUR, wenn das Abo seit mehr als 30 Tagen abgelaufen ist
 * (siehe profile.subscription_expires_at). Frische Konten ohne Ablaufdatum
 * sowie Admin-Accounts passieren ungehindert.
 */
export const paidGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  if (!auth.accessExpired()) return true;
  return router.createUrlTree(['/zugang']);
};
