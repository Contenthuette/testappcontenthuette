import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { router } from "expo-router";
import { useCallContext } from "@/lib/call-context";

interface ActiveCallScreenProps {
  callId: Id<"calls">;
}

export function ActiveCallScreen({ callId }: ActiveCallScreenProps) {
  const call = useQuery(api.calls.getCallDetails, { callId });
  const endCallMutation = useMutation(api.calls.endCall);
  const toggleMuteMutation = useMutation(api.calls.toggleMute);
  const toggleVideoMutation = useMutation(api.calls.toggleVideo);
  const me = useQuery(api.users.me);
  const { minimizeCall } = useCallContext();

  const [elapsed, setElapsed] = useState(0);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Navigate away when call ends
  useEffect(() => {
    if (call && (call.status === "ended" || call.status === "declined" || call.status === "missed")) {
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
  const otherParticipants = call?.participants.filter((p) => p.userId !== me?._id) ?? [];
  const isMuted = myParticipant?.isMuted ?? false;
  const isVideoOff = myParticipant?.isVideoOff ?? true;
  const isVideoCall = call?.type === "video";

  const handleMinimize = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    minimizeCall(callId);
    if (router.canGoBack()) router.back();
  }, [callId, minimizeCall]);

  const handleEndCall = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await endCallMutation({ callId });
    } catch { /* ignore */ }
  }, [callId, endCallMutation]);

  const handleToggleMute = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleMuteMutation({ callId });
    } catch { /* ignore */ }
  }, [callId, toggleMuteMutation]);

  const handleToggleVideo = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleVideoMutation({ callId });
    } catch { /* ignore */ }
  }, [callId, toggleVideoMutation]);

  const handleFlipCamera = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpeaker((prev) => !prev);
  }, []);

  if (!call) {
    return (
      <View style={styles.container}>
        <Text style={styles.connectingText}>Verbinde…</Text>
      </View>
    );
  }

  const isEnded = call.status === "ended" || call.status === "declined" || call.status === "missed";
  const displayName = call.groupName ?? call.callerName;
  const mainAvatar = otherParticipants[0];
  const connectedCount = otherParticipants.filter((p) => p.status === "connected").length;

  const statusLabel = isEnded
    ? "Anruf beendet"
    : call.status === "ringing"
      ? "klingelt…"
      : call.status === "active"
        ? formatTime(elapsed)
        : "Verbinde…";

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleMinimize}
            style={styles.minimizeBtn}
          >
            <SymbolView name="chevron.down" size={20} tintColor="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.topName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.topStatus}>{statusLabel}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Center: Avatar / participants */}
        <View style={styles.centerArea}>
          {call.groupId && otherParticipants.length > 1 ? (
            <View style={styles.avatarGrid}>
              {otherParticipants.filter((p) => p.status === "connected").map((p) => (
                <View key={p._id} style={styles.gridItem}>
                  <Avatar uri={p.userAvatarUrl} name={p.userName} size={80} />
                  <Text style={styles.gridName} numberOfLines={1}>{p.userName}</Text>
                  {p.isMuted && (
                    <View style={styles.muteBadge}>
                      <SymbolView name="mic.slash.fill" size={12} tintColor="#FFF" />
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
              {call.groupId && (
                <Text style={styles.groupParticipantCount}>
                  {connectedCount} Teilnehmer
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom controls */}
        {!isEnded && (
          <Animated.View style={styles.controls} entering={FadeIn.delay(200)}>
            {isVideoCall ? (
              /* Video call: 5 buttons */
              <>
                <View style={styles.controlRow}>
                  {/* Mute */}
                  <TouchableOpacity
                    style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isMuted ? "mic.slash.fill" : "mic.fill"}
                      size={22}
                      tintColor={isMuted ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>

                  {/* Video */}
                  <TouchableOpacity
                    style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
                    onPress={handleToggleVideo}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isVideoOff ? "video.slash.fill" : "video.fill"}
                      size={22}
                      tintColor={isVideoOff ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>

                  {/* End call */}
                  <TouchableOpacity
                    style={styles.endCallBtn}
                    onPress={handleEndCall}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="phone.down.fill" size={26} tintColor="#FFF" />
                  </TouchableOpacity>

                  {/* Camera flip */}
                  <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={handleFlipCamera}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="camera.rotate.fill" size={22} tintColor="#FFF" />
                  </TouchableOpacity>

                  {/* Speaker */}
                  <TouchableOpacity
                    style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
                    onPress={handleToggleSpeaker}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isSpeaker ? "speaker.wave.3.fill" : "speaker.fill"}
                      size={22}
                      tintColor={isSpeaker ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.controlLabel}>Stumm</Text>
                  <Text style={styles.controlLabel}>Video</Text>
                  <Text style={[styles.controlLabel, { width: 68 }]}>{" "}</Text>
                  <Text style={styles.controlLabel}>Wechseln</Text>
                  <Text style={styles.controlLabel}>Lautspr.</Text>
                </View>
              </>
            ) : (
              /* Audio call: 3 buttons */
              <>
                <View style={styles.controlRow}>
                  {/* Mute */}
                  <TouchableOpacity
                    style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isMuted ? "mic.slash.fill" : "mic.fill"}
                      size={22}
                      tintColor={isMuted ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>

                  {/* End call */}
                  <TouchableOpacity
                    style={styles.endCallBtn}
                    onPress={handleEndCall}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="phone.down.fill" size={26} tintColor="#FFF" />
                  </TouchableOpacity>

                  {/* Speaker */}
                  <TouchableOpacity
                    style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
                    onPress={handleToggleSpeaker}
                    activeOpacity={0.7}
                  >
                    <SymbolView
                      name={isSpeaker ? "speaker.wave.3.fill" : "speaker.fill"}
                      size={22}
                      tintColor={isSpeaker ? "#000" : "#FFF"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.controlLabel}>Stumm</Text>
                  <Text style={[styles.controlLabel, { width: 68 }]}>{" "}</Text>
                  <Text style={styles.controlLabel}>Lautspr.</Text>
                </View>
              </>
            )}
          </Animated.View>
        )}

        {isEnded && (
          <Animated.View style={styles.endedContainer} entering={FadeIn}>
            <Text style={styles.endedText}>Anruf beendet</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </Animated.View>
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
  connectingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 17,
    textAlign: "center",
    marginTop: 100,
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
