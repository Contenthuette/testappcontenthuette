import type { LegalSection } from "./legal-content";
import { LEGAL_URLS } from "./legal-links";

/* ═══════════════════════════════════════════════════
   Datenschutzerklärung – DSGVO-konform
   ═══════════════════════════════════════════════════ */
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Verantwortlicher",
    body: [
      "Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:",
      "Contenthuette\nLeif Dunkelmann\nWerderstraße 135\n19055 Schwerin\nDeutschland",
      "Tel.: 01734506873\nE-Mail: leif@z-social.com",
      "Bei Fragen zum Datenschutz können Sie sich jederzeit an die oben genannte E-Mail-Adresse wenden.",
    ].join("\n\n"),
  },
  {
    heading: "2. Überblick über die Datenverarbeitung",
    body: `Die Z App verarbeitet personenbezogene Daten ausschließlich im Rahmen der nachfolgend beschriebenen Zwecke und Rechtsgrundlagen. Wir erheben nur solche Daten, die für die Bereitstellung und Verbesserung unserer Dienste erforderlich sind.\n\nDie aktuelle Datenschutzerklärung ist jederzeit vor dem Download unter ${LEGAL_URLS.privacy} abrufbar und zusätzlich in der App im Privacy Center einsehbar.`,
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
    heading: "4. Logfiles bei Nutzung der App",
    body: [
      "Bei Nutzung unserer mobilen App erheben wir die nachfolgend beschriebenen Daten, die f\u00fcr uns technisch erforderlich sind, um Ihnen die Funktionen unserer App anzubieten und die Stabilit\u00e4t und Sicherheit zu gew\u00e4hrleisten:",
      "\u2022 Datum und Uhrzeit der Anfrage\n\u2022 Zeitzonendifferenz zur Greenwich Mean Time (GMT)\n\u2022 Inhalt der Anforderung\n\u2022 Zugriffsstatus / HTTP-Statuscode\n\u2022 Menge der gesendeten Daten in Byte\n\u2022 Verwendeter Browser bzw. App-Version\n\u2022 Verwendetes Betriebssystem und dessen Oberfl\u00e4che\n\u2022 Verwendete IP-Adresse (ggf. in anonymisierter Form)",
      "Die Verarbeitung erfolgt gem\u00e4\u00df Art. 6 Abs. 1 lit. f DSGVO auf Basis unseres berechtigten Interesses an der Verbesserung der Stabilit\u00e4t und Funktionalit\u00e4t unserer App. Eine Weitergabe oder anderweitige Verwendung der Daten findet nicht statt. Wir behalten uns allerdings vor, die vorbenannten Logfiles nachtr\u00e4glich zu \u00fcberpr\u00fcfen, sollten konkrete Anhaltspunkte auf eine rechtswidrige Nutzung hinweisen.",
    ].join("\n\n"),
  },
  {
    heading: "5. Hosting",
    body: [
      "Wir nutzen den Dienst „Convex“ der Convex Labs LLC, USA, zum Zwecke des Hostings, der Datenbank, Dateispeicherung und Echtzeit-Datensynchronisation auf Basis einer Verarbeitung in unserem Auftrag.",
      "Sämtliche in unserer App erhobenen Daten werden auf den Servern von Convex verarbeitet. Im Rahmen der vorgenannten Leistungen können Daten auch an Server in den USA übermittelt werden.",
      "Soweit für einzelne Empfänger kein Angemessenheitsbeschluss oder keine Zertifizierung nach dem EU-US Data Privacy Framework vorliegt, erfolgt die Übermittlung auf Grundlage geeigneter Garantien, insbesondere EU-Standardvertragsklauseln gemäß Art. 46 DSGVO.",
    ].join("\n\n"),
  },
  {
    heading: "6. Cookies und lokale Speicherung",
    body: [
      "Um unsere App attraktiv zu gestalten und die Nutzung bestimmter Funktionen zu erm\u00f6glichen, verwenden wir sogenannte Cookies bzw. lokale Speichertechnologien. Hierbei handelt es sich um kleine Datens\u00e4tze, die auf Ihrem Endger\u00e4t abgelegt werden.",
      "Einige der verwendeten Technologien werden nach dem Schlie\u00dfen der App wieder gel\u00f6scht (sog. Sitzungs-Cookies). Andere verbleiben auf Ihrem Endger\u00e4t und erm\u00f6glichen uns, Sie wiederzuerkennen (sog. persistente Cookies/Token).",
      "Sofern durch einzelne von uns eingesetzte Cookies auch personenbezogene Daten verarbeitet werden, erfolgt die Verarbeitung gem\u00e4\u00df Art. 6 Abs. 1 lit. b DSGVO zur Durchf\u00fchrung des Vertrages, gem\u00e4\u00df Art. 6 Abs. 1 lit. a DSGVO im Falle einer erteilten Einwilligung oder gem\u00e4\u00df Art. 6 Abs. 1 lit. f DSGVO zur Wahrung unserer berechtigten Interessen an der bestm\u00f6glichen Funktionalit\u00e4t der App.",
    ].join("\n\n"),
  },
  {
    heading: "7. Regionale Angaben",
    body: [
      "In der App können Sie freiwillig regionale Angaben wie Landkreis und Stadt hinterlegen, damit wir Ihnen passende Inhalte und Community-Bezüge innerhalb Mecklenburg-Vorpommerns anzeigen können.",
      "Diese Angaben stammen ausschließlich aus Ihren manuellen Eingaben innerhalb der App. Eine Erhebung präziser Standortdaten per GPS oder im Hintergrund findet derzeit nicht statt.",
      "Sie können diese Angaben jederzeit in Ihrem Profil ändern oder löschen.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).",
    ].join("\n\n"),
  },
  {
    heading: "8. Art der erhobenen Daten",
    body: [
      "8.1 Registrierungsdaten (erforderlich)",
      "\u2022 E-Mail-Adresse\n\u2022 Name / Anzeigename\n\u2022 Passwort (verschl\u00fcsselt gespeichert)",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "8.2 Profildaten (freiwillig)",
      "\u2022 Profilbild und Bannerbild\n\u2022 Biografie\n\u2022 Wohnort (Landkreis, Stadt)\n\u2022 Geschlecht\n\u2022 Geburtsdatum\n\u2022 Interessen",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Diese Daten k\u00f6nnen jederzeit im Profil gel\u00f6scht oder ge\u00e4ndert werden.",
      "8.3 Nutzergenerierte Inhalte",
      "\u2022 Foto- und Videobeitr\u00e4ge im Feed\n\u2022 Bildunterschriften (Captions)\n\u2022 Kommentare und Reaktionen (Likes)\n\u2022 Nachrichten (Text, Bild, Video, Sprachnachrichten)\n\u2022 Gruppenerstellungen und -beitritte",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "8.4 Kommunikationsdaten",
      "\u2022 Direktnachrichten (Text, Medien, Sprachnachrichten)\n\u2022 Audio- und Videoanrufe (Signalisierungsdaten)\n\u2022 Anrufprotokolle (Zeitpunkt, Dauer, Teilnehmer)\n\u2022 Live-Stream-Metadaten (Titel, Startzeitpunkt, Teilnehmerzahl, Zuschauerzahl)\n\u2022 Chat-Nachrichten w\u00e4hrend Live-Streams",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "8.5 Event- und Ticketdaten",
      "\u2022 Eventteilnahmen\n\u2022 Ticketk\u00e4ufe und -status\n\u2022 QR-Code-Daten zur Einlassverifizierung\n\u2022 Check-in-Zeitpunkte",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "8.6 Zahlungsdaten",
      "\u2022 Stripe-Kunden-ID\n\u2022 Abonnementstatus und -zeitraum\n\u2022 Zahlungsvorg\u00e4nge (\u00fcber Stripe verarbeitet)",
      "Kreditkarten- oder Bankdaten werden ausschlie\u00dflich von Stripe verarbeitet und zu keinem Zeitpunkt auf unseren Servern gespeichert.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
      "8.7 Technische Daten und Nutzungsdaten",
      "\u2022 App-Aktivität und Interaktionen\n\u2022 Zeitpunkt der letzten Aktivität\n\u2022 Freundschaftsanfragen und soziale Verbindungen\n\u2022 Gespeicherte Beiträge\n\u2022 Benachrichtigungspräferenzen\n\u2022 Meldungen und Blockierungen",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung und Sicherheit der App).",
      "8.8 Geräteberechtigungen und Zugriffsrechte",
      "• Push-Benachrichtigungen: Für Nachrichten, Gruppenaktivitäten, Event-Erinnerungen, Freundschaftsanfragen und Ankündigungen. Verarbeitet werden insbesondere Push-Token, Plattform-/Gerätebezug und Ihre Benachrichtigungseinstellungen.\n• Mikrofon: Für Sprachnachrichten sowie Audioanteile bei Audio-/Videoanrufen und Live-Streams. Verarbeitet werden von Ihnen aktiv aufgenommene oder übertragene Audiodaten.\n• Kamera: Für Videoanrufe und Live-Streams. Verarbeitet werden nur Bilddaten, die Sie im Rahmen dieser Funktionen aktiv erfassen oder übertragen.\n• Mediathek / Fotobibliothek: Zum Auswählen von Bildern und Videos für Profil, Banner, Beiträge, Gruppenbilder und Chat-Anhänge. Verarbeitet werden nur die von Ihnen ausgewählten Dateien.\n• Standortberechtigung des Geräts: Derzeit nicht erforderlich, da Landkreis und Stadt manuell eingegeben werden.",
      "Sie können erteilte Berechtigungen jederzeit in den Einstellungen Ihres Geräts widerrufen. Ohne die jeweilige Berechtigung stehen die entsprechenden Funktionen nicht oder nur eingeschränkt zur Verfügung.",
      "Rechtsgrundlagen: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung bzw. Gerätefreigabe) sowie Art. 6 Abs. 1 lit. b DSGVO, soweit die Datenverarbeitung zur Bereitstellung der von Ihnen angeforderten Funktion erforderlich ist.",
    ].join("\n\n"),
  },
  {
    heading: "9. Kontaktaufnahme",
    body: [
      "Im Rahmen der Kontaktaufnahme mit uns (z.\u00a0B. per E-Mail) werden personenbezogene Daten erhoben. Diese Daten werden ausschlie\u00dflich zum Zweck der Beantwortung Ihres Anliegens bzw. f\u00fcr die Kontaktaufnahme und die damit verbundene technische Administration gespeichert und verwendet.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung Ihres Anliegens). Zielt Ihre Kontaktierung auf den Abschluss eines Vertrages ab, so ist zus\u00e4tzliche Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO.",
      "Ihre Daten werden nach abschlie\u00dfender Bearbeitung Ihrer Anfrage gel\u00f6scht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.",
    ].join("\n\n"),
  },
  {
    heading: "10. Registrierung in der App",
    body: [
      "Sie k\u00f6nnen sich in unserer App unter Angabe von personenbezogenen Daten registrieren. Welche Daten f\u00fcr die Registrierung verarbeitet werden, ergibt sich aus der Eingabemaske.",
      "Wenn Sie unsere App nutzen, speichern wir Ihre zur Vertragserf\u00fcllung erforderlichen Daten bis Sie Ihren Zugang endg\u00fcltig l\u00f6schen. Alle Angaben k\u00f6nnen Sie im gesch\u00fctzten Nutzerbereich verwalten und \u00e4ndern.",
      "Dar\u00fcber hinaus speichern wir alle von Ihnen ver\u00f6ffentlichten Inhalte (\u00f6ffentliche Beitr\u00e4ge, Kommentare, etc.) um die App zu betreiben. Wir haben ein berechtigtes Interesse an der Bereitstellung der App mit dem vollst\u00e4ndigen User-Generated-Content.",
      "Sie k\u00f6nnen Ihren Account jederzeit \u00fcber die Funktion \u201eAccount l\u00f6schen\u201c in den Profileinstellungen der App l\u00f6schen. Bei Kontol\u00f6schung werden alle Profildaten, Beitr\u00e4ge (Fotos, Videos), Kommentare, Likes, Freundschaftsverbindungen, Gruppenmitgliedschaften, Benachrichtigungen und hochgeladene Mediendateien unwiderruflich gel\u00f6scht. Nachrichten, die Sie an andere Nutzer \u00fcber die Direktnachrichtenfunktion gesendet haben, bleiben f\u00fcr den jeweiligen Gespr\u00e4chspartner weiterhin sichtbar und werden nicht gel\u00f6scht.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.",
    ].join("\n\n"),
  },
  {
    heading: "11. Datenverarbeitung zur Vertragsabwicklung",
    body: [
      "Zahlungen werden \u00fcber den Paymentdienstleister Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland, abgewickelt. Die im Rahmen des Bestellvorgangs mitgeteilten Informationen (Name, Anschrift, Kontonummer, Kreditkartennummer, Rechnungsbetrag, W\u00e4hrung und Transaktionsnummer) werden gem\u00e4\u00df Art. 6 Abs. 1 lit. b DSGVO weitergegeben.",
      "Die Weitergabe Ihrer Daten erfolgt ausschlie\u00dflich zum Zwecke der Zahlungsabwicklung und nur insoweit, als sie hierf\u00fcr erforderlich ist.",
      "N\u00e4here Informationen zum Datenschutz von Stripe finden Sie unter: https://stripe.com/de/privacy",
    ].join("\n\n"),
  },
  {
    heading: "12. Empf\u00e4nger und Auftragsverarbeiter",
    body: [
      "Zur Erbringung unserer Dienste setzen wir folgende Dienstleister als Auftragsverarbeiter ein:",
      "12.1 Convex Labs LLC (USA)\nZweck: Datenbank, Serverinfrastruktur, Dateispeicherung, Echtzeit-Datensynchronisation\nStandort: USA / eingesetzte Cloud-Infrastruktur\nGrundlage für Drittlandtransfer: Soweit kein Angemessenheitsbeschluss oder keine Zertifizierung nach dem EU-US Data Privacy Framework vorliegt, erfolgt die Übermittlung auf Grundlage geeigneter Garantien, insbesondere EU-Standardvertragsklauseln gemäß Art. 46 DSGVO.",
      "12.2 Stripe, Inc. (USA)\nZweck: Zahlungsabwicklung f\u00fcr Abonnements und Event-Tickets\nStandort: USA / Irland\nGrundlage: EU-US Data Privacy Framework (DPF). Zahlungsdaten werden direkt von Stripe verarbeitet. Der Anbieter speichert ausschlie\u00dflich die Stripe-Kunden-ID und den Abonnementstatus.",
      "12.3 Expo / The Expo Project (USA)\nZweck: Push-Benachrichtigungen an mobile Ger\u00e4te\nStandort: USA\nGrundlage: Soweit kein Angemessenheitsbeschluss oder keine Zertifizierung nach dem EU-US Data Privacy Framework vorliegt, erfolgt die Übermittlung auf Grundlage geeigneter Garantien, insbesondere EU-Standardvertragsklauseln gemäß Art. 46 DSGVO.",
      "12.4 Next Path Software Consulting Inc. (Metered), Kanada\nZweck: Bereitstellung von TURN/STUN-Relayservern f\u00fcr WebRTC-Verbindungen (Audio-/Videoanrufe und Live-Streams), wenn eine direkte Peer-to-Peer-Verbindung zwischen den Endger\u00e4ten nicht m\u00f6glich ist.\nVerarbeitete Daten: IP-Adressen der Verbindungsteilnehmer, verschl\u00fcsselte Medienstr\u00f6me (Inhalt bleibt durch DTLS-SRTP-Verschl\u00fcsselung gesch\u00fctzt).\nStandort: Kanada / weltweit verteilte Serverinfrastruktur\nGrundlage f\u00fcr Drittlandtransfer: Angemessenheitsbeschluss der EU-Kommission f\u00fcr Kanada (Art. 45 DSGVO) sowie, soweit Server au\u00dferhalb Kanadas eingesetzt werden, geeignete Garantien wie EU-Standardvertragsklauseln gemäß Art. 46 DSGVO.",
      "12.5 WebRTC (Peer-to-Peer)\nAudio- und Videoanrufe sowie Live-Streams werden \u00fcber das WebRTC-Protokoll realisiert. Nach dem Verbindungsaufbau laufen Medienstr\u00f6me nach M\u00f6glichkeit direkt zwischen den Endger\u00e4ten. Ist eine direkte Verbindung nicht m\u00f6glich, werden die Daten \u00fcber TURN-Relayserver (Metered, siehe 12.4) geleitet. Signalisierungsdaten werden \u00fcber die Server des Anbieters (Convex, siehe 12.1) vermittelt.",
      "12.6 Plus Five Five, Inc. (Resend), USA\nZweck: Versand transaktionaler E-Mails (z.\u00a0B. Kontobest\u00e4tigungen, Passwortzur\u00fccksetzungen, Systembenachrichtigungen) sowie E-Mail-Kommunikation zu Plattform-Updates, neuen Funktionen und Angeboten des Anbieters (Direktwerbung gem\u00e4\u00df \u00a7 7 Abs. 3 UWG)\nVerarbeitete Daten: E-Mail-Adresse des Empf\u00e4ngers, Name (sofern angegeben), E-Mail-Inhalt\nStandort: USA\nGrundlage f\u00fcr Drittlandtransfer: EU-US Data Privacy Framework (DPF) sowie ergänzend EU-Standardvertragsklauseln gemäß Art. 46 DSGVO.\nN\u00e4here Informationen: https://resend.com/legal/privacy-policy",
      "Eine Weitergabe personenbezogener Daten an sonstige Dritte erfolgt nur:",
      "\u2022 Wenn eine gesetzliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO)\n\u2022 Wenn der Nutzer ausdr\u00fccklich eingewilligt hat (Art. 6 Abs. 1 lit. a DSGVO)\n\u2022 Wenn dies zur Geltendmachung von Rechtsanspr\u00fcchen erforderlich ist",
      "Eine kommerzielle Weitergabe oder ein Verkauf personenbezogener Daten an Dritte findet nicht statt.",
    ].join("\n\n"),
  },
  {
    heading: "13. Daten\u00fcbermittlung in Drittl\u00e4nder",
    body: "Personenbezogene Daten können an Dienstleister in Drittländern, insbesondere in den USA und Kanada, übermittelt werden (siehe Abschnitt 12). Für Kanada besteht, soweit der Empfänger dem kanadischen Datenschutzrecht unterfällt, ein Angemessenheitsbeschluss der EU-Kommission gemäß Art. 45 DSGVO. Für Übermittlungen in die USA stützen wir uns, soweit einschlägig, auf eine Zertifizierung des jeweiligen Empfängers nach dem EU-US Data Privacy Framework. Soweit kein Angemessenheitsbeschluss oder keine entsprechende Zertifizierung vorliegt, erfolgt die Übermittlung auf Grundlage geeigneter Garantien, insbesondere EU-Standardvertragsklauseln gemäß Art. 46 DSGVO.\n\nDer Anbieter überprüft regelmäßig, ob die eingesetzten Dienstleister geeignete Garantien für den Schutz personenbezogener Daten bereitstellen.",
  },
  {
    heading: "14. Speicherdauer",
    body: [
      "Personenbezogene Daten werden nur so lange gespeichert, wie dies f\u00fcr den jeweiligen Verarbeitungszweck erforderlich ist:",
      "\u2022 Kontodaten: F\u00fcr die Dauer der Nutzung. Bei L\u00f6schung des Kontos \u00fcber die Funktion \u201eAccount l\u00f6schen\u201c in den Profileinstellungen werden Profildaten, Beitr\u00e4ge, Kommentare, Likes, Mediendateien, Freundschaften, Gruppenmitgliedschaften, Benachrichtigungen und Tickets unverz\u00fcglich gel\u00f6scht. Nachrichten, die \u00fcber die Direktnachrichtenfunktion an andere Nutzer gesendet wurden, bleiben auch nach Kontol\u00f6schung f\u00fcr den Gespr\u00e4chspartner sichtbar.",
      "\u2022 Nutzerinhalte (Beitr\u00e4ge, Medien): Bis zur L\u00f6schung durch den Nutzer oder Kontol\u00f6schung.",
      "\u2022 Direktnachrichten: Gesendete Nachrichten verbleiben auch nach Kontol\u00f6schung beim Empf\u00e4nger. Der Empf\u00e4nger kann die Konversation eigenst\u00e4ndig l\u00f6schen.",
      "\u2022 Zahlungs- und Rechnungsdaten: 10 Jahre nach Ende des Kalenderjahres der Transaktion (\u00a7 147 AO).",
      "\u2022 Kommunikationsdaten: Bis zur L\u00f6schung des Kontos oder der Konversation.",
      "\u2022 Anrufprotokolle: 90 Tage nach Beendigung des Anrufs.",
      "\u2022 Live-Stream-Metadaten: Bis zur L\u00f6schung des Kontos oder 90 Tage nach Ende des Streams.",
      "\u2022 Meldungen und Moderationsdaten: Bis zur Erledigung bzw. f\u00fcr die Dauer etwaiger Rechtsstreitigkeiten.",
      "\u2022 Anonymisierte Analysedaten: Unbefristet, da kein Personenbezug besteht.",
      "Bei der Verarbeitung auf Grundlage einer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) werden die Daten so lange gespeichert, bis Sie Ihre Einwilligung widerrufen.",
      "Bei der Verarbeitung auf Grundlage berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO) werden die Daten so lange gespeichert, bis Sie Ihr Widerspruchsrecht nach Art. 21 Abs. 1 DSGVO aus\u00fcben, es sei denn, wir k\u00f6nnen zwingende schutzw\u00fcrdige Gr\u00fcnde nachweisen.",
    ].join("\n\n"),
  },
  {
    heading: "15. Direktwerbung und E-Mail-Kommunikation",
    body: [
      "15.1 Eigenwerbung per E-Mail (\u00a7 7 Abs. 3 UWG)",
      "Wenn Sie sich bei Z registrieren, speichern wir Ihren Namen und Ihre E-Mail-Adresse auch zum Zweck der Direktwerbung. Auf Grundlage von \u00a7 7 Abs. 3 UWG sind wir berechtigt, Ihnen ohne gesonderte Einwilligung E-Mails zu \u00e4hnlichen Dienstleistungen zu senden, die in Zusammenhang mit Ihrer Nutzung der Z-Plattform stehen. Dies umfasst insbesondere:",
      "\u2022 Informationen \u00fcber neue Funktionen und Updates der Z App\n\u2022 Ank\u00fcndigungen zu Events und Community-Aktivit\u00e4ten in Mecklenburg-Vorpommern\n\u2022 Tipps zur Nutzung der Plattform\n\u2022 Einladungen zu besonderen Aktionen des Anbieters",
      "Die Datenverarbeitung erfolgt auf Basis unseres berechtigten Interesses an personalisierter Direktwerbung gem\u00e4\u00df Art. 6 Abs. 1 lit. f DSGVO i.\u00a0V.\u00a0m. \u00a7 7 Abs. 3 UWG.",
      "15.2 Widerspruchsrecht",
      "Sie k\u00f6nnen der Nutzung Ihrer E-Mail-Adresse zu Werbezwecken jederzeit mit Wirkung f\u00fcr die Zukunft widersprechen, ohne dass hierf\u00fcr andere als die \u00dcbermittlungskosten nach den Basistarifen entstehen. Der Widerspruch kann formlos erfolgen:\n\u2022 Per E-Mail an: leif@z-social.com\n\u2022 \u00dcber den Abmeldelink in jeder Werbe-E-Mail\n\u2022 In den App-Einstellungen unter \u201eBenachrichtigungen\u201c",
      "15.3 Transaktionale E-Mails",
      "Unabh\u00e4ngig von der Direktwerbung senden wir Ihnen systemrelevante E-Mails, die f\u00fcr die Nutzung Ihres Kontos erforderlich sind. Diese k\u00f6nnen nicht abbestellt werden und umfassen:\n\u2022 Passwort-Zur\u00fccksetzungen\n\u2022 Sicherheitsbenachrichtigungen (z.\u00a0B. Kontol\u00f6schung)\n\u2022 Wesentliche \u00c4nderungen der Nutzungsbedingungen oder Datenschutzerkl\u00e4rung",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserf\u00fcllung).",
    ].join("\n\n"),
  },
  {
    heading: "16. Push-Benachrichtigungen",
    body: [
      "Die App kann Push-Benachrichtigungen versenden, um Sie \u00fcber neue Nachrichten, Gruppenaktivit\u00e4ten, Event-Erinnerungen, Freundschaftsanfragen und Ank\u00fcndigungen zu informieren.",
      "Zur Anmeldung m\u00fcssen Sie den Erhalt von Benachrichtigungen best\u00e4tigen bzw. in den Einstellungen Ihres Betriebssystems erlauben. Hierzu geh\u00f6rt die Speicherung des Anmeldezeitpunkts sowie Ihre Ger\u00e4tekennzeichnung.",
      "Push-Benachrichtigungen k\u00f6nnen jederzeit in den Ger\u00e4teeinstellungen oder in den App-Einstellungen deaktiviert werden. Ihre Daten werden gel\u00f6scht, sobald das Abonnement f\u00fcr Push-Benachrichtigungen deaktiviert wird.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Aktivierung im Ger\u00e4t).",
    ].join("\n\n"),
  },
  {
    heading: "17. Betroffenenrechte",
    body: [
      "Sie haben nach der DSGVO folgende Rechte:",
      "\u2022 Auskunftsrecht (Art. 15 DSGVO): Auskunft \u00fcber Ihre gespeicherten personenbezogenen Daten.",
      "\u2022 Recht auf Berichtigung (Art. 16 DSGVO): Berichtigung unrichtiger Daten.",
      "\u2022 Recht auf L\u00f6schung (Art. 17 DSGVO): L\u00f6schung Ihrer Daten, sofern keine Aufbewahrungspflichten bestehen.",
      "\u2022 Recht auf Einschr\u00e4nkung (Art. 18 DSGVO): Einschr\u00e4nkung der Verarbeitung.",
      "\u2022 Recht auf Unterrichtung (Art. 19 DSGVO): Mitteilung \u00fcber Berichtigung, L\u00f6schung oder Einschr\u00e4nkung an alle Empf\u00e4nger.",
      "\u2022 Recht auf Daten\u00fcbertragbarkeit (Art. 20 DSGVO): Erhalt Ihrer Daten in maschinenlesbarem Format.",
      "\u2022 Widerspruchsrecht (Art. 21 DSGVO): Widerspruch gegen Verarbeitung auf Grundlage berechtigter Interessen.",
      "\u2022 Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO): Jederzeit mit Wirkung f\u00fcr die Zukunft. Die Rechtm\u00e4\u00dfigkeit der bis zum Widerruf erfolgten Verarbeitung wird dadurch nicht ber\u00fchrt.",
      "Anfragen richten Sie bitte an: leif@z-social.com\n\nWir beantworten Ihre Anfrage innerhalb eines Monats.",
    ].join("\n\n"),
  },
  {
    heading: "18. Widerspruchsrecht",
    body: [
      "Wenn wir im Rahmen einer Interessenabw\u00e4gung Ihre personenbezogenen Daten aufgrund unseres \u00fcberwiegenden berechtigten Interesses verarbeiten, haben Sie das jederzeitige Recht, aus Gr\u00fcnden, die sich aus Ihrer besonderen Situation ergeben, gegen diese Verarbeitung Widerspruch mit Wirkung f\u00fcr die Zukunft einzulegen.",
      "Machen Sie von Ihrem Widerspruchsrecht Gebrauch, beenden wir die Verarbeitung der betroffenen Daten. Eine Weiterverarbeitung bleibt aber vorbehalten, wenn wir zwingende schutzw\u00fcrdige Gr\u00fcnde nachweisen k\u00f6nnen, die Ihre Interessen, Grundrechte und Grundfreiheiten \u00fcberwiegen, oder wenn die Verarbeitung der Geltendmachung, Aus\u00fcbung oder Verteidigung von Rechtsanspr\u00fcchen dient.",
      "Werden Ihre personenbezogenen Daten von uns verarbeitet, um Direktwerbung zu betreiben, haben Sie das Recht, jederzeit Widerspruch gegen die Verarbeitung einzulegen.",
    ].join("\n\n"),
  },
  {
    heading: "19. Beschwerderecht bei einer Aufsichtsbeh\u00f6rde",
    body: [
      "Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbeh\u00f6rde \u00fcber die Verarbeitung Ihrer personenbezogenen Daten zu beschweren (Art. 77 DSGVO).",
      "Zust\u00e4ndige Aufsichtsbeh\u00f6rde:",
      "Der Landesbeauftragte f\u00fcr Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern\nSchloss Schwerin\nLenn\u00e9stra\u00dfe 1\n19053 Schwerin",
      "Telefon: +49 385 59494 0\nE-Mail: datenschutz@datenschutz-mv.de\nWebsite: www.datenschutz-mv.de",
    ].join("\n\n"),
  },
  {
    heading: "20. Datensicherheit",
    body: [
      "Wir setzen technische und organisatorische Ma\u00dfnahmen ein, um Ihre Daten zu sch\u00fctzen:",
      "\u2022 Verschl\u00fcsselte Daten\u00fcbertragung (TLS/SSL)\n\u2022 Ende-zu-Ende-Verschl\u00fcsselung der Medienstr\u00f6me bei Anrufen und Live-Streams (DTLS-SRTP)\n\u2022 Verschl\u00fcsselte Speicherung von Passw\u00f6rtern (Hashing)\n\u2022 Zugriffsbeschr\u00e4nkungen auf personenbezogene Daten\n\u2022 Regelm\u00e4\u00dfige \u00dcberpr\u00fcfung der Sicherheitsma\u00dfnahmen",
      "Unsere Sicherheitsma\u00dfnahmen werden dem Stand der Technik entsprechend fortlaufend angepasst.",
    ].join("\n\n"),
  },
  {
    heading: "21. Minderj\u00e4hrige",
    body: "Die App richtet sich an Nutzer ab 16 Jahren. Personenbezogene Daten von Kindern unter 16 Jahren werden nicht wissentlich erhoben. Sollten wir Kenntnis erlangen, dass ein Kind unter 16 Jahren ein Konto erstellt hat, werden wir dieses Konto und die zugeh\u00f6rigen Daten unverz\u00fcglich l\u00f6schen.",
  },
  {
    heading: "22. Änderungen dieser Datenschutzerklärung",
    body: `Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen, neue Funktionen oder veränderte Datenverarbeitungsprozesse anzupassen.\n\nBei wesentlichen Änderungen werden die Nutzer per E-Mail oder In-App-Benachrichtigung informiert. Die jeweils aktuelle Fassung ist jederzeit innerhalb der App im Privacy Center sowie unter ${LEGAL_URLS.privacy} einsehbar.\n\nStand: April 2026`,
  },
  {
    heading: "23. Plattformstatistiken und interne Analysen",
    body: [
      "Der Anbieter erhebt und speichert aggregierte, nicht personenbezogene Plattformstatistiken zum Zweck der Betriebsüberwachung, Qualitätssicherung und Weiterentwicklung der App. Hierbei werden ausschließlich Gesamtzahlen und zusammengefasste Kennwerte erfasst, die keinen Rückschluss auf einzelne Nutzer ermöglichen.",
      "Erfasste Statistiken umfassen insbesondere:",
      "• Gesamtanzahl registrierter Nutzer\n• Anzahl aktiver Nutzer (heute, 7 Tage, 30 Tage)\n• Neuregistrierungen pro Tag\n• Gesamtanzahl und tägliche Anzahl veröffentlichter Beiträge (aufgeschlüsselt nach Fotos und Videos)\n• Gesamtanzahl der Gruppen und Events\n• Gesamtanzahl der Nachrichten\n• Umsatzkennzahlen (Ticket-Erlöse, Abonnement-Status)\n• Abonnementstatus-Verteilung (aktiv, gekündigt, abgelaufen)",
      "Diese Statistiken werden automatisiert in regelmäßigen Intervallen (alle 6 Stunden) durch ein serverseitiges Verfahren berechnet und als Tagesschnappschuss gespeichert. Die Auswertung erfolgt ausschließlich in aggregierter Form; es werden keine individuellen Nutzerprofile erstellt und keine Bewegungs- oder Verhaltensprofile einzelner Nutzer angelegt.",
      "Es werden keine externen Analyse- oder Tracking-Dienste (wie z. B. Google Analytics, Firebase Analytics, Facebook Pixel o. Ä.) eingesetzt. Es findet kein Tracking für Werbezwecke statt. Es werden keine Daten an Werbenetzwerke oder sonstige Dritte zu Analysezwecken übermittelt.",
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse des Anbieters an der Betriebsüberwachung und Weiterentwicklung der Plattform). Da ausschließlich anonymisierte, aggregierte Daten verarbeitet werden, liegt kein Personenbezug im Sinne der DSGVO vor.",
    ].join("\n\n"),
  },
];

