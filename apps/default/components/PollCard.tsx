import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
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
  createdAt: number;
}

export function PollCard({
  _id,
  question,
  options,
  creatorName,
  _creatorAvatarUrl,
  totalVotes,
  voteCounts,
  myVote,
  isActive,
  createdAt,
}: PollCardProps) {
  const castVote = useMutation(api.polls.vote);
  const hasVoted = myVote !== undefined;

  const handleVote = async (index: number) => {
    if (hasVoted || !isActive) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await castVote({ pollId: _id, optionIndex: index });
    } catch {
      /* already voted */
    }
  };

  const timeAgo = getTimeAgo(createdAt);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.pollIcon}>
          <SymbolView name="chart.bar.fill" size={16} tintColor={colors.white} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>Umfrage</Text>
          <Text style={styles.headerMeta}>
            von {creatorName} · {timeAgo}
          </Text>
        </View>
        {!isActive && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Beendet</Text>
          </View>
        )}
      </View>

      {/* Question */}
      <Text style={styles.question}>{question}</Text>

      {/* Options */}
      <View style={styles.optionsWrap}>
        {options.map((option, i) => {
          const count = voteCounts[i] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === i;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.optionBtn,
                hasVoted && styles.optionVoted,
                isMyVote && styles.optionMyVote,
              ]}
              onPress={() => handleVote(i)}
              activeOpacity={hasVoted ? 1 : 0.65}
              disabled={hasVoted || !isActive}
            >
              {/* Progress bar fill */}
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
                  isMyVote && styles.optionTextBold,
                ]}
                numberOfLines={2}
              >
                {option}
              </Text>
              {hasVoted && (
                <View style={styles.optionRight}>
                  {isMyVote && (
                    <SymbolView name="checkmark.circle.fill" size={14} tintColor={colors.black} />
                  )}
                  <Text style={[styles.pctText, isMyVote && styles.pctTextBold]}>
                    {pct}%
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {totalVotes} {totalVotes === 1 ? "Stimme" : "Stimmen"}
      </Text>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    padding: spacing.lg,
    borderCurve: "continuous",
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
  headerInfo: { flex: 1 },
  headerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.2,
  },
  headerMeta: {
    fontSize: 12,
    color: colors.gray400,
    letterSpacing: -0.1,
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
  optionsWrap: {
    gap: spacing.sm,
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
  pctTextBold: {
    fontWeight: "700",
    color: colors.black,
  },
  footer: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: spacing.md,
    letterSpacing: -0.1,
  },
});
