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
const FEED_ASPECT_RATIO = 3 / 4; // 3:4 portrait (width:height)

export default function FeedScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const feed = useQuery(api.posts.feed, {});
  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const [sharePostId, setSharePostId] = useState<Id<"posts"> | null>(null);

  // 4:3 feed media height
  const feedMediaHeight = screenWidth / FEED_ASPECT_RATIO;

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

  /** Calculate crop transform for feed display */
  const getCropTransform = (item: NonNullable<typeof feed>[number]) => {
    const zoom = item.cropZoom ?? 1;
    const mediaAR = item.mediaAspectRatio ?? 9 / 16;

    const scaledW = screenWidth * zoom;
    const scaledH = (screenWidth / mediaAR) * zoom;
    const overflowX = Math.max(0, scaledW - screenWidth);
    const overflowY = Math.max(0, scaledH - feedMediaHeight);

    const tX = (0.5 - (item.cropOffsetX ?? 0.5)) * overflowX;
    const tY = (0.5 - (item.cropOffsetY ?? 0.5)) * overflowY;

    return { translateX: tX, translateY: tY, scale: zoom };
  };

  /** Get content position for cropped images (no zoom) */
  const getImagePosition = (item: NonNullable<typeof feed>[number]) => {
    const yOffset = item.cropOffsetY ?? 0.5;
    const xOffset = item.cropOffsetX ?? 0.5;
    return { top: `${yOffset * 100}%` as const, left: `${xOffset * 100}%` as const };
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
        <Image source={{ uri: item.mediaUrl }} style={styles.announcementImage} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      )}
      {item.caption && <Text style={styles.announcementText}>{item.caption}</Text>}
    </View>
  );

  const renderMedia = (item: NonNullable<typeof feed>[number]) => {
    if (!item.mediaUrl) return null;

    const isOriginal = item.aspectMode === "original";
    const isVideo = item.type === "video";
    const isThisVideoVisible = isFocused && visibleVideoId === item._id;

    if (isVideo) {
      const thumbUri = item.thumbnailUrl;
      const crop = getCropTransform(item);
      const mediaAR = item.mediaAspectRatio ?? 9 / 16;
      const nativeHeight = screenWidth / mediaAR;

      if (isOriginal) {
        return (
          <View style={[styles.mediaContainerOriginal, { width: screenWidth, height: feedMediaHeight }]}>
            {isThisVideoVisible ? (
              <VideoPlayer
                uri={item.mediaUrl}
                height={feedMediaHeight}
                width={screenWidth}
                autoPlay
                loop
                hideControls
                isVisible
                contentFit="contain"
              />
            ) : (
              <View style={{ width: screenWidth, height: feedMediaHeight, justifyContent: "center", alignItems: "center" }}>
                {thumbUri ? (
                  <Image
                    source={{ uri: thumbUri }}
                    style={{ width: screenWidth, height: feedMediaHeight }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority="high"
                    transition={0}
                    recyclingKey={item._id + "-orig-thumb"}
                  />
                ) : (
                  <View style={{ width: screenWidth, height: feedMediaHeight, backgroundColor: "#111" }} />
                )}
                <View style={styles.videoPlayOverlay}>
                  <View style={styles.videoPlayCircle}>
                    <SymbolView name="play.fill" size={22} tintColor="#fff" />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      // Cropped video: apply full crop transform
      return (
        <View style={[styles.mediaContainerCropped, { width: screenWidth, height: feedMediaHeight }]}>
          {isThisVideoVisible ? (
            <View
              style={{
                transform: [
                  { translateX: crop.translateX },
                  { translateY: crop.translateY },
                  { scale: crop.scale },
                ],
              }}
            >
              <VideoPlayer
                uri={item.mediaUrl}
                height={nativeHeight}
                width={screenWidth}
                autoPlay
                loop
                hideControls
                isVisible
              />
            </View>
          ) : (
            <View>
              {thumbUri ? (
                <Image
                  source={{ uri: thumbUri }}
                  style={{ width: screenWidth, height: feedMediaHeight }}
                  contentFit="cover"
                  contentPosition={getImagePosition(item)}
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={0}
                  recyclingKey={item._id + "-crop-thumb"}
                />
              ) : (
                <View
                  style={{
                    width: screenWidth,
                    height: feedMediaHeight,
                    backgroundColor: "#111",
                  }}
                />
              )}
              <View style={styles.videoPlayOverlay}>
                <View style={styles.videoPlayCircle}>
                  <SymbolView name="play.fill" size={22} tintColor="#fff" />
                </View>
              </View>
            </View>
          )}
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
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            recyclingKey={item._id + "-orig"}
          />
        </View>
      );
    }

    // Cropped photo with zoom support
    const hasZoom = (item.cropZoom ?? 1) > 1.05;
    if (hasZoom) {
      const crop = getCropTransform(item);
      const mediaAR = item.mediaAspectRatio ?? 3 / 4;
      const photoH = screenWidth / mediaAR;
      return (
        <View style={[styles.mediaContainerCropped, { width: screenWidth, height: feedMediaHeight }]}>
          <View
            style={{
              width: screenWidth,
              height: photoH,
              transform: [
                { translateX: crop.translateX },
                { translateY: crop.translateY },
                { scale: crop.scale },
              ],
            }}
          >
            <Image
              source={{ uri: item.mediaUrl }}
              style={{ width: screenWidth, height: photoH }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              recyclingKey={item._id + "-zoom"}
            />
          </View>
        </View>
      );
    }

    // Cropped photo without zoom: use contentPosition
    return (
      <Image
        source={{ uri: item.mediaUrl }}
        style={[styles.postImage, { width: screenWidth, height: feedMediaHeight }]}
        contentFit="cover"
        contentPosition={getImagePosition(item)}
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        recyclingKey={item._id + "-crop"}
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
            <SymbolView name="paperplane.fill" size={24} tintColor={colors.black} />
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
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={3}
        updateCellsBatchingPeriod={50}
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
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
});
