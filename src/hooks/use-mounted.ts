"use client";

import { useSyncExternalStore } from "react";

/**
 * Lint-safe hydration guard (replaces `useEffect(() => setMounted(true), [])`,
 * which trips react-hooks/set-state-in-effect).
 * Returns false on the server snapshot, true on every client render.
 */
const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
