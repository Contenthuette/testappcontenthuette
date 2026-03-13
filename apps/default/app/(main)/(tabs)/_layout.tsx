import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { SymbolView } from "@/components/Icon";
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
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: "Community",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "person.3.fill" : "person.3"}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "rectangle.stack.fill" : "rectangle.stack"}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={tabStyles.createBtn}>
              <SymbolView name="plus" size={18} tintColor={colors.white} weight="bold" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "calendar" : "calendar"}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "person.circle.fill" : "person.circle"}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  createBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    boxShadow: "0px 4px 14px rgba(0,0,0,0.25)",
  },
});
