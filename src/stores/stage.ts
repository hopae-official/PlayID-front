import type { Stage } from "@/api/model";
import { create } from "zustand";

interface SelectedStageStore {
  selectedStage: Stage | null;
  setSelectedStage: (stage: Stage) => void;
}

export const useSelectedStageStore = create<SelectedStageStore>((set) => ({
  selectedStage: null,
  setSelectedStage: (stage) => set({ selectedStage: stage }),
}));
