import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useIsFocused } from "@react-navigation/native";
import { ShareSheet } from "@/components/ShareSheet";
import type { Id } from "@/convex/_generated/dataModel";

const HEADER_HEIGHT = 56;
const FEED_ASPECT = 3 / 4; // 3:4 portrait

export default function FeedScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const feed = useQuery(api.posts.feed, {});
  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const [sharePostId, setSharePostId] = useState<Id<"posts"> | null>(null);

  // 3:4 feed media height
  const feedMediaHeight = screenWidth / FEED_ASPECT;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visibleVideo = viewableItems.find(
        (v) => v.isViewable && v.item?.type === "video" && v.item?.mediaUrl,
      );
      setVisibleVideoId(visibleVideo ? visibleVideo.item._id : null);
    },
    [],
  );

  /** Calculate video height from stored aspect ratio */
  const getVideoNativeHeight = (item: NonNullable<typeof feed>[number]) => {
    const ar = item.mediaAspectRatio ?? 9 / 16; // default 9:16
    return screenWidth / ar;
  };

  /** Calculate translateY for cropped videos */
  const getCropTranslateY = (item: NonNullable<typeof feed>[number]) => {
    const nativeHeight = getVideoNativeHeight(item);
    const overflow = Math.max(0, nativeHeight - feedMediaHeight);
    const offset = item.cropOffsetY ?? 0.5;
    return -offset * overflow;
  };

  /** Get content position for cropped images */
  const getImagePosition = (item: NonNullable<typeof feed>[number]) => {
    const offset = item.cropOffsetY ?? 0.5;
    return { top: `${offset * 100}%` as const };
  };

  const renderAnnouncement = (item: NonNullable<typeof feed>[number]) => (
    <View style={styles.announcementCard} key={item._id}>
      <View style={styles.announcementHeader}>
        <ZLogo size={28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.announcementTitle}>Z Announcement</Text>
          <Text style={styles.announcementSub}>Offiziell</Text>
        </View>
      </View>
      {item.mediaUrl && (
        <Image source={{ uri: item.mediaUrl }} style={styles.announcementImage} contentFit="cover" transition={300} />
      )}
      {item.caption && <Text style={styles.announcementText}>{item.caption}</Text>}
    </View>
  );

  const renderMedia = (item: NonNullable<typeof feed>[number]) => {
    if (!item.mediaUrl) return null;

    const isOriginal = item.aspectMode === "original";
    const isVideo = item.type === "video";

    if (isVideo) {
      if (isOriginal) {
        // Original: video fits inside 3:4 container with contain
        return (
          <View style={[styles.mediaContainerOriginal, { width: screenWidth, height: feedMediaHeight }]}>
            <VideoPlayer
              uri={item.mediaUrl}
              height={feedMediaHeight}
              width={screenWidth}
              autoPlay
              loop
              hideControls
              isVisible={isFocused && visibleVideoId === item._id}
              contentFit="contain"
            />
          </View>
        );
      }
      // Cropped: video fills 3:4 container, positioned with offset
      const nativeHeight = getVideoNativeHeight(item);
      const translateY = getCropTranslateY(item);
      return (
        <View style={[styles.mediaContainerCropped, { width: screenWidth, height: feedMediaHeight }]}>
          <View style={{ transform: [{ translateY }] }}>
            <VideoPlayer
              uri={item.mediaUrl}
              height={nativeHeight}
              width={screenWidth}
              autoPlay
              loop
              hideControls
              isVisible={isFocused && visibleVideoId === item._id}
            />
          </View>
        </View>
      );
    }

    // Photo
    if (isOriginal) {
      return (
        <View style={[styles.mediaContainerOriginal, { width: screenWidth, height: feedMediaHeight }]}>
          <Image
            source={{ uri: item.mediaUrl }}
            style={{ width: screenWidth, height: feedMediaHeight }}
            contentFit="contain"
            transition={200}
          />
        </View>
      );
    }
    // Cropped photo: use contentPosition for precise placement
    return (
      <Image
        source={{ uri: item.mediaUrl }}
        style={[styles.postImage, { width: screenWidth, height: feedMediaHeight }]}
        contentFit="cover"
        contentPosition={getImagePosition(item)}
        transition={200}
      />
    );
  };

  const renderPost = ({ item }: { item: NonNullable<typeof feed>[number] }) => {
    if (item.isAnnouncement) return renderAnnouncement(item);
    return (
      <View style={styles.postCard}>
        {/* Author */}
        <TouchableOpacity
          style={styles.postHeader}
          onPress={() => router.push({ pathname: "/(main)/user-profile", params: { id: item.authorId } })}
          activeOpacity={0.7}
        >
          <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={styles.postAuthor}>{item.authorName}</Text>
            <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
          </View>
          <TouchableOpacity hitSlop={12}>
            <SymbolView name="ellipsis" size={18} tintColor={colors.gray400} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Media */}
        {renderMedia(item)}

        {/* Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike({ postId: item._id })} hitSlop={8}>
            <SymbolView
              name={item.isLiked ? "heart.fill" : "heart"}
              size={24}
              tintColor={item.isLiked ? colors.danger : colors.black}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: "/(main)/post-comments", params: { id: item._id } })}
            hitSlop={8}
          >
            <SymbolView name="bubble.right" size={24} tintColor={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} hitSlop={8} onPress={() => setSharePostId(item._id)}>
            <SymbolView name="paperplane" size={24} tintColor={colors.black} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => toggleSave({ postId: item._id })} hitSlop={8}>
            <SymbolView
              name={item.isSaved ? "bookmark.fill" : "bookmark"}
              size={24}
              tintColor={colors.black}
            />
          </TouchableOpacity>
        </View>

        {/* Counts */}
        {item.likeCount > 0 && (
          <Text style={styles.likeCount}>
            {item.likeCount} {item.likeCount === 1 ? "Like" : "Likes"}
          </Text>
        )}

        {/* Caption */}
        {item.caption ? (
          <Text style={styles.captionRow}>
            <Text style={styles.captionAuthor}>{item.authorName} </Text>
            <Text style={styles.captionText}>{item.caption}</Text>
          </Text>
        ) : null}

        {/* View comments */}
        {item.commentCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/(main)/post-comments", params: { id: item._id } })}
          >
            <Text style={styles.viewComments}>
              Alle {item.commentCount} Kommentare ansehen
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push("/(main)/conversations")} style={styles.iconBtn}>
          <SymbolView name="bubble.left.and.bubble.right" size={22} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(main)/notifications")} style={styles.iconBtn}>
          <SymbolView name="bell" size={22} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={feed}
        renderItem={renderPost}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ListEmptyComponent={
          feed === undefined ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.gray300} />
            </View>
          ) : (
            <EmptyState
              icon="photo.on.rectangle"
              title="Dein Feed ist leer"
              subtitle="Folge Gruppen und Personen, um hier Beitraege zu sehen."
            />
          )
        }
      />

      <ShareSheet
        visible={sharePostId !== null}
        postId={sharePostId}
        onClose={() => setSharePostId(null)}
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
  return new Date(ts).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: colors.black, letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  // Announcement
  announcementCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.black,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  announcementTitle: { fontSize: 15, fontWeight: "700", color: colors.white },
  announcementSub: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  announcementImage: { width: "100%", height: 200 },
  announcementText: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: colors.white,
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  // Post
  postCard: { marginBottom: spacing.lg },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  postAuthor: { fontSize: 15, fontWeight: "600", color: colors.black, letterSpacing: -0.2 },
  postTime: { fontSize: 12, color: colors.gray400 },

  // Media containers
  postImage: {
    backgroundColor: colors.gray100,
  },
  mediaContainerOriginal: {
    backgroundColor: colors.gray100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaContainerCropped: {
    backgroundColor: "#000",
    overflow: "hidden",
  },

  // Actions
  postActions: {
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
