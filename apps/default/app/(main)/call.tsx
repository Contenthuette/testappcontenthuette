import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Id } from "@/convex/_generated/dataModel";
import { ActiveCallScreen } from "@/components/ActiveCallScreen";

export default function CallRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <ActiveCallScreen callId={id as Id<"calls">} />;
}
