import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import * as Haptics from "expo-haptics";

export default function CreatePostScreen() {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const createPost = useMutation(api.posts.create);

  const handlePublish = async () => {
    if (!caption.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await createPost({ caption: caption.trim(), type: "photo" });
      router.back();
    } catch (e) {
      if (Platform.OS !== "web") Alert.alert("Fehler", "Beitrag konnte nicht veröffentlicht werden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancelText}>Abbrechen</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Neuer Beitrag</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!caption.trim() || loading}
          hitSlop={8}
        >
          <Text style={[styles.postBtn, (!caption.trim() || loading) && styles.postBtnDisabled]}>
            {loading ? "..." : "Posten"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Media area */}
      <TouchableOpacity style={styles.mediaArea} activeOpacity={0.7}>
        <View style={styles.mediaIconWrap}>
          <SymbolView name="photo.on.rectangle.angled" size={28} tintColor={colors.gray400} />
        </View>
        <Text style={styles.mediaTitle}>Foto oder Video hinzufügen</Text>
        <Text style={styles.mediaDesc}>Tippe hier, um Medien auszuwählen</Text>
      </TouchableOpacity>

      {/* Caption */}
      <TextInput
        style={styles.captionInput}
        placeholder="Schreibe etwas dazu..."
        placeholderTextColor={colors.gray400}
        value={caption}
        onChangeText={setCaption}
        multiline
        textAlignVertical="top"
        maxLength={2200}
      />

      <View style={styles.charCount}>
        <Text style={styles.charCountText}>{caption.length} / 2200</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  cancelText: { fontSize: 16, color: colors.gray500 },
  title: { fontSize: 17, fontWeight: "600", color: colors.black },
  postBtn: { fontSize: 16, fontWeight: "700", color: colors.black },
  postBtnDisabled: { color: colors.gray300 },

  mediaArea: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderCurve: "continuous",
  },
  mediaIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  mediaTitle: { fontSize: 15, fontWeight: "600", color: colors.gray600 },
  mediaDesc: { fontSize: 13, color: colors.gray400 },

  captionInput: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    fontSize: 16,
    color: colors.black,
    lineHeight: 24,
  },
  charCount: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  charCountText: { fontSize: 12, color: colors.gray400, textAlign: "right" },
});
