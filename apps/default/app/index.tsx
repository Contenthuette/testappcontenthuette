import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { colors } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { usePushNotifications } from "@/lib/push-notifications";
import { authClient } from "@/lib/auth-client";

interface SessionUser {
  email?: string;
  name?: string;
}

function AuthenticatedRouter() {
  const me = useQuery(api.users.me);
  const ensureUser = useMutation(api.users.ensureUser);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [isBootstrappingUser, setIsBootstrappingUser] = useState(false);
  usePushNotifications();

  const sessionUser =
    typeof session === "object" && session !== null && "user" in session
      ? (session.user as SessionUser | undefined)
      : undefined;

  useEffect(() => {
    console.log("[index] auth state", {
      me,
      isSessionPending,
      isBootstrappingUser,
      hasSessionUser: Boolean(sessionUser?.email),
    });
  }, [isBootstrappingUser, isSessionPending, me, sessionUser?.email]);

  useEffect(() => {
    if (me !== null || isBootstrappingUser || isSessionPending) return;
    const email = sessionUser?.email?.trim();
    if (!email) return;

    const fallbackName = email.split("@")[0] ?? "Z User";
    const name = sessionUser?.name?.trim() || fallbackName;

    console.log("[index] bootstrapping user", { email, name });
    setIsBootstrappingUser(true);
    void ensureUser({ name, email })
      .catch((error: unknown) => {
        console.log("[index] ensureUser failed", { error });
        return null;
      })
      .finally(() => {
        setIsBootstrappingUser(false);
      });
  }, [ensureUser, isBootstrappingUser, isSessionPending, me, sessionUser?.email, sessionUser?.name]);

  useEffect(() => {
    if (me === undefined || isSessionPending || isBootstrappingUser) return;
    if (me === null) {
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
  }, [isBootstrappingUser, isSessionPending, me]);

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
