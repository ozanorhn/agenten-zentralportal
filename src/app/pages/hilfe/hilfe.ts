import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface FaqItem {
  q: string;
  a: string;
  category: FaqCategory;
}

type FaqCategory = 'einstieg' | 'systeme' | 'konto' | 'daten' | 'support';

@Component({
  selector: 'app-hilfe',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './hilfe.html',
})
export class HilfeComponent {
  readonly search = signal('');
  readonly activeCategory = signal<FaqCategory | 'alle'>('alle');
  readonly openIndex = signal<number | null>(0);

  readonly categories: { id: FaqCategory | 'alle'; label: string; icon: string }[] = [
    { id: 'alle', label: 'Alle Themen', icon: 'apps' },
    { id: 'einstieg', label: 'Einstieg', icon: 'rocket_launch' },
    { id: 'systeme', label: 'KI-Systeme', icon: 'smart_toy' },
    { id: 'konto', label: 'Konto & Zugang', icon: 'account_circle' },
    { id: 'daten', label: 'Daten & Sicherheit', icon: 'lock' },
    { id: 'support', label: 'Support', icon: 'support_agent' },
  ];

  readonly faqs: FaqItem[] = [
    // Einstieg
    {
      category: 'einstieg',
      q: 'Was ist arcnode OS?',
      a: 'arcnode OS ist Ihr zentrales Portal für KI-gestützte Marketing- und Vertriebsautomatisierung. Sie starten KI-Systeme für Aufgaben wie SEO-Analyse, Reporting, Produkttexte oder interne Verlinkung – ohne selbst Prompts schreiben oder Workflows bauen zu müssen.',
    },
    {
      category: 'einstieg',
      q: 'Wie starte ich ein KI-System?',
      a: 'Öffnen Sie den Bereich „KI-Systeme" in der linken Navigation, wählen Sie das passende System aus, füllen Sie das kurze Formular aus und klicken Sie auf „Starten". Das Ergebnis erscheint nach Abschluss im Bereich „Verlauf".',
    },
    {
      category: 'einstieg',
      q: 'Wie lange dauert eine Ausführung?',
      a: 'Je nach System zwischen wenigen Sekunden und mehreren Minuten. Aufwendige Analysen (z. B. SEO-Intelligence oder Content-Strategie) können bis zu fünf Minuten benötigen. Sie sehen den Fortschritt direkt in der Ergebnisansicht.',
    },
    {
      category: 'einstieg',
      q: 'Wo finde ich frühere Ergebnisse?',
      a: 'Unter „Verlauf" in der linken Navigation. Dort sehen Sie alle gestarteten Aufgaben mit Status, Zeitpunkt und vollständigem Ergebnis. Ergebnisse bleiben dauerhaft Ihrem Konto zugeordnet.',
    },

    // Systeme
    {
      category: 'systeme',
      q: 'Welche KI-Systeme stehen zur Verfügung?',
      a: 'Unter anderem: SEO-GEO-Analyse, Reporting-Assistent, Produkttext-Generator (einzeln und per CSV), Inhalts- und SEO-Analyse, Vorschläge für interne Verlinkung, Content-Strategie und das SEO-Intelligence-Dashboard. Die vollständige Liste finden Sie unter „KI-Systeme".',
    },
    {
      category: 'systeme',
      q: 'Welche Modelle laufen im Hintergrund?',
      a: 'Wir setzen aktuelle Sprachmodelle ein, darunter Claude Opus 4.7, Claude Sonnet 4.6 und Claude Haiku 4.5. Die Modellauswahl pro System ist auf das jeweilige Ergebnis abgestimmt – Sie müssen nichts konfigurieren.',
    },
    {
      category: 'systeme',
      q: 'Kann ich eigene Systeme oder Vorlagen anlegen?',
      a: 'Aktuell stehen die kuratierten Systeme bereit. Wenn Ihnen ein konkretes Szenario fehlt, reichen Sie es unter „Idee einreichen" ein – passende Anfragen bauen wir als neues System nach.',
    },
    {
      category: 'systeme',
      q: 'Was unterscheidet die SEO-GEO-Analyse vom Inhalts-Analyzer?',
      a: 'Die SEO-GEO-Analyse bewertet, wie sichtbar Ihre Marke in klassischer Suche und in KI-Antworten (ChatGPT, Perplexity, AI Overviews) ist. Der Inhalts-Analyzer prüft eine konkrete Seite auf inhaltliche Qualität, Lücken und Optimierungspotenzial.',
    },

    // Konto
    {
      category: 'konto',
      q: 'Wie bekomme ich Zugang freigeschaltet?',
      a: 'Nach der Registrierung muss Ihr Konto einmalig freigeschaltet werden. Falls Sie die Zugang-anfragen-Seite sehen, klicken Sie dort auf „Zugang anfragen" – Sie werden in der Regel innerhalb eines Werktages freigeschaltet und per E-Mail informiert.',
    },
    {
      category: 'konto',
      q: 'Wo ändere ich mein Passwort oder meinen Namen?',
      a: 'Unter „Einstellungen" → Tab „Profil". Dort passen Sie Ihren Namen an und setzen ein neues Passwort.',
    },
    {
      category: 'konto',
      q: 'Wie stelle ich Benachrichtigungen ein?',
      a: 'Unter „Einstellungen" → Tab „Benachrichtigungen". Sie können wählen, ob Sie über fertige Ergebnisse im Portal und/oder per E-Mail informiert werden.',
    },
    {
      category: 'konto',
      q: 'Können mehrere Personen aus meinem Unternehmen das Portal nutzen?',
      a: 'Ja. Jede Person bekommt ein eigenes Konto mit eigenem Verlauf. Wenden Sie sich an uns, wenn Sie mehrere Zugänge auf einmal anlegen lassen möchten.',
    },

    // Daten
    {
      category: 'daten',
      q: 'Wo werden meine Daten gespeichert?',
      a: 'Ihre Eingaben und Ergebnisse werden in unserer europäischen Infrastruktur gespeichert. Der Zugriff ist auf Ihr Konto und – falls beauftragt – auf das EOM-Betreuungsteam beschränkt.',
    },
    {
      category: 'daten',
      q: 'Werden meine Eingaben für das Training von KI-Modellen verwendet?',
      a: 'Nein. Wir nutzen Schnittstellen, die ausdrücklich kein Modelltraining auf Ihren Daten erlauben. Ihre Inhalte bleiben Ihre Inhalte.',
    },
    {
      category: 'daten',
      q: 'Wie lange werden Ergebnisse aufbewahrt?',
      a: 'Ergebnisse bleiben dauerhaft in Ihrem Verlauf, bis Sie sie löschen oder Ihr Konto schließen. Auf Wunsch richten wir individuelle Aufbewahrungsfristen ein.',
    },
    {
      category: 'daten',
      q: 'Kann ich meine Daten exportieren oder löschen?',
      a: 'Ja. Schreiben Sie uns über „Kontakt" – wir stellen Ihnen einen Export bereit oder löschen Ihr Konto vollständig nach Ihrer Bestätigung.',
    },

    // Support
    {
      category: 'support',
      q: 'Ein KI-System liefert kein oder ein fehlerhaftes Ergebnis. Was tun?',
      a: 'Melden Sie den Fall über „Fehler melden" in der linken Navigation. Wir bekommen die Details inklusive Zeitstempel automatisch übermittelt und melden uns mit einer Lösung zurück.',
    },
    {
      category: 'support',
      q: 'Wie schnell antwortet der Support?',
      a: 'In der Regel innerhalb eines Werktages. Dringende Themen markieren Sie im Betreff – wir priorisieren entsprechend.',
    },
    {
      category: 'support',
      q: 'Ich vermisse ein bestimmtes KI-System. Kann ich es vorschlagen?',
      a: 'Ja, sehr gerne. Nutzen Sie „Idee einreichen" und beschreiben Sie kurz, welches Problem das System für Sie lösen soll. Passende Vorschläge nehmen wir in die Entwicklungsplanung auf.',
    },
    {
      category: 'support',
      q: 'Gibt es eine persönliche Einführung in das Portal?',
      a: 'Ja. Über „Kontakt" können Sie eine kurze Einführung anfragen – wir zeigen Ihnen die wichtigsten Systeme anhand Ihrer eigenen Anwendungsfälle.',
    },
  ];

  readonly filteredFaqs = computed<FaqItem[]>(() => {
    const term = this.search().trim().toLowerCase();
    const cat = this.activeCategory();
    return this.faqs.filter((item) => {
      const matchesCategory = cat === 'alle' || item.category === cat;
      if (!matchesCategory) return false;
      if (!term) return true;
      return item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term);
    });
  });

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  setCategory(cat: FaqCategory | 'alle'): void {
    this.activeCategory.set(cat);
    this.openIndex.set(null);
  }

  clearSearch(): void {
    this.search.set('');
    this.openIndex.set(null);
  }
}
