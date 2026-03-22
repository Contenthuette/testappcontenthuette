import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import type { Id } from "@/convex/_generated/dataModel";

export default function AdminEventForm() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const isEdit = !!params.eventId;
  const eventId = params.eventId as Id<"events"> | undefined;

  const eventDetail = useQuery(
    api.admin.getEventDetail,
    eventId ? { eventId } : "skip",
  );

  const createEvent = useMutation(api.admin.createEvent);
  const updateEvent = useMutation(api.admin.updateEvent);
  const genUrl = useMutation(api.admin.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbStorageId, setThumbStorageId] = useState<Id<"_storage"> | null>(null);

  // Video state
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoStorageId, setVideoStorageId] = useState<Id<"_storage"> | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoThumbUri, setVideoThumbUri] = useState<string | null>(null);
  const [videoThumbStorageId, setVideoThumbStorageId] = useState<Id<"_storage"> | null>(null);

  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  /* Pre-fill when editing */
  useEffect(() => {
    if (isEdit && eventDetail && !seeded) {
      setName(eventDetail.name);
      setDescription(eventDetail.description ?? "");
      setVenue(eventDetail.venue);
      setCity(eventDetail.city);
      setDate(eventDetail.date);
      setStartTime(eventDetail.startTime);
      const [h, m] = eventDetail.startTime.split(":").map(Number);
      const totalMin = h * 60 + m + eventDetail.durationMinutes;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
      setTotalTickets(String(eventDetail.totalTickets));
      setTicketPrice(String(eventDetail.ticketPrice));
      if (eventDetail.thumbnailUrl) setThumbUri(eventDetail.thumbnailUrl);
      if (eventDetail.videoUrl) setVideoUri(eventDetail.videoUrl);
      if (eventDetail.videoThumbnailUrl) setVideoThumbUri(eventDetail.videoThumbnailUrl);
      setSeeded(true);
    }
  }, [isEdit, eventDetail, seeded]);

  /* Pick thumbnail */
  const handlePickThumb = async () => {
    const result = await pickImage({ mediaType: "images", quality: 0.8 });
    if (!result) return;
    setThumbUri(result.uri);
    try {
      const url = await genUrl();
      const id = await uploadToConvex(url, result.uri, result.mimeType);
      setThumbStorageId(id as Id<"_storage">);
    } catch {
      /* keep local preview */
    }
  };

  /* Pick video */
  const handlePickVideo = async () => {
    const result = await pickVideo();
    if (!result) return;
    setVideoUri(result.uri);
    setVideoUploading(true);
    try {
      const url = await genUrl();
      const id = await uploadToConvex(url, result.uri, result.mimeType);
      setVideoStorageId(id as Id<"_storage">);
    } catch {
      /* keep local preview */
    } finally {
      setVideoUploading(false);
    }
  };

  /* Pick video thumbnail */
  const handlePickVideoThumb = async () => {
    const result = await pickImage({ mediaType: "images", quality: 0.8 });
    if (!result) return;
    setVideoThumbUri(result.uri);
    try {
      const url = await genUrl();
      const id = await uploadToConvex(url, result.uri, result.mimeType);
      setVideoThumbStorageId(id as Id<"_storage">);
    } catch {
      /* keep local preview */
    }
  };

  /* Remove video */
  const handleRemoveVideo = () => {
    setVideoUri(null);
    setVideoStorageId(null);
    setVideoThumbUri(null);
    setVideoThumbStorageId(null);
  };

  /* Submit */
  const handleSave = async () => {
    if (!name.trim() || !venue.trim() || !city.trim() || !date.trim() || !startTime.trim()) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    const durationMinutes = diff || 120;
    setSaving(true);
    try {
      if (isEdit && eventId) {
        await updateEvent({
          eventId,
          name: name.trim(),
          description: description.trim() || undefined,
          venue: venue.trim(),
          city: city.trim(),
          date: date.trim(),
          startTime: startTime.trim(),
          durationMinutes,
          totalTickets: parseInt(totalTickets, 10) || 0,
          ticketPrice: parseFloat(ticketPrice) || 0,
          ...(thumbStorageId ? { thumbnailStorageId: thumbStorageId } : {}),
          ...(videoStorageId ? { videoStorageId } : {}),
          ...(videoThumbStorageId ? { videoThumbnailStorageId: videoThumbStorageId } : {}),
        });
      } else {
        await createEvent({
          name: name.trim(),
          description: description.trim() || undefined,
          venue: venue.trim(),
          city: city.trim(),
          date: date.trim(),
          startTime: startTime.trim(),
          durationMinutes,
          totalTickets: parseInt(totalTickets, 10) || 0,
          ticketPrice: parseFloat(ticketPrice) || 0,
          currency: "EUR",
          ...(thumbStorageId ? { thumbnailStorageId: thumbStorageId } : {}),
          ...(videoStorageId ? { videoStorageId } : {}),
          ...(videoThumbStorageId ? { videoThumbnailStorageId: videoThumbStorageId } : {}),
        });
      }
      router.back();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && !eventDetail) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <SymbolView name="xmark" size={16} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Event bearbeiten" : "Neues Event"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Speichern</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Thumbnail */}
          <TouchableOpacity onPress={handlePickThumb} style={styles.thumbPicker} activeOpacity={0.7}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.thumbImage} contentFit="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <SymbolView name="photo" size={28} tintColor={colors.gray300} />
                <Text style={styles.thumbText}>Thumbnail wählen</Text>
              </View>
            )}
          </TouchableOpacity>

          <Field label="Eventname *" value={name} onChangeText={setName} placeholder="z.B. Z Summer Party" />
          <Field label="Beschreibung" value={description} onChangeText={setDescription} placeholder="Was erwartet die Gäste?" multiline />
          <Field label="Veranstaltungsort *" value={venue} onChangeText={setVenue} placeholder="z.B. Kulturhaus Rostock" />
          <Field label="Stadt *" value={city} onChangeText={setCity} placeholder="z.B. Rostock" />
          <Field label="Datum *" value={date} onChangeText={setDate} placeholder="TT.MM.JJJJ" />
          <Field label="Startzeit *" value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
          <Field label="Endzeit" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
          <Field label="Ticketanzahl" value={totalTickets} onChangeText={setTotalTickets} placeholder="100" keyboardType="number-pad" />
          <Field label="Ticketpreis (EUR)" value={ticketPrice} onChangeText={setTicketPrice} placeholder="15.00" keyboardType="decimal-pad" />

          {/* ─── Video Section ─── */}
          <View style={styles.sectionHeader}>
            <SymbolView name="film" size={16} tintColor={colors.gray600} />
            <Text style={styles.sectionTitle}>Erklärvideo</Text>
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

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── field ───────────────────────────────────────────────────── */
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray300}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray50 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  saveBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  thumbPicker: {
    height: 180,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.xl,
    borderCurve: "continuous",
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  thumbText: { fontSize: 13, color: colors.gray400 },

  field: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.black,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },

  /* ─── Video section ─── */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray600,
  },
  addVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderStyle: "dashed",
  },
  addVideoText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },
  videoPreview: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  videoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8FBF0",
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
    marginTop: 3,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.gray500,
  },
  videoThumbPicker: {
    height: 120,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  videoThumbImg: {
    width: "100%",
    height: "100%",
  },
  videoThumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.gray50,
  },
  videoThumbText: {
    fontSize: 12,
    color: colors.gray400,
  },
});
