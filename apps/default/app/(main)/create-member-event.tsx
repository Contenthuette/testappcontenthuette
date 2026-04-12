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
import { SymbolView } from "@/components/Icon";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CITIES, COUNTIES } from "@/lib/constants";

function parseDateDE(input: string): string | null {
  const m = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export default function CreateMemberEventScreen() {
  const router = useRouter();
  const createEvent = useMutation(api.memberEvents.create);
  const generateUploadUrl = useMutation(api.memberEvents.generateUploadUrl);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<{ uri: string; mimeType: string } | null>(null);

  // Video state
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoThumbUri, setVideoThumbUri] = useState<string | null>(null);
  const [videoThumbFile, setVideoThumbFile] = useState<{ uri: string; mimeType: string } | null>(null);

  const [creating, setCreating] = useState(false);

  const handlePickThumb = async () => {
    const result = await pickImage({ mediaType: "images", allowsEditing: true, aspect: [16, 9] });
    if (result) {
      setThumbPreview(result.uri);
      setThumbFile({ uri: result.uri, mimeType: result.mimeType });
    }
  };

  const handlePickVideo = async () => {
    const result = await pickVideo();
    if (!result) return;
    setVideoUri(result.uri);
    setVideoFile({ uri: result.uri, mimeType: result.mimeType });
  };

  const handlePickVideoThumb = async () => {
    const result = await pickImage({ mediaType: "images", quality: 0.8 });
    if (!result) return;
    setVideoThumbUri(result.uri);
    setVideoThumbFile({ uri: result.uri, mimeType: result.mimeType });
  };

  const handleRemoveVideo = () => {
    setVideoUri(null);
    setVideoFile(null);
    setVideoThumbUri(null);
    setVideoThumbFile(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Namen ein.");
      return;
    }
    if (!venue.trim()) {
      Alert.alert("Fehler", "Bitte gib einen Ort/Venue ein.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Fehler", "Bitte wähle eine Stadt.");
      return;
    }
    if (!date.trim() || !parseDateDE(date.trim())) {
      Alert.alert("Fehler", "Bitte gib ein Datum im Format TT.MM.JJJJ ein (z.B. 24.04.2026).");
      return;
    }
    if (!startTime.trim() || !/^\d{2}:\d{2}$/.test(startTime)) {
      Alert.alert("Fehler", "Bitte gib eine Startzeit im Format HH:MM ein.");
      return;
    }
    if (!endTime.trim() || !/^\d{2}:\d{2}$/.test(endTime)) {
      Alert.alert("Fehler", "Bitte gib eine Endzeit im Format HH:MM ein.");
      return;
    }

    setCreating(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let thumbnailStorageId: string | undefined;
      if (thumbFile) {
        const uploadUrl = await generateUploadUrl();
        thumbnailStorageId = await uploadToConvex(uploadUrl, thumbFile.uri, thumbFile.mimeType);
      }

      let videoStorageId: string | undefined;
      if (videoFile) {
        setVideoUploading(true);
        const uploadUrl = await generateUploadUrl();
        videoStorageId = await uploadToConvex(uploadUrl, videoFile.uri, videoFile.mimeType);
      }

      let videoThumbnailStorageId: string | undefined;
      if (videoThumbFile) {
        const uploadUrl = await generateUploadUrl();
        videoThumbnailStorageId = await uploadToConvex(uploadUrl, videoThumbFile.uri, videoThumbFile.mimeType);
      }

      const eventId = await createEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        venue: venue.trim(),
        city: city.trim(),
        county: county || undefined,
        date: parseDateDE(date.trim()) as string,
        startTime: startTime.trim(),
        durationMinutes: (() => {
          const [sh, sm] = startTime.split(":").map(Number);
          const [eh, em] = endTime.split(":").map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff <= 0) diff += 24 * 60;
          return diff;
        })(),
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        thumbnailStorageId: thumbnailStorageId as never,
        ...(videoStorageId ? { videoStorageId: videoStorageId as never } : {}),
        ...(videoThumbnailStorageId ? { videoThumbnailStorageId: videoThumbnailStorageId as never } : {}),
      });

      router.replace({ pathname: "/(main)/member-event-detail", params: { id: eventId } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler beim Erstellen";
      Alert.alert("Fehler", msg);
    } finally {
      setCreating(false);
      setVideoUploading(false);
    }
  };

  const canCreate = name.trim() && venue.trim() && city.trim() && date.trim() && startTime.trim() && endTime.trim();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => safeBack("create-member-event")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Z Member Event</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail */}
        <TouchableOpacity style={styles.thumbPicker} onPress={handlePickThumb} activeOpacity={0.7}>
          {thumbPreview ? (
            <Image source={{ uri: thumbPreview }} style={styles.thumbImage} contentFit="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <SymbolView name="photo" size={28} tintColor={colors.gray300} />
              <Text style={styles.thumbPlaceholderText}>Titelbild hinzufügen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.label}>Event-Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Hausparty bei Max"
          placeholderTextColor={colors.gray300}
          value={name}
          onChangeText={setName}
          maxLength={80}
        />

        {/* Description */}
        <Text style={styles.label}>Beschreibung</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Was erwartet die Teilnehmer?"
          placeholderTextColor={colors.gray300}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {/* Venue */}
        <Text style={styles.label}>Ort / Venue *</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Mein Garten, Schweriner See"
          placeholderTextColor={colors.gray300}
          value={venue}
          onChangeText={setVenue}
          maxLength={120}
        />

        {/* City */}
        <Text style={styles.label}>Stadt *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CITIES.slice(0, 15).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, city === c && styles.chipActive]}
              onPress={() => setCity(c)}
            >
              <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {!CITIES.slice(0, 15).includes(city as typeof CITIES[number]) && city ? (
          <Text style={styles.selectedText}>Gewählt: {city}</Text>
        ) : null}
        <TextInput
          style={[styles.input, { marginTop: spacing.sm }]}
          placeholder="Oder Stadt eingeben"
          placeholderTextColor={colors.gray300}
          value={CITIES.includes(city as typeof CITIES[number]) ? "" : city}
          onChangeText={setCity}
        />

        {/* County */}
        <Text style={styles.label}>Landkreis</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {COUNTIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, county === c && styles.chipActive]}
              onPress={() => setCounty(county === c ? "" : c)}
            >
              <Text style={[styles.chipText, county === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date & Time */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Datum * (TT.MM.JJJJ)</Text>
            <TextInput
              style={styles.input}
              placeholder="24.04.2026"
              placeholderTextColor={colors.gray300}
              value={date}
              onChangeText={setDate}
              maxLength={10}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Startzeit *</Text>
            <TextInput
              style={styles.input}
              placeholder="19:00"
              placeholderTextColor={colors.gray300}
              value={startTime}
              onChangeText={setStartTime}
              maxLength={5}
            />
          </View>
        </View>

        {/* Duration & Max */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Endzeit *</Text>
            <TextInput
              style={styles.input}
              placeholder="23:00"
              placeholderTextColor={colors.gray300}
              value={endTime}
              onChangeText={setEndTime}
              maxLength={5}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Max. Teilnehmer</Text>
            <TextInput
              style={styles.input}
              placeholder="Unbegrenzt"
              placeholderTextColor={colors.gray300}
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* ─── Erklärvideo Section ─── */}
        <View style={styles.sectionHeader}>
          <SymbolView name="film" size={16} tintColor={colors.gray600} />
          <Text style={styles.sectionTitle}>Erklärvideo (optional)</Text>
        </View>

        {videoUri ? (
          <View style={styles.videoPreview}>
            <View style={styles.videoInfo}>
              <View style={styles.videoIconWrap}>
                <SymbolView name="checkmark.circle.fill" size={20} tintColor="#34C759" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.videoFileName}>Video ausgewählt</Text>
                {videoUploading && (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator size="small" color={colors.gray500} />
                    <Text style={styles.uploadingText}>Wird hochgeladen…</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={handleRemoveVideo} hitSlop={12}>
                <SymbolView name="trash" size={18} tintColor={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Video Thumbnail */}
            <TouchableOpacity
              style={styles.videoThumbPicker}
              onPress={handlePickVideoThumb}
              activeOpacity={0.7}
            >
              {videoThumbUri ? (
                <Image source={{ uri: videoThumbUri }} style={styles.videoThumbImg} contentFit="cover" />
              ) : (
                <View style={styles.videoThumbPlaceholder}>
                  <SymbolView name="photo" size={20} tintColor={colors.gray400} />
                  <Text style={styles.videoThumbText}>Video-Thumbnail wählen</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addVideoBtn}
            onPress={handlePickVideo}
            activeOpacity={0.7}
          >
            <SymbolView name="plus.circle.fill" size={22} tintColor={colors.black} />
            <Text style={styles.addVideoText}>Video hinzufügen</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <SymbolView name="info.circle" size={16} tintColor={colors.gray400} />
          <Text style={styles.infoText}>
            Member Events sind immer kostenlos. Es wird automatisch eine Event-Gruppe erstellt, in der du mit den Teilnehmern chatten kannst.
          </Text>
        </View>

        {/* Create button */}
        <TouchableOpacity
          style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!canCreate || creating}
          activeOpacity={0.7}
        >
          {creating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.createBtnText}>Event erstellen</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  thumbPicker: {
    height: 180,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thumbPlaceholderText: {
    fontSize: 14,
    color: colors.gray400,
    fontWeight: "500",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    marginBottom: 6,
    marginTop: spacing.md,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.black,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  chipScroll: {
    marginTop: 4,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  chipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.gray500,
  },
  chipTextActive: {
    color: colors.white,
  },
  selectedText: {
    fontSize: 13,
    color: colors.gray400,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  createBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray600,
    letterSpacing: -0.2,
  },
  videoPreview: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(52,199,89,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoFileName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.gray500,
  },
  videoThumbPicker: {
    height: 100,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  videoThumbImg: {
    width: "100%",
    height: "100%",
  },
  videoThumbPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray50,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  videoThumbText: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500",
  },
  addVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  addVideoText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },
});
