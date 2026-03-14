import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import { ChatInputBar } from "@/components/ChatInputBar";
import { SharedPostBubble } from "@/components/SharedPostBubble";
import { VoiceMessageBubble } from "@/components/VoiceMessageBubble";
import * as Haptics from "expo-haptics";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isNewChat = !!id && id.startsWith("new-");
  const otherUserId = isNewChat ? id.replace("new-", "") : undefined;
  const conversationId = !isNewChat && id ? (id as Id<"conversations">) : undefined;

  // For new chats, resolve the conversation
  const getOrCreateDM = useMutation(api.messaging.getOrCreateDM);
  const resolvedRef = useRef<Id<"conversations"> | null>(null);

  useEffect(() => {
    if (isNewChat && otherUserId && !resolvedRef.current) {
      getOrCreateDM({ otherUserId: otherUserId as Id<"users"> }).then((convId) => {
        resolvedRef.current = convId;
        // Replace with the real conversation id
        router.replace({ pathname: "/(main)/chat" as "/", params: { id: convId } });
      }).catch(console.error);
    }
  }, [isNewChat, otherUserId, getOrCreateDM]);

  const messages = useQuery(api.messaging.getDirectMessages, conversationId ? { conversationId } : "skip");
  const sendMessage = useMutation(api.messaging.sendDirectMessage);
  const deleteMessage = useMutation(api.messaging.deleteMessage);
  const generateUploadUrl = useMutation(api.messaging.generateUploadUrl);
  const me = useQuery(api.users.me);
  const partner = useQuery(api.calls.getConversationPartner, conversationId ? { conversationId } : "skip");
  const initiateCall = useMutation(api.calls.initiateCall);

  const handleCall = useCallback(async (type: "audio" | "video") => {
    if (!conversationId || !partner) return;
    try {
      const callId = await initiateCall({
        receiverId: partner._id,
        conversationId,
        type,
      });
      router.push({ pathname: "/(main)/call" as "/", params: { id: callId } });
    } catch (e) {
      console.error("Failed to initiate call", e);
    }
  }, [conversationId, partner, initiateCall]);

  const handleSend = async (msg: string) => {
    if (!conversationId) return;
    await sendMessage({ conversationId, text: msg, type: "text" });
  };

  const handleDeleteMessage = useCallback(async (messageId: Id<"messages">) => {
    try {
      await deleteMessage({ messageId });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error("Failed to delete message", e);
    }
  }, [deleteMessage]);

  const handleLongPressMessage = useCallback((item: NonNullable<typeof messages>[number]) => {
    if (item.senderId !== me?._id) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (Platform.OS === "web") {
      if (confirm("Nachricht loeschen?")) {
        handleDeleteMessage(item._id);
      }
    } else {
      Alert.alert(
        "Nachricht loeschen",
        "Moechtest du diese Nachricht loeschen?",
        [
          { text: "Abbrechen", style: "cancel" },
          { text: "Loeschen", style: "destructive", onPress: () => handleDeleteMessage(item._id) },
        ]
      );
    }
  }, [me?._id, handleDeleteMessage]);

  const handleSendVoice = useCallback(async (uri: string, durationMs: number) => {
    if (!conversationId) return;
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
        conversationId,
        type: "voice",
        mediaStorageId: storageId,
        text: `🎤 ${Math.round(durationMs / 1000)}s`,
      });
    } catch (err) {
      console.error("Failed to send voice message", err);
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Sprachnachricht konnte nicht gesendet werden.");
      }
    }
  }, [conversationId, generateUploadUrl, sendMessage]);

  const renderMessage = ({ item }: { item: NonNullable<typeof messages>[number] }) => {
    const isMine = item.senderId === me?._id;
    const timeStr = new Date(item.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    if (item.type === "post_share" && item.sharedPostId) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={500}
          disabled={!isMine}
        >
          <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
            <SharedPostBubble
              postId={item.sharedPostId}
              preview={item.sharedPostPreview ?? undefined}
              isMine={isMine}
              timestamp={timeStr}
            />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === "voice" && item.mediaUrl) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={500}
          disabled={!isMine}
        >
          <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
            <VoiceMessageBubble
              audioUrl={item.mediaUrl}
              durationMs={item.mediaDuration}
              isMine={isMine}
              timestamp={timeStr}
            />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleLongPressMessage(item)}
        delayLongPress={500}
        disabled={!isMine}
      >
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
            <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.text}</Text>
            <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
              {timeStr}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("chat")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{partner?.name ?? "Chat"}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={() => handleCall("audio")}>
            <SymbolView name="phone" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={() => handleCall("video")}>
            <SymbolView name="video" size={20} tintColor={colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          inverted
          contentContainerStyle={styles.messageList}
        />

        <ChatInputBar onSend={handleSend} onSendVoice={handleSendVoice} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  backBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.black, marginLeft: spacing.sm },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerAction: { padding: spacing.sm },
  messageList: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  msgRow: { marginBottom: spacing.md, maxWidth: "80%" },
  msgRowMine: { alignSelf: "flex-end" },
  bubble: { padding: spacing.md, borderRadius: radius.lg },
  bubbleOther: { backgroundColor: colors.gray100, borderTopLeftRadius: spacing.xs },
  bubbleMine: { backgroundColor: colors.black, borderTopRightRadius: spacing.xs },
  msgText: { fontSize: 15, color: colors.black, lineHeight: 21 },
  msgTextMine: { color: colors.white },
  timestamp: { fontSize: 11, color: colors.gray400, marginTop: spacing.xs, alignSelf: "flex-end" },
  timestampMine: { color: "rgba(255,255,255,0.6)" },
});
