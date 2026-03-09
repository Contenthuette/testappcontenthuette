import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { SymbolView } from "@/components/Icon";
import { theme } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import type { Id } from "@/convex/_generated/dataModel";

interface PostCardProps {
  post: {
    _id: Id<"posts">;
    authorId: Id<"users">;
    authorName: string;
    authorAvatarUrl?: string;
    type: "photo" | "video";
    caption?: string;
    mediaUrl?: string;
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

function VideoPost({ mediaUrl }: { mediaUrl: string }) {
  const { width } = useWindowDimensions();
  const videoHeight = width * (16 / 9);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(mediaUrl, (p: { loop: boolean }) => {
    p.loop = true;
  });

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, player]);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleTogglePlay}
      style={[vs.container, { height: videoHeight }]}
    >
      <VideoView
        player={player}
        style={vs.video}
        allowsFullscreen
        allowsPictureInPicture={false}
        contentFit="cover"
        nativeControls={false}
      />
      {!isPlaying && (
        <View style={vs.playOverlay}>
          <View style={vs.playBtn}>
            <SymbolView name="play.fill" size={28} tintColor="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const vs = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export function PostCard({ post, onLike, onComment, onSave, onShare, onProfile }: PostCardProps) {
  const timeAgo = formatTimeAgo(post.createdAt);
  const isVideo = post.type === "video";

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
        isVideo ? (
          <VideoPost mediaUrl={post.mediaUrl} />
        ) : (
          <Image source={{ uri: post.mediaUrl }} style={s.media} contentFit="cover" />
        )
      ) : null}

      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={onLike}>
          <SymbolView name={post.isLiked ? "heart.fill" : "heart"} size={22} tintColor={post.isLiked ? "#FF3B30" : theme.text} />
          {post.likeCount > 0 && <Text style={s.actionCount}>{post.likeCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onComment}>
          <SymbolView name="bubble.right" size={22} tintColor={theme.text} />
          {post.commentCount > 0 && <Text style={s.actionCount}>{post.commentCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onShare}>
          <SymbolView name="paperplane" size={22} tintColor={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onSave}>
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
  if (mins < 1) return "just now";
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
  media: { width: "100%", aspectRatio: 1 },
  actions: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 14, color: theme.text },
  captionRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, flexWrap: "wrap" },
  captionAuthor: { fontSize: 14, fontWeight: "600", color: theme.text },
  caption: { fontSize: 14, color: theme.text, flex: 1 },
});
