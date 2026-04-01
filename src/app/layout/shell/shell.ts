import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationDropdown } from '../../components/notification-dropdown/notification-dropdown';
import { PaywallModal } from '../../components/paywall-modal/paywall-modal';
import { BookingModal } from '../../components/booking-modal/booking-modal';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationDropdown, PaywallModal, BookingModal],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly theme = inject(ThemeService);
  readonly notifService = inject(NotificationService);

  showNotifications = signal(false);
  showBooking = signal(false);

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  navSections: NavSection[] = [
    {
      label: 'Hauptnavigation',
      items: [
        { label: 'Agenten', icon: 'bolt', route: '/dashboard' },
        { label: 'Conversations', icon: 'chat', route: '/conversations' },
        { label: 'Analytics', icon: 'bar_chart', route: '/analytics' },
        { label: 'Management', icon: 'tune', route: '/management' },
        { label: 'History', icon: 'history', route: '/conversations' },
      ],
    },
    {
      label: 'Admin / CEO',
      items: [
        { label: 'CEO Dashboard', icon: 'speed', route: '/ceo-dashboard' },
        { label: 'Reporting Bot', icon: 'summarize', route: '/reporting-bot' },
      ],
    },
  ];

  mobileNavItems: NavItem[] = [
    { label: 'Agenten', icon: 'bolt', route: '/dashboard' },
    { label: 'Analytics', icon: 'bar_chart', route: '/analytics' },
    { label: 'Mgmt', icon: 'tune', route: '/management' },
    { label: 'CEO', icon: 'speed', route: '/ceo-dashboard' },
    { label: 'Report', icon: 'summarize', route: '/reporting-bot' },
  ];
}
