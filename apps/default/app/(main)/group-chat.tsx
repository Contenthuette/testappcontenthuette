import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "expo-symbols";

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState("");
  const messages = useQuery(api.messaging.getGroupMessages, id ? { groupId: id as Id<"groups"> } : "skip");
  const sendMessage = useMutation(api.messaging.sendGroupMessage);
  const me = useQuery(api.users.me);

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText("");
    await sendMessage({ groupId: id as Id<"groups">, text: msg, type: "text" });
  };

  const renderMessage = ({ item }: { item: NonNullable<typeof messages>[number] }) => {
    const isMine = item.senderId === me?._id;
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {!isMine && <Avatar uri={item.senderAvatarUrl} name={item.senderName} size={28} />}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.text}</Text>
          <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
            {new Date(item.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Gruppenchat</Text>
        <TouchableOpacity style={styles.headerAction}>
          <SymbolView name="phone" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <SymbolView name="video" size={20} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          inverted
          contentContainerStyle={styles.messageList}
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachBtn}>
            <SymbolView name="plus.circle.fill" size={28} tintColor={colors.gray400} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nachricht..."
            placeholderTextColor={colors.gray400}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <SymbolView name="arrow.up.circle.fill" size={32} tintColor={text.trim() ? colors.black : colors.gray300} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: spacing.sm },
  backBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.black },
  headerAction: { padding: spacing.sm },
  messageList: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  msgRow: { flexDirection: "row", marginBottom: spacing.md, gap: spacing.sm, maxWidth: "80%" },
  msgRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubble: { padding: spacing.md, borderRadius: radius.lg, maxWidth: "100%" },
  bubbleOther: { backgroundColor: colors.gray100, borderTopLeftRadius: spacing.xs },
  bubbleMine: { backgroundColor: colors.black, borderTopRightRadius: spacing.xs },
  senderName: { fontSize: 12, fontWeight: "600", color: colors.gray500, marginBottom: 2 },
  msgText: { fontSize: 15, color: colors.black, lineHeight: 21 },
  msgTextMine: { color: colors.white },
  timestamp: { fontSize: 11, color: colors.gray400, marginTop: spacing.xs, alignSelf: "flex-end" },
  timestampMine: { color: "rgba(255,255,255,0.6)" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray100, gap: spacing.sm },
  attachBtn: { paddingBottom: 4 },
  input: { flex: 1, fontSize: 16, color: colors.black, maxHeight: 100, backgroundColor: colors.gray100, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sendBtn: { paddingBottom: 2 },
});
