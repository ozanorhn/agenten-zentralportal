import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationDropdown } from '../../components/notification-dropdown/notification-dropdown';
import { BookingModal } from '../../components/booking-modal/booking-modal';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationDropdown, BookingModal],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly theme = inject(ThemeService);
  readonly notifService = inject(NotificationService);
  readonly router = inject(Router);

  showNotifications = signal(false);
  showBooking = signal(false);
  showFeedback = signal(false);

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  isCategoryActive(category: string): boolean {
    return this.router.url.includes(`category=${category}`);
  }

  navSections: NavSection[] = [
    {
      label: 'Hauptnavigation',
      items: [
        { label: 'Sales', icon: 'trending_up', route: '/agents', queryParams: { category: 'Sales' } },
        { label: 'Content', icon: 'edit_note', route: '/agents', queryParams: { category: 'Content' } },
        { label: 'SEO', icon: 'manage_search', route: '/agents', queryParams: { category: 'SEO' } },
        { label: 'Data', icon: 'analytics', route: '/agents', queryParams: { category: 'Data' } },
      ],
    },
    {
      label: 'Admin',
      items: [
        { label: 'Operations', icon: 'bar_chart', route: '/analytics' },
        { label: 'Management', icon: 'tune', route: '/management' },
        { label: 'History', icon: 'history', route: '/history' },
        { label: 'ROI Übersicht', icon: 'speed', route: '/ceo-dashboard' },
        { label: 'Live KPIs', icon: 'query_stats', route: '/kpi-dashboard' },
        { label: 'Reporting Bot', icon: 'summarize', route: '/reporting-bot' },
      ],
    },
  ];

  mobileNavItems: NavItem[] = [
    { label: 'Sales', icon: 'trending_up', route: '/agents', queryParams: { category: 'Sales' } },
    { label: 'Content', icon: 'edit_note', route: '/agents', queryParams: { category: 'Content' } },
    { label: 'SEO', icon: 'manage_search', route: '/agents', queryParams: { category: 'SEO' } },
    { label: 'Data', icon: 'analytics', route: '/agents', queryParams: { category: 'Data' } },
    { label: 'Admin', icon: 'admin_panel_settings', route: '/analytics' },
  ];
}
