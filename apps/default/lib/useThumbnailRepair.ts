import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface PostWithMedia {
  _id: string;
  type: "photo" | "video";
  mediaUrl?: string;
  thumbnailUrl?: string;
}

// Track which posts we've already repaired this session
const repairedPosts = new Set<string>();

/**
 * Background thumbnail repair hook.
 * Finds video posts without thumbnails, extracts one client-side,
 * uploads it, and patches the post. Runs once per post per session.
 * Does NOT block UI — everything is async and fire-and-forget.
 */
export function useThumbnailRepair(posts: PostWithMedia[] | undefined) {
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const patchThumbnail = useMutation(api.posts.patchThumbnail);
  const processing = useRef(false);

  useEffect(() => {
    if (!posts || posts.length === 0) return;
    if (Platform.OS === "web") return;
    if (processing.current) return;

    const videosNeedingThumbnails = posts.filter(
      p => p.type === "video" && p.mediaUrl && !p.thumbnailUrl && !repairedPosts.has(p._id)
    );

    if (videosNeedingThumbnails.length === 0) return;

    processing.current = true;

    // Process one at a time in the background, non-blocking
    (async () => {
      for (const post of videosNeedingThumbnails) {
        if (repairedPosts.has(post._id)) continue;
        repairedPosts.add(post._id);

        try {
          // Extract thumbnail (first frame, low quality for speed)
          const { uri } = await VideoThumbnails.getThumbnailAsync(post.mediaUrl!, {
            time: 0,
            quality: 0.4,
          });

          // Upload to Convex storage
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uri);
          const blob = await response.blob();
          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          const { storageId } = await uploadResult.json();

          // Patch the post
          await patchThumbnail({
            postId: post._id as never,
            thumbnailStorageId: storageId,
          });
        } catch {
          // Silently fail — don't block anything
          repairedPosts.delete(post._id);
        }
      }
      processing.current = false;
    })();
  }, [posts, generateUploadUrl, patchThumbnail]);
}
