import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from "react-native";
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
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");

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
        {!isMine && <Avatar uri={item.senderAvatarUrl} name={item.senderName} size={30} />}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={12}>
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
        <TouchableOpacity style={styles.headerIcon} hitSlop={8}>
          <SymbolView name="phone" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} hitSlop={8}>
          <SymbolView name="video" size={20} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} hitSlop={8}>
            <SymbolView name="plus" size={22} tintColor={colors.gray400} />
          </TouchableOpacity>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Nachricht..."
              placeholderTextColor={colors.gray400}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity style={styles.micBtn} hitSlop={8}>
            <SymbolView name="mic" size={22} tintColor={colors.gray400} />
          </TouchableOpacity>
          {text.trim().length > 0 && (
            <TouchableOpacity onPress={handleSend} hitSlop={8}>
              <View style={styles.sendBtn}>
                <SymbolView name="arrow.up" size={16} tintColor={colors.white} />
              </View>
            </TouchableOpacity>
          )}
        </View>
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

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
    gap: spacing.sm,
  },
  attachBtn: { paddingBottom: 6 },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    maxHeight: 120,
  },
  input: { fontSize: 16, color: colors.black, lineHeight: 22 },
  micBtn: { paddingBottom: 6 },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
