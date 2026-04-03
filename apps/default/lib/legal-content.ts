/* ─── Legal content for Privacy Center ─── */

export interface LegalSection {
  heading?: string;
  body: string;
}

/* ═══════════════════════════════════════════════════
   AGB – Allgemeine Geschäftsbedingungen
   ═══════════════════════════════════════════════════ */
export const AGB_SECTIONS: LegalSection[] = [
  {
    heading: "§ 1 Geltungsbereich",
    body: [
      "(1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend \u201eAGB\u201c) gelten für die Nutzung der mobilen Anwendung \u201eZ\u201c (nachfolgend \u201eApp\u201c), betrieben von Leif Dunkelmann, c/o MDC Management #4560, Welserstraße 3, 87463 Dietmannsried, Deutschland (nachfolgend \u201eAnbieter\u201c).",
      "(2) Die App richtet sich an Nutzer ab 16 Jahren mit Wohnsitz oder Aufenthalt im Bundesland Mecklenburg-Vorpommern bzw. mit Bezug zur Region.",
      "(3) Abweichende oder ergänzende Bedingungen des Nutzers werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.",
      "(4) Maßgeblich ist die zum Zeitpunkt des Vertragsschlusses gültige Fassung dieser AGB.",
    ].join("\n\n"),
  },
  {
    heading: "§ 2 Vertragsgegenstand",
    body: [
      "(1) Die App \u201eZ\u201c ist eine regionale Social-Media-Plattform für Mecklenburg-Vorpommern. Sie bietet den Nutzern folgende Funktionen:",
      "• Erstellung und Verwaltung eines persönlichen Profils\n• Veröffentlichung von Foto- und Videobeiträgen im Community-Feed\n• Direkte Nachrichten (Text, Bild, Video, Sprachnachrichten)\n• Audio- und Videoanrufe zwischen Nutzern\n• Live-Streaming (Übertragung von Audio und Video in Echtzeit an andere Nutzer)\n• Erstellung und Teilnahme an Gruppen\n• Entdecken und Teilnahme an regionalen Events\n• Erwerb von Event-Tickets\n• Freundschaftsanfragen und soziale Vernetzung",
      "(2) Der Anbieter stellt die technische Infrastruktur zur Verfügung und gewährt dem Nutzer ein nicht-exklusives, nicht übertragbares Recht zur Nutzung der App im Rahmen dieser AGB.",
    ].join("\n\n"),
  },
  {
    heading: "§ 3 Registrierung und Nutzerkonto",
    body: [
      "(1) Die Nutzung der App setzt eine Registrierung und ein aktives Abonnement voraus.",
      "(2) Bei der Registrierung sind wahrheitsgemäße Angaben zu machen. Insbesondere sind eine gültige E-Mail-Adresse und ein Name anzugeben.",
      "(3) Jeder Nutzer darf nur ein Konto führen. Die Weitergabe von Zugangsdaten an Dritte ist untersagt.",
      "(4) Der Nutzer ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln und den Anbieter unverzüglich zu informieren, wenn Anhaltspunkte für einen Missbrauch des Kontos bestehen.",
      "(5) Der Anbieter behält sich vor, Konten zu sperren oder zu löschen, die gegen diese AGB verstoßen.",
    ].join("\n\n"),
  },
  {
    heading: "§ 4 Abonnement und Zahlungsbedingungen",
    body: [
      "(1) Die Nutzung der App erfordert ein kostenpflichtiges Abonnement.",
      "(2) Das Abonnement wird monatlich abgerechnet. Die Zahlung erfolgt über den externen Zahlungsdienstleister Stripe. Es gelten zusätzlich die Nutzungsbedingungen von Stripe.",
      "(3) Das Abonnement verlängert sich automatisch um den jeweiligen Abrechnungszeitraum, sofern es nicht vor Ablauf der aktuellen Laufzeit gekündigt wird.",
      "(4) Die Kündigung ist jederzeit zum Ende des laufenden Abrechnungszeitraums möglich. Nach der Kündigung bleibt der Zugang bis zum Ende des bezahlten Zeitraums bestehen.",
      "(5) Eine Rückerstattung bereits bezahlter Beträge für angebrochene Abrechnungszeiträume erfolgt nicht, sofern kein gesetzliches Widerrufsrecht besteht.",
      "(6) Der Anbieter behält sich vor, Preise für zukünftige Abrechnungszeiträume zu ändern. Preisänderungen werden dem Nutzer mindestens 30 Tage vor Inkrafttreten mitgeteilt.",
    ].join("\n\n"),
  },
  {
    heading: "§ 5 Widerrufsrecht",
    body: [
      "(1) Verbraucher haben das Recht, den Vertrag binnen 14 Tagen ohne Angabe von Gründen zu widerrufen.",
      "(2) Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses.",
      "(3) Um das Widerrufsrecht auszuüben, muss der Nutzer dem Anbieter mittels einer eindeutigen Erklärung (z.\u00a0B. per E-Mail an leif@z-social.com) über den Entschluss, den Vertrag zu widerrufen, informieren.",
      "(4) Zur Wahrung der Widerrufsfrist reicht es aus, dass die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist abgesendet wird.",
      "(5) Im Falle des Widerrufs werden alle Zahlungen unverzüglich, spätestens binnen 14 Tagen ab dem Tag, an dem die Mitteilung über den Widerruf eingegangen ist, erstattet.",
      "(6) Hat der Nutzer verlangt, dass die Dienstleistung während der Widerrufsfrist beginnen soll, so hat er dem Anbieter einen angemessenen Betrag zu zahlen, der dem Anteil der bis zum Widerruf bereits erbrachten Leistungen entspricht.",
    ].join("\n\n"),
  },
  {
    heading: "§ 6 Pflichten des Nutzers",
    body: [
      "(1) Der Nutzer verpflichtet sich zu einem respektvollen Umgang mit anderen Nutzern.",
      "(2) Es ist untersagt:\n\n• Rechtswidrige, beleidigende, diskriminierende, rassistische, gewaltverherrlichende oder pornografische Inhalte zu verbreiten\n• Falschinformationen oder Spam-Nachrichten zu versenden\n• Urheberrechtlich geschützte Inhalte Dritter ohne Berechtigung zu veröffentlichen\n• Die App oder ihre Infrastruktur technisch zu manipulieren\n• Automatisierte Zugriffe (Bots, Scraper) durchzuführen\n• Andere Nutzer zu belästigen, zu bedrohen oder zu stalken\n• Minderjährige zu gefährden",
      "(3) Der Nutzer trägt die alleinige Verantwortung für die von ihm veröffentlichten Inhalte.",
      "(4) Der Anbieter ist berechtigt, Inhalte ohne vorherige Ankündigung zu entfernen, die gegen diese AGB oder geltendes Recht verstoßen.",
    ].join("\n\n"),
  },
  {
    heading: "§ 7 Nutzerinhalte und Urheberrecht",
    body: [
      "(1) Der Nutzer behält alle Urheberrechte an den von ihm erstellten und hochgeladenen Inhalten.",
      "(2) Mit dem Hochladen räumt der Nutzer dem Anbieter ein einfaches, zeitlich und räumlich unbeschränktes, unentgeltliches Recht ein, die Inhalte im Rahmen der App darzustellen, zu speichern und an andere Nutzer auszuliefern.",
      "(3) Dieses Nutzungsrecht erlischt mit Löschung der Inhalte oder des Nutzerkontos.",
      "(4) Der Nutzer versichert, dass er die erforderlichen Rechte an den hochgeladenen Inhalten besitzt und keine Rechte Dritter verletzt.",
    ].join("\n\n"),
  },
  {
    heading: "§ 8 Kommunikation, Anrufe und Live-Streaming",
    body: [
      "(1) Die App bietet Funktionen für Direktnachrichten, Audio- und Videoanrufe sowie Live-Streaming.",
      "(2) Nachrichten werden verschlüsselt übertragen und auf den Servern des Anbieters gespeichert.",
      "(3) Audio- und Videoanrufe sowie Live-Streams werden über das WebRTC-Protokoll realisiert. Medienströme laufen nach Möglichkeit direkt zwischen den Geräten der Teilnehmer (Peer-to-Peer). Ist eine direkte Verbindung nicht möglich, werden die Medienströme über sogenannte TURN-Relayserver des Drittanbieters Metered Networks Inc. (Kanada) geleitet, um die Verbindung herzustellen.",
      "(4) Bei der Nutzung von TURN-Relayservern werden die IP-Adressen der beteiligten Geräte sowie die verschlüsselten Medienströme über die Server von Metered Networks Inc. geleitet. Der Inhalt der Kommunikation bleibt durch die WebRTC-eigene Verschlüsselung (DTLS-SRTP) geschützt.",
      "(5) Lediglich Signalisierungsdaten (Verbindungsaufbau, SDP-Angebote) werden über die Server des Anbieters vermittelt.",
      "(6) Live-Streams sind öffentlich für alle eingeloggten Nutzer der App sichtbar. Der streamende Nutzer ist für die von ihm übertragenen Inhalte selbst verantwortlich. Es gelten die Verhaltensregeln gemäß § 6 dieser AGB.",
      "(7) Der Anbieter kann Live-Streams ohne vorherige Ankündigung beenden, wenn Verstöße gegen diese AGB oder geltendes Recht festgestellt werden.",
      "(8) Live-Streams werden nicht vom Anbieter aufgezeichnet oder gespeichert. Das unbefugte Aufzeichnen von Live-Streams durch Zuschauer ist untersagt.",
      "(9) Der Anbieter hat keinen Zugriff auf die Inhalte laufender Audio- oder Videoanrufe und Live-Streams.",
    ].join("\n\n"),
  },
  {
    heading: "§ 9 Events und Tickets",
    body: [
      "(1) Über die App können Veranstaltungen erstellt und Tickets zum Kauf angeboten werden.",
      "(2) Bei Ticketkäufen kommt ein Vertrag zwischen dem Nutzer und dem jeweiligen Veranstalter zustande. Der Anbieter fungiert lediglich als technischer Vermittler.",
      "(3) Stornierungen richten sich nach den Bedingungen des jeweiligen Veranstalters.",
      "(4) QR-Code-Tickets dürfen nicht vervielfältigt oder weitergegeben werden.",
    ].join("\n\n"),
  },
  {
    heading: "§ 10 Verfügbarkeit und Gewährleistung",
    body: [
      "(1) Der Anbieter bemüht sich um eine möglichst hohe Verfügbarkeit, übernimmt jedoch keine Garantie für eine ununterbrochene Nutzung.",
      "(2) Wartungsarbeiten, technische Störungen oder höhere Gewalt können zu vorübergehenden Einschränkungen führen.",
      "(3) Die App wird in ihrem jeweiligen Zustand bereitgestellt. Der Anbieter übernimmt keine Gewähr für nutzergenerierte Inhalte.",
    ].join("\n\n"),
  },
  {
    heading: "§ 11 Haftung",
    body: [
      "(1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für vorsätzliche und grob fahrlässige Pflichtverletzungen.",
      "(2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Die Haftung ist auf den vorhersehbaren, vertragstypischen Schaden begrenzt.",
      "(3) Der Anbieter haftet nicht für nutzergenerierte Inhalte.",
      "(4) Die Haftungsbeschränkungen gelten nicht bei arglistigem Verschweigen eines Mangels oder Übernahme einer Beschaffenheitsgarantie.",
    ].join("\n\n"),
  },
  {
    heading: "§ 12 Kündigung und Kontolöschung",
    body: [
      "(1) Der Nutzer kann sein Konto jederzeit in den App-Einstellungen löschen oder die Löschung per E-Mail an leif@z-social.com beantragen.",
      "(2) Mit der Kontolöschung werden Profil, Beiträge, Nachrichten und sonstige Inhalte gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.",
      "(3) Der Anbieter ist berechtigt, das Nutzungsverhältnis aus wichtigem Grund fristlos zu kündigen.",
      "(4) Bei Kündigung durch den Anbieter aufgrund von Verstößen besteht kein Anspruch auf Rückerstattung.",
    ].join("\n\n"),
  },
  {
    heading: "§ 13 Meldungen und Moderation",
    body: [
      "(1) Nutzer können Inhalte oder andere Nutzer melden, die gegen diese AGB verstoßen.",
      "(2) Der Anbieter prüft Meldungen und kann Inhalte entfernen oder Konten sperren.",
      "(3) Blockierte Nutzer können keine Nachrichten senden, keine Anrufe tätigen und keine Beiträge des blockierenden Nutzers sehen.",
    ].join("\n\n"),
  },
  {
    heading: "§ 14 Datenschutz",
    body: "Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung, die im Tab \u201eDatenschutz\u201c dieses Privacy Centers einsehbar ist.",
  },
  {
    heading: "§ 15 Änderungen der AGB",
    body: [
      "(1) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern.",
      "(2) Änderungen werden mindestens 30 Tage vor Inkrafttreten mitgeteilt.",
      "(3) Widerspricht der Nutzer nicht innerhalb von 30 Tagen, gelten die neuen AGB als angenommen.",
      "(4) Im Falle des Widerspruchs steht beiden Parteien ein Kündigungsrecht zu.",
    ].join("\n\n"),
  },
  {
    heading: "§ 16 Schlussbestimmungen",
    body: [
      "(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.",
      "(2) Ist der Nutzer Verbraucher, gelten zusätzlich die zwingenden Verbraucherschutzvorschriften seines Aufenthaltsstaates.",
      "(3) Ist der Nutzer Kaufmann, ist ausschließlicher Gerichtsstand der Sitz des Anbieters.",
      "(4) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
      "(5) Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr\n\nDer Anbieter ist zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.",
      "Stand: März 2026",
    ].join("\n\n"),
  },
];
