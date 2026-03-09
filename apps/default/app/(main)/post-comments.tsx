import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";

export default function PostCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState("");
  const comments = useQuery(api.posts.getComments, id ? { postId: id as Id<"posts"> } : "skip");
  const addComment = useMutation(api.posts.addComment);

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText("");
    await addComment({ postId: id as Id<"posts">, text: msg });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.grabber} />
      <Text style={styles.title}>Kommentare</Text>

      <FlatList
        data={comments}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={styles.commentAuthor}>{item.authorName}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          comments === undefined ? null : (
            <EmptyState icon="text.bubble" title="Keine Kommentare" subtitle="Schreib den ersten Kommentar" />
          )
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Kommentar schreiben..."
          placeholderTextColor={colors.gray400}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity onPress={handleSend}>
          <SymbolView name="arrow.up.circle.fill" size={32} tintColor={text.trim() ? colors.black : colors.gray300} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.gray300, alignSelf: "center", marginTop: spacing.md },
  title: { fontSize: 18, fontWeight: "600", color: colors.black, textAlign: "center", paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 20 },
  commentRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  commentAuthor: { fontSize: 14, fontWeight: "600", color: colors.black },
  commentText: { fontSize: 14, color: colors.gray700, marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray100, gap: spacing.sm },
  input: { flex: 1, fontSize: 16, color: colors.black, backgroundColor: colors.gray100, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
