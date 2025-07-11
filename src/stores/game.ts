import type { GameType } from "@/api/model";
import { create } from "zustand";

interface SelectedGameStore {
  selectedGame: GameType | null;
  setSelectedGame: (game: GameType) => void;
}

export const useSelectedGameStore = create<SelectedGameStore>((set) => ({
  selectedGame: null,
  setSelectedGame: (game) => set({ selectedGame: game }),
}));
