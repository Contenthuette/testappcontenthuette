import { LegalSection } from "./legal-content";

/* ═══════════════════════════════════════════════════
   Datenschutzerklärung – DSGVO-konform
   ═══════════════════════════════════════════════════ */
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Verantwortlicher",
    body: [
      "Verantwortlich f\u00fcr die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:",
      "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstra\u00dfe 3\n87463 Dietmannsried\nDeutschland",
      "E-Mail: leif@z-social.com",
      "Bei Fragen zum Datenschutz k\u00f6nnen Sie sich jederzeit an die oben genannte E-Mail-Adresse wenden.",
    ].join("\n\n"),
  },
  {
    heading: "2. \u00dcberblick \u00fcber die Datenverarbeitung",
    body: "Die Z App verarbeitet personenbezogene Daten ausschlie\u00dflich im Rahmen der nachfolgend beschriebenen Zwecke und Rechtsgrundlagen. Wir erheben nur solche Daten, die f\u00fcr die Bereitstellung und Verbesserung unserer Dienste erforderlich sind.",
  },
  {
    heading: "3. Rechtsgrundlagen der Verarbeitung",
    body: [
      "Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage folgender Rechtsgrundlagen:",
      "\u2022 Art. 6 Abs. 1 lit. a DSGVO \u2013 Einwilligung: F\u00fcr die freiwillige Angabe zus\u00e4tzlicher Profildaten (z.\u00a0B. Geburtsdatum, Geschlecht, Interessen, Bio, Standort).",
      "\u2022 Art. 6 Abs. 1 lit. b DSGVO \u2013 Vertragserf\u00fcllung: F\u00fcr die Registrierung, Bereitstellung des Nutzerkontos, Abonnementverwaltung, Nachrichten\u00fcbermittlung, Anrufe und Eventfunktionen.",
      "\u2022 Art. 6 Abs. 1 lit. c DSGVO \u2013 Rechtliche Verpflichtung: F\u00fcr die Aufbewahrung von Rechnungs- und Zahlungsdaten gem\u00e4\u00df steuer- und handelsrechtlichen Vorschriften.",
      "\u2022 Art. 6 Abs. 1 lit. f DSGVO \u2013 Berechtigte Interessen: F\u00fcr die Gew\u00e4hrleistung der App-Sicherheit, Missbrauchspr\u00e4vention, Moderation und technische Verbesserungen.",
    ].join("\n\n"),
  },
  {
    heading: "4. Art der erhobenen Daten",
    body: [
      "4.1 Registrierungsdaten (erforderlich)",
      "\u2022 E-Mail-Adresse\n\u2022 Name / Anzeigename\n\u2022 Passwort (verschl\u00fcsselt gespeichert)",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "4.2 Profildaten (freiwillig)",
      "\u2022 Profilbild und Bannerbild\n\u2022 Biografie\n\u2022 Wohnort (Landkreis, Stadt)\n\u2022 Geschlecht\n\u2022 Geburtsdatum\n\u2022 Interessen",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Diese Daten k\u00f6nnen jederzeit im Profil gel\u00f6scht oder ge\u00e4ndert werden.",
      "4.3 Nutzergenerierte Inhalte",
      "\u2022 Foto- und Videobeitr\u00e4ge im Feed\n\u2022 Bildunterschriften (Captions)\n\u2022 Kommentare und Reaktionen (Likes)\n\u2022 Nachrichten (Text, Bild, Video, Sprachnachrichten)\n\u2022 Gruppenerstellungen und -beitritte",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "4.4 Kommunikationsdaten",
      "\u2022 Direktnachrichten (Text, Medien, Sprachnachrichten)\n\u2022 Audio- und Videoanrufe (Signalisierungsdaten)\n\u2022 Anrufprotokolle (Zeitpunkt, Dauer, Teilnehmer)\n\u2022 Live-Stream-Metadaten (Titel, Startzeitpunkt, Teilnehmerzahl, Zuschauerzahl)\n\u2022 Chat-Nachrichten w\u00e4hrend Live-Streams",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "4.5 Event- und Ticketdaten",
      "\u2022 Eventteilnahmen\n\u2022 Ticketk\u00e4ufe und -status\n\u2022 QR-Code-Daten zur Einlassverifizierung\n\u2022 Check-in-Zeitpunkte",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "4.6 Zahlungsdaten",
      "\u2022 Stripe-Kunden-ID\n\u2022 Abonnementstatus und -zeitraum\n\u2022 Zahlungsvorg\u00e4nge (\u00fcber Stripe verarbeitet)",
      "Kreditkarten- oder Bankdaten werden ausschlie\u00dflich von Stripe verarbeitet und zu keinem Zeitpunkt auf unseren Servern gespeichert.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "4.7 Technische Daten und Nutzungsdaten",
      "\u2022 App-Aktivit\u00e4t und Interaktionen\n\u2022 Zeitpunkt der letzten Aktivit\u00e4t\n\u2022 Freundschaftsanfragen und soziale Verbindungen\n\u2022 Gespeicherte Beitr\u00e4ge\n\u2022 Benachrichtigungspr\u00e4ferenzen\n\u2022 Meldungen und Blockierungen",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung und Sicherheit der App).",
    ].join("\n\n"),
  },
  {
    heading: "5. Empf\u00e4nger und Auftragsverarbeiter",
    body: [
      "Zur Erbringung unserer Dienste setzen wir folgende Dienstleister als Auftragsverarbeiter ein:",
      "5.1 Convex, Inc. (USA)\nZweck: Datenbank, Serverinfrastruktur, Dateispeicherung, Echtzeit-Datensynchronisation\nStandort: AWS-Rechenzentrum, USA\nGrundlage f\u00fcr Drittlandtransfer: EU-US Data Privacy Framework (DPF) sowie Standardvertragsklauseln (SCC) gem\u00e4\u00df Art. 46 Abs. 2 lit. c DSGVO.",
      "5.2 Stripe, Inc. (USA)\nZweck: Zahlungsabwicklung f\u00fcr Abonnements und Event-Tickets\nStandort: USA / Irland\nGrundlage: EU-US Data Privacy Framework (DPF). Zahlungsdaten werden direkt von Stripe verarbeitet. Der Anbieter speichert ausschlie\u00dflich die Stripe-Kunden-ID und den Abonnementstatus.",
      "5.3 Expo / The Expo Project (USA)\nZweck: Push-Benachrichtigungen an mobile Ger\u00e4te\nStandort: USA\nGrundlage: EU-US Data Privacy Framework (DPF) sowie SCC.",
      "5.4 Metered Networks Inc. (Kanada)\nZweck: Bereitstellung von TURN/STUN-Relayservern f\u00fcr WebRTC-Verbindungen (Audio-/Videoanrufe und Live-Streams), wenn eine direkte Peer-to-Peer-Verbindung zwischen den Endger\u00e4ten nicht m\u00f6glich ist.\nVerarbeitete Daten: IP-Adressen der Verbindungsteilnehmer, verschl\u00fcsselte Medienstr\u00f6me (Inhalt bleibt durch DTLS-SRTP-Verschl\u00fcsselung gesch\u00fctzt).\nStandort: Kanada / weltweit verteilte Serverinfrastruktur\nGrundlage f\u00fcr Drittlandtransfer: Angemessenheitsbeschluss der EU-Kommission f\u00fcr Kanada (Art. 45 DSGVO) sowie Standardvertragsklauseln (SCC) f\u00fcr Server au\u00dferhalb Kanadas.",
      "5.5 WebRTC (Peer-to-Peer)\nAudio- und Videoanrufe sowie Live-Streams werden \u00fcber das WebRTC-Protokoll realisiert. Nach dem Verbindungsaufbau laufen Medienstr\u00f6me nach M\u00f6glichkeit direkt zwischen den Endger\u00e4ten. Ist eine direkte Verbindung nicht m\u00f6glich, werden die Daten \u00fcber TURN-Relayserver (Metered Networks, siehe 5.4) geleitet. Signalisierungsdaten werden \u00fcber die Server des Anbieters (Convex, siehe 5.1) vermittelt.",
      "Eine Weitergabe personenbezogener Daten an sonstige Dritte erfolgt nur:",
      "\u2022 Wenn eine gesetzliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO)\n\u2022 Wenn der Nutzer ausdr\u00fccklich eingewilligt hat (Art. 6 Abs. 1 lit. a DSGVO)\n\u2022 Wenn dies zur Geltendmachung von Rechtsanspr\u00fcchen erforderlich ist",
      "Eine kommerzielle Weitergabe oder ein Verkauf personenbezogener Daten an Dritte findet nicht statt.",
    ].join("\n\n"),
  },
  {
    heading: "6. Daten\u00fcbermittlung in Drittl\u00e4nder",
    body: "Personenbezogene Daten werden an Dienstleister in den USA \u00fcbermittelt (siehe Abschnitt 5). Die \u00dcbermittlung erfolgt auf Grundlage des EU-US Data Privacy Framework (Angemessenheitsbeschluss der EU-Kommission gem\u00e4\u00df Art. 45 DSGVO) sowie erg\u00e4nzend auf Basis von Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).\n\nDer Anbieter \u00fcberpr\u00fcft regelm\u00e4\u00dfig, ob die Garantien f\u00fcr den Schutz personenbezogener Daten eingehalten werden.",
  },
  {
    heading: "7. Speicherdauer",
    body: [
      "Personenbezogene Daten werden nur so lange gespeichert, wie dies f\u00fcr den jeweiligen Verarbeitungszweck erforderlich ist:",
      "\u2022 Kontodaten: F\u00fcr die Dauer der Nutzung. Bei L\u00f6schung des Kontos werden alle Daten unverz\u00fcglich gel\u00f6scht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.",
      "\u2022 Nutzerinhalte (Beitr\u00e4ge, Nachrichten, Medien): Bis zur L\u00f6schung durch den Nutzer oder Kontol\u00f6schung.",
      "\u2022 Zahlungs- und Rechnungsdaten: 10 Jahre nach Ende des Kalenderjahres der Transaktion (\u00a7 147 AO).",
      "\u2022 Kommunikationsdaten: Bis zur L\u00f6schung des Kontos oder der Konversation.",
      "\u2022 Anrufprotokolle: 90 Tage nach Beendigung des Anrufs.",
      "\u2022 Live-Stream-Metadaten: Bis zur L\u00f6schung des Kontos oder 90 Tage nach Ende des Streams.",
      "\u2022 Meldungen und Moderationsdaten: Bis zur Erledigung bzw. f\u00fcr die Dauer etwaiger Rechtsstreitigkeiten.",
      "\u2022 Anonymisierte Analysedaten: Unbefristet, da kein Personenbezug besteht.",
    ].join("\n\n"),
  },
  {
    heading: "8. Betroffenenrechte",
    body: [
      "Sie haben nach der DSGVO folgende Rechte:",
      "\u2022 Auskunftsrecht (Art. 15 DSGVO): Auskunft \u00fcber Ihre gespeicherten personenbezogenen Daten.",
      "\u2022 Recht auf Berichtigung (Art. 16 DSGVO): Berichtigung unrichtiger Daten.",
      "\u2022 Recht auf L\u00f6schung (Art. 17 DSGVO): L\u00f6schung Ihrer Daten, sofern keine Aufbewahrungspflichten bestehen.",
      "\u2022 Recht auf Einschr\u00e4nkung (Art. 18 DSGVO): Einschr\u00e4nkung der Verarbeitung.",
      "\u2022 Recht auf Daten\u00fcbertragbarkeit (Art. 20 DSGVO): Erhalt Ihrer Daten in maschinenlesbarem Format.",
      "\u2022 Widerspruchsrecht (Art. 21 DSGVO): Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen.",
      "\u2022 Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO): Jederzeit mit Wirkung f\u00fcr die Zukunft.",
      "Anfragen richten Sie bitte an: leif@z-social.com\n\nWir beantworten Ihre Anfrage innerhalb eines Monats.",
    ].join("\n\n"),
  },
  {
    heading: "9. Beschwerderecht bei einer Aufsichtsbeh\u00f6rde",
    body: [
      "Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbeh\u00f6rde \u00fcber die Verarbeitung Ihrer personenbezogenen Daten zu beschweren (Art. 77 DSGVO).",
      "Zust\u00e4ndige Aufsichtsbeh\u00f6rde:",
      "Der Landesbeauftragte f\u00fcr Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern\nSchloss Schwerin\nLenn\u00e9stra\u00dfe 1\n19053 Schwerin",
      "Telefon: +49 385 59494 0\nE-Mail: datenschutz@datenschutz-mv.de\nWebsite: www.datenschutz-mv.de",
    ].join("\n\n"),
  },
  {
    heading: "10. Push-Benachrichtigungen",
    body: "Die App kann Push-Benachrichtigungen versenden, um Sie \u00fcber neue Nachrichten, Gruppenaktivit\u00e4ten, Event-Erinnerungen, Freundschaftsanfragen und Ank\u00fcndigungen zu informieren.\n\nPush-Benachrichtigungen k\u00f6nnen jederzeit in den Ger\u00e4teeinstellungen deaktiviert werden.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Aktivierung im Ger\u00e4t).",
  },
  {
    heading: "11. Datensicherheit",
    body: [
      "Wir setzen technische und organisatorische Ma\u00dfnahmen ein, um Ihre Daten zu sch\u00fctzen:",
      "\u2022 Verschl\u00fcsselte Daten\u00fcbertragung (TLS/SSL)\n\u2022 Ende-zu-Ende-Verschl\u00fcsselung der Medienstr\u00f6me bei Anrufen und Live-Streams (DTLS-SRTP)\n\u2022 Verschl\u00fcsselte Speicherung von Passw\u00f6rtern (Hashing)\n\u2022 Zugriffsbeschr\u00e4nkungen auf personenbezogene Daten\n\u2022 Regelm\u00e4\u00dfige \u00dcberpr\u00fcfung der Sicherheitsma\u00dfnahmen",
      "Unsere Sicherheitsma\u00dfnahmen werden dem Stand der Technik entsprechend fortlaufend angepasst.",
    ].join("\n\n"),
  },
  {
    heading: "12. Minderj\u00e4hrige",
    body: "Die App richtet sich an Nutzer ab 16 Jahren. Personenbezogene Daten von Kindern unter 16 Jahren werden nicht wissentlich erhoben. Sollten wir Kenntnis erlangen, dass ein Kind unter 16 Jahren ein Konto erstellt hat, werden wir dieses Konto und die zugeh\u00f6rigen Daten unverz\u00fcglich l\u00f6schen.",
  },
  {
    heading: "13. \u00c4nderungen dieser Datenschutzerkl\u00e4rung",
    body: "Wir behalten uns vor, diese Datenschutzerkl\u00e4rung anzupassen, um sie an ge\u00e4nderte Rechtslagen, neue Funktionen oder ver\u00e4nderte Datenverarbeitungsprozesse anzupassen.\n\nBei wesentlichen \u00c4nderungen werden die Nutzer per E-Mail oder In-App-Benachrichtigung informiert. Die jeweils aktuelle Fassung ist jederzeit innerhalb der App im Privacy Center einsehbar.\n\nStand: M\u00e4rz 2026",
  },
];

