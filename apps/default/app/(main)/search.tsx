import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { COUNTIES, CITIES, INTERESTS } from "@/lib/constants";

export default function SearchScreen() {
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [ageFrom, setAgeFrom] = useState("");
  const [ageTo, setAgeTo] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (i: string) => {
    setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const genderOptions = ["M\u00e4nnlich", "Weiblich", "Divers", "Alle"];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <SymbolView name="slider.horizontal.3" size={20} tintColor={colors.black} />
        <Text style={styles.title}>Filter</Text>
        <TouchableOpacity onPress={() => { setCounty(""); setCity(""); setGender(""); setAgeFrom(""); setAgeTo(""); setSelectedInterests([]); }}>
          <Text style={styles.resetText}>Zur\u00fccksetzen</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Landkreis</Text>
        <View style={styles.chips}>
          {COUNTIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, county === c && styles.chipActive]} onPress={() => setCounty(county === c ? "" : c)}>
              <Text style={[styles.chipText, county === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Stadt</Text>
        <View style={styles.chips}>
          {CITIES.map(c => (
            <TouchableOpacity key={c} style={[styles.chip, city === c && styles.chipActive]} onPress={() => setCity(city === c ? "" : c)}>
              <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Geschlecht</Text>
        <View style={styles.chips}>
          {genderOptions.map(g => (
            <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(gender === g ? "" : g)}>
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Alter</Text>
        <View style={styles.ageRow}>
          <TextInput style={styles.ageInput} placeholder="Von" placeholderTextColor={colors.gray400} value={ageFrom} onChangeText={setAgeFrom} keyboardType="numeric" />
          <Text style={styles.ageDash}>\u2013</Text>
          <TextInput style={styles.ageInput} placeholder="Bis" placeholderTextColor={colors.gray400} value={ageTo} onChangeText={setAgeTo} keyboardType="numeric" />
        </View>

        <Text style={styles.sectionTitle}>Interessen</Text>
        <View style={styles.chips}>
          {INTERESTS.slice(0, 50).map(i => (
            <TouchableOpacity key={i} style={[styles.chip, selectedInterests.includes(i) && styles.chipActive]} onPress={() => toggleInterest(i)}>
              <Text style={[styles.chipText, selectedInterests.includes(i) && styles.chipTextActive]}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.applyBtn} onPress={() => router.back()}>
          <Text style={styles.applyText}>Filter anwenden</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.black },
  resetText: { fontSize: 14, fontWeight: "500", color: colors.gray500 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: colors.black, marginTop: spacing.xl, marginBottom: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 13, color: colors.gray700 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  ageRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ageInput: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.gray100, paddingHorizontal: spacing.md, fontSize: 16, color: colors.black },
  ageDash: { fontSize: 18, color: colors.gray400 },
  applyBtn: { marginTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.black, borderRadius: radius.lg, alignItems: "center" },
  applyText: { fontSize: 16, fontWeight: "600", color: colors.white },
});
