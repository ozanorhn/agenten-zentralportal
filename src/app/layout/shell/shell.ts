import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NotificationDropdown } from '../../components/notification-dropdown/notification-dropdown';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
}

interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationDropdown],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly notifService = inject(NotificationService);
  readonly router = inject(Router);

  showNotifications = signal(false);
  sidebarCollapsed = signal(localStorage.getItem('sidebarCollapsed') === 'true');
  collapsedSections = signal<Set<string>>(new Set());

  tooltipText = signal('');
  tooltipTop = signal(0);
  tooltipVisible = signal(false);

  showTooltip(event: MouseEvent, text: string): void {
    if (!this.sidebarCollapsed()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltipTop.set(rect.top + rect.height / 2);
    this.tooltipText.set(text);
    this.tooltipVisible.set(true);
  }

  hideTooltip(): void {
    this.tooltipVisible.set(false);
  }

  readonly navItemClass = computed(() =>
    this.sidebarCollapsed()
      ? 'shell-nav-item flex items-center justify-center py-2 w-9 mx-auto rounded-lg text-sm transition-all duration-150'
      : 'shell-nav-item flex items-center gap-2 px-3 py-1.5 rounded-lg font-body font-medium text-sm transition-all duration-150'
  );

  readonly mainClass = computed(() =>
    `flex-1 pt-[56px] relative z-10 transition-[margin] duration-300 ${this.sidebarCollapsed() ? 'md:ml-16' : 'md:ml-64'}`
  );

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  toggleSection(label: string): void {
    this.collapsedSections.update(s => {
      const next = new Set(s);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed()));
  }

  isSectionCollapsed(label: string): boolean {
    return this.collapsedSections().has(label);
  }

  isCategoryActive(category: string): boolean {
    return this.router.url.includes(`category=${category}`);
  }

  navSections: NavSection[] = [
    {
      label: 'Navigation',
      collapsible: true,
      items: [
        { label: 'Live KPIs', icon: 'query_stats', route: '/kpi-dashboard' },
        { label: 'Reporting', icon: 'summarize', route: '/reporting-bot' },
        { label: 'Verlauf', icon: 'history', route: '/history' },
        { label: 'Verwaltung', icon: 'tune', route: '/management' },
      ],
    },
    {
      label: 'Systeme',
      items: [
        { label: 'Marketing', icon: 'campaign', route: '/agents', queryParams: { category: 'Marketing' } },
        { label: 'Sales', icon: 'trending_up', route: '/agents', queryParams: { category: 'Sales' } },
        { label: 'HR', icon: 'groups', route: '/agents', queryParams: { category: 'HR' } },
        { label: 'Data', icon: 'analytics', route: '/agents', queryParams: { category: 'Data' } },
      ],
    },
  ];

  mobileNavItems: NavItem[] = [
    { label: 'Marketing', icon: 'campaign', route: '/agents', queryParams: { category: 'Marketing' } },
    { label: 'Sales', icon: 'trending_up', route: '/agents', queryParams: { category: 'Sales' } },
    { label: 'HR', icon: 'groups', route: '/agents', queryParams: { category: 'HR' } },
    { label: 'Data', icon: 'analytics', route: '/agents', queryParams: { category: 'Data' } },
    { label: 'Admin', icon: 'admin_panel_settings', route: '/analytics' },
  ];
}
