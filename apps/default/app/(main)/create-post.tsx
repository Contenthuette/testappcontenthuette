import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "expo-symbols";

export default function CreatePostScreen() {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const createPost = useMutation(api.posts.create);

  const handlePublish = async () => {
    if (!caption.trim()) return;
    setLoading(true);
    try {
      await createPost({ caption: caption.trim(), type: "photo" });
      router.back();
    } catch (e) {
      // handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <SymbolView name="xmark" size={22} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Neuer Beitrag</Text>
        <Button title="Posten" onPress={handlePublish} loading={loading} size="sm" disabled={!caption.trim()} />
      </View>

      <TouchableOpacity style={styles.mediaArea}>
        <SymbolView name="photo.on.rectangle.angled" size={32} tintColor={colors.gray400} />
        <Text style={styles.mediaText}>Foto oder Video hinzufügen</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.captionInput}
        placeholder="Schreib eine Bildunterschrift..."
        placeholderTextColor={colors.gray400}
        value={caption}
        onChangeText={setCaption}
        multiline
        textAlignVertical="top"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  title: { fontSize: 18, fontWeight: "600", color: colors.black },
  mediaArea: {
    height: 200,
    margin: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  mediaText: { fontSize: 15, color: colors.gray400 },
  captionInput: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
    color: colors.black,
    lineHeight: 24,
  },
});
