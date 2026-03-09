import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function OnboardingProfileScreen() {
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<string>("");
  const [birthDate, setBirthDate] = useState("");

  const genderOptions = [
    { value: "male", label: "Männlich" },
    { value: "female", label: "Weiblich" },
    { value: "other", label: "Divers" },
    { value: "prefer_not_to_say", label: "Keine Angabe" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "33%" }]} />
        </View>

        <Text style={styles.step}>Schritt 1 von 3</Text>
        <Text style={styles.title}>Erzähl uns etwas über dich</Text>
        <Text style={styles.subtitle}>Diese Infos helfen dir, die richtigen Leute zu finden.</Text>

        <Text style={styles.label}>Geschlecht</Text>
        <View style={styles.optionRow}>
          {genderOptions.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionChip, gender === opt.value && styles.optionChipSelected]}
              onPress={() => setGender(opt.value)}
            >
              <Text style={[styles.optionText, gender === opt.value && styles.optionTextSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Geburtsdatum" placeholder="TT.MM.JJJJ" value={birthDate}
          onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" />

        <Input label="Über mich" placeholder="Kurze Bio..." value={bio}
          onChangeText={setBio} multiline numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }} />

        <Button title="Weiter" onPress={() => router.push("/(auth)/onboarding-location")} fullWidth style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  progress: { height: 4, backgroundColor: colors.gray200, borderRadius: 2, marginTop: spacing.xxl, marginBottom: spacing.xxl },
  progressBar: { height: 4, backgroundColor: colors.black, borderRadius: 2 },
  step: { fontSize: 14, color: colors.gray400, marginBottom: spacing.xs },
  title: { fontSize: 28, fontWeight: "700", color: colors.black, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.gray500, marginBottom: spacing.xxl, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "500", color: colors.gray700, marginBottom: spacing.sm },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  optionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  optionChipSelected: { backgroundColor: colors.black, borderColor: colors.black },
  optionText: { fontSize: 14, color: colors.gray700 },
  optionTextSelected: { color: colors.white, fontWeight: "600" },
});
