import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { COUNTIES, CITIES } from "@/lib/constants";

export default function OnboardingLocationScreen() {
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "50%" }]} />
        </View>

        <Text style={styles.step}>Schritt 2 von 4</Text>
        <Text style={styles.title}>Wo bist du in MV?</Text>
        <Text style={styles.subtitle}>Wähle deinen Landkreis und deine Stadt</Text>

        <Text style={styles.label}>Landkreis</Text>
        <View style={styles.chipContainer}>
          {COUNTIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, county === c && styles.chipSelected]}
              onPress={() => setCounty(c)}
            >
              <Text style={[styles.chipText, county === c && styles.chipTextSelected]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Stadt</Text>
        <View style={styles.chipContainer}>
          {CITIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, city === c && styles.chipSelected]}
              onPress={() => setCity(c)}
            >
              <Text style={[styles.chipText, city === c && styles.chipTextSelected]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Weiter"
          onPress={() => router.navigate({ pathname: "/(auth)/onboarding-interests", params: { county, city } })}
          fullWidth
          style={{ marginTop: spacing.xl }}
        />
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
  subtitle: { fontSize: 16, color: colors.gray500, marginBottom: spacing.xxl },
  label: { fontSize: 14, fontWeight: "500", color: colors.gray700, marginBottom: spacing.sm, marginTop: spacing.lg },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 13, color: colors.gray700 },
  chipTextSelected: { color: colors.white, fontWeight: "600" },
});
