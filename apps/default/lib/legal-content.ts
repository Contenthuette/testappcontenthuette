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
    heading: "\u00a7 1 Geltungsbereich",
    body: [
      "(1) Diese Allgemeinen Gesch\u00e4ftsbedingungen (nachfolgend \u201eAGB\u201c) gelten f\u00fcr die Nutzung der mobilen Anwendung \u201eZ\u201c (nachfolgend \u201eApp\u201c), betrieben von Leif Dunkelmann, c/o MDC Management #4560, Welserstra\u00dfe 3, 87463 Dietmannsried, Deutschland (nachfolgend \u201eAnbieter\u201c).",
      "(2) Die App richtet sich an Nutzer ab 16 Jahren mit Wohnsitz oder Aufenthalt im Bundesland Mecklenburg-Vorpommern bzw. mit Bezug zur Region.",
      "(3) Abweichende oder erg\u00e4nzende Bedingungen des Nutzers werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdr\u00fccklich schriftlich zu.",
      "(4) Ma\u00dfgeblich ist die zum Zeitpunkt des Vertragsschlusses g\u00fcltige Fassung dieser AGB.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 2 Vertragsgegenstand",
    body: [
      "(1) Die App \u201eZ\u201c ist eine regionale Social-Media-Plattform f\u00fcr Mecklenburg-Vorpommern. Sie bietet den Nutzern folgende Funktionen:",
      "\u2022 Erstellung und Verwaltung eines pers\u00f6nlichen Profils\n\u2022 Ver\u00f6ffentlichung von Foto- und Videobeitr\u00e4gen im Community-Feed\n\u2022 Direkte Nachrichten (Text, Bild, Video, Sprachnachrichten)\n\u2022 Audio- und Videoanrufe zwischen Nutzern\n\u2022 Erstellung und Teilnahme an Gruppen\n\u2022 Entdecken und Teilnahme an regionalen Events\n\u2022 Erwerb von Event-Tickets\n\u2022 Freundschaftsanfragen und soziale Vernetzung",
      "(2) Der Anbieter stellt die technische Infrastruktur zur Verf\u00fcgung und gew\u00e4hrt dem Nutzer ein nicht-exklusives, nicht \u00fcbertragbares Recht zur Nutzung der App im Rahmen dieser AGB.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 3 Registrierung und Nutzerkonto",
    body: [
      "(1) Die Nutzung der App setzt eine Registrierung und ein aktives Abonnement voraus.",
      "(2) Bei der Registrierung sind wahrheitsgem\u00e4\u00dfe Angaben zu machen. Insbesondere sind eine g\u00fcltige E-Mail-Adresse und ein Name anzugeben.",
      "(3) Jeder Nutzer darf nur ein Konto f\u00fchren. Die Weitergabe von Zugangsdaten an Dritte ist untersagt.",
      "(4) Der Nutzer ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln und den Anbieter unverz\u00fcglich zu informieren, wenn Anhaltspunkte f\u00fcr einen Missbrauch des Kontos bestehen.",
      "(5) Der Anbieter beh\u00e4lt sich vor, Konten zu sperren oder zu l\u00f6schen, die gegen diese AGB versto\u00dfen.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 4 Abonnement und Zahlungsbedingungen",
    body: [
      "(1) Die Nutzung der App erfordert ein kostenpflichtiges Abonnement.",
      "(2) Das Abonnement wird monatlich abgerechnet. Die Zahlung erfolgt \u00fcber den externen Zahlungsdienstleister Stripe. Es gelten zus\u00e4tzlich die Nutzungsbedingungen von Stripe.",
      "(3) Das Abonnement verl\u00e4ngert sich automatisch um den jeweiligen Abrechnungszeitraum, sofern es nicht vor Ablauf der aktuellen Laufzeit gek\u00fcndigt wird.",
      "(4) Die K\u00fcndigung ist jederzeit zum Ende des laufenden Abrechnungszeitraums m\u00f6glich. Nach der K\u00fcndigung bleibt der Zugang bis zum Ende des bezahlten Zeitraums bestehen.",
      "(5) Eine R\u00fcckerstattung bereits bezahlter Betr\u00e4ge f\u00fcr angebrochene Abrechnungszeitr\u00e4ume erfolgt nicht, sofern kein gesetzliches Widerrufsrecht besteht.",
      "(6) Der Anbieter beh\u00e4lt sich vor, Preise f\u00fcr zuk\u00fcnftige Abrechnungszeitr\u00e4ume zu \u00e4ndern. Preis\u00e4nderungen werden dem Nutzer mindestens 30 Tage vor Inkrafttreten mitgeteilt.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 5 Widerrufsrecht",
    body: [
      "(1) Verbraucher haben das Recht, den Vertrag binnen 14 Tagen ohne Angabe von Gr\u00fcnden zu widerrufen.",
      "(2) Die Widerrufsfrist betr\u00e4gt 14 Tage ab dem Tag des Vertragsschlusses.",
      "(3) Um das Widerrufsrecht auszu\u00fcben, muss der Nutzer dem Anbieter mittels einer eindeutigen Erkl\u00e4rung (z.\u00a0B. per E-Mail an leif@z-social.com) \u00fcber den Entschluss, den Vertrag zu widerrufen, informieren.",
      "(4) Zur Wahrung der Widerrufsfrist reicht es aus, dass die Mitteilung \u00fcber die Aus\u00fcbung des Widerrufsrechts vor Ablauf der Widerrufsfrist abgesendet wird.",
      "(5) Im Falle des Widerrufs werden alle Zahlungen unverz\u00fcglich, sp\u00e4testens binnen 14 Tagen ab dem Tag, an dem die Mitteilung \u00fcber den Widerruf eingegangen ist, erstattet.",
      "(6) Hat der Nutzer verlangt, dass die Dienstleistung w\u00e4hrend der Widerrufsfrist beginnen soll, so hat er dem Anbieter einen angemessenen Betrag zu zahlen, der dem Anteil der bis zum Widerruf bereits erbrachten Leistungen entspricht.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 6 Pflichten des Nutzers",
    body: [
      "(1) Der Nutzer verpflichtet sich zu einem respektvollen Umgang mit anderen Nutzern.",
      "(2) Es ist untersagt:\n\n\u2022 Rechtswidrige, beleidigende, diskriminierende, rassistische, gewaltverherrlichende oder pornografische Inhalte zu verbreiten\n\u2022 Falschinformationen oder Spam-Nachrichten zu versenden\n\u2022 Urheberrechtlich gesch\u00fctzte Inhalte Dritter ohne Berechtigung zu ver\u00f6ffentlichen\n\u2022 Die App oder ihre Infrastruktur technisch zu manipulieren\n\u2022 Automatisierte Zugriffe (Bots, Scraper) durchzuf\u00fchren\n\u2022 Andere Nutzer zu bel\u00e4stigen, zu bedrohen oder zu stalken\n\u2022 Minderj\u00e4hrige zu gef\u00e4hrden",
      "(3) Der Nutzer tr\u00e4gt die alleinige Verantwortung f\u00fcr die von ihm ver\u00f6ffentlichten Inhalte.",
      "(4) Der Anbieter ist berechtigt, Inhalte ohne vorherige Ank\u00fcndigung zu entfernen, die gegen diese AGB oder geltendes Recht versto\u00dfen.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 7 Nutzerinhalte und Urheberrecht",
    body: [
      "(1) Der Nutzer beh\u00e4lt alle Urheberrechte an den von ihm erstellten und hochgeladenen Inhalten.",
      "(2) Mit dem Hochladen r\u00e4umt der Nutzer dem Anbieter ein einfaches, zeitlich und r\u00e4umlich unbeschr\u00e4nktes, unentgeltliches Recht ein, die Inhalte im Rahmen der App darzustellen, zu speichern und an andere Nutzer auszuliefern.",
      "(3) Dieses Nutzungsrecht erlischt mit L\u00f6schung der Inhalte oder des Nutzerkontos.",
      "(4) Der Nutzer versichert, dass er die erforderlichen Rechte an den hochgeladenen Inhalten besitzt und keine Rechte Dritter verletzt.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 8 Kommunikation und Anrufe",
    body: [
      "(1) Die App bietet Funktionen f\u00fcr Direktnachrichten sowie Audio- und Videoanrufe.",
      "(2) Nachrichten werden verschl\u00fcsselt \u00fcbertragen und auf den Servern des Anbieters gespeichert.",
      "(3) Audio- und Videoanrufe werden \u00fcber WebRTC realisiert. Medienstr\u00f6me laufen nach M\u00f6glichkeit direkt zwischen den Ger\u00e4ten (Peer-to-Peer).",
      "(4) Der Anbieter hat keinen Zugriff auf die Inhalte laufender Audio- oder Videoanrufe.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 9 Events und Tickets",
    body: [
      "(1) \u00dcber die App k\u00f6nnen Veranstaltungen erstellt und Tickets zum Kauf angeboten werden.",
      "(2) Bei Ticketk\u00e4ufen kommt ein Vertrag zwischen dem Nutzer und dem jeweiligen Veranstalter zustande. Der Anbieter fungiert lediglich als technischer Vermittler.",
      "(3) Stornierungen richten sich nach den Bedingungen des jeweiligen Veranstalters.",
      "(4) QR-Code-Tickets d\u00fcrfen nicht vervielf\u00e4ltigt oder weitergegeben werden.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 10 Verf\u00fcgbarkeit und Gew\u00e4hrleistung",
    body: [
      "(1) Der Anbieter bem\u00fcht sich um eine m\u00f6glichst hohe Verf\u00fcgbarkeit, \u00fcbernimmt jedoch keine Garantie f\u00fcr eine ununterbrochene Nutzung.",
      "(2) Wartungsarbeiten, technische St\u00f6rungen oder h\u00f6here Gewalt k\u00f6nnen zu vor\u00fcbergehenden Einschr\u00e4nkungen f\u00fchren.",
      "(3) Die App wird in ihrem jeweiligen Zustand bereitgestellt. Der Anbieter \u00fcbernimmt keine Gew\u00e4hr f\u00fcr nutzergenerierte Inhalte.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 11 Haftung",
    body: [
      "(1) Der Anbieter haftet unbeschr\u00e4nkt f\u00fcr Sch\u00e4den aus der Verletzung des Lebens, des K\u00f6rpers oder der Gesundheit sowie f\u00fcr vors\u00e4tzliche und grob fahrl\u00e4ssige Pflichtverletzungen.",
      "(2) Bei leichter Fahrl\u00e4ssigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Die Haftung ist auf den vorhersehbaren, vertragstypischen Schaden begrenzt.",
      "(3) Der Anbieter haftet nicht f\u00fcr nutzergenerierte Inhalte.",
      "(4) Die Haftungsbeschr\u00e4nkungen gelten nicht bei arglistigem Verschweigen eines Mangels oder \u00dcbernahme einer Beschaffenheitsgarantie.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 12 K\u00fcndigung und Kontol\u00f6schung",
    body: [
      "(1) Der Nutzer kann sein Konto jederzeit in den App-Einstellungen l\u00f6schen oder die L\u00f6schung per E-Mail an leif@z-social.com beantragen.",
      "(2) Mit der Kontol\u00f6schung werden Profil, Beitr\u00e4ge, Nachrichten und sonstige Inhalte gel\u00f6scht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.",
      "(3) Der Anbieter ist berechtigt, das Nutzungsverh\u00e4ltnis aus wichtigem Grund fristlos zu k\u00fcndigen.",
      "(4) Bei K\u00fcndigung durch den Anbieter aufgrund von Verst\u00f6\u00dfen besteht kein Anspruch auf R\u00fcckerstattung.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 13 Meldungen und Moderation",
    body: [
      "(1) Nutzer k\u00f6nnen Inhalte oder andere Nutzer melden, die gegen diese AGB versto\u00dfen.",
      "(2) Der Anbieter pr\u00fcft Meldungen und kann Inhalte entfernen oder Konten sperren.",
      "(3) Blockierte Nutzer k\u00f6nnen keine Nachrichten senden, keine Anrufe t\u00e4tigen und keine Beitr\u00e4ge des blockierenden Nutzers sehen.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 14 Datenschutz",
    body: "Die Verarbeitung personenbezogener Daten erfolgt gem\u00e4\u00df der Datenschutzerkl\u00e4rung, die im Tab \u201eDatenschutz\u201c dieses Privacy Centers einsehbar ist.",
  },
  {
    heading: "\u00a7 15 \u00c4nderungen der AGB",
    body: [
      "(1) Der Anbieter beh\u00e4lt sich vor, diese AGB mit Wirkung f\u00fcr die Zukunft zu \u00e4ndern.",
      "(2) \u00c4nderungen werden mindestens 30 Tage vor Inkrafttreten mitgeteilt.",
      "(3) Widerspricht der Nutzer nicht innerhalb von 30 Tagen, gelten die neuen AGB als angenommen.",
      "(4) Im Falle des Widerspruchs steht beiden Parteien ein K\u00fcndigungsrecht zu.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 16 Schlussbestimmungen",
    body: [
      "(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.",
      "(2) Ist der Nutzer Verbraucher, gelten zus\u00e4tzlich die zwingenden Verbraucherschutzvorschriften seines Aufenthaltsstaates.",
      "(3) Ist der Nutzer Kaufmann, ist ausschlie\u00dflicher Gerichtsstand der Sitz des Anbieters.",
      "(4) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der \u00fcbrigen Bestimmungen unber\u00fchrt.",
      "(5) Die Europ\u00e4ische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr\n\nDer Anbieter ist zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.",
      "Stand: M\u00e4rz 2025",
    ].join("\n\n"),
  },
];
