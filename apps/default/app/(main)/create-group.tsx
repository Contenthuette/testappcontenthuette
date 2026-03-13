import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import Icon from "@/components/Icon";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import { INTERESTS } from "@/lib/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GroupVisibility = "public" | "request";

export default function CreateGroupScreen() {
  const router = useRouter();
  const createGroup = useMutation(api.groups.create);
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [pickingThumb, setPickingThumb] = useState(false);
  const [creating, setCreating] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed) && !(INTERESTS as readonly string[]).includes(trimmed)) {
      setSelectedInterests(prev => [...prev, trimmed]);
      setCustomInterest("");
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePickThumbnail = async () => {
    setPickingThumb(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: true });
      if (result) {
        setThumbPreview(result.uri);
        setThumbFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setPickingThumb(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      let thumbnailStorageId: string | undefined;
      if (thumbFile) {
        const url = await generateUploadUrl();
        thumbnailStorageId = await uploadToConvex(url, thumbFile.uri, thumbFile.mimeType);
      }

      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        topic: topic.trim() || undefined,
        interests: selectedInterests.length > 0 ? selectedInterests : undefined,
        visibility,
        ...(thumbnailStorageId ? { thumbnailStorageId: thumbnailStorageId as never } : {}),
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(main)/(tabs)/groups" as never);
    } catch (error) {
      console.error("Group creation failed:", error);
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Gruppe konnte nicht erstellt werden.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => safeBack("create-group")}
          style={styles.headerBtn}
        >
          <Icon name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gruppe erstellen</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating || !name.trim()}
          style={[
            styles.saveBtn,
            (creating || !name.trim()) && styles.saveBtnDisabled,
          ]}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Erstellen</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gruppenbild</Text>
          <TouchableOpacity
            style={styles.thumbArea}
            onPress={handlePickThumbnail}
            disabled={pickingThumb || creating}
            activeOpacity={0.7}
          >
            {thumbPreview ? (
              <View style={styles.thumbPreviewWrap}>
                <Image
                  source={{ uri: thumbPreview }}
                  style={styles.thumbImage}
                  contentFit="cover"
                />
                <View style={styles.thumbOverlay}>
                  {pickingThumb ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={styles.editBadge}>
                      <Icon name="camera" size={14} tintColor={colors.white} />
                      <Text style={styles.editBadgeText}>Bild ändern</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : pickingThumb ? (
              <View style={styles.thumbEmpty}>
                <ActivityIndicator size="large" color={colors.gray400} />
              </View>
            ) : (
              <View style={styles.thumbEmpty}>
                <Icon name="photo" size={36} tintColor={colors.gray400} />
                <Text style={styles.thumbEmptyText}>Tippe, um ein Gruppenbild auszuwählen</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Gruppenname"
              placeholderTextColor={colors.gray400}
              editable={!creating}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Beschreibung</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Worum geht es in der Gruppe?"
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={300}
              editable={!creating}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Thema</Text>
            <TextInput
              style={styles.fieldInput}
              value={topic}
              onChangeText={setTopic}
              placeholder="z.B. Sport, Kultur, Technik"
              placeholderTextColor={colors.gray400}
              editable={!creating}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Landkreis</Text>
            <TextInput
              style={styles.fieldInput}
              value={county}
              onChangeText={setCounty}
              placeholder="z.B. Rostock"
              placeholderTextColor={colors.gray400}
              editable={!creating}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Stadt</Text>
            <TextInput
              style={styles.fieldInput}
              value={city}
              onChangeText={setCity}
              placeholder="z.B. Stralsund"
              placeholderTextColor={colors.gray400}
              editable={!creating}
            />
          </View>
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sichtbarkeit</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              style={[styles.visibilityOption, visibility === "public" && styles.visibilityActive]}
              onPress={() => setVisibility("public")}
              activeOpacity={0.7}
            >
              <Icon name="globe" size={20} tintColor={visibility === "public" ? colors.white : colors.gray600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.visibilityTitle, visibility === "public" && styles.visibilityTitleActive]}>
                  Öffentlich
                </Text>
                <Text style={[styles.visibilityDesc, visibility === "public" && styles.visibilityDescActive]}>
                  Jeder kann beitreten
                </Text>
              </View>
              <View style={[styles.radio, visibility === "public" && styles.radioActive]}>
                {visibility === "public" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.visibilityOption, visibility === "request" && styles.visibilityActive]}
              onPress={() => setVisibility("request")}
              activeOpacity={0.7}
            >
              <Icon name="lock" size={20} tintColor={visibility === "request" ? colors.white : colors.gray600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.visibilityTitle, visibility === "request" && styles.visibilityTitleActive]}>
                  Auf Anfrage
                </Text>
                <Text style={[styles.visibilityDesc, visibility === "request" && styles.visibilityDescActive]}>
                  Beitritt muss bestätigt werden
                </Text>
              </View>
              <View style={[styles.radio, visibility === "request" && styles.radioActive]}>
                {visibility === "request" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Interessen</Text>
          <Text style={styles.interestHint}>
            Wähle Interessen aus, die zur Gruppe passen
          </Text>
          <View style={styles.interestChips}>
            {INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  style={[styles.interestChip, isSelected && styles.interestChipActive]}
                  onPress={() => toggleInterest(interest)}
                  disabled={creating}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.interestChipText, isSelected && styles.interestChipTextActive]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {selectedInterests
              .filter(i => !(INTERESTS as readonly string[]).includes(i))
              .map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[styles.interestChip, styles.interestChipActive, styles.customChip]}
                  onPress={() => toggleInterest(interest)}
                  disabled={creating}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.interestChipText, styles.interestChipTextActive]}>
                    {interest}
                  </Text>
                  <Icon name="xmark" size={10} tintColor={colors.white} />
                </TouchableOpacity>
              ))}
          </View>
          <View style={styles.customInterestRow}>
            <TextInput
              style={styles.customInterestInput}
              value={customInterest}
              onChangeText={setCustomInterest}
              placeholder="Eigenes Interesse eingeben..."
              placeholderTextColor={colors.gray400}
              editable={!creating}
              returnKeyType="done"
              onSubmitEditing={handleAddCustomInterest}
            />
            <TouchableOpacity
              style={[styles.customInterestBtn, !customInterest.trim() && styles.customInterestBtnDisabled]}
              onPress={handleAddCustomInterest}
              disabled={!customInterest.trim() || creating}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={16} tintColor={!customInterest.trim() ? colors.gray400 : colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  saveBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: colors.gray300 },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 60 },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  thumbArea: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    minHeight: 180,
  },
  thumbPreviewWrap: { position: "relative", minHeight: 180 },
  thumbImage: { width: "100%", height: 200, borderRadius: radius.md },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: radius.md,
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  editBadgeText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 10,
  },
  thumbEmptyText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.black,
  },
  fieldInputMultiline: { minHeight: 80, textAlignVertical: "top" },
  // Visibility
  visibilityRow: { gap: spacing.sm },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  visibilityActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  visibilityTitle: { fontSize: 15, fontWeight: "600", color: colors.black },
  visibilityTitleActive: { color: colors.white },
  visibilityDesc: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  visibilityDescActive: { color: "rgba(255,255,255,0.65)" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.white },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  // Interests
  interestHint: {
    fontSize: 13,
    color: colors.gray400,
  },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  interestChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  interestChipText: {
    fontSize: 13,
    color: colors.gray700,
  },
  interestChipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  customInterestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customInterestInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.gray100,
    borderRadius: 21,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.black,
  },
  customInterestBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  customInterestBtnDisabled: {
    backgroundColor: colors.gray200,
  },
});
