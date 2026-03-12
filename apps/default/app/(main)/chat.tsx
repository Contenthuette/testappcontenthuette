import React, { useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const messages = useQuery(api.messaging.getDirectMessages, id ? { conversationId: id as Id<"conversations"> } : "skip");
  const sendMessage = useMutation(api.messaging.sendDirectMessage);
  const generateUploadUrl = useMutation(api.messaging.generateUploadUrl);
  const me = useQuery(api.users.me);
  const partner = useQuery(api.calls.getConversationPartner, id ? { conversationId: id as Id<"conversations"> } : "skip");
  const initiateCall = useMutation(api.calls.initiateCall);

  const handleCall = useCallback(async (type: "audio" | "video") => {
    if (!id || !partner) return;
    try {
      const callId = await initiateCall({
        receiverId: partner._id,
        conversationId: id as Id<"conversations">,
        type,
      });
      router.push({ pathname: "/(main)/call" as "/", params: { id: callId } });
    } catch (e) {
      console.error("Failed to initiate call", e);
    }
  }, [id, partner, initiateCall]);

  const handleSend = async (msg: string) => {
    if (!id) return;
    await sendMessage({ conversationId: id as Id<"conversations">, text: msg, type: "text" });
  };

  const handleSendVoice = useCallback(async (uri: string, durationMs: number) => {
    if (!id) return;
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Fetch the recorded file and upload
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp4" },
        body: blob,
      });

      const { storageId } = await uploadResponse.json() as { storageId: Id<"_storage"> };

      // Send voice message
      await sendMessage({
        conversationId: id as Id<"conversations">,
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
  }, [id, generateUploadUrl, sendMessage]);

  const renderMessage = ({ item }: { item: NonNullable<typeof messages>[number] }) => {
    const isMine = item.senderId === me?._id;
    const timeStr = new Date(item.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    // Shared post bubble
    if (item.type === "post_share" && item.sharedPostId) {
      return (
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          <SharedPostBubble
            postId={item.sharedPostId}
            preview={item.sharedPostPreview ?? undefined}
            isMine={isMine}
            timestamp={timeStr}
          />
        </View>
      );
    }

    // Voice message bubble
    if (item.type === "voice" && item.mediaUrl) {
      return (
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          <VoiceMessageBubble
            audioUrl={item.mediaUrl}
            durationMs={item.mediaDuration}
            isMine={isMine}
            timestamp={timeStr}
          />
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
