"use client";

/**
 * Tiny standalone context for the Testing & Funding Center modal.
 * Kept in its own module so both the wallet modal and the funding center can
 * consume it WITHOUT importing each other (no circular imports).
 */

import { createContext, useContext, useMemo, useState } from "react";

export type TestingCenterContextShape = { visible: boolean; setVisible: (open: boolean) => void };

const TestingCenterContext = createContext<TestingCenterContextShape>({
  visible: false,
  setVisible: () => undefined,
});

export function useTestingCenter(): TestingCenterContextShape {
  return useContext(TestingCenterContext);
}

export function TestingCenterProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);
  return <TestingCenterContext.Provider value={value}>{children}</TestingCenterContext.Provider>;
}
