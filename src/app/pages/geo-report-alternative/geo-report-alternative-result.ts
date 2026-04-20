import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  findGeoReportAlternative,
  StoredGeoReportAlternative,
} from './geo-report-alternative.models';
import { renderMarkdownToHtml } from '../../utils/markdown.utils';

@Component({
  selector: 'app-geo-report-alternative-result',
  standalone: true,
  templateUrl: './geo-report-alternative-result.html',
  styleUrl: './geo-report-alternative-result.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GeoReportAlternativeResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly agentId = 'geo-report-alternative';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');

  private readonly _record = signal<StoredGeoReportAlternative | null>(
    findGeoReportAlternative(this.reportId),
  );

  readonly record = this._record.asReadonly();
  readonly hostname = computed(() => this.toHostname(this.record()?.url));
  readonly renderedMarkdown = computed((): SafeHtml | null => {
    const markdown = this.record()?.markdown;
    if (!markdown) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(markdown));
  });

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  rerun(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }

  private toHostname(value?: string): string {
    if (!value) {
      return 'Report';
    }

    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return value;
    }
  }
}
