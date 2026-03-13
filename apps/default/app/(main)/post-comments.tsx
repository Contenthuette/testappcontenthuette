import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function PostCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const me = useQuery(api.users.me);
  const comments = useQuery(
    api.posts.getComments,
    id ? { postId: id as Id<"posts">, currentUserId: me?._id } : "skip"
  );
  const addComment = useMutation(api.posts.addComment);
  const toggleCommentLike = useMutation(api.posts.toggleCommentLike);

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText("");
    await addComment({ postId: id as Id<"posts">, text: msg });
  };

  const handleToggleLike = async (commentId: Id<"comments">) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleCommentLike({ commentId });
  };

  return (
    <View style={styles.container}>
      {/* Grabber handle */}
      <View style={styles.grabberRow}>
        <View style={styles.grabber} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Kommentare</Text>
      </View>

      {/* Comments list */}
      <FlatList
        style={styles.listFlex}
        data={comments}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={34} />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{item.authorName}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
              <View style={styles.commentMeta}>
                <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                {item.likeCount > 0 && (
                  <Text style={styles.commentLikeCount}>
                    {item.likeCount} {item.likeCount === 1 ? "Like" : "Likes"}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.likeBtn}
              onPress={() => handleToggleLike(item._id)}
              hitSlop={12}
            >
              <SymbolView
                name={item.isLiked ? "heart.fill" : "heart"}
                size={16}
                tintColor={item.isLiked ? "#FF3B30" : colors.gray400}
              />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          comments === undefined ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Noch keine Kommentare</Text>
              <Text style={styles.emptySub}>Sei der Erste!</Text>
            </View>
          )
        }
      />

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TextInput
            style={styles.input}
            placeholder="Kommentar schreiben..."
            placeholderTextColor={colors.gray400}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          {text.trim().length > 0 && (
            <TouchableOpacity onPress={handleSend} hitSlop={8}>
              <View style={styles.sendBtn}>
                <SymbolView name="arrow.up" size={14} tintColor={colors.white} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} Std.`;
  return `${Math.floor(hrs / 24)} T.`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  grabberRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray300,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
    textAlign: "center",
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: "600", color: colors.gray500 },
  emptySub: { fontSize: 13, color: colors.gray400, marginTop: 4 },

  commentRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    alignItems: "flex-start",
  },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 14, fontWeight: "600", color: colors.black },
  commentText: { fontSize: 14, color: colors.gray700, lineHeight: 20, marginTop: 2 },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  commentTime: { fontSize: 12, color: colors.gray400 },
  commentLikeCount: { fontSize: 12, fontWeight: "600", color: colors.gray500 },
  likeBtn: {
    paddingTop: 4,
    paddingLeft: 8,
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.black,
    maxHeight: 100,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
