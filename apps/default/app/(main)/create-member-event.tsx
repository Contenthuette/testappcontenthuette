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
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CITIES, COUNTIES } from "@/lib/constants";

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
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [maxAttendees, setMaxAttendees] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const handlePickThumb = async () => {
    const result = await pickImage({ mediaType: "images", allowsEditing: true, aspect: [16, 9] });
    if (result) {
      setThumbPreview(result.uri);
      setThumbFile({ uri: result.uri, mimeType: result.mimeType });
    }
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
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Fehler", "Bitte gib ein Datum im Format JJJJ-MM-TT ein.");
      return;
    }
    if (!startTime.trim() || !/^\d{2}:\d{2}$/.test(startTime)) {
      Alert.alert("Fehler", "Bitte gib eine Uhrzeit im Format HH:MM ein.");
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

      const eventId = await createEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        venue: venue.trim(),
        city: city.trim(),
        county: county || undefined,
        date: date.trim(),
        startTime: startTime.trim(),
        durationMinutes: parseInt(durationMinutes, 10) || 120,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        thumbnailStorageId: thumbnailStorageId as never,
      });

      router.replace({ pathname: "/(main)/member-event-detail", params: { id: eventId } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler beim Erstellen";
      Alert.alert("Fehler", msg);
    } finally {
      setCreating(false);
    }
  };

  const canCreate = name.trim() && venue.trim() && city.trim() && date.trim() && startTime.trim();

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
            <Text style={styles.label}>Datum * (JJJJ-MM-TT)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-06-15"
              placeholderTextColor={colors.gray300}
              value={date}
              onChangeText={setDate}
              maxLength={10}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Uhrzeit * (HH:MM)</Text>
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
            <Text style={styles.label}>Dauer (Minuten)</Text>
            <TextInput
              style={styles.input}
              placeholder="120"
              placeholderTextColor={colors.gray300}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="number-pad"
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
});
