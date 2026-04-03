import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, TextInput } from "react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

interface PollCardProps {
  _id: Id<"polls">;
  question: string;
  options: string[];
  creatorName: string;
  creatorAvatarUrl?: string;
  totalVotes: number;
  voteCounts: number[];
  myVote?: number;
  isActive: boolean;
  isOwner: boolean;
  canDelete: boolean;
  createdAt: number;
  expiresAt: number;
  compact?: boolean;
}

export function PollCard({
  _id,
  question,
  options,
  creatorName,
  creatorAvatarUrl: _creatorAvatarUrl,
  totalVotes,
  voteCounts,
  myVote,
  isActive,
  isOwner,
  canDelete,
  createdAt,
  expiresAt,
  compact,
}: PollCardProps) {
  const castVote = useMutation(api.polls.vote);
  const removePoll = useMutation(api.polls.remove);
  const editPoll = useMutation(api.polls.edit);
  const hasVoted = myVote !== undefined;

  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(question);
  const [editOptions, setEditOptions] = useState(options);

  const handleVote = async (index: number) => {
    if (hasVoted || !isActive) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await castVote({ pollId: _id, optionIndex: index });
    } catch {
      /* already voted */
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    const doDelete = async () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        await removePoll({ pollId: _id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Fehler beim Löschen";
        if (Platform.OS !== "web") Alert.alert("Fehler", msg);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Umfrage löschen?")) doDelete();
    } else {
      Alert.alert(
        "Umfrage löschen",
        "Möchtest du diese Umfrage unwiderruflich löschen?",
        [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: doDelete },
        ],
      );
    }
  };

  const handleStartEdit = () => {
    setShowMenu(false);
    if (totalVotes > 0) {
      if (Platform.OS === "web") {
        alert("Umfrage hat bereits Stimmen, Bearbeiten nicht möglich");
      } else {
        Alert.alert("Nicht möglich", "Umfrage hat bereits Stimmen, Bearbeiten nicht möglich");
      }
      return;
    }
    setEditQuestion(question);
    setEditOptions([...options]);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    const cleanOptions = editOptions.map((o) => o.trim()).filter(Boolean);
    if (!editQuestion.trim() || cleanOptions.length < 2) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await editPoll({ pollId: _id, question: editQuestion, options: cleanOptions });
      setEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      if (Platform.OS !== "web") Alert.alert("Fehler", msg);
    }
  };

  const timeAgo = getTimeAgo(createdAt);
  const timeLeft = getTimeLeft(expiresAt);

  /* ── Edit mode ── */
  if (editing) {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={[styles.card, compact && styles.cardCompact]}>
        <View style={styles.header}>
          <View style={[styles.pollIcon, compact && styles.pollIconCompact]}>
            <SymbolView name="chart.bar.fill" size={compact ? 12 : 16} tintColor={colors.white} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerLabel, compact && styles.headerLabelCompact]}>Umfrage bearbeiten</Text>
          </View>
        </View>

        <TextInput
          style={styles.editInput}
          value={editQuestion}
          onChangeText={setEditQuestion}
          placeholder="Frage..."
          placeholderTextColor={colors.gray400}
          multiline
          maxLength={200}
        />

        {editOptions.map((opt, i) => (
          <View key={i} style={styles.editOptionRow}>
            <TextInput
              style={styles.editOptionInput}
              value={opt}
              onChangeText={(t) => {
                const updated = [...editOptions];
                updated[i] = t;
                setEditOptions(updated);
              }}
              placeholder={`Option ${i + 1}`}
              placeholderTextColor={colors.gray400}
              maxLength={100}
            />
            {editOptions.length > 2 && (
              <TouchableOpacity onPress={() => setEditOptions(editOptions.filter((_, j) => j !== i))}>
                <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.gray300} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {editOptions.length < 5 && (
          <TouchableOpacity
            style={styles.addOptBtn}
            onPress={() => setEditOptions([...editOptions, ""])}
          >
            <SymbolView name="plus.circle.fill" size={16} tintColor={colors.black} />
            <Text style={styles.addOptText}>Option hinzufügen</Text>
          </TouchableOpacity>
        )}

        <View style={styles.editActions}>
          <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.editCancelText}>Abbrechen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.editSaveBtn,
              (!editQuestion.trim() || editOptions.filter((o) => o.trim()).length < 2) && styles.editSaveBtnDisabled,
            ]}
            onPress={handleSaveEdit}
            disabled={!editQuestion.trim() || editOptions.filter((o) => o.trim()).length < 2}
          >
            <Text style={styles.editSaveText}>Speichern</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  /* ── Normal view ── */
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.card, compact && styles.cardCompact]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.pollIcon, compact && styles.pollIconCompact]}>
          <SymbolView name="chart.bar.fill" size={compact ? 12 : 16} tintColor={colors.white} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerLabel, compact && styles.headerLabelCompact]}>Umfrage</Text>
          {!compact && (
            <Text style={styles.headerMeta}>
              von {creatorName} · {timeAgo}
            </Text>
          )}
        </View>

        {/* Menu button */}
        {canDelete && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMenu(!showMenu);
            }}
            hitSlop={8}
          >
            <SymbolView name="ellipsis" size={16} tintColor={colors.gray400} />
          </TouchableOpacity>
        )}

        {!isActive && !canDelete && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Beendet</Text>
          </View>
        )}
      </View>

      {/* Dropdown menu */}
      {showMenu && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.menuDropdown}>
          {isOwner && isActive && totalVotes === 0 && (
            <TouchableOpacity style={styles.menuItem} onPress={handleStartEdit}>
              <SymbolView name="pencil" size={14} tintColor={colors.black} />
              <Text style={styles.menuItemText}>Bearbeiten</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItemDanger} onPress={handleDelete}>
            <SymbolView name="trash.fill" size={14} tintColor="#FF3B30" />
            <Text style={styles.menuItemTextDanger}>Löschen</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Question */}
      <Text style={[styles.question, compact && styles.questionCompact]} numberOfLines={compact ? 2 : undefined}>{question}</Text>

      {/* Options */}
      <View style={[styles.optionsWrap, compact && styles.optionsWrapCompact]}>
        {options.map((option, i) => {
          const count = voteCounts[i] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === i;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.optionBtn,
                compact && styles.optionBtnCompact,
                hasVoted && styles.optionVoted,
                isMyVote && styles.optionMyVote,
              ]}
              onPress={() => handleVote(i)}
              activeOpacity={hasVoted ? 1 : 0.65}
              disabled={hasVoted || !isActive}
            >
              {hasVoted && (
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%` },
                    isMyVote && styles.progressMyVote,
                  ]}
                />
              )}
              <Text
                style={[
                  styles.optionText,
                  compact && styles.optionTextCompact,
                  isMyVote && styles.optionTextBold,
                ]}
                numberOfLines={1}
              >
                {option}
              </Text>
              {hasVoted && (
                <View style={styles.optionRight}>
                  {isMyVote && (
                    <SymbolView name="checkmark.circle.fill" size={compact ? 12 : 14} tintColor={colors.black} />
                  )}
                  <Text style={[styles.pctText, compact && styles.pctTextCompact, isMyVote && styles.pctTextBold]}>
                    {pct}%
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer with countdown */}
      <View style={[styles.footerRow, compact && styles.footerRowCompact]}>
        <Text style={[styles.footer, compact && styles.footerCompact]}>
          {totalVotes} {totalVotes === 1 ? "Stimme" : "Stimmen"}{compact ? "" : ` · ${timeAgo}`}
        </Text>
        {isActive && timeLeft && (
          <View style={styles.expiryBadge}>
            <SymbolView name="clock" size={10} tintColor={colors.gray500} />
            <Text style={[styles.expiryText, compact && styles.expiryTextCompact]}>{timeLeft}</Text>
          </View>
        )}
        {!isActive && (
          <View style={styles.closedBadgeSmall}>
            <Text style={styles.closedTextSmall}>Beendet</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  return new Date(timestamp).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function getTimeLeft(expiresAt: number): string | null {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours} Std. ${mins} Min.`;
  return `${mins} Min.`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    padding: spacing.lg,
    borderCurve: "continuous",
  },
  cardCompact: {
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pollIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  pollIconCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  headerInfo: { flex: 1 },
  headerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.2,
  },
  headerLabelCompact: {
    fontSize: 13,
  },
  headerMeta: {
    fontSize: 12,
    color: colors.gray400,
    letterSpacing: -0.1,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  menuDropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    marginBottom: spacing.md,
    overflow: "hidden",
    boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.black,
  },
  menuItemDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemTextDanger: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF3B30",
  },
  closedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  closedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
  },
  question: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  questionCompact: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  optionsWrapCompact: {
    gap: 6,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  optionBtnCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  optionVoted: {
    backgroundColor: colors.gray100,
  },
  optionMyVote: {
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: radius.md,
  },
  progressMyVote: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    letterSpacing: -0.2,
  },
  optionTextCompact: {
    fontSize: 13,
  },
  optionTextBold: {
    fontWeight: "600",
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: spacing.sm,
  },
  pctText: {
    fontSize: 14,
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
  },
  pctTextCompact: {
    fontSize: 12,
  },
  pctTextBold: {
    fontWeight: "700",
    color: colors.black,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  footerRowCompact: {
    marginTop: spacing.sm,
  },
  footer: {
    fontSize: 12,
    color: colors.gray400,
    letterSpacing: -0.1,
  },
  footerCompact: {
    fontSize: 11,
  },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
  },
  expiryTextCompact: {
    fontSize: 10,
  },
  closedBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  closedTextSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
  },
  /* Edit mode styles */
  editInput: {
    fontSize: 15,
    color: colors.black,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: spacing.sm,
    borderCurve: "continuous",
  },
  editOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  editOptionInput: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderCurve: "continuous",
  },
  addOptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  addOptText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    alignItems: "center",
    borderCurve: "continuous",
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.black,
    alignItems: "center",
    borderCurve: "continuous",
  },
  editSaveBtnDisabled: {
    backgroundColor: colors.gray200,
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
