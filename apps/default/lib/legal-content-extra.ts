import { LegalSection } from "./legal-content";

/* ═══════════════════════════════════════════════════
   Datenschutzerklärung – DSGVO-konform
   ═══════════════════════════════════════════════════ */
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Verantwortlicher",
    body: [
      "Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:",
      "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstraße 3\n87463 Dietmannsried\nDeutschland",
      "E-Mail: leif@z-social.com",
      "Bei Fragen zum Datenschutz können Sie sich jederzeit an die oben genannte E-Mail-Adresse wenden.",
    ].join("\n\n"),
  },
  {
    heading: "2. Überblick über die Datenverarbeitung",
    body: "Die Z App verarbeitet personenbezogene Daten ausschließlich im Rahmen der nachfolgend beschriebenen Zwecke und Rechtsgrundlagen. Wir erheben nur solche Daten, die für die Bereitstellung und Verbesserung unserer Dienste erforderlich sind.",
  },
  {
    heading: "3. Rechtsgrundlagen der Verarbeitung",
    body: [
      "Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage folgender Rechtsgrundlagen:",
      "• Art. 6 Abs. 1 lit. a DSGVO – Einwilligung: Für die freiwillige Angabe zusätzlicher Profildaten (z.\u00a0B. Geburtsdatum, Geschlecht, Interessen, Bio, Standort).",
      "• Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung: Für die Registrierung, Bereitstellung des Nutzerkontos, Abonnementverwaltung, Nachrichtenübermittlung, Anrufe und Eventfunktionen.",
      "• Art. 6 Abs. 1 lit. c DSGVO – Rechtliche Verpflichtung: Für die Aufbewahrung von Rechnungs- und Zahlungsdaten gemäß steuer- und handelsrechtlichen Vorschriften.",
      "• Art. 6 Abs. 1 lit. f DSGVO – Berechtigte Interessen: Für die Gewährleistung der App-Sicherheit, Missbrauchsprävention, Moderation und technische Verbesserungen.",
    ].join("\n\n"),
  },
  {
    heading: "4. Art der erhobenen Daten",
    body: [
      "4.1 Registrierungsdaten (erforderlich)",
      "• E-Mail-Adresse\n• Name / Anzeigename\n• Passwort (verschlüsselt gespeichert)",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).",
      "4.2 Profildaten (freiwillig)",
      "• Profilbild und Bannerbild\n• Biografie\n• Wohnort (Landkreis, Stadt)\n• Geschlecht\n• Geburtsdatum\n• Interessen",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Diese Daten können jederzeit im Profil gelöscht oder geändert werden.",
      "4.3 Nutzergenerierte Inhalte",
      "• Foto- und Videobeiträge im Feed\n• Bildunterschriften (Captions)\n• Kommentare und Reaktionen (Likes)\n• Nachrichten (Text, Bild, Video, Sprachnachrichten)\n• Gruppenerstellungen und -beitritte",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).",
      "4.4 Kommunikationsdaten",
      "• Direktnachrichten (Text, Medien, Sprachnachrichten)\n• Audio- und Videoanrufe (Signalisierungsdaten)\n• Anrufprotokolle (Zeitpunkt, Dauer, Teilnehmer)\n• Live-Stream-Metadaten (Titel, Startzeitpunkt, Teilnehmerzahl, Zuschauerzahl)\n• Chat-Nachrichten während Live-Streams",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).",
      "4.5 Event- und Ticketdaten",
      "• Eventteilnahmen\n• Ticketkäufe und -status\n• QR-Code-Daten zur Einlassverifizierung\n• Check-in-Zeitpunkte",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).",
      "4.6 Zahlungsdaten",
      "• Stripe-Kunden-ID\n• Abonnementstatus und -zeitraum\n• Zahlungsvorgänge (über Stripe verarbeitet)",
      "Kreditkarten- oder Bankdaten werden ausschließlich von Stripe verarbeitet und zu keinem Zeitpunkt auf unseren Servern gespeichert.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).",
      "4.7 Technische Daten und Nutzungsdaten",
      "• App-Aktivität und Interaktionen\n• Zeitpunkt der letzten Aktivität\n• Freundschaftsanfragen und soziale Verbindungen\n• Gespeicherte Beiträge\n• Benachrichtigungspräferenzen\n• Meldungen und Blockierungen",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung und Sicherheit der App).",
    ].join("\n\n"),
  },
  {
    heading: "5. Empfänger und Auftragsverarbeiter",
    body: [
      "Zur Erbringung unserer Dienste setzen wir folgende Dienstleister als Auftragsverarbeiter ein:",
      "5.1 Convex, Inc. (USA)\nZweck: Datenbank, Serverinfrastruktur, Dateispeicherung, Echtzeit-Datensynchronisation\nStandort: AWS-Rechenzentrum, USA\nGrundlage für Drittlandtransfer: EU-US Data Privacy Framework (DPF) sowie Standardvertragsklauseln (SCC) gemäß Art. 46 Abs. 2 lit. c DSGVO.",
      "5.2 Stripe, Inc. (USA)\nZweck: Zahlungsabwicklung für Abonnements und Event-Tickets\nStandort: USA / Irland\nGrundlage: EU-US Data Privacy Framework (DPF). Zahlungsdaten werden direkt von Stripe verarbeitet. Der Anbieter speichert ausschließlich die Stripe-Kunden-ID und den Abonnementstatus.",
      "5.3 Expo / The Expo Project (USA)\nZweck: Push-Benachrichtigungen an mobile Geräte\nStandort: USA\nGrundlage: EU-US Data Privacy Framework (DPF) sowie SCC.",
      "5.4 Metered Networks Inc. (Kanada)\nZweck: Bereitstellung von TURN/STUN-Relayservern für WebRTC-Verbindungen (Audio-/Videoanrufe und Live-Streams), wenn eine direkte Peer-to-Peer-Verbindung zwischen den Endgeräten nicht möglich ist.\nVerarbeitete Daten: IP-Adressen der Verbindungsteilnehmer, verschlüsselte Medienströme (Inhalt bleibt durch DTLS-SRTP-Verschlüsselung geschützt).\nStandort: Kanada / weltweit verteilte Serverinfrastruktur\nGrundlage für Drittlandtransfer: Angemessenheitsbeschluss der EU-Kommission für Kanada (Art. 45 DSGVO) sowie Standardvertragsklauseln (SCC) für Server außerhalb Kanadas.",
      "5.5 WebRTC (Peer-to-Peer)\nAudio- und Videoanrufe sowie Live-Streams werden über das WebRTC-Protokoll realisiert. Nach dem Verbindungsaufbau laufen Medienströme nach Möglichkeit direkt zwischen den Endgeräten. Ist eine direkte Verbindung nicht möglich, werden die Daten über TURN-Relayserver (Metered Networks, siehe 5.4) geleitet. Signalisierungsdaten werden über die Server des Anbieters (Convex, siehe 5.1) vermittelt.",
      "Eine Weitergabe personenbezogener Daten an sonstige Dritte erfolgt nur:",
      "• Wenn eine gesetzliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO)\n• Wenn der Nutzer ausdrücklich eingewilligt hat (Art. 6 Abs. 1 lit. a DSGVO)\n• Wenn dies zur Geltendmachung von Rechtsansprüchen erforderlich ist",
      "Eine kommerzielle Weitergabe oder ein Verkauf personenbezogener Daten an Dritte findet nicht statt.",
    ].join("\n\n"),
  },
  {
    heading: "6. Datenübermittlung in Drittländer",
    body: "Personenbezogene Daten werden an Dienstleister in den USA übermittelt (siehe Abschnitt 5). Die Übermittlung erfolgt auf Grundlage des EU-US Data Privacy Framework (Angemessenheitsbeschluss der EU-Kommission gemäß Art. 45 DSGVO) sowie ergänzend auf Basis von Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).\n\nDer Anbieter überprüft regelmäßig, ob die Garantien für den Schutz personenbezogener Daten eingehalten werden.",
  },
  {
    heading: "7. Speicherdauer",
    body: [
      "Personenbezogene Daten werden nur so lange gespeichert, wie dies für den jeweiligen Verarbeitungszweck erforderlich ist:",
      "• Kontodaten: Für die Dauer der Nutzung. Bei Löschung des Kontos werden alle Daten unverzüglich gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.",
      "• Nutzerinhalte (Beiträge, Nachrichten, Medien): Bis zur Löschung durch den Nutzer oder Kontolöschung.",
      "• Zahlungs- und Rechnungsdaten: 10 Jahre nach Ende des Kalenderjahres der Transaktion (§ 147 AO).",
      "• Kommunikationsdaten: Bis zur Löschung des Kontos oder der Konversation.",
      "• Anrufprotokolle: 90 Tage nach Beendigung des Anrufs.",
      "• Live-Stream-Metadaten: Bis zur Löschung des Kontos oder 90 Tage nach Ende des Streams.",
      "• Meldungen und Moderationsdaten: Bis zur Erledigung bzw. für die Dauer etwaiger Rechtsstreitigkeiten.",
      "• Anonymisierte Analysedaten: Unbefristet, da kein Personenbezug besteht.",
    ].join("\n\n"),
  },
  {
    heading: "8. Betroffenenrechte",
    body: [
      "Sie haben nach der DSGVO folgende Rechte:",
      "• Auskunftsrecht (Art. 15 DSGVO): Auskunft über Ihre gespeicherten personenbezogenen Daten.",
      "• Recht auf Berichtigung (Art. 16 DSGVO): Berichtigung unrichtiger Daten.",
      "• Recht auf Löschung (Art. 17 DSGVO): Löschung Ihrer Daten, sofern keine Aufbewahrungspflichten bestehen.",
      "• Recht auf Einschränkung (Art. 18 DSGVO): Einschränkung der Verarbeitung.",
      "• Recht auf Datenübertragbarkeit (Art. 20 DSGVO): Erhalt Ihrer Daten in maschinenlesbarem Format.",
      "• Widerspruchsrecht (Art. 21 DSGVO): Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen.",
      "• Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO): Jederzeit mit Wirkung für die Zukunft.",
      "Anfragen richten Sie bitte an: leif@z-social.com\n\nWir beantworten Ihre Anfrage innerhalb eines Monats.",
    ].join("\n\n"),
  },
  {
    heading: "9. Beschwerderecht bei einer Aufsichtsbehörde",
    body: [
      "Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren (Art. 77 DSGVO).",
      "Zuständige Aufsichtsbehörde:",
      "Der Landesbeauftragte für Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern\nSchloss Schwerin\nLennéstraße 1\n19053 Schwerin",
      "Telefon: +49 385 59494 0\nE-Mail: datenschutz@datenschutz-mv.de\nWebsite: www.datenschutz-mv.de",
    ].join("\n\n"),
  },
  {
    heading: "10. Push-Benachrichtigungen",
    body: "Die App kann Push-Benachrichtigungen versenden, um Sie über neue Nachrichten, Gruppenaktivitäten, Event-Erinnerungen, Freundschaftsanfragen und Ankündigungen zu informieren.\n\nPush-Benachrichtigungen können jederzeit in den Geräteeinstellungen deaktiviert werden.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Aktivierung im Gerät).",
  },
  {
    heading: "11. Datensicherheit",
    body: [
      "Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen:",
      "• Verschlüsselte Datenübertragung (TLS/SSL)\n• Ende-zu-Ende-Verschlüsselung der Medienströme bei Anrufen und Live-Streams (DTLS-SRTP)\n• Verschlüsselte Speicherung von Passwörtern (Hashing)\n• Zugriffsbeschränkungen auf personenbezogene Daten\n• Regelmäßige Überprüfung der Sicherheitsmaßnahmen",
      "Unsere Sicherheitsmaßnahmen werden dem Stand der Technik entsprechend fortlaufend angepasst.",
    ].join("\n\n"),
  },
  {
    heading: "12. Minderjährige",
    body: "Die App richtet sich an Nutzer ab 16 Jahren. Personenbezogene Daten von Kindern unter 16 Jahren werden nicht wissentlich erhoben. Sollten wir Kenntnis erlangen, dass ein Kind unter 16 Jahren ein Konto erstellt hat, werden wir dieses Konto und die zugehörigen Daten unverzüglich löschen.",
  },
  {
    heading: "13. Änderungen dieser Datenschutzerklärung",
    body: "Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen, neue Funktionen oder veränderte Datenverarbeitungsprozesse anzupassen.\n\nBei wesentlichen Änderungen werden die Nutzer per E-Mail oder In-App-Benachrichtigung informiert. Die jeweils aktuelle Fassung ist jederzeit innerhalb der App im Privacy Center einsehbar.\n\nStand: März 2026",
  },
];

/* ═══════════════════════════════════════════════════
   Impressum
   ═══════════════════════════════════════════════════ */
export const IMPRESSUM_SECTIONS: LegalSection[] = [
  {
    heading: "Angaben gemäß § 5 TMG",
    body: "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstraße 3\n87463 Dietmannsried\nDeutschland",
  },
  {
    heading: "Kontakt",
    body: "E-Mail: leif@z-social.com",
  },
  {
    heading: "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV",
    body: "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstraße 3\n87463 Dietmannsried",
  },
  {
    heading: "Online-Streitbeilegung",
    body: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:\nhttps://ec.europa.eu/consumers/odr\n\nUnsere E-Mail-Adresse finden Sie oben.\n\nWir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
  },
  {
    heading: "Haftungsausschluss",
    body: [
      "Haftung für Inhalte:\nAls Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.",
      "Haftung für Links:\nSofern die App Links zu externen Websites enthält, haben wir auf deren Inhalte keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.",
    ].join("\n\n"),
  },
  {
    heading: "Urheberrecht",
    body: "Die durch den Anbieter erstellten Inhalte und Werke in dieser App unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des Anbieters.\n\nNutzergenerierte Inhalte verbleiben im Eigentum des jeweiligen Nutzers.",
  },
];
