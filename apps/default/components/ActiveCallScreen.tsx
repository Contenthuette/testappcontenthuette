import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { router } from "expo-router";
import { useCallContext } from "@/lib/call-context";
import { useSound } from "@/lib/sounds";
import {
  LiveKitCallView,
  type LiveKitCallViewHandle,
} from "@/components/LiveKitCallView";

interface ActiveCallScreenProps {
  callId: Id<"calls">;
}

export function ActiveCallScreen({ callId }: ActiveCallScreenProps) {
  const call = useQuery(api.calls.getCallDetails, { callId });
  const endCallMutation = useMutation(api.calls.endCall);
  const getCallToken = useAction(api.calls.getCallToken);
  const me = useQuery(api.users.me);
  const { minimizeCall } = useCallContext();
  const { playSound } = useSound();

  const [phase, setPhase] = useState<
    "ringing" | "connecting" | "live" | "ended" | "error"
  >("ringing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const livekitRef = useRef<LiveKitCallViewHandle>(null);
  const tokenFetchedRef = useRef(false);
  const hangingUpRef = useRef(false);

  const isVideoCall = call?.type === "video";

  // Connect to LiveKit when call becomes active
  useEffect(() => {
    if (
      call?.status === "active" &&
      phase === "ringing" &&
      !tokenFetchedRef.current
    ) {
      tokenFetchedRef.current = true;
      setPhase("connecting");

      getCallToken({ callId })
        .then(({ token, wsUrl }) => {
          setTimeout(() => {
            livekitRef.current?.connect(wsUrl, token, call.type === "video");
          }, 800);
        })
        .catch((err: unknown) => {
          console.error("Failed to get call token:", err);
          setPhase("error");
          setErrorMsg(err instanceof Error ? err.message : "Token-Fehler");
        });
    }
  }, [call?.status, call?.type, callId, phase, getCallToken]);

  // Watch for call ending in DB
  useEffect(() => {
    if (
      call &&
      (call.status === "ended" ||
        call.status === "declined" ||
        call.status === "missed")
    ) {
      livekitRef.current?.disconnect();
      setPhase("ended");
      const timeout = setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [call?.status]);

  // ─── INSTANT native handlers ───

  const handleHangUp = useCallback(() => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;

    playSound("hangup");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    livekitRef.current?.disconnect();
    setPhase("ended");
    endCallMutation({ callId }).catch(() => {});
    setTimeout(() => {
      if (router.canGoBack()) router.back();
    }, 400);
  }, [callId, endCallMutation, playSound]);

  const handleToggleMute = useCallback(() => {
    playSound("tap");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Optimistic UI update — instant visual feedback
    setIsMuted((prev) => !prev);
    livekitRef.current?.toggleMute();
  }, [playSound]);

  const handleToggleVideo = useCallback(() => {
    playSound("tap");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsVideoOff((prev) => !prev);
    livekitRef.current?.toggleVideo();
  }, [playSound]);

  const handleFlipCamera = useCallback(() => {
    playSound("tap");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    livekitRef.current?.flipCamera();
  }, [playSound]);

  const handleMinimize = useCallback(() => {
    playSound("tap");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    minimizeCall(callId);
    if (router.canGoBack()) router.back();
  }, [callId, minimizeCall, playSound]);

  const handleLiveKitConnected = useCallback(() => {
    setPhase("live");
  }, []);

  const handleLiveKitDisconnected = useCallback(() => {
    if (phase === "live" && !hangingUpRef.current) {
      hangingUpRef.current = true;
      setPhase("ended");
      endCallMutation({ callId }).catch(() => {});
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 500);
    }
  }, [phase, callId, endCallMutation]);

  const handleLiveKitError = useCallback((message: string) => {
    console.error("LiveKit error:", message);
    setPhase("error");
    setErrorMsg(message);
  }, []);

  const handleControlState = useCallback(
    (state: { isMuted: boolean; isVideoOff: boolean }) => {
      // Sync native state with WebView truth
      setIsMuted(state.isMuted);
      setIsVideoOff(state.isVideoOff);
    },
    []
  );

  // Loading
  if (!call) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFF" size="large" />
        <Text style={styles.statusText}>Verbinde…</Text>
      </View>
    );
  }

  const otherParticipants =
    call.participants.filter((p) => p.userId !== me?._id) ?? [];
  const mainOther = otherParticipants[0];
  const displayName = call.groupName ?? call.callerName;

  // Ringing / connecting
  if (phase === "ringing" || phase === "connecting") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.ringingContent} edges={["top", "bottom"]}>
          <View style={styles.ringingTop}>
            <Text style={styles.ringingLabel}>
              {isVideoCall ? "Videoanruf" : "Anruf"}
            </Text>
            <Text style={styles.ringingName}>{displayName}</Text>
            <Text style={styles.ringingStatus}>
              {phase === "connecting" ? "Verbinde…" : "Klingelt…"}
            </Text>
          </View>

          <View style={styles.ringingCenter}>
            {call.groupId && otherParticipants.length > 1 ? (
              <View style={styles.avatarRow}>
                {otherParticipants.slice(0, 4).map((p) => (
                  <Avatar
                    key={p._id}
                    uri={p.userAvatarUrl}
                    name={p.userName}
                    size={72}
                  />
                ))}
              </View>
            ) : (
              <Avatar
                uri={mainOther?.userAvatarUrl}
                name={mainOther?.userName ?? displayName}
                size={140}
              />
            )}
            {phase === "connecting" && (
              <ActivityIndicator
                color="rgba(255,255,255,0.4)"
                style={{ marginTop: 24 }}
              />
            )}
          </View>

          <View style={styles.ringingBottom}>
            <Pressable
              style={({ pressed }) => [
                styles.endCallBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleHangUp}
            >
              <SymbolView name="phone.down.fill" size={28} tintColor="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>Auflegen</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error
  if (phase === "error") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.ringingContent} edges={["top", "bottom"]}>
          <View style={styles.ringingCenter}>
            <SymbolView
              name="exclamationmark.triangle.fill"
              size={48}
              tintColor="#EF4444"
            />
            <Text style={styles.errorText}>
              {errorMsg ?? "Verbindungsfehler"}
            </Text>
          </View>
          <View style={styles.ringingBottom}>
            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.canGoBack() && router.back()}
            >
              <Text style={styles.backBtnText}>Zurück</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Ended
  if (phase === "ended") {
    return (
      <View style={styles.container}>
        <View style={styles.ringingCenter}>
          <SymbolView
            name="phone.down.fill"
            size={48}
            tintColor="rgba(255,255,255,0.4)"
          />
          <Text style={styles.endedText}>Anruf beendet</Text>
        </View>
      </View>
    );
  }

  // ─── Live call: WebView + NATIVE control overlay ───
  return (
    <View style={styles.container}>
      <LiveKitCallView
        ref={livekitRef}
        onConnected={handleLiveKitConnected}
        onDisconnected={handleLiveKitDisconnected}
        onHangUp={handleHangUp}
        onError={handleLiveKitError}
        onControlState={handleControlState}
      />

      {/* Full native overlay — 100% touch reliable */}
      <SafeAreaView
        style={styles.nativeOverlay}
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        {/* Top: minimize */}
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable
            onPress={handleMinimize}
            style={({ pressed }) => [
              styles.minimizeBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={12}
          >
            <SymbolView
              name="chevron.down"
              size={18}
              tintColor="rgba(255,255,255,0.9)"
            />
          </Pressable>
        </View>

        {/* Bottom: all controls — fully native */}
        <View style={styles.bottomControls} pointerEvents="box-none">
          {/* Mute */}
          <View style={styles.controlGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.controlBtn,
                isMuted && styles.controlBtnActive,
                pressed && styles.btnPressed,
              ]}
              onPress={handleToggleMute}
              hitSlop={8}
            >
              <SymbolView
                name={isMuted ? "mic.slash.fill" : "mic.fill"}
                size={22}
                tintColor={isMuted ? "#111" : "#FFF"}
              />
            </Pressable>
            <Text style={styles.controlLabel}>
              {isMuted ? "Stumm" : "Mikro"}
            </Text>
          </View>

          {/* Video toggle — only for video calls */}
          {isVideoCall && (
            <View style={styles.controlGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.controlBtn,
                  isVideoOff && styles.controlBtnActive,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleToggleVideo}
                hitSlop={8}
              >
                <SymbolView
                  name={
                    isVideoOff
                      ? "video.slash.fill"
                      : "video.fill"
                  }
                  size={22}
                  tintColor={isVideoOff ? "#111" : "#FFF"}
                />
              </Pressable>
              <Text style={styles.controlLabel}>
                {isVideoOff ? "Kamera aus" : "Kamera"}
              </Text>
            </View>
          )}

          {/* Hang up */}
          <View style={styles.controlGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.hangupBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={handleHangUp}
              hitSlop={8}
            >
              <SymbolView name="phone.down.fill" size={24} tintColor="#FFF" />
            </Pressable>
            <Text style={styles.controlLabel}>Auflegen</Text>
          </View>

          {/* Flip camera — only for video calls */}
          {isVideoCall && (
            <View style={styles.controlGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.controlBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={handleFlipCamera}
                hitSlop={8}
              >
                <SymbolView
                  name="camera.rotate.fill"
                  size={22}
                  tintColor="#FFF"
                />
              </Pressable>
              <Text style={styles.controlLabel}>Wechseln</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 17,
    marginTop: 16,
  },

  // Ringing
  ringingContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  ringingTop: {
    alignItems: "center",
    paddingTop: 40,
  },
  ringingLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  ringingName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    marginTop: 8,
  },
  ringingStatus: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginTop: 6,
  },
  ringingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  avatarRow: {
    flexDirection: "row",
    gap: 12,
  },
  ringingBottom: {
    alignItems: "center",
    paddingBottom: 40,
    gap: 8,
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },

  // Error
  errorText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  // Ended
  endedText: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    marginTop: 12,
  },

  // ─── Native overlay on live call ───
  nativeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    zIndex: 50,
  },
  topRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  minimizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── Bottom controls bar ───
  bottomControls: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  controlGroup: {
    alignItems: "center",
    gap: 6,
    minWidth: 56,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlBtnActive: {
    backgroundColor: "#FFF",
  },
  hangupBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 4px 20px rgba(239, 68, 68, 0.5)",
  },
  controlLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
});
