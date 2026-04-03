import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";
import { INTERESTS } from "@/lib/constants";

export default function OnboardingInterestsScreen() {
  const params = useLocalSearchParams<{ county: string; city: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const createInterest = useMutation(api.communityInterests.create);
  const communityResults = useQuery(
    api.communityInterests.search,
    searchQuery.trim().length >= 2 ? { query: searchQuery.trim() } : "skip",
  );

  const toggle = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
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

  // Merge preset interests with search results
  const presetSet = new Set<string>(INTERESTS);

  // Filtered preset list based on search
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [...INTERESTS];
    return INTERESTS.filter((i) => i.toLowerCase().includes(q));
  }, [searchQuery]);

  // Community interests not already in preset
  const communityExtras = useMemo(() => {
    if (!communityResults) return [];
    return communityResults.filter(
      (ci: { _id: string; name: string; usageCount: number }) => !presetSet.has(ci.name) && !selected.includes(ci.name),
    );
  }, [communityResults, selected]);

  const hasSearchResults = filteredPresets.length > 0 || communityExtras.length > 0;
  const showCreateOption =
    searchQuery.trim().length >= 2 &&
    !filteredPresets.some((p) => p.toLowerCase() === searchQuery.trim().toLowerCase()) &&
    !communityExtras.some((c: { name: string }) => c.name.toLowerCase() === searchQuery.trim().toLowerCase()) &&
    !selected.some((s) => s.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "75%" }]} />
        </View>
        <Text style={styles.step}>Schritt 3 von 4</Text>
        <Text style={styles.title}>Wähle deine Interessen</Text>
        <Text style={styles.subtitle}>
          Wähle mindestens 3 Interessen aus
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <SymbolView name="magnifyingglass" size={16} tintColor={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Interesse suchen oder erstellen..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            maxLength={40}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <SymbolView name="xmark.circle.fill" size={16} tintColor={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected count */}
        {selected.length > 0 && (
          <Text style={styles.selectedCount}>
            {selected.length} ausgewählt
          </Text>
        )}

        {/* Selected tags */}
        {selected.length > 0 && (
          <View style={styles.selectedSection}>
            <View style={styles.chipContainer}>
              {selected.map((tag) => (
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

        {/* Create custom option */}
        {showCreateOption && (
          <TouchableOpacity
            style={styles.createOption}
            onPress={async () => {
              const name = searchQuery.trim();
              if (!selected.includes(name)) {
                setSelected((prev) => [...prev, name]);
                try { await createInterest({ name }); } catch {}
              }
              setSearchQuery("");
              Keyboard.dismiss();
            }}
          >
            <SymbolView name="plus.circle.fill" size={20} tintColor={colors.black} />
            <Text style={styles.createOptionText}>
              "{searchQuery.trim()}" erstellen
            </Text>
          </TouchableOpacity>
        )}

        {/* Community interests from search */}
        {communityExtras.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>Community Interessen</Text>
            <View style={styles.chipContainer}>
              {communityExtras.map((ci: { _id: string; name: string; usageCount: number }) => (
                <TouchableOpacity
                  key={ci._id}
                  style={[styles.chip, selected.includes(ci.name) && styles.chipSelected]}
                  onPress={() => toggle(ci.name)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected.includes(ci.name) && styles.chipTextSelected,
                    ]}
                  >
                    {ci.name}
                  </Text>
                  {ci.usageCount > 1 && (
                    <Text style={styles.usageCount}>{ci.usageCount}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Preset chips */}
        {filteredPresets.length > 0 && (
          <View style={styles.chipContainer}>
            {filteredPresets.map((interest) => (
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
        )}

        {/* No results */}
        {searchQuery.trim().length >= 2 && !hasSearchResults && !showCreateOption && (
          <View style={styles.emptyState}>
            <SymbolView name="magnifyingglass" size={32} tintColor={colors.gray300} />
            <Text style={styles.emptyText}>Keine Interessen gefunden</Text>
          </View>
        )}
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
    marginBottom: spacing.sm,
  },

  /* Search */
  searchRow: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
  },

  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 120 },

  selectedCount: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray400,
    marginBottom: spacing.sm,
  },
  selectedSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },

  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  /* Create option */
  createOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.gray50,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  createOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.black,
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
  usageCount: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: "600",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray400,
  },

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