/* ═══════════════════════════════════════════════════
   Impressum
   ═══════════════════════════════════════════════════ */
export const IMPRESSUM_SECTIONS: LegalSection[] = [
  {
    heading: "Angaben gem\u00e4\u00df \u00a7 5 TMG",
    body: "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstra\u00dfe 3\n87463 Dietmannsried\nDeutschland",
  },
  {
    heading: "Kontakt",
    body: "E-Mail: leif@z-social.com",
  },
  {
    heading: "Verantwortlich f\u00fcr den Inhalt nach \u00a7 55 Abs. 2 RStV",
    body: "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstra\u00dfe 3\n87463 Dietmannsried",
  },
  {
    heading: "Online-Streitbeilegung",
    body: "Die Europ\u00e4ische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:\nhttps://ec.europa.eu/consumers/odr\n\nUnsere E-Mail-Adresse finden Sie oben.\n\nWir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
  },
  {
    heading: "Haftungsausschluss",
    body: [
      "Haftung f\u00fcr Inhalte:\nAls Diensteanbieter sind wir gem\u00e4\u00df \u00a7 7 Abs. 1 TMG f\u00fcr eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich. Nach \u00a7\u00a7 8 bis 10 TMG sind wir jedoch nicht verpflichtet, \u00fcbermittelte oder gespeicherte fremde Informationen zu \u00fcberwachen.",
      "Haftung f\u00fcr Links:\nSofern die App Links zu externen Websites enth\u00e4lt, haben wir auf deren Inhalte keinen Einfluss. F\u00fcr die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.",
    ].join("\n\n"),
  },
  {
    heading: "Urheberrecht",
    body: "Die durch den Anbieter erstellten Inhalte und Werke in dieser App unterliegen dem deutschen Urheberrecht. Die Vervielf\u00e4ltigung, Bearbeitung, Verbreitung und jede Art der Verwertung au\u00dferhalb der Grenzen des Urheberrechts bed\u00fcrfen der schriftlichen Zustimmung des Anbieters.\n\nNutzergenerierte Inhalte verbleiben im Eigentum des jeweiligen Nutzers.",
  },
];
