import React, { useCallback, useRef, useState, memo, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, Platform,
  ViewToken, Alert, ActionSheetIOS,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { usePaginatedQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useIsFocused } from "@react-navigation/native";
import { ShareSheet } from "@/components/ShareSheet";
import { safeBack } from "@/lib/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
  withDelay, runOnJS,
} from "react-native-reanimated";
import { CommentsSheet } from "@/components/CommentsSheet";

interface FeedItem {
  _id: Id<"posts">;
  authorId: Id<"users">;
  authorName: string;
  authorAvatarUrl?: string;
  type: "photo" | "video";
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  aspectMode?: "original" | "cropped";
  cropOffsetY?: number;
  cropOffsetX?: number;
  cropZoom?: number;
  mediaAspectRatio?: number;
  location?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isPinned: boolean;
  isAnnouncement: boolean;
  isOwn: boolean;
  createdAt: number;
}

// ── Helpers ────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} Mio.`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")} Tsd.`;
  return String(n);
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

function getImagePosition(item: FeedItem) {
  const yOffset = item.cropOffsetY ?? 0.5;
  const xOffset = item.cropOffsetX ?? 0.5;
  return { top: `${yOffset * 100}%` as const, left: `${xOffset * 100}%` as const };
}

// ── Fullscreen Reel Post ────────────────────────────
interface ReelPostProps {
  item: FeedItem;
  screenWidth: number;
  screenHeight: number;
  isVideoPlaying: boolean;
  bottomInset: number;
  onToggleLike: (postId: Id<"posts">) => void;
  onToggleSave: (postId: Id<"posts">) => void;
  onShare: (postId: Id<"posts">) => void;
  onDelete: (postId: Id<"posts">) => void;
  onComment: (postId: Id<"posts">) => void;
  onReport: (postId: Id<"posts">) => void;
}

