import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";

/* ─── Structured legal content ─── */

interface Section {
  heading?: string;
  body: string;
}

interface LegalPage {
  title: string;
  sections: Section[];
}

const CONTENT: Record<string, LegalPage> = {
  imprint: {
    title: "Impressum",
    sections: [
      {
        heading: "Angaben gemäß § 5 TMG",
        body: "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstraße 3\n87463 Dietmannsried\nDeutschland",
      },
      {
        heading: "E-Mail",
        body: "leif@z-social.com",
      },
      {
        heading: "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV",
        body: "Leif Dunkelmann\nc/o MDC Management #4560\nWelserstraße 3\n87463 Dietmannsried",
      },
    ],
  },

  privacy: {
    title: "Datenschutzerklärung",
    sections: [
      {
        heading: "1. Allgemeine Hinweise",
        body: "Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. In dieser Datenschutzerklärung informieren wir Sie darüber, welche Daten bei der Nutzung der Z App erhoben, verarbeitet und gespeichert werden.\n\nDie Verarbeitung Ihrer personenbezogenen Daten erfolgt gemäß den geltenden Datenschutzvorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO).",
      },
      {
        heading: "2. Verantwortlicher",
        body: "Verantwortlicher für die Datenverarbeitung:\n\nLeif Dunkelmann\nc/o MDC Management #4560\nWelserstraße 3\n87463 Dietmannsried\nDeutschland\n\nE-Mail: leif@z-social.com",
      },
      {
        heading: "3. Daten, die bei der Nutzung der App erhoben werden",
        body: "Bei der Nutzung der Z App können folgende Daten erhoben werden:",
      },
      {
        heading: "Registrierungsdaten",
        body: "Bei der Erstellung eines Accounts:\n\n• E-Mail-Adresse\n• Benutzername\n• Profilbild\n• Standort (z. B. Stadt oder Landkreis)\n• Ausgewählte Interessen\n\nDiese Daten sind erforderlich, um Ihr Nutzerkonto zu erstellen und Ihnen die Nutzung der App zu ermöglichen.",
      },
      {
        heading: "Profildaten",
        body: "Innerhalb Ihres Profils können freiwillig weitere Angaben gemacht werden:\n\n• Profilbild\n• Bannerbild\n• Interessen\n• Beiträge\n• Gruppenmitgliedschaften\n\nDiese Informationen sind für andere Nutzer der App sichtbar, sofern Sie diese veröffentlichen.",
      },
      {
        heading: "Nutzungsdaten",
        body: "Bei der Nutzung der App werden technische Daten erhoben, z. B.:\n\n• App-Aktivität\n• Interaktionen mit Beiträgen\n• Gruppenbeitritte\n• Chat-Nutzung\n• Eventteilnahmen\n• Hochgeladene Inhalte\n\nDiese Daten dienen der Verbesserung der Funktionalität und Sicherheit der App.",
      },
      {
        heading: "Medieninhalte",
        body: "Wenn Sie Inhalte hochladen, werden folgende Daten verarbeitet:\n\n• Fotos\n• Videos\n• Profilbilder\n• Gruppen-Thumbnails\n\nDiese Inhalte werden gespeichert, um sie innerhalb der Community anzuzeigen.",
      },
      {
        heading: "Kommunikationsdaten",
        body: "Wenn Sie Chatfunktionen nutzen:\n\n• Nachrichten\n• Sprachnachrichten\n• Gesendete Medien\n\nDiese Daten werden verarbeitet, um die Kommunikation zwischen Nutzern zu ermöglichen.",
      },
      {
        heading: "Event- und Ticketdaten",
        body: "Wenn Sie an Events teilnehmen oder Tickets kaufen:\n\n• Ticketkäufe\n• Eventteilnahmen\n• QR-Codes zur Eventverifikation\n\nDiese Daten werden verarbeitet, um Events zu organisieren und den Zugang zu Veranstaltungen zu ermöglichen.",
      },
      {
        heading: "4. Zahlungsabwicklung",
        body: "Für die Abwicklung von Zahlungen (z. B. App-Abonnements oder Eventtickets) nutzen wir externe Zahlungsanbieter wie:\n\n• Stripe\n• Apple Pay\n• Google Pay\n\nBei einer Zahlung werden Zahlungsdaten direkt an den jeweiligen Zahlungsanbieter übermittelt. Die Verarbeitung erfolgt gemäß den Datenschutzbestimmungen des jeweiligen Anbieters.",
      },
      {
        heading: "5. Push-Benachrichtigungen",
        body: "Die Z App kann Push-Benachrichtigungen senden, z. B. bei:\n\n• Neuen Nachrichten\n• Gruppenaktivitäten\n• Event-Erinnerungen\n• App-Ankündigungen\n\nPush-Benachrichtigungen können jederzeit in den Geräteeinstellungen deaktiviert werden.",
      },
      {
        heading: "6. Verwendung von Standortdaten",
        body: "Die App kann Standortinformationen verwenden, um:\n\n• Gruppen in Ihrer Nähe anzuzeigen\n• Lokale Events anzuzeigen\n• Inhalte regional zu filtern\n\nDie Nutzung dieser Daten erfolgt ausschließlich zur Bereitstellung der App-Funktionen.",
      },
      {
        heading: "7. Weitergabe von Daten",
        body: "Eine Weitergabe Ihrer personenbezogenen Daten erfolgt nur:\n\n• Wenn dies zur Erfüllung der App-Funktionen notwendig ist\n• Wenn gesetzliche Verpflichtungen bestehen\n• Wenn Sie ausdrücklich eingewilligt haben\n\nEine kommerzielle Weitergabe Ihrer Daten an Dritte findet nicht statt.",
      },
      {
        heading: "8. Speicherung der Daten",
        body: "Ihre Daten werden nur so lange gespeichert, wie dies für den Betrieb der App erforderlich ist.\n\nBei Löschung Ihres Accounts werden Ihre personenbezogenen Daten grundsätzlich gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.",
      },
      {
        heading: "9. Rechte der Nutzer",
        body: "Sie haben das Recht:\n\n• Auskunft über Ihre gespeicherten Daten zu erhalten\n• Die Berichtigung falscher Daten zu verlangen\n• Die Löschung Ihrer Daten zu verlangen\n• Die Einschränkung der Verarbeitung zu verlangen\n• Der Datenverarbeitung zu widersprechen\n• Ihre Daten übertragen zu lassen\n\nAnfragen können jederzeit an folgende E-Mail-Adresse gestellt werden:\nleif@z-social.com",
      },
      {
        heading: "10. Datensicherheit",
        body: "Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten vor Verlust, Manipulation oder unberechtigtem Zugriff zu schützen.",
      },
      {
        heading: "11. Änderungen dieser Datenschutzerklärung",
        body: "Wir behalten uns vor, diese Datenschutzerklärung anzupassen, wenn neue Funktionen der App dies erforderlich machen.\n\nDie jeweils aktuelle Version ist jederzeit innerhalb der App einsehbar.",
      },
      {
        heading: "12. Kontakt",
        body: "Bei Fragen zum Datenschutz können Sie uns jederzeit kontaktieren:\n\nleif@z-social.com",
      },
    ],
  },

  terms: {
    title: "AGB",
    sections: [
      {
        heading: "1. Geltungsbereich",
        body: "Diese AGB gelten für die Nutzung der Z App.",
      },
      {
        heading: "2. Registrierung",
        body: "Die Nutzung setzt eine Registrierung und ein aktives Abonnement voraus.",
      },
      {
        heading: "3. Nutzungsbedingungen",
        body: "• Respektvoller Umgang\n• Keine rechtswidrigen Inhalte\n• Keine Spam-Nachrichten\n• Keine Manipulation der App",
      },
      {
        heading: "4. Abonnement",
        body: "• Monatlich oder jährlich kündbar\n• Kündigung jederzeit möglich\n• Keine Rückerstattung für angebrochene Zeiträume",
      },
      {
        heading: "5. Haftung",
        body: "Wir haften nicht für nutzergenerierte Inhalte.",
      },
      {
        heading: "6. Sperrung",
        body: "Bei Verstoß gegen diese AGB kann das Konto gesperrt werden.",
      },
      {
        body: "Kontakt: leif@z-social.com",
      },
    ],
  },
};

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const page = CONTENT[type ?? "imprint"] ?? CONTENT.imprint;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("legal")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{page.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={styles.pageTitle}>{page.title} – Z App</Text>

        {page.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.heading && (
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            )}
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.footerText}>Z App · {new Date().getFullYear()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 60 },

  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },

  section: {
    marginTop: spacing.xl,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    color: colors.gray700,
    lineHeight: 24,
    letterSpacing: -0.1,
  },

  footer: {
    marginTop: spacing.xxxl,
    alignItems: "center",
    gap: spacing.md,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gray200,
  },
  footerText: {
    fontSize: 12,
    color: colors.gray400,
  },
});
