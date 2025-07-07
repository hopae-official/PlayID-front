import type { CustomStage } from "@/pages/Bracket/BracketCreate";
import { create } from "zustand";

interface StageStore {
  globalStage: CustomStage | null;
  setGlobalStage: (stage: CustomStage | null) => void;
}

export const useStageStore = create<StageStore>((set) => ({
  globalStage: null,
  setGlobalStage: (stage) => set({ globalStage: stage }),
}));
