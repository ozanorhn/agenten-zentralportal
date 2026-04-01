import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly theme = inject(ThemeService);

  navSections: NavSection[] = [
    {
      label: 'Hauptnavigation',
      items: [
        { label: 'Agenten', icon: 'bolt', route: '/dashboard' },
        { label: 'Conversations', icon: 'chat', route: '/conversations' },
        { label: 'Analytics', icon: 'bar_chart', route: '/analytics' },
        { label: 'Management', icon: 'tune', route: '/management' },
        { label: 'History', icon: 'history', route: '/agents' },
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
