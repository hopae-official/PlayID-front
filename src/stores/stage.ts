import type { Stage } from "@/pages/Bracket/BracketCreate";
import { create } from "zustand";

interface StageStore {
  globalStage: Stage | null;
  setGlobalStage: (stage: Stage | null) => void;
}

export const useStageStore = create<StageStore>((set) => ({
  globalStage: null,
  setGlobalStage: (stage) => set({ globalStage: stage }),
}));
