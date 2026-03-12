import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ShareSheet } from "@/components/ShareSheet";

const FEED_ASPECT = 3 / 4;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useQuery(
    api.posts.getById,
    id ? { postId: id as Id<"posts"> } : "skip",
  );
  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const { width: screenWidth } = useWindowDimensions();
  const [shareVisible, setShareVisible] = useState(false);

  const feedMediaHeight = screenWidth / FEED_ASPECT;

  if (post === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      </SafeAreaView>
    );
  }

  if (post === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("post-detail")} style={styles.backBtn}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Beitrag</Text>
        </View>
        <View style={styles.emptyWrap}>
          <SymbolView name="photo" size={40} tintColor={colors.gray300} />
          <Text style={styles.emptyText}>Beitrag nicht gefunden</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOriginal = post.aspectMode === "original";
  const isVideo = post.type === "video";

  const getVideoNativeHeight = () => {
    const ar = post.mediaAspectRatio ?? 9 / 16;
    return screenWidth / ar;
  };

  const getCropTranslateY = () => {
    const nativeHeight = getVideoNativeHeight();
    const overflow = Math.max(0, nativeHeight - feedMediaHeight);
    const offset = post.cropOffsetY ?? 0.5;
    return -offset * overflow;
  };

  const renderMedia = () => {
    if (!post.mediaUrl) return null;

    if (isVideo) {
      if (isOriginal) {
        return (
          <View style={[styles.mediaContainer, { width: screenWidth, height: feedMediaHeight }]}>
            <VideoPlayer
              uri={post.mediaUrl}
              height={feedMediaHeight}
              width={screenWidth}
              autoPlay
              loop
              hideControls
              isVisible
              contentFit="contain"
            />
          </View>
        );
      }
      const nativeHeight = getVideoNativeHeight();
      const translateY = getCropTranslateY();
      return (
        <View style={[styles.mediaCropped, { width: screenWidth, height: feedMediaHeight }]}>
          <View style={{ transform: [{ translateY }] }}>
            <VideoPlayer
              uri={post.mediaUrl}
              height={nativeHeight}
              width={screenWidth}
              autoPlay
              loop
              hideControls
              isVisible
            />
          </View>
        </View>
      );
    }

    if (isOriginal) {
      return (
        <View style={[styles.mediaContainer, { width: screenWidth, height: feedMediaHeight }]}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={{ width: screenWidth, height: feedMediaHeight }}
            contentFit="contain"
            transition={200}
          />
        </View>
      );
    }

    return (
      <Image
        source={{ uri: post.mediaUrl }}
        style={[styles.postImage, { width: screenWidth, height: feedMediaHeight }]}
        contentFit="cover"
        contentPosition={{ top: `${(post.cropOffsetY ?? 0.5) * 100}%` }}
        transition={200}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("post-detail")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beitrag</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Author */}
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() =>
            router.push({
              pathname: "/(main)/user-profile",
              params: { id: post.authorId },
            })
          }
          activeOpacity={0.7}
        >
          <Avatar uri={post.authorAvatarUrl} name={post.authorName} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <Text style={styles.postTime}>{formatTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Media */}
        {renderMedia()}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleLike({ postId: post._id })}
            hitSlop={8}
          >
            <SymbolView
              name={post.isLiked ? "heart.fill" : "heart"}
              size={24}
              tintColor={post.isLiked ? colors.danger : colors.black}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push({
                pathname: "/(main)/post-comments",
                params: { id: post._id },
              })
            }
            hitSlop={8}
          >
            <SymbolView name="bubble.right" size={24} tintColor={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShareVisible(true)}
            hitSlop={8}
          >
            <SymbolView name="paperplane" size={24} tintColor={colors.black} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => toggleSave({ postId: post._id })} hitSlop={8}>
            <SymbolView
              name={post.isSaved ? "bookmark.fill" : "bookmark"}
              size={24}
              tintColor={colors.black}
            />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        {post.likeCount > 0 && (
          <Text style={styles.likeCount}>
            {post.likeCount} {post.likeCount === 1 ? "Like" : "Likes"}
          </Text>
        )}

        {/* Caption */}
        {post.caption ? (
          <Text style={styles.captionRow}>
            <Text style={styles.captionAuthor}>{post.authorName} </Text>
            <Text style={styles.captionText}>{post.caption}</Text>
          </Text>
        ) : null}

        {/* Comments link */}
        {post.commentCount > 0 && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(main)/post-comments",
                params: { id: post._id },
              })
            }
          >
            <Text style={styles.viewComments}>
              Alle {post.commentCount} Kommentare ansehen
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <ShareSheet
        visible={shareVisible}
        postId={post._id}
        onClose={() => setShareVisible(false)}
      />
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `vor ${days} T.`;
  return new Date(ts).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, color: colors.gray400 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  authorName: { fontSize: 15, fontWeight: "600", color: colors.black },
  postTime: { fontSize: 12, color: colors.gray400 },

  mediaContainer: {
    backgroundColor: colors.gray100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCropped: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
  postImage: {
    backgroundColor: colors.gray100,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  actionBtn: { padding: 2 },
  likeCount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  captionRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    lineHeight: 20,
  },
  captionAuthor: { fontSize: 14, fontWeight: "600", color: colors.black },
  captionText: { fontSize: 14, color: colors.gray700 },
  viewComments: {
    fontSize: 14,
    color: colors.gray400,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
