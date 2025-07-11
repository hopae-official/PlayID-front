import type { Competition } from "@/api/model";
import { create } from "zustand";

interface SelectedCompetitionStore {
  selectedCompetition: Competition | null;
  setSelectedCompetition: (competition: Competition) => void;
}

export const useSelectedCompetitionStore = create<SelectedCompetitionStore>(
  (set) => ({
    selectedCompetition: null,
    setSelectedCompetition: (competition) =>
      set({ selectedCompetition: competition }),
  })
);
