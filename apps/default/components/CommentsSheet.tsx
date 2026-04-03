import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Platform, ActivityIndicator,
  Keyboard, Alert, KeyboardAvoidingView,
  useWindowDimensions, Modal, Pressable,
} from "react-native";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Animated, {
  SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

interface CommentsSheetProps {
  postId: Id<"posts"> | null;
  visible: boolean;
  onClose: () => void;
}

export function CommentsSheet({ postId, visible, onClose }: CommentsSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const me = useQuery(api.users.me, isAuthenticated ? undefined : "skip");
  const meId = me?._id;
  const router = useRouter();

  const comments = useQuery(
    api.posts.getComments,
    postId ? { postId, currentUserId: meId ?? undefined } : "skip",
  );
  const addComment = useMutation(api.posts.addComment);
  const deleteComment = useMutation(api.posts.deleteComment);
  const toggleCommentLike = useMutation(api.posts.toggleCommentLike);

  // Swipe-to-dismiss
  const translateY = useSharedValue(0);
  const sheetHeight = screenHeight * 0.7;
  const DISMISS_THRESHOLD = sheetHeight * 0.25;

  const dismissSheet = useCallback(() => {
    onClose();
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow dragging down
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        translateY.value = withSpring(sheetHeight, { damping: 20, stiffness: 200 });
        runOnJS(dismissSheet)();
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 300 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Reset when sheet opens/closes
  useEffect(() => {
    if (!visible) {
      setText("");
      translateY.value = 0;
    }
  }, [visible, translateY]);

  const handleSend = useCallback(async () => {
    const msg = text.trim();
    if (!msg || !postId) return;
    setText("");
    Keyboard.dismiss();
    try {
      await addComment({ postId, text: msg });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  }, [text, postId, addComment]);

  const handleToggleLike = useCallback(async (commentId: Id<"comments">) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await toggleCommentLike({ commentId });
    } catch (e) {
      console.error("Failed to toggle like", e);
    }
  }, [toggleCommentLike]);

  const handleDeleteComment = useCallback(async (commentId: Id<"comments">) => {
    try {
      await deleteComment({ commentId });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  }, [deleteComment]);

  const handleLongPress = useCallback((item: { _id: Id<"comments">; authorId: Id<"users"> }) => {
    if (item.authorId !== meId) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (Platform.OS === "web") {
      if (confirm("Kommentar löschen?")) {
        handleDeleteComment(item._id);
      }
    } else {
      Alert.alert(
        "Kommentar löschen",
        "Möchtest du diesen Kommentar löschen?",
        [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: () => handleDeleteComment(item._id) },
        ],
      );
    }
  }, [meId, handleDeleteComment]);

  const handleProfilePress = useCallback(
    (authorId: Id<"users">) => {
      onClose();
      setTimeout(() => {
        if (authorId === meId) {
          router.navigate("/(main)/(tabs)/profile");
        } else {
          router.navigate({ pathname: "/(main)/user-profile", params: { id: authorId } });
        }
      }, 300);
    },
    [meId, onClose, router],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.duration(350)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { height: sheetHeight }, animatedSheetStyle]}
        >
          {/* Draggable Grabber area */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.grabberArea}>
              <View style={styles.grabber} />
              <View style={styles.header}>
                <Text style={styles.title}>Kommentare</Text>
              </View>
            </View>
          </GestureDetector>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={screenHeight - sheetHeight}
          >
            {/* Comments list */}
            <FlatList
              style={styles.list}
              data={comments ?? []}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onLongPress={() => handleLongPress(item)}
                  delayLongPress={500}
                  disabled={item.authorId !== meId}
                >
                  <View style={styles.commentRow}>
                    <TouchableOpacity onPress={() => handleProfilePress(item.authorId)} activeOpacity={0.7}>
                      <Avatar uri={item.authorAvatarUrl} name={item.authorName} size={32} />
                    </TouchableOpacity>
                    <View style={styles.commentBody}>
                      <TouchableOpacity onPress={() => handleProfilePress(item.authorId)} activeOpacity={0.7}>
                        <Text style={styles.commentAuthor}>{item.authorName}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
                        {item.likeCount > 0 && (
                          <Text style={styles.commentLikeCount}>
                            {item.likeCount} {item.likeCount === 1 ? "Like" : "Likes"}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.likeBtn}
                      onPress={() => handleToggleLike(item._id)}
                      hitSlop={12}
                    >
                      <SymbolView
                        name={item.isLiked ? "heart.fill" : "heart"}
                        size={14}
                        tintColor={item.isLiked ? "#FF3B30" : "rgba(255,255,255,0.5)"}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                comments === undefined ? (
                  <View style={styles.emptyWrap}>
                    <ActivityIndicator color="rgba(255,255,255,0.4)" />
                  </View>
                ) : (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Noch keine Kommentare</Text>
                    <Text style={styles.emptySub}>Sei der Erste!</Text>
                  </View>
                )
              }
            />

            {/* Input bar */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Kommentar schreiben..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={text.trim().length === 0}
                activeOpacity={0.7}
                style={[
                  styles.sendBtn,
                  text.trim().length === 0 && styles.sendBtnDisabled,
                ]}
              >
                <SymbolView name="arrow.up" size={14} tintColor="#000" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} Std.`;
  return `${Math.floor(hrs / 24)} T.`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  grabberArea: {
    paddingTop: 10,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  emptySub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
  commentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    alignItems: "flex-start",
  },
  commentBody: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  commentText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 19,
    marginTop: 2,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 5,
  },
  commentTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  commentLikeCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
  },
  likeBtn: {
    paddingTop: 4,
    paddingLeft: 8,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    gap: 8,
    backgroundColor: "rgba(20, 20, 20, 0.95)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#fff",
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
