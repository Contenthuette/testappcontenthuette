import React from "react";
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { SymbolView } from "@/components/Icon";
import { theme } from "@/lib/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilter?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = "Search...", onFilter }: SearchBarProps) {
  return (
    <View style={s.container}>
      <SymbolView name="magnifyingglass" size={18} tintColor={theme.textSecondary} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
      />
      {onFilter && (
        <TouchableOpacity onPress={onFilter}>
          <SymbolView name="line.3.horizontal.decrease" size={18} tintColor={theme.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  input: { flex: 1, fontSize: 16, color: theme.text },
});
