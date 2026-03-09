import React from "react";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          borderTopColor: colors.gray100,
          backgroundColor: colors.white,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: "Gruppen",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="person.3" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="square.grid.2x2" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Erstellen",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="plus.circle.fill" size={size + 4} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="calendar" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="person.circle" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
