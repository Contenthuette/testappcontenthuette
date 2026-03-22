import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { usePushNotifications } from "@/lib/push-notifications";

function AuthenticatedRouter() {
  const me = useQuery(api.users.me);
  usePushNotifications();
  const [hasWaited, setHasWaited] = useState(false);

  // Give the backend time to create the user record on first login
  useEffect(() => {
    if (me === null && !hasWaited) {
      const timer = setTimeout(() => setHasWaited(true), 2000);
      return () => clearTimeout(timer);
    }
    if (me !== null && me !== undefined) {
      setHasWaited(true);
    }
  }, [me, hasWaited]);

  useEffect(() => {
    if (me === undefined) {
      return;
    }
    // Don't redirect to welcome until we've waited for the user record
    if (me === null && !hasWaited) {
      return;
    }
    if (me === null) {
      router.replace("/(auth)/welcome");
      return;
    }
    if (me.role === "admin") {
      router.replace("/(main)/(tabs)/groups");
      return;
    }
    if (me.subscriptionStatus !== "active") {
      router.replace("/(auth)/paywall");
      return;
    }
    if (!me.onboardingComplete) {
      router.replace("/(auth)/onboarding-profile");
      return;
    }
    router.replace("/(main)/(tabs)/groups");
  }, [me, hasWaited]);

  return (
    <View style={styles.container}>
      <ZLogo size={56} />
      <ActivityIndicator style={styles.spinner} color={colors.gray400} />
    </View>
  );
}

export default function Index() {
  return (
    <View style={styles.container}>
      <AuthLoading>
        <ZLogo size={56} />
        <ActivityIndicator style={styles.spinner} color={colors.gray400} />
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
  spinner: {
    marginTop: 24,
  },
});