/* ═══════════════════════════════════════════════════
   Impressum
   ═══════════════════════════════════════════════════ */
export const IMPRESSUM_SECTIONS: LegalSection[] = [
  {
    heading: "Angaben gemäß § 5 DDG",
    body: [
      "Contenthuette",
      "Leif Dunkelmann",
      "Werderstraße 135",
      "19055 Schwerin",
      "Deutschland",
    ].join("\n"),
  },
  {
    heading: "Kontakt",
    body: "Tel.: 01734506873\nE-Mail: leif@z-social.com",
  },
  {
    heading: "Verantwortliche/r i.S.d. § 18 Abs. 2 MStV",
    body: "Leif Dunkelmann\nWerderstraße 135\n19055 Schwerin",
  },
  {
    heading: "Zust\u00e4ndige Aufsichtsbeh\u00f6rde",
    body: "Zust\u00e4ndige Aufsichtsbeh\u00f6rde f\u00fcr das Angebot audiovisueller Mediendienste:\n\nMedienanstalt Mecklenburg-Vorpommern (MMV)\nBleicherufer 1\n19053 Schwerin\nDeutschland",
  },
  {
    heading: "Zentrale Kontaktstelle (Digital Services Act \u2013 DSA)",
    body: "Der Anbieter hat f\u00fcr beh\u00f6rdliche Entfernungsanordnungen sowie f\u00fcr Anfragen und Beschwerden von Beh\u00f6rden und Nutzern in Bezug auf angebotene Hosting-Leistungen die folgende zentrale Kontaktstelle eingerichtet:\n\nleif@z-social.com\n\nEine Kommunikation \u00fcber diese Kontaktstelle ist in den Sprachen Deutsch und Englisch m\u00f6glich.",
  },
  {
    heading: "Online-Streitbeilegung",
    body: "Die Europ\u00e4ische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:\nhttps://ec.europa.eu/consumers/odr\n\nUnsere E-Mail-Adresse finden Sie oben.\n\nWir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.",
  },
  {
    heading: "Haftungsausschluss",
    body: [
      "Haftung f\u00fcr Inhalte:\nAls Diensteanbieter sind wir gem\u00e4\u00df \u00a7 7 Abs. 1 DDG f\u00fcr eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich. Nach \u00a7\u00a7 8 bis 10 DDG sind wir jedoch nicht verpflichtet, \u00fcbermittelte oder gespeicherte fremde Informationen zu \u00fcberwachen.",
      "Haftung f\u00fcr Links:\nSofern die App Links zu externen Websites enth\u00e4lt, haben wir auf deren Inhalte keinen Einfluss. F\u00fcr die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.",
    ].join("\n\n"),
  },
  {
    heading: "Urheberrecht",
    body: "Die durch den Anbieter erstellten Inhalte und Werke in dieser App unterliegen dem deutschen Urheberrecht. Die Vervielf\u00e4ltigung, Bearbeitung, Verbreitung und jede Art der Verwertung au\u00dferhalb der Grenzen des Urheberrechts bed\u00fcrfen der schriftlichen Zustimmung des Anbieters.\n\nNutzergenerierte Inhalte verbleiben im Eigentum des jeweiligen Nutzers.",
  },
  {
    heading: "",
    body: "Stand: 04.04.2026",
  },
];
