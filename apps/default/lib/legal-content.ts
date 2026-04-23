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
      "(1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend \u201eAGB\u201c) gelten für die Nutzung der mobilen Anwendung \u201eZ\u201c (nachfolgend \u201eApp\u201c), betrieben von Leif Dunkelmann, Werderstraße 135, 19055 Schwerin, Deutschland (nachfolgend \u201eAnbieter\u201c).",
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
      "(1) Über die App können Veranstaltungen (\u201eEvents\u201c) erstellt und Tickets zum Kauf angeboten werden. Die Erstellung von Z Member Events ist für alle registrierten Nutzer kostenlos möglich.",
      "(2) Bei Ticketkäufen kommt ein Vertrag ausschließlich zwischen dem Nutzer (Käufer) und dem jeweiligen Veranstalter zustande. Der Anbieter fungiert lediglich als technischer Vermittler und ist nicht Vertragspartei des Ticketkaufvertrags.",
      "(3) Stornierungen und Rückerstattungen richten sich nach den Bedingungen des jeweiligen Veranstalters. Der Anbieter übernimmt keine Haftung für die Durchführung, Absage oder Qualität von Veranstaltungen.",
      "(4) QR-Code-Tickets sind personengebunden und dürfen nicht vervielfältigt, weitergegeben oder weiterverkauft werden.",
      "(5) Der Anbieter behält sich vor, Events ohne vorherige Ankündigung zu entfernen, die gegen diese AGB, die Nutzungsrichtlinien für Veranstalter (§ 10) oder geltendes Recht verstoßen.",
      "(6) Bei Events können durch den Veranstalter oder durch andere Teilnehmer Bild- und Tonaufnahmen (Fotos, Videos) angefertigt werden. Mit der Teilnahme an einem über die App beworbenen Event nimmt der Nutzer zur Kenntnis, dass er auf solchen Aufnahmen erkennbar abgebildet sein kann. Der Nutzer erklärt sich damit einverstanden, dass Übersichtsaufnahmen der Veranstaltung, auf denen er als Teil einer Menschenmenge und nicht als Hauptmotiv abgebildet ist, gemäß § 23 Abs. 1 Nr. 3 des Kunsturhebergesetzes (KUG) ohne gesonderte Einwilligung veröffentlicht werden dürfen.",
      "(7) Für Aufnahmen, auf denen der Nutzer als Einzelperson erkennbar im Vordergrund abgebildet ist (Bildnisse im Sinne von § 22 KUG), ist eine gesonderte Einwilligung des Abgebildeten erforderlich. Die Verantwortung für die Einholung dieser Einwilligung liegt ausschließlich beim aufnehmenden Nutzer bzw. Veranstalter. Der Anbieter übernimmt hierfür keinerlei Haftung.",
      "(8) Werden Aufnahmen von der Veranstaltung in der App (z.\u00a0B. als Beitrag im Feed) veröffentlicht, gelten die allgemeinen Bestimmungen zu Nutzerinhalten (§ 7) und die Pflichten des Nutzers (§ 6) entsprechend. Nutzer, die ohne ihre Einwilligung auf Aufnahmen erkennbar abgebildet sind, können die Löschung über die Meldefunktion der App oder per E-Mail an leif@z-social.com verlangen.",
    ].join("\n\n"),
  },
  {
    heading: "§ 10 Nutzungsrichtlinien für Veranstalter",
    body: [
      "(1) Jeder Nutzer, der über die App ein Event erstellt (nachfolgend \u201eVeranstalter\u201c), übernimmt die vollständige Verantwortung für die Organisation, Durchführung und Kommunikation der Veranstaltung.",
      "(2) Der Veranstalter verpflichtet sich, ausschließlich wahrheitsgemäße und vollständige Angaben zu seinem Event zu machen. Dazu gehören insbesondere:\n\n• Zutreffende Bezeichnung und Beschreibung der Veranstaltung\n• Korrektes Datum, korrekte Uhrzeit und korrekter Veranstaltungsort\n• Transparente Preisangaben (inkl. aller Gebühren)\n• Hinweise auf Altersbeschränkungen, soweit zutreffend\n• Angaben zur maximalen Teilnehmerzahl, sofern begrenzt",
      "(3) Folgende Inhalte und Veranstaltungen sind untersagt:\n\n• Events, die gegen geltendes Recht verstoßen oder zu Straftaten aufrufen\n• Veranstaltungen mit diskriminierendem, rassistischem, extremistischem, gewaltverherrlichendem oder pornografischem Inhalt\n• Irreführende oder betrügerische Veranstaltungsangebote\n• Events, die ausschließlich kommerziellen Werbezwecken dienen, ohne einen Veranstaltungscharakter aufzuweisen\n• Veranstaltungen, die Minderjährige gefährden\n• Mehrfacheinstellungen identischer Events zum Zwecke des Spammings",
      "(4) Der Veranstalter ist für die Einhaltung aller anwendbaren gesetzlichen Vorschriften selbst verantwortlich. Dazu zählen insbesondere:\n\n• Einholung erforderlicher behördlicher Genehmigungen (z.\u00a0B. Veranstaltungsgenehmigung, Gaststättenerlaubnis, GEMA-Anmeldung)\n• Einhaltung von Jugendschutzvorschriften\n• Gewährleistung der Verkehrssicherungspflicht am Veranstaltungsort\n• Einhaltung steuerrechtlicher Pflichten (z.\u00a0B. Umsatzsteuer auf Ticketverkäufe)\n• Einhaltung der Datenschutzvorschriften gegenüber Teilnehmern\n• Einhaltung des Rechts am eigenen Bild (§§ 22, 23 KUG) sowie der Datenschutz-Grundverordnung (DSGVO) bei der Anfertigung und Veröffentlichung von Bild- und Tonaufnahmen",
      "(5) Plant der Veranstalter, die Veranstaltung durch Foto- oder Videoaufnahmen zu dokumentieren oder dokumentieren zu lassen, ist er verpflichtet, die Teilnehmer vor Beginn der Veranstaltung in geeigneter Weise (z.\u00a0B. durch Aushang am Eingang, Hinweis in der Eventbeschreibung oder mündliche Ankündigung) darüber zu informieren. Für Aufnahmen, die einzelne Personen erkennbar im Vordergrund zeigen, hat der Veranstalter eine gesonderte Einwilligung gemäß § 22 KUG und Art. 6 Abs. 1 lit. a DSGVO einzuholen.",
      "(6) Der Veranstalter stellt den Anbieter von sämtlichen Ansprüchen Dritter frei, die aus oder im Zusammenhang mit der Veranstaltung entstehen. Dies umfasst insbesondere Ansprüche wegen Personen- oder Sachschäden, Urheberrechtsverletzungen, Verletzungen des Rechts am eigenen Bild sowie behördliche Bußgelder.",
      "(7) Bei Absage oder wesentlicher Änderung einer Veranstaltung ist der Veranstalter verpflichtet, alle Ticketkäufer unverzüglich über die App oder per Nachricht zu informieren und eine angemessene Rückerstattung anzubieten.",
      "(8) Der Anbieter ist berechtigt, Events jederzeit und ohne vorherige Ankündigung zu entfernen oder die Erstellungsberechtigung eines Veranstalters zu entziehen, wenn:\n\n• Ein Verstoß gegen diese AGB oder die vorstehenden Richtlinien vorliegt oder zu befürchten ist\n• Meldungen anderer Nutzer einen begründeten Verdacht auf Regelverstöße ergeben\n• Das Event offensichtlich nicht stattfinden wird oder irreführend ist\n• Behördliche Anordnungen dies erfordern",
      "(9) Der Anbieter ist berechtigt, die Event-Erstellungsberechtigung eines Nutzers bei Regelverstößen ohne Angabe von Gründen zu entziehen. Ein Anspruch auf Wiederherstellung besteht nicht.",
      "(10) Der Anbieter übernimmt keine Haftung für die Inhalte, die Durchführung, die Qualität oder die Sicherheit von nutzerorganisierten Veranstaltungen. Die Nutzung der Event-Funktion erfolgt auf eigene Verantwortung des Veranstalters und der Teilnehmer.",
    ].join("\n\n"),
  },
  {
    heading: "§ 11 Offline-Interaktionen und Nutzertreffen",
    body: [
      "(1) Die App ermöglicht es Nutzern, miteinander in Kontakt zu treten und sich über Events, Direktnachrichten oder Gruppen zu verabreden. Der Anbieter stellt hierfür ausschließlich die technische Plattform bereit. Sämtliche persönlichen Treffen, Begegnungen und Offline-Interaktionen zwischen Nutzern finden außerhalb des Einflussbereichs des Anbieters statt.",
      "(2) Der Anbieter übernimmt keinerlei Verantwortung oder Haftung für:\n\n• Persönliche Treffen oder Begegnungen, die über die App verabredet oder angebahnt werden\n• Das Verhalten von Nutzern bei Offline-Treffen oder Veranstaltungen\n• Personen-, Sach- oder Vermögensschäden, die im Zusammenhang mit solchen Treffen oder Veranstaltungen entstehen\n• Die Richtigkeit der Angaben, die Nutzer in ihren Profilen oder Event-Beschreibungen machen\n• Die Identität oder Zuverlässigkeit anderer Nutzer",
      "(3) Der Anbieter trifft keine Auswahl, Überprüfung oder Überwachung der Nutzer im Hinblick auf deren Eignung oder Vertrauenswürdigkeit für Offline-Begegnungen. Es besteht keine Verkehrssicherungspflicht des Anbieters in Bezug auf Nutzertreffen.",
      "(4) Jeder Nutzer ist für seine eigene Sicherheit bei Offline-Treffen und Veranstaltungen selbst verantwortlich. Der Anbieter empfiehlt, erste Treffen an öffentlichen Orten stattfinden zu lassen und eine Vertrauensperson über das Treffen zu informieren.",
      "(5) Diese Haftungsbeschränkung gilt nicht, soweit der Anbieter selbst vorsätzlich oder grob fahrlässig gehandelt hat oder es sich um Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit handelt (§ 309 Nr. 7 BGB).",
    ].join("\n\n"),
  },
  {
    heading: "§ 12 Verfügbarkeit und Gewährleistung",
    body: [
      "(1) Der Anbieter bemüht sich um eine möglichst hohe Verfügbarkeit, übernimmt jedoch keine Garantie für eine ununterbrochene Nutzung.",
      "(2) Wartungsarbeiten, technische Störungen oder höhere Gewalt können zu vorübergehenden Einschränkungen führen.",
      "(3) Die App wird in ihrem jeweiligen Zustand bereitgestellt. Der Anbieter übernimmt keine Gewähr für nutzergenerierte Inhalte.",
    ].join("\n\n"),
  },
  {
    heading: "§ 13 Haftung",
    body: [
      "(1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für vorsätzliche und grob fahrlässige Pflichtverletzungen.",
      "(2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Die Haftung ist auf den vorhersehbaren, vertragstypischen Schaden begrenzt.",
      "(3) Der Anbieter haftet nicht für nutzergenerierte Inhalte, insbesondere nicht für die Richtigkeit, Vollständigkeit oder Rechtmäßigkeit von Nutzerangaben in Profilen, Beiträgen oder Event-Beschreibungen.",
      "(4) Der Anbieter haftet nicht für Schäden, die im Zusammenhang mit Veranstaltungen, Nutzertreffen oder sonstigen Offline-Interaktionen zwischen Nutzern entstehen. Die Haftung richtet sich insoweit nach den Bestimmungen des § 11 dieser AGB.",
      "(5) Der Anbieter haftet nicht für Schäden, die durch die Verletzung des Rechts am eigenen Bild (§§ 22, 23 KUG) oder datenschutzrechtlicher Vorschriften durch Veranstalter oder andere Nutzer entstehen.",
      "(6) Die Haftungsbeschränkungen gelten nicht bei arglistigem Verschweigen eines Mangels oder Übernahme einer Beschaffenheitsgarantie.",
      "(7) Die vorstehenden Haftungsbeschränkungen gelten auch zugunsten der gesetzlichen Vertreter, Erfüllungsgehilfen und Mitarbeiter des Anbieters.",
    ].join("\n\n"),
  },
  {
    heading: "\u00a7 14 K\u00fcndigung und Kontol\u00f6schung",
    body: [
      "(1) Der Nutzer kann sein Konto jederzeit \u00fcber die Funktion \u201eAccount l\u00f6schen\u201c in den Profileinstellungen der App l\u00f6schen. Alternativ kann die L\u00f6schung per E-Mail an leif@z-social.com beantragt werden.",
      "(2) Mit der Kontol\u00f6schung werden folgende Daten unwiderruflich gel\u00f6scht:\n\n\u2022 Profildaten (Name, Bio, Profilbild, Bannerbild, Standort, Interessen)\n\u2022 Alle ver\u00f6ffentlichten Beitr\u00e4ge (Fotos, Videos, Bildunterschriften)\n\u2022 Kommentare und Reaktionen (Likes) des Nutzers\n\u2022 Gespeicherte Beitr\u00e4ge\n\u2022 Freundschaftsverbindungen und Freundschaftsanfragen\n\u2022 Gruppenmitgliedschaften\n\u2022 Benachrichtigungen und Tickets\n\u2022 Hochgeladene Mediendateien (Profilbilder, Banner, Beitragsmedien)",
      "(3) Nachrichten, die der Nutzer innerhalb der Direktnachrichtenfunktion an andere Nutzer gesendet hat, werden bei Kontol\u00f6schung nicht gel\u00f6scht und bleiben f\u00fcr den jeweiligen Gespr\u00e4chspartner weiterhin sichtbar.",
      "(4) Die L\u00f6schung ist endg\u00fcltig und kann nicht r\u00fcckg\u00e4ngig gemacht werden. Ein etwaiges aktives Abonnement wird automatisch zum n\u00e4chsten Abrechnungszeitraum gek\u00fcndigt.",
      "(5) Der Anbieter ist berechtigt, das Nutzungsverh\u00e4ltnis aus wichtigem Grund fristlos zu k\u00fcndigen.",
      "(6) Bei K\u00fcndigung durch den Anbieter aufgrund von Verst\u00f6\u00dfen besteht kein Anspruch auf R\u00fcckerstattung.",
      "(7) Gesetzliche Aufbewahrungspflichten (insbesondere f\u00fcr Zahlungs- und Rechnungsdaten gem\u00e4\u00df \u00a7 147 AO) bleiben von der Kontol\u00f6schung unber\u00fchrt.",
    ].join("\n\n"),
  },
  {
    heading: "§ 15 Meldungen und Moderation",
    body: [
      "(1) Nutzer können Inhalte oder andere Nutzer melden, die gegen diese AGB verstoßen.",
      "(2) Der Anbieter prüft Meldungen und kann Inhalte entfernen oder Konten sperren.",
      "(3) Blockierte Nutzer können keine Nachrichten senden, keine Anrufe tätigen und keine Beiträge des blockierenden Nutzers sehen.",
    ].join("\n\n"),
  },
  {
    heading: "§ 16 Datenschutz",
    body: [
      "(1) Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung, die im Tab \u201eDatenschutz\u201c dieses Privacy Centers einsehbar ist.",
      "(2) Der Anbieter erhebt und speichert aggregierte, anonymisierte Plattformstatistiken (z.\u00a0B. Gesamtzahl der Nutzer, Gruppen, Events, Beiträge pro Tag, Umsatzkennzahlen). Diese Auswertungen lassen keinen Rückschluss auf einzelne Nutzer zu und dienen ausschließlich der Betriebs\u00fcberwachung und Weiterentwicklung der Plattform.",
      "(3) Es werden keine externen Analyse-, Tracking- oder Werbedienste (z.\u00a0B. Google Analytics, Facebook Pixel) eingesetzt. Es findet kein Tracking zu Werbezwecken statt und es werden keine Daten an Werbenetzwerke übermittelt.",
    ].join("\n\n"),
  },
  {
    heading: "§ 17 Änderungen der AGB",
    body: [
      "(1) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern.",
      "(2) Änderungen werden mindestens 30 Tage vor Inkrafttreten mitgeteilt.",
      "(3) Widerspricht der Nutzer nicht innerhalb von 30 Tagen, gelten die neuen AGB als angenommen.",
      "(4) Im Falle des Widerspruchs steht beiden Parteien ein Kündigungsrecht zu.",
    ].join("\n\n"),
  },
  {
    heading: "§ 18 Schlussbestimmungen",
    body: [
      "(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.",
      "(2) Ist der Nutzer Verbraucher, gelten zusätzlich die zwingenden Verbraucherschutzvorschriften seines Aufenthaltsstaates.",
      "(3) Ist der Nutzer Kaufmann, ist ausschließlicher Gerichtsstand der Sitz des Anbieters.",
      "(4) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.",
      "(5) Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr\n\nDer Anbieter ist zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder verpflichtet noch bereit.",
      "Stand: April 2026",
    ].join("\n\n"),
  },
];
