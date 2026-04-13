import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

const WEBHOOK_IDEA = 'https://n8n.eom.de/webhook/idee-einreichen';

@Component({
  selector: 'app-idea-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './idea-form.html',
  styleUrl: './idea-form.scss',
})
export class IdeaFormComponent {
  prozessbeschreibung = '';
  haeufigkeit = signal('');
  zeitaufwand = '';
  bereich = '';
  tools = '';
  ansprechperson = '';
  loading = signal(false);
  files = signal<File[]>([]);
  dragOver = signal(false);

  constructor(private router: Router) {}

  selectHaeufigkeit(value: string) {
    this.haeufigkeit.set(value);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave() {
    this.dragOver.set(false);
  }

  removeFile(index: number) {
    this.files.update(f => f.filter((_, i) => i !== index));
  }

  private addFiles(newFiles: File[]) {
    this.files.update(existing => [...existing, ...newFiles]);
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async submit() {
    if (!this.haeufigkeit()) {
      alert('Bitte wähle aus, wie oft der Workflow eintritt.');
      return;
    }

    this.loading.set(true);

    const attachments = await Promise.all(
      this.files().map(async file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        data: await this.readFileAsBase64(file)
      }))
    );

    const payload = {
      'Idee/Prozessbeschreibung (kurz/konkret)': this.prozessbeschreibung,
      'Wie oft tritt der Prozess auf? (täglich/wöchentlich/monatlich)?': this.haeufigkeit(),
      'Zeitaufwand pro Durchführung': this.zeitaufwand,
      'Beteiligte Personen, die den Prozess nutzen könnten (Anzahl 1=nur ich)': this.bereich,
      'Systeme / Tools (auf die Zugegriffen werden muss)': this.tools || 'Keine angegeben',
      'Ansprechperson für Rückfragen': this.ansprechperson,
      'submittedAt': new Date().toISOString(),
      'attachments': attachments
    };

    try {
      await fetch(WEBHOOK_IDEA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.router.navigate(['/success', 'idea']);
    } catch (err) {
      alert('Es gab ein Problem beim Senden. Bitte versuche es erneut.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }
}
