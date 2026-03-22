import React, { useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { ChatInputBar } from "@/components/ChatInputBar";
import { SharedPostBubble } from "@/components/SharedPostBubble";
import { VoiceMessageBubble } from "@/components/VoiceMessageBubble";

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const messages = useQuery(api.messaging.getGroupMessages, isAuthenticated && id ? { groupId: id as Id<"groups"> } : "skip");
  const sendMessage = useMutation(api.messaging.sendGroupMessage);
  const generateUploadUrl = useMutation(api.messaging.generateUploadUrl);
  const me = useQuery(api.users.me, isAuthenticated ? undefined : "skip");
  const group = useQuery(api.groups.getById, isAuthenticated && id ? { groupId: id as Id<"groups"> } : "skip");
  const initiateGroupCall = useMutation(api.calls.initiateGroupCall);

  const handleGroupCall = useCallback(async (type: "audio" | "video") => {
    if (!id) return;
    try {
      const callId = await initiateGroupCall({
        groupId: id as Id<"groups">,
        type,
      });
      router.push({ pathname: "/(main)/call" as "/", params: { id: callId } });
    } catch (e) {
      console.error("Failed to initiate group call", e);
    }
  }, [id, initiateGroupCall]);

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
    <SafeAreaView style={styles.safe}>
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
        <TouchableOpacity style={styles.headerIcon} hitSlop={8} onPress={() => handleGroupCall("audio")}>
          <SymbolView name="phone" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} hitSlop={8} onPress={() => handleGroupCall("video")}>
          <SymbolView name="video" size={20} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        <ChatInputBar onSend={handleSend} onSendVoice={handleSendVoice} />
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
