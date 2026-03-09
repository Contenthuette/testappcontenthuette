import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { colors } from "@/lib/theme";
import { BlurView } from "expo-blur";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.gray200,
          backgroundColor: Platform.OS === "ios" ? "transparent" : colors.white,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 70,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: "Gruppen",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView name={focused ? "person.3.fill" : "person.3"} size={24} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView name={focused ? "square.stack.3d.up.fill" : "square.stack.3d.up"} size={24} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={tabStyles.createBtn}>
              <SymbolView name="plus" size={20} tintColor={colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView name={focused ? "calendar.circle.fill" : "calendar.circle"} size={24} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView name={focused ? "person.circle.fill" : "person.circle"} size={24} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
  },
});
