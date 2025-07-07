import { create } from "zustand";

interface GameIdStore {
  gameId: string;
  setGameId: (gameId: string) => void;
}

export const useGameStore = create<GameIdStore>((set) => ({
  gameId: "",
  setGameId: (gameId) => set({ gameId }),
}));
