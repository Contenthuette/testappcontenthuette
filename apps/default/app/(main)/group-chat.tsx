import React, { useCallback, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { ChatInputBar } from "@/components/ChatInputBar";
import type { MediaPickResult } from "@/components/ChatInputBar";
import { SharedPostBubble } from "@/components/SharedPostBubble";
import { VoiceMessageBubble } from "@/components/VoiceMessageBubble";
import { MediaMessageBubble } from "@/components/MediaMessageBubble";

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const groupConversationId = useQuery(
    api.messaging.getGroupConversation,
    isAuthenticated && id ? { groupId: id as Id<"groups"> } : "skip",
  );
  const markAsRead = useMutation(api.messaging.markConversationAsRead);

  useEffect(() => {
    if (groupConversationId && isAuthenticated) {
      markAsRead({ conversationId: groupConversationId }).catch(() => {});
    }
  }, [groupConversationId, isAuthenticated, markAsRead]);

  const {
    results: messages,
    status: messagesStatus,
    loadMore,
  } = usePaginatedQuery(
    api.messaging.getGroupMessages,
    isAuthenticated && id ? { groupId: id as Id<"groups"> } : "skip",
    { initialNumItems: 30 },
  );
  const sendMessage = useMutation(api.messaging.sendGroupMessage);
  const generateUploadUrl = useMutation(api.messaging.generateUploadUrl);
  const me = useQuery(api.users.me, isAuthenticated ? undefined : "skip");
  const group = useQuery(api.groups.getById, isAuthenticated && id ? { groupId: id as Id<"groups"> } : "skip");

  const handleSend = async (msg: string) => {
    if (!id) return;
    await sendMessage({ groupId: id as Id<"groups">, text: msg, type: "text" });
  };

  const handleSendVoice = useCallback(async (uri: string, durationMs: number) => {
    if (!id) return;
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp4" },
        body: blob,
      });
      const { storageId } = await uploadResponse.json() as { storageId: Id<"_storage"> };
      await sendMessage({
        groupId: id as Id<"groups">,
        type: "voice",
        mediaStorageId: storageId,
        mediaDuration: durationMs,
        text: `\ud83c\udfa4 ${Math.round(durationMs / 1000)}s`,
      });
    } catch (err) {
      console.error("Failed to send voice message", err);
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Sprachnachricht konnte nicht gesendet werden.");
      }
    }
  }, [id, generateUploadUrl, sendMessage]);

  const handleSendMedia = useCallback(async (media: MediaPickResult) => {
    if (!id) return;
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(media.uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": media.mimeType },
        body: blob,
      });
      const { storageId } = await uploadResponse.json() as { storageId: Id<"_storage"> };
      await sendMessage({
        groupId: id as Id<"groups">,
        type: media.type,
        mediaStorageId: storageId,
        text: media.type === "video" ? "\ud83c\udfa5 Video" : "\ud83d\uddbc\ufe0f Foto",
      });
    } catch (err) {
      console.error("Failed to send media", err);
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Medium konnte nicht gesendet werden.");
      }
    }
  }, [id, generateUploadUrl, sendMessage]);

  const renderMessage = ({ item }: { item: NonNullable<typeof messages>[number] }) => {
    const isMine = item.senderId === me?._id;
    const timeStr = new Date(item.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    // Shared post bubble
    if (item.type === "post_share" && item.sharedPostId) {
      return (
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          {!isMine && <Avatar uri={item.senderAvatarUrl} name={item.senderName} size={30} />}
          <View>
            {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
            <SharedPostBubble
              postId={item.sharedPostId}
              preview={item.sharedPostPreview ?? undefined}
              isMine={isMine}
              timestamp={timeStr}
            />
          </View>
        </View>
      );
    }

    // Voice message bubble
    if (item.type === "voice") {
      return (
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          {!isMine && <Avatar uri={item.senderAvatarUrl} name={item.senderName} size={30} />}
          <View>
            {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
            <VoiceMessageBubble
              audioUrl={item.mediaUrl ?? ""}
              durationMs={item.mediaDuration}
              isMine={isMine}
              timestamp={timeStr}
            />
          </View>
        </View>
      );
    }

    // Image/Video message bubble
    if ((item.type === "image" || item.type === "video") && item.mediaUrl) {
      return (
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          {!isMine && <Avatar uri={item.senderAvatarUrl} name={item.senderName} size={30} />}
          <View>
            {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
            <MediaMessageBubble
              mediaUrl={item.mediaUrl}
              type={item.type}
              isMine={isMine}
              timestamp={timeStr}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {!isMine && <Avatar uri={item.senderAvatarUrl} name={item.senderName} size={30} />}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.text}</Text>
          <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("group-chat")} style={styles.headerBack} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group?.name ?? "Gruppenchat"}
          </Text>
          <Text style={styles.headerSub}>
            {group?.memberCount ?? 0} Mitglieder
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (messagesStatus === "CanLoadMore") loadMore(30);
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            messagesStatus === "LoadingMore" ? (
              <View style={styles.loadingMoreWrap}>
                <ActivityIndicator color={colors.gray300} />
              </View>
            ) : null
          }
        />

        <ChatInputBar onSend={handleSend} onSendVoice={handleSendVoice} onSendMedia={handleSendMedia} bottomInset={insets.bottom} />
      </KeyboardAvoidingView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
    gap: spacing.sm,
  },
  headerBack: { padding: spacing.xs },
  headerCenter: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: colors.black },
  headerSub: { fontSize: 12, color: colors.gray400 },
  headerIcon: { padding: spacing.sm },

  messageList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  loadingMoreWrap: { paddingVertical: spacing.md, alignItems: "center" },
  msgRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    gap: spacing.sm,
    maxWidth: "80%",
    alignItems: "flex-end",
  },
  msgRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    maxWidth: "100%",
  },
  bubbleOther: { backgroundColor: colors.gray100, borderBottomLeftRadius: 6 },
  bubbleMine: { backgroundColor: colors.black, borderBottomRightRadius: 6 },
  senderName: { fontSize: 12, fontWeight: "600", color: colors.gray500, marginBottom: 2 },
  msgText: { fontSize: 15, color: colors.black, lineHeight: 21 },
  msgTextMine: { color: colors.white },
  timestamp: { fontSize: 10, color: colors.gray400, marginTop: 4, alignSelf: "flex-end" },
  timestampMine: { color: "rgba(255,255,255,0.5)" },
});