const ReelPost = memo(function ReelPost({
  item, screenWidth, screenHeight, isVideoPlaying, bottomInset,
  onToggleLike, onToggleSave, onShare, onDelete, onComment, onReport,
}: ReelPostProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const pauseIconOpacity = useSharedValue(0);
  const pauseIconScale = useSharedValue(0);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset pause when video becomes non-visible (scrolled away)
  useEffect(() => {
    if (!isVideoPlaying) setIsPaused(false);
  }, [isVideoPlaying]);

  const showPausePlayIcon = useCallback((_pausing: boolean) => {
    pauseIconScale.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(600, withTiming(0, { duration: 250 })),
    );
    pauseIconOpacity.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withDelay(600, withTiming(0, { duration: 250 })),
    );
  }, [pauseIconScale, pauseIconOpacity]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap → like
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      if (!item.isLiked) onToggleLike(item._id);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowHeart(true);
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 100 }),
        withDelay(400, withTiming(0, { duration: 250 }, () => runOnJS(setShowHeart)(false))),
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(500, withTiming(0, { duration: 250 })),
      );
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Wait to see if it's a double tap
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        // Single tap → toggle pause (only for videos)
        if (item.type === "video" && isVideoPlaying) {
          setIsPaused((prev) => {
            const next = !prev;
            showPausePlayIcon(next);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return next;
          });
        }
      }, 300);
    }
  }, [item._id, item.isLiked, item.type, isVideoPlaying, onToggleLike, heartScale, heartOpacity, showPausePlayIcon]);

  const heartAnim = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const pauseIconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pauseIconScale.value }],
    opacity: pauseIconOpacity.value,
  }));

  const handleMore = useCallback(() => {
    if (Platform.OS === "ios") {
      const options = item.isOwn
        ? ["Abbrechen", "Beitrag löschen"]
        : ["Abbrechen", "Beitrag melden"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) {
            if (item.isOwn) {
              onDelete(item._id);
            } else {
              onReport(item._id);
            }
          }
        },
      );
    } else {
      if (item.isOwn) {
        Alert.alert("Beitrag löschen?", "Unwiderruflich.", [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: () => onDelete(item._id) },
        ]);
      } else {
        Alert.alert("Beitrag melden", "Möchtest du diesen Beitrag melden?", [
          { text: "Abbrechen", style: "cancel" },
          { text: "Melden", style: "destructive", onPress: () => onReport(item._id) },
        ]);
      }
    }
  }, [item._id, item.isOwn, onDelete, onReport]);

  const isVideo = item.type === "video";
  const thumbUri = item.thumbnailUrl;

  return (
    <View style={[styles.reelContainer, { width: screenWidth, height: screenHeight }]}>
      {/* Fullscreen media */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={StyleSheet.absoluteFill}
      >
        {item.mediaUrl ? (
          isVideo ? (
            isVideoPlaying ? (
              <VideoPlayer
                uri={item.mediaUrl}
                height={screenHeight}
                width={screenWidth}
                autoPlay
                loop
                hideControls
                isVisible
                posterUri={thumbUri}
                paused={isPaused}
              />
            ) : (
              <View style={StyleSheet.absoluteFill}>
                {thumbUri ? (
                  <Image
                    source={{ uri: thumbUri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                    recyclingKey={item._id + "-reel-t"}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
                )}
                <View style={styles.playOverlay}>
                  <View style={styles.playCircle}>
                    <SymbolView name="play.fill" size={28} tintColor="#fff" />
                  </View>
                </View>
              </View>
            )
          ) : (
            <Image
              source={{ uri: item.mediaUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={getImagePosition(item)}
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={item._id + "-reel"}
            />
          )
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
        )}
      </TouchableOpacity>

      {/* Double-tap heart */}
      {showHeart && (
        <Animated.View style={[styles.heartOverlay, heartAnim]} pointerEvents="none">
          <SymbolView name="heart.fill" size={90} tintColor="#fff" />
        </Animated.View>
      )}

      {/* Tap-to-pause/play icon */}
      <Animated.View style={[styles.heartOverlay, pauseIconAnim]} pointerEvents="none">
        <View style={styles.pausePlayCircle}>
          <SymbolView
            name={isPaused ? "play.fill" : "pause.fill"}
            size={32}
            tintColor="#fff"
          />
        </View>
      </Animated.View>

      {/* Bottom gradient for readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Right side action buttons */}
      <View style={[styles.actionColumn, { bottom: 100 + bottomInset }]}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            onToggleLike(item._id);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          hitSlop={12}
        >
          <SymbolView
            name={item.isLiked ? "heart.fill" : "heart"}
            size={34}
            tintColor={item.isLiked ? "#ff3b5c" : "#fff"}
          />
          {item.likeCount > 0 && (
            <Text style={styles.actionCount}>{formatCount(item.likeCount)}</Text>
          )}
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onComment(item._id)}
          hitSlop={12}
        >
          <SymbolView name="bubble.right" size={34} tintColor="#fff" />
          {item.commentCount > 0 && (
            <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
          )}
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onShare(item._id)}
          hitSlop={12}
        >
          <SymbolView name="paperplane" size={32} tintColor="#fff" />
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            onToggleSave(item._id);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          hitSlop={12}
        >
          <SymbolView
            name={item.isSaved ? "bookmark.fill" : "bookmark"}
            size={32}
            tintColor="#fff"
          />
        </TouchableOpacity>

        {/* More */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleMore}
          hitSlop={12}
        >
          <SymbolView name="ellipsis" size={28} tintColor="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom left: author + caption */}
      <View style={[styles.bottomInfo, { bottom: 16 + bottomInset }]}>
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => router.navigate({ pathname: "/(main)/user-profile", params: { id: item.authorId } })}
          activeOpacity={0.8}
        >
          <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={36} />
          <Text style={styles.authorName}>{item.authorName}</Text>
          <Text style={styles.timeLabel}>{formatTime(item.createdAt)}</Text>
        </TouchableOpacity>

        {item.location && (
          <View style={styles.locationRow}>
            <SymbolView name="mappin" size={11} tintColor="rgba(255,255,255,0.7)" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        )}

        {item.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

// ── Feed Loop Screen ───────────────────────────────
export default function FeedLoopScreen() {
  const { startIndex: startIndexStr } = useLocalSearchParams<{ startIndex: string }>();
  const startIdx = parseInt(startIndexStr ?? "0", 10);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { isAuthenticated } = useConvexAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const {
    results: feed,
    status: feedStatus,
    loadMore,
  } = usePaginatedQuery(api.posts.feed, isAuthenticated ? {} : "skip", {
    initialNumItems: Math.max(30, startIdx + 10),
  });

  const toggleLike = useMutation(api.posts.toggleLike);
  const toggleSave = useMutation(api.posts.toggleSave);
  const deletePost = useMutation(api.posts.deletePost);
  const reportPost = useMutation(api.reports.create);
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<Id<"posts"> | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<Id<"posts"> | null>(null);
  const didScrollRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const handleToggleLike = useCallback((postId: Id<"posts">) => { toggleLike({ postId }); }, [toggleLike]);
  const handleToggleSave = useCallback((postId: Id<"posts">) => { toggleSave({ postId }); }, [toggleSave]);
  const handleShare = useCallback((postId: Id<"posts">) => { setSharePostId(postId); }, []);
  const handleComment = useCallback((postId: Id<"posts">) => { setCommentsPostId(postId); }, []);
  const handleDelete = useCallback(async (postId: Id<"posts">) => {
    try {
      await deletePost({ postId });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Fehler", "Beitrag konnte nicht gelöscht werden.");
    }
  }, [deletePost]);

  const handleReport = useCallback(async (postId: Id<"posts">) => {
    try {
      await reportPost({ type: "post" as const, targetId: postId, reason: "Vom Nutzer gemeldet" });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Gemeldet", "Der Beitrag wurde gemeldet. Danke für dein Feedback.");
    } catch {
      Alert.alert("Fehler", "Meldung konnte nicht gesendet werden.");
    }
  }, [reportPost]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visibleVideo = viewableItems.find(
        (v) => v.isViewable && v.item?.type === "video" && v.item?.mediaUrl,
      );
      setVisibleVideoId(visibleVideo ? visibleVideo.item._id : null);
    },
    [],
  );

  const keyExtractor = useCallback((item: FeedItem) => item._id, []);

  const getItemLayout = useCallback((_data: unknown, index: number) => ({
    length: screenHeight,
    offset: screenHeight * index,
    index,
  }), [screenHeight]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => (
    <ReelPost
      item={item}
      screenWidth={screenWidth}
      screenHeight={screenHeight}
      isVideoPlaying={isFocused && visibleVideoId === item._id}
      bottomInset={insets.bottom}
      onToggleLike={handleToggleLike}
      onToggleSave={handleToggleSave}
      onShare={handleShare}
      onDelete={handleDelete}
      onComment={handleComment}
      onReport={handleReport}
    />
  ), [screenWidth, screenHeight, isFocused, visibleVideoId, insets.bottom, handleToggleLike, handleToggleSave, handleShare, handleDelete, handleComment, handleReport]);

  const onContentSizeChange = useCallback(() => {
    if (!didScrollRef.current && feed && feed.length > startIdx && flatListRef.current) {
      didScrollRef.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: startIdx, animated: false });
      }, 50);
    }
  }, [feed, startIdx]);

  if (!feed || feed.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={feed}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onContentSizeChange={onContentSizeChange}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
        }}
        onEndReached={() => {
          if (feedStatus === "CanLoadMore") loadMore(10);
        }}
        onEndReachedThreshold={0.6}
        removeClippedSubviews={false}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={3}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={screenHeight}
      />

      {/* Floating header row */}
      <View style={[styles.headerRow, { top: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeBack("feed-loop")}
          hitSlop={12}
        >
          <SymbolView name="chevron.left" size={22} tintColor="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feed</Text>
      </View>

      <CommentsSheet
        postId={commentsPostId}
        visible={commentsPostId !== null}
        onClose={() => setCommentsPostId(null)}
      />
      <ShareSheet visible={sharePostId !== null} postId={sharePostId} onClose={() => setSharePostId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Floating header */
  headerRow: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Reel post */
  reelContainer: {
    backgroundColor: "#000",
    position: "relative",
  },

  /* Bottom gradient */
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
  },

  /* Right side actions */
  actionColumn: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    gap: 18,
  },
  actionItem: {
    alignItems: "center",
    gap: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Bottom info */
  bottomInfo: {
    position: "absolute",
    left: 16,
    right: 80,
    gap: 6,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Heart overlay */
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },

  /* Play overlay */
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  pausePlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
});
