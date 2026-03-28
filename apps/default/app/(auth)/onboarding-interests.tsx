import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { INTERESTS } from "@/lib/constants";

export default function OnboardingInterestsScreen() {
  const params = useLocalSearchParams<{ county: string; city: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const toggle = (interest: string) => {
    setSelected(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        county: params.county || undefined,
        city: params.city || undefined,
        interests: selected,
      });
      router.replace("/");
    } catch (_e) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "100%" }]} />
        </View>
        <Text style={styles.step}>Schritt 3 von 3</Text>
        <Text style={styles.title}>Wähle deine Interessen</Text>
        <Text style={styles.subtitle}>{selected.length} ausgewählt • Wähle mindestens 3</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.chipContainer}>
          {INTERESTS.map(interest => (
            <TouchableOpacity
              key={interest}
              style={[styles.chip, selected.includes(interest) && styles.chipSelected]}
              onPress={() => toggle(interest)}
            >
              <Text style={[styles.chipText, selected.includes(interest) && styles.chipTextSelected]}>
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title="Fertig"
          onPress={handleComplete}
          loading={loading}
          disabled={selected.length < 3}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  progress: { height: 4, backgroundColor: colors.gray200, borderRadius: 2, marginBottom: spacing.lg },
  progressBar: { height: 4, backgroundColor: colors.black, borderRadius: 2 },
  step: { fontSize: 14, color: colors.gray400, marginBottom: spacing.xs },
  title: { fontSize: 28, fontWeight: "700", color: colors.black, marginBottom: spacing.xs },
  subtitle: { fontSize: 15, color: colors.gray500, marginBottom: spacing.md },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 120 },
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xxl,
    paddingBottom: 40,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
});
