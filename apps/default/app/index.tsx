import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { colors } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { usePushNotifications } from "@/lib/push-notifications";

function AuthenticatedRouter() {
  const me = useQuery(api.users.me);
  usePushNotifications();

  useEffect(() => {
    if (me === undefined) return; // loading
    if (me === null) {
      // No user record yet - go to auth to create one
      router.replace("/(auth)/welcome");
      return;
    }
    // Check admin
    if (me.role === "admin") {
      if (me.subscriptionStatus !== "active") {
        // Admin bypasses paywall
        router.replace("/(main)/(tabs)/groups");
        return;
      }
    }
    // Check subscription
    if (me.subscriptionStatus !== "active" && me.role !== "admin") {
      router.replace("/(auth)/paywall");
      return;
    }
    // Check onboarding
    if (!me.onboardingComplete && me.role !== "admin") {
      router.replace("/(auth)/onboarding-profile");
      return;
    }
    // All good - go to app
    router.replace("/(main)/(tabs)/groups");
  }, [me]);

  return (
    <View style={styles.container}>
      <ZLogo size={56} />
      <ActivityIndicator style={{ marginTop: 24 }} color={colors.gray400} />
    </View>
  );
}

export default function Index() {
  return (
    <View style={styles.container}>
      <AuthLoading>
        <ZLogo size={56} />
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.gray400} />
      </AuthLoading>
      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedRouter />
      </Authenticated>
    </View>
  );
}

function UnauthenticatedRedirect() {
  useEffect(() => {
    router.replace("/(auth)/welcome");
  }, []);
  return (
    <View style={styles.container}>
      <ZLogo size={56} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
