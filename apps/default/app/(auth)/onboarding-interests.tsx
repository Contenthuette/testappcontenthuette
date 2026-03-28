import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";
import { INTERESTS } from "@/lib/constants";

export default function OnboardingInterestsScreen() {
  const params = useLocalSearchParams<{ county: string; city: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  const toggle = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    // Avoid duplicates (case-insensitive)
    const already = selected.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!already) {
      setSelected((prev) => [...prev, trimmed]);
    }
    setCustomInput("");
    Keyboard.dismiss();
  };

  const handleNext = () => {
    router.push({
      pathname: "/(auth)/onboarding-notifications",
      params: {
        county: params.county || "",
        city: params.city || "",
        interests: selected.join(","),
      },
    });
  };

  // Split into preset vs. custom
  const presetSet = new Set<string>(INTERESTS);
  const customTags = selected.filter((s) => !presetSet.has(s));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "75%" }]} />
        </View>
        <Text style={styles.step}>Schritt 3 von 4</Text>
        <Text style={styles.title}>W\u00e4hle deine Interessen</Text>
        <Text style={styles.subtitle}>
          {selected.length} ausgew\u00e4hlt \u2022 W\u00e4hle mindestens 3
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Custom input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Eigenes Interesse hinzuf\u00fcgen\u2026"
            placeholderTextColor={colors.gray400}
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={addCustom}
            returnKeyType="done"
            maxLength={30}
          />
          <TouchableOpacity
            style={[
              styles.addBtn,
              !customInput.trim() && styles.addBtnDisabled,
            ]}
            onPress={addCustom}
            disabled={!customInput.trim()}
            activeOpacity={0.7}
          >
            <SymbolView
              name="plus"
              size={16}
              tintColor={customInput.trim() ? colors.white : colors.gray400}
            />
          </TouchableOpacity>
        </View>

        {/* Custom tags */}
        {customTags.length > 0 && (
          <View style={styles.customSection}>
            <Text style={styles.customLabel}>Deine Interessen</Text>
            <View style={styles.chipContainer}>
              {customTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, styles.chipSelected]}
                  onPress={() => toggle(tag)}
                >
                  <Text style={[styles.chipText, styles.chipTextSelected]}>
                    {tag}
                  </Text>
                  <SymbolView name="xmark" size={10} tintColor={colors.white} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Preset chips */}
        <View style={styles.chipContainer}>
          {INTERESTS.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.chip,
                selected.includes(interest) && styles.chipSelected,
              ]}
              onPress={() => toggle(interest)}
            >
              <Text
                style={[
                  styles.chipText,
                  selected.includes(interest) && styles.chipTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Weiter"
          onPress={handleNext}
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
  progress: {
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  progressBar: { height: 4, backgroundColor: colors.black, borderRadius: 2 },
  step: { fontSize: 14, color: colors.gray400, marginBottom: spacing.xs },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 120 },

  /* Custom input */
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.gray50,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: {
    backgroundColor: colors.gray100,
  },

  /* Custom section */
  customSection: {
    marginBottom: spacing.lg,
  },
  customLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  /* Chips */
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    borderCurve: "continuous",
  },
  chipSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
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
