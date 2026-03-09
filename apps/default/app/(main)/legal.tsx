import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors, spacing } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

const CONTENT: Record<string, { title: string; text: string }> = {
  imprint: {
    title: "Impressum",
    text: "Z Social\nApp f\u00fcr Mecklenburg-Vorpommern\n\nKontakt: live@z-social.com\n\nVerantwortlich f\u00fcr den Inhalt nach \u00a7 55 Abs. 2 RStV:\nZ Social UG\nSchwerin, Deutschland\n\nRegistergericht: Amtsgericht Schwerin\nUSt-IdNr.: DE[pending]\n\nHaftungshinweis: Trotz sorgf\u00e4ltiger inhaltlicher Kontrolle \u00fcbernehmen wir keine Haftung f\u00fcr die Inhalte externer Links. F\u00fcr den Inhalt der verlinkten Seiten sind ausschlie\u00dflich deren Betreiber verantwortlich.",
  },
  privacy: {
    title: "Datenschutzerkl\u00e4rung",
    text: "Datenschutz\n\nDie Betreiber dieser App nehmen den Schutz Ihrer pers\u00f6nlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerkl\u00e4rung.\n\nDatenerhebung:\n\u2022 Registrierungsdaten (Name, E-Mail)\n\u2022 Profilinformationen\n\u2022 Nutzungsdaten\n\u2022 Standortdaten (wenn erlaubt)\n\nDatenverarbeitung:\nIhre Daten werden zur Bereitstellung der App-Funktionen verarbeitet und nicht an Dritte verkauft.\n\nIhre Rechte:\n\u2022 Auskunft\n\u2022 Berichtigung\n\u2022 L\u00f6schung\n\u2022 Einschr\u00e4nkung der Verarbeitung\n\u2022 Daten\u00fcbertragbarkeit\n\u2022 Widerspruch\n\nKontakt: live@z-social.com",
  },
  terms: {
    title: "AGB",
    text: "Allgemeine Gesch\u00e4ftsbedingungen\n\n1. Geltungsbereich\nDiese AGB gelten f\u00fcr die Nutzung der Z App.\n\n2. Registrierung\nDie Nutzung setzt eine Registrierung und ein aktives Abonnement voraus.\n\n3. Nutzungsbedingungen\n\u2022 Respektvoller Umgang\n\u2022 Keine rechtswidrigen Inhalte\n\u2022 Keine Spam-Nachrichten\n\u2022 Keine Manipulation der App\n\n4. Abonnement\n\u2022 Monatlich oder j\u00e4hrlich k\u00fcndbar\n\u2022 K\u00fcndigung jederzeit m\u00f6glich\n\u2022 Keine R\u00fcckerstattung f\u00fcr angebrochene Zeitr\u00e4ume\n\n5. Haftung\nWir haften nicht f\u00fcr nutzergenerierte Inhalte.\n\n6. Sperrung\nBei Versto\u00df gegen diese AGB kann das Konto gesperrt werden.\n\nKontakt: live@z-social.com",
  },
};

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const page = CONTENT[type ?? "imprint"] ?? CONTENT.imprint;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>{page.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.body}>{page.text}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  body: { fontSize: 15, color: colors.gray700, lineHeight: 24 },
});
