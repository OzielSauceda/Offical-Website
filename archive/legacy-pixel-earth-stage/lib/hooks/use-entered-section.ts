"use client";

import { useCallback, useState } from "react";

import type { SectionId } from "@/lib/sections";

export function useEnteredSection() {
  const [enteredSectionId, setEnteredSectionId] = useState<SectionId | null>(
    null,
  );

  const enter = useCallback((id: SectionId) => {
    setEnteredSectionId(id);
  }, []);

  const exit = useCallback(() => {
    setEnteredSectionId(null);
  }, []);

  return { enteredSectionId, enter, exit };
}
