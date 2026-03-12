import { createContext, useContext } from "react";
import { Id } from "@/convex/_generated/dataModel";

export interface CallContextType {
  minimizedCallId: Id<"calls"> | null;
  minimizeCall: (callId: Id<"calls">) => void;
  expandCall: () => void;
}

export const CallContext = createContext<CallContextType>({
  minimizedCallId: null,
  minimizeCall: () => {},
  expandCall: () => {},
});

export function useCallContext() {
  return useContext(CallContext);
}
