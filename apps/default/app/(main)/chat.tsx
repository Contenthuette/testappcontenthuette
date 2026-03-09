import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState("");
  const messages = useQuery(api.messaging.getDirectMessages, id ? { conversationId: id as Id<"conversations"> } : "skip");
  const sendMessage = useMutation(api.messaging.sendDirectMessage);
  const me = useQuery(api.users.me);

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText("");
    await sendMessage({ conversationId: id as Id<"conversations">, text: msg, type: "text" });
  };

  const renderMessage = ({ item }: { item: NonNullable<typeof messages>[number] }) => {
    const isMine = item.senderId === me?._id;
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("chat")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction}>
            <SymbolView name="phone" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
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
          <TouchableOpacity onPress={handleSend}>
            <SymbolView name="arrow.up.circle.fill" size={32} tintColor={text.trim() ? colors.black : colors.gray300} />
          </TouchableOpacity>
        </View>
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
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray100, gap: spacing.sm },
  attachBtn: { paddingBottom: 4 },
  input: { flex: 1, fontSize: 16, color: colors.black, maxHeight: 100, backgroundColor: colors.gray100, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
