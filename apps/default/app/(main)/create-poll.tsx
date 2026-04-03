import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, Alert, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

type Target = "community" | "group";

export default function CreatePollScreen() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["" , ""]);
  const [target, setTarget] = useState<Target>("community");
  const [selectedGroupId, setSelectedGroupId] = useState<Id<"groups"> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const myGroups = useQuery(api.polls.myGroups);
  const createPoll = useMutation(api.polls.create);

  const addOption = () => {
    if (options.length >= 5) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const canSubmit =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2 &&
    (target === "community" || selectedGroupId !== null);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      await createPoll({
        question,
        options: cleanOptions,
        target,
        groupId: target === "group" ? (selectedGroupId ?? undefined) : undefined,
      });
      safeBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Fehler beim Erstellen";
      if (Platform.OS !== "web") Alert.alert("Fehler", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Umfrage erstellen</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Target Picker */}
          <Text style={styles.sectionLabel}>Veröffentlichen in</Text>
          <View style={styles.targetRow}>
            <TouchableOpacity
              style={[styles.targetBtn, target === "community" && styles.targetActive]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setTarget("community");
                setSelectedGroupId(null);
              }}
              activeOpacity={0.7}
            >
              <SymbolView
                name="globe"
                size={16}
                tintColor={target === "community" ? colors.white : colors.gray500}
              />
              <Text style={[styles.targetText, target === "community" && styles.targetTextActive]}>
                Z Community
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.targetBtn, target === "group" && styles.targetActive]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync();
                setTarget("group");
              }}
              activeOpacity={0.7}
            >
              <SymbolView
                name="person.3.fill"
                size={16}
                tintColor={target === "group" ? colors.white : colors.gray500}
              />
              <Text style={[styles.targetText, target === "group" && styles.targetTextActive]}>
                In Gruppe
              </Text>
            </TouchableOpacity>
          </View>

          {/* Group Picker */}
          {target === "group" && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <Text style={styles.sectionLabel}>Gruppe auswählen</Text>
              <View style={styles.groupList}>
                {(!myGroups || myGroups.length === 0) && (
                  <Text style={styles.noGroups}>Du bist noch keiner Gruppe beigetreten.</Text>
                )}
                {myGroups?.map((g: { _id: Id<"groups">; name: string }) => (
                  <TouchableOpacity
                    key={g._id}
                    style={[
                      styles.groupChip,
                      selectedGroupId === g._id && styles.groupChipActive,
                    ]}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                      setSelectedGroupId(g._id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        selectedGroupId === g._id && styles.groupChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Question */}
          <Text style={styles.sectionLabel}>Frage</Text>
          <TextInput
            style={styles.questionInput}
            placeholder="Stelle deine Frage…"
            placeholderTextColor={colors.gray400}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={200}
          />

          {/* Options */}
          <Text style={styles.sectionLabel}>Auswahlmöglichkeiten (2–5)</Text>
          <Animated.View layout={LinearTransition.duration(200)} style={styles.optionsWrap}>
            {options.map((opt, i) => (
              <Animated.View
                key={`opt-${i}`}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                layout={LinearTransition.duration(200)}
                style={styles.optionRow}
              >
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.gray400}
                  value={opt}
                  onChangeText={(t) => updateOption(i, t)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(i)} style={styles.removeBtn}>
                    <SymbolView name="xmark.circle.fill" size={20} tintColor={colors.gray300} />
                  </TouchableOpacity>
                )}
              </Animated.View>
            ))}
          </Animated.View>

          {options.length < 5 && (
            <TouchableOpacity style={styles.addOptionBtn} onPress={addOption} activeOpacity={0.7}>
              <SymbolView name="plus.circle.fill" size={18} tintColor={colors.black} />
              <Text style={styles.addOptionText}>Option hinzufügen</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.7}
        >
          <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
            {submitting ? "Erstellen…" : "Umfrage veröffentlichen"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    letterSpacing: -0.1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: "uppercase",
  },

  /* Target */
  targetRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  targetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  targetActive: {
    backgroundColor: colors.black,
  },
  targetText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
    letterSpacing: -0.2,
  },
  targetTextActive: {
    color: colors.white,
  },

  /* Groups */
  groupList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    borderCurve: "continuous",
  },
  groupChipActive: {
    backgroundColor: colors.black,
  },
  groupChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.black,
    letterSpacing: -0.2,
  },
  groupChipTextActive: {
    color: colors.white,
  },
  noGroups: {
    fontSize: 14,
    color: colors.gray400,
    fontStyle: "italic",
  },

  /* Question */
  questionInput: {
    fontSize: 17,
    color: colors.black,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: "top",
    letterSpacing: -0.2,
    borderCurve: "continuous",
  },

  /* Options */
  optionsWrap: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionInput: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    letterSpacing: -0.2,
    borderCurve: "continuous",
  },
  removeBtn: {
    padding: 4,
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  addOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
    letterSpacing: -0.2,
  },

  /* Submit */
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  submitBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    borderCurve: "continuous",
  },
  submitBtnDisabled: {
    backgroundColor: colors.gray200,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.2,
  },
  submitTextDisabled: {
    color: colors.gray400,
  },
});
