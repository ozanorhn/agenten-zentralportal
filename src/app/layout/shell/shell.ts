import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { NotificationDropdown } from '../../components/notification-dropdown/notification-dropdown';
import { AGENTS, AgentMeta } from '../../data/agents.data';
import { AuthService } from '../../services/auth.service';

const TOP_LEVEL_PATHS = new Set([
  '/dashboard',
  '/agents',
  '/kpi-dashboard',
  '/reporting-bot',
  '/history',
  '/management',
  '/analytics',
]);

const MARKETING_CATEGORIES = new Set<AgentMeta['category']>(['Content', 'SEO', 'Ads']);

function categoryForAgent(agentId: string): string | null {
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return null;
  return MARKETING_CATEGORIES.has(agent.category) ? 'Marketing' : agent.category;
}

interface NavItem {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
  comingSoon?: boolean;
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
  private readonly location = inject(Location);
  readonly auth = inject(AuthService);

  showNotifications = signal(false);
  showUserMenu = signal(false);
  sidebarCollapsed = signal(localStorage.getItem('sidebarCollapsed') === 'true');
  collapsedSections = signal<Set<string>>(new Set());
  private readonly currentPath = signal(this.extractPath(this.router.url));

  readonly showBackButton = computed(() => !TOP_LEVEL_PATHS.has(this.currentPath()));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentPath.set(this.extractPath(e.urlAfterRedirects)));
  }

  private extractPath(url: string): string {
    const queryIdx = url.indexOf('?');
    return queryIdx >= 0 ? url.slice(0, queryIdx) : url;
  }

  goBack(): void {
    const path = this.currentPath();
    const agentMatch = path.match(/^\/agents\/([^/]+)/);
    if (agentMatch) {
      const category = categoryForAgent(agentMatch[1]);
      if (category) {
        this.router.navigate(['/agents'], { queryParams: { category } });
        return;
      }
      this.router.navigate(['/agents']);
      return;
    }
    this.location.back();
  }

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

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  async signOut(): Promise<void> {
    this.showUserMenu.set(false);
    await this.auth.signOut();
    await this.router.navigate(['/login']);
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

  readonly navSections = computed<NavSection[]>(() => {
    const isAdmin = this.auth.isAdmin();
    const overviewItems: NavItem[] = isAdmin
      ? [
          { label: 'Live KPIs', icon: 'query_stats', route: '/kpi-dashboard' },
          { label: 'Reporting', icon: 'summarize', route: '/reporting-bot' },
          { label: 'Verlauf', icon: 'history', route: '/history' },
          { label: 'Verwaltung', icon: 'tune', route: '/management' },
        ]
      : [
          { label: 'Live KPIs', icon: 'query_stats', route: '/kpi-dashboard' },
          { label: 'Verlauf', icon: 'history', route: '/history' },
          { label: 'Verwaltung', icon: 'tune', route: '/management' },
          { label: 'Reporting', icon: 'summarize', route: '/reporting-bot', comingSoon: true },
        ];
    return [
      { label: '', items: overviewItems },
      {
        label: 'KI-Systeme',
        items: [
          { label: 'Marketing', icon: 'campaign', route: '/agents', queryParams: { category: 'Marketing' } },
          { label: 'Sales', icon: 'trending_up', route: '/agents', queryParams: { category: 'Sales' } },
          { label: 'HR', icon: 'groups', route: '/agents', queryParams: { category: 'HR' } },
          { label: 'Data', icon: 'analytics', route: '/agents', queryParams: { category: 'Data' } },
        ],
      },
    ];
  });

  mobileNavItems: NavItem[] = [
    { label: 'Marketing', icon: 'campaign', route: '/agents', queryParams: { category: 'Marketing' } },
    { label: 'Sales', icon: 'trending_up', route: '/agents', queryParams: { category: 'Sales' } },
    { label: 'HR', icon: 'groups', route: '/agents', queryParams: { category: 'HR' } },
    { label: 'Data', icon: 'analytics', route: '/agents', queryParams: { category: 'Data' } },
    { label: 'Admin', icon: 'admin_panel_settings', route: '/analytics' },
  ];
}
