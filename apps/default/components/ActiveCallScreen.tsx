import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import {
  LiveKitCallView,
  type LiveKitCallViewHandle,
} from "@/components/LiveKitCallView";

interface ActiveCallScreenProps {
  callId: Id<"calls">;
}

type ConnectionState = "idle" | "fetching-token" | "connecting" | "connected" | "error";

export function ActiveCallScreen({ callId }: ActiveCallScreenProps) {
  const call = useQuery(api.calls.getCallDetails, { callId });
  const endCallMutation = useMutation(api.calls.endCall);
  const toggleMuteMutation = useMutation(api.calls.toggleMute);
  const toggleVideoMutation = useMutation(api.calls.toggleVideo);
  const getCallToken = useAction(api.calls.getCallToken);
  const me = useQuery(api.users.me);
  const { minimizeCall } = useCallContext();

  const [elapsed, setElapsed] = useState(0);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const livekitRef = useRef<LiveKitCallViewHandle>(null);
  const tokenFetchedRef = useRef(false);

  // Duration timer
  useEffect(() => {
    if (call?.status === "active" && call.answeredAt) {
      setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call?.status, call?.answeredAt]);

  // Connect to LiveKit when call becomes active
  useEffect(() => {
    if (
      call?.status === "active" &&
      connectionState === "idle" &&
      !tokenFetchedRef.current
    ) {
      tokenFetchedRef.current = true;
      setConnectionState("fetching-token");

      getCallToken({ callId })
        .then(({ token, wsUrl }) => {
          setConnectionState("connecting");
          // Short delay to let WebView initialize
          setTimeout(() => {
            livekitRef.current?.connect(wsUrl, token, call.type === "video");
          }, 1000);
        })
        .catch((err: unknown) => {
          console.error("Failed to get call token:", err);
          setConnectionState("error");
          setErrorMsg(
            err instanceof Error ? err.message : "Token-Fehler"
          );
        });
    }
  }, [call?.status, call?.type, callId, connectionState, getCallToken]);

  // Disconnect LiveKit when call ends
  useEffect(() => {
    if (
      call &&
      (call.status === "ended" ||
        call.status === "declined" ||
        call.status === "missed")
    ) {
      livekitRef.current?.disconnect();
      const timeout = setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [call?.status]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const myParticipant = call?.participants.find((p) => p.userId === me?._id);
  const otherParticipants =
    call?.participants.filter((p) => p.userId !== me?._id) ?? [];
  const isMuted = myParticipant?.isMuted ?? false;
  const isVideoOff = myParticipant?.isVideoOff ?? true;
  const isVideoCall = call?.type === "video";

  const handleMinimize = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    minimizeCall(callId);
    if (router.canGoBack()) router.back();
  }, [callId, minimizeCall]);

  const handleEndCall = useCallback(async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    livekitRef.current?.disconnect();
    try {
      await endCallMutation({ callId });
    } catch (e) {
      console.error("Failed to end call", e);
    }
  }, [callId, endCallMutation]);

  const handleToggleMute = useCallback(async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    livekitRef.current?.toggleMute();
    try {
      await toggleMuteMutation({ callId });
    } catch (e) {
      console.error("Failed to toggle mute", e);
    }
  }, [callId, toggleMuteMutation]);

  const handleToggleVideo = useCallback(async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    livekitRef.current?.toggleVideo();
    try {
      await toggleVideoMutation({ callId });
    } catch (e) {
      console.error("Failed to toggle video", e);
    }
  }, [callId, toggleVideoMutation]);

  const handleFlipCamera = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    livekitRef.current?.flipCamera();
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpeaker((prev) => !prev);
  }, []);

  const handleLiveKitConnected = useCallback(() => {
    setConnectionState("connected");
  }, []);

  const handleLiveKitDisconnected = useCallback(() => {
    setConnectionState("idle");
  }, []);

  const handleLiveKitError = useCallback((message: string) => {
    console.error("LiveKit error:", message);
    setErrorMsg(message);
  }, []);

  if (!call) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFF" size="large" />
        <Text style={styles.connectingText}>Verbinde…</Text>
      </View>
    );
  }

  const isEnded =
    call.status === "ended" ||
    call.status === "declined" ||
    call.status === "missed";
  const displayName = call.groupName ?? call.callerName;
  const mainAvatar = otherParticipants[0];
  const connectedCount = otherParticipants.filter(
    (p) => p.status === "connected"
  ).length;

  const statusLabel = isEnded
    ? "Anruf beendet"
    : connectionState === "connected" && call.status === "active"
      ? formatTime(elapsed)
      : call.status === "ringing"
        ? "Klingelt…"
        : connectionState === "fetching-token" || connectionState === "connecting"
          ? "Verbinde LiveKit…"
          : connectionState === "error"
            ? errorMsg ?? "Fehler"
            : "Verbinde…";

  const showLiveKitVideo = isVideoCall && call.status === "active";

  return (
    <View style={styles.container}>
      {/* LiveKit WebView – invisible for audio, visible for video */}
      <LiveKitCallView
        ref={livekitRef}
        isVideoCall={isVideoCall ?? false}
        onConnected={handleLiveKitConnected}
        onDisconnected={handleLiveKitDisconnected}
        onError={handleLiveKitError}
      />

      <SafeAreaView
        style={[
          styles.safeArea,
          showLiveKitVideo && styles.overlayOnVideo,
        ]}
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        {/* Top bar */}
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleMinimize}
            style={styles.minimizeBtn}
            activeOpacity={0.7}
          >
            <SymbolView
              name="chevron.down"
              size={20}
              tintColor="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.topName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.topStatus}>{statusLabel}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Center: Avatar (audio) or spacer (video) */}
        {!showLiveKitVideo && (
          <View style={styles.centerArea}>
            {call.groupId && otherParticipants.length > 1 ? (
              <View style={styles.avatarGrid}>
                {otherParticipants
                  .filter((p) => p.status === "connected")
                  .map((p) => (
                    <View key={p._id} style={styles.gridItem}>
                      <Avatar
                        uri={p.userAvatarUrl}
                        name={p.userName}
                        size={80}
                      />
                      <Text style={styles.gridName} numberOfLines={1}>
                        {p.userName}
                      </Text>
                      {p.isMuted && (
                        <View style={styles.muteBadge}>
                          <SymbolView
                            name="mic.slash.fill"
                            size={12}
                            tintColor="#FFF"
                          />
                        </View>
                      )}
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.singleAvatar}>
                <Avatar
                  uri={mainAvatar?.userAvatarUrl}
                  name={mainAvatar?.userName ?? displayName}
                  size={140}
                />
                {connectionState === "connecting" ||
                connectionState === "fetching-token" ? (
                  <ActivityIndicator
                    color="rgba(255,255,255,0.5)"
                    style={{ marginTop: 16 }}
                  />
                ) : null}
                {call.groupId && (
                  <Text style={styles.groupParticipantCount}>
                    {connectedCount} Teilnehmer
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Spacer for video calls so controls stay at bottom */}
        {showLiveKitVideo && <View style={{ flex: 1 }} />}

        {/* Bottom controls */}
        {!isEnded && (
          <View style={styles.controls}>
            {isVideoCall ? (
              <>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={[
                      styles.controlBtn,
                      isMuted && styles.controlBtnActive,
                    ]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isMuted ? "mic.slash.fill" : "mic.fill"}
                      size={22}
                      tintColor={isMuted ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.controlBtn,
                      isVideoOff && styles.controlBtnActive,
                    ]}
                    onPress={handleToggleVideo}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isVideoOff ? "video.slash.fill" : "video.fill"}
                      size={22}
                      tintColor={isVideoOff ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.endCallBtn}
                    onPress={handleEndCall}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name="phone.down.fill"
                      size={26}
                      tintColor="#FFF"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={handleFlipCamera}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name="camera.rotate.fill"
                      size={22}
                      tintColor="#FFF"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.controlBtn,
                      isSpeaker && styles.controlBtnActive,
                    ]}
                    onPress={handleToggleSpeaker}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={
                        isSpeaker
                          ? "speaker.wave.3.fill"
                          : "speaker.fill"
                      }
                      size={22}
                      tintColor={isSpeaker ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.controlLabel}>Stumm</Text>
                  <Text style={styles.controlLabel}>Video</Text>
                  <Text style={[styles.controlLabel, { width: 68 }]}>
                    {" "}
                  </Text>
                  <Text style={styles.controlLabel}>Wechseln</Text>
                  <Text style={styles.controlLabel}>Lautspr.</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={[
                      styles.controlBtn,
                      isMuted && styles.controlBtnActive,
                    ]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isMuted ? "mic.slash.fill" : "mic.fill"}
                      size={22}
                      tintColor={isMuted ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.endCallBtn}
                    onPress={handleEndCall}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name="phone.down.fill"
                      size={26}
                      tintColor="#FFF"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.controlBtn,
                      isSpeaker && styles.controlBtnActive,
                    ]}
                    onPress={handleToggleSpeaker}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={
                        isSpeaker
                          ? "speaker.wave.3.fill"
                          : "speaker.fill"
                      }
                      size={22}
                      tintColor={isSpeaker ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.controlLabel}>Stumm</Text>
                  <Text style={[styles.controlLabel, { width: 68 }]}>
                    {" "}
                  </Text>
                  <Text style={styles.controlLabel}>Lautspr.</Text>
                </View>
              </>
            )}
          </View>
        )}

        {isEnded && (
          <View style={styles.endedContainer}>
            <Text style={styles.endedText}>Anruf beendet</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
  },
  overlayOnVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  connectingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 17,
    textAlign: "center",
    marginTop: 16,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  minimizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  topInfo: {
    flex: 1,
    alignItems: "center",
  },
  topName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
  },
  topStatus: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },

  // Center
  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  singleAvatar: {
    alignItems: "center",
    gap: 20,
  },
  groupParticipantCount: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 30,
  },
  gridItem: {
    alignItems: "center",
    gap: 8,
  },
  gridName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    maxWidth: 80,
    textAlign: "center",
  },
  muteBadge: {
    position: "absolute",
    bottom: 22,
    right: -4,
    backgroundColor: "#EF4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // Controls
  controls: {
    paddingBottom: 20,
    alignItems: "center",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
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
    backgroundColor: "#FFFFFF",
  },
  endCallBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
  },
  controlLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    width: 52,
  },

  endedContainer: {
    paddingBottom: 60,
    alignItems: "center",
  },
  endedText: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
});
