import React, { useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, Pressable } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "@/components/Icon";
import { theme } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { useSound } from "@/lib/sounds";
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
  withDelay, runOnJS,
} from "react-native-reanimated";

interface PostCardProps {
  post: {
    _id: Id<"posts">;
    authorId: Id<"users">;
    authorName: string;
    authorAvatarUrl?: string;
    type: "photo" | "video";
    caption?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    cropOffsetX?: number;
    cropOffsetY?: number;
    cropZoom?: number;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    isSaved: boolean;
    isPinned: boolean;
    isAnnouncement: boolean;
    createdAt: number;
  };
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onShare?: () => void;
  onProfile?: () => void;
}

export function PostCard({ post, onLike, onComment, onSave, onShare, onProfile }: PostCardProps) {
  const { width } = useWindowDimensions();
  const timeAgo = formatTimeAgo(post.createdAt);
  const isVideo = post.type === "video";
  const [playVideo, setPlayVideo] = useState(false);
  const videoHeight = (width - 32) * (4 / 3);
  const { playSound } = useSound();
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const lastTapRef = useRef(0);

  const handlePlayVideo = useCallback(() => {
    setPlayVideo(true);
    playSound("tap");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const triggerDoubleTapLike = useCallback(() => {
    if (!post.isLiked) {
      onLike();
    }
    setShowHeart(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    heartScale.value = withSequence(
      withTiming(1.3, { duration: 200 }),
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 200 })),
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(500, withTiming(0, { duration: 200 }, () => {
        runOnJS(setShowHeart)(false);
      })),
    );
  }, [post.isLiked, onLike, heartScale, heartOpacity]);

  const handleMediaPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerDoubleTapLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [triggerDoubleTapLike]);

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // Use thumbnail for videos, media for photos
  const displayImage = isVideo ? (post.thumbnailUrl ?? post.mediaUrl) : post.mediaUrl;
  const cropPosition = { top: `${(post.cropOffsetY ?? 0.5) * 100}%`, left: `${(post.cropOffsetX ?? 0.5) * 100}%` } as const;

  return (
    <View style={[s.container, post.isAnnouncement && s.announcement]}>
      {post.isAnnouncement && (
        <View style={s.announcementBadge}>
          <SymbolView name="megaphone.fill" size={12} tintColor={theme.bg} />
          <Text style={s.announcementText}>Z Announcement</Text>
        </View>
      )}
      <View style={s.header}>
        <TouchableOpacity style={s.authorRow} onPress={onProfile}>
          <Avatar uri={post.authorAvatarUrl} name={post.authorName} size={36} />
          <View style={s.authorInfo}>
            <Text style={s.authorName}>{post.authorName}</Text>
            <Text style={s.time}>{timeAgo}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {post.mediaUrl ? (
        isVideo && playVideo ? (
          <Pressable onPress={handleMediaPress}>
            <View style={s.videoWrap}>
              <VideoPlayer
                uri={post.mediaUrl}
                height={videoHeight}
                autoPlay
                loop
                muted={false}
                posterUri={displayImage}
              />
              {showHeart && (
                <View style={s.heartOverlay} pointerEvents="none">
                  <Animated.View style={heartAnimStyle}>
                    <SymbolView name="heart.fill" size={80} tintColor="#FF3B30" />
                  </Animated.View>
                </View>
              )}
            </View>
          </Pressable>
        ) : isVideo ? (
          <TouchableOpacity activeOpacity={0.9} onPress={handlePlayVideo}>
            <View style={s.videoWrap}>
              {displayImage ? (
                <Image
                  source={{ uri: displayImage }}
                  style={s.media}
                  contentFit="cover"
                  transition={0}
                  cachePolicy="memory-disk"
                  priority="high"
                  recyclingKey={post._id + "-thumb"}
                />
              ) : (
                <View style={[s.media, s.videoPlaceholder]} />
              )}
              <View style={s.playOverlay}>
                <View style={s.playCircle}>
                  <SymbolView name="play.fill" size={24} tintColor="#fff" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <Pressable onPress={handleMediaPress}>
            <View>
              <Image
                source={{ uri: post.mediaUrl }}
                style={s.media}
                contentFit="cover"
                contentPosition={cropPosition}
                cachePolicy="memory-disk"
                priority="high"
                transition={0}
                recyclingKey={post._id}
              />
              {showHeart && (
                <View style={s.heartOverlay} pointerEvents="none">
                  <Animated.View style={heartAnimStyle}>
                    <SymbolView name="heart.fill" size={80} tintColor="#FF3B30" />
                  </Animated.View>
                </View>
              )}
            </View>
          </Pressable>
        )
      ) : null}

      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => { playSound("tap"); onLike(); }}>
          <SymbolView name={post.isLiked ? "heart.fill" : "heart"} size={22} tintColor={post.isLiked ? "#FF3B30" : theme.text} />
          {post.likeCount > 0 && <Text style={s.actionCount}>{post.likeCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => { playSound("tap"); onComment(); }}>
          <SymbolView name="bubble.right" size={22} tintColor={theme.text} />
          {post.commentCount > 0 && <Text style={s.actionCount}>{post.commentCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => { playSound("tap"); onShare?.(); }}>
          <SymbolView name="paperplane.fill" size={22} tintColor={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => { playSound("tap"); onSave(); }}>
          <SymbolView name={post.isSaved ? "bookmark.fill" : "bookmark"} size={22} tintColor={theme.text} />
        </TouchableOpacity>
      </View>
      {post.caption ? (
        <View style={s.captionRow}>
          <Text style={s.captionAuthor}>{post.authorName}</Text>
          <Text style={s.caption}> {post.caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const s = StyleSheet.create({
  container: { backgroundColor: theme.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  announcement: { backgroundColor: "#F8F8F8", borderLeftWidth: 3, borderLeftColor: theme.text },
  announcementBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.text, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 16, marginTop: 12 },
  announcementText: { fontSize: 11, fontWeight: "700", color: theme.bg, letterSpacing: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, paddingBottom: 8 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorInfo: {},
  authorName: { fontSize: 14, fontWeight: "600", color: theme.text },
  time: { fontSize: 12, color: theme.textSecondary },
  media: { width: "100%", aspectRatio: 3 / 4 },
  videoWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
  },
  videoPlaceholder: {
    backgroundColor: "#1a1a1a",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 14, color: theme.text },
  captionRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, flexWrap: "wrap" },
  captionAuthor: { fontSize: 14, fontWeight: "600", color: theme.text },
  caption: { fontSize: 14, color: theme.text, flex: 1 },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
