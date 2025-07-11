import { create } from "zustand";

interface NavOpenMenusStore {
  openMenus: { [key: string]: boolean };
  setOpenMenus: (openMenus: { [key: string]: boolean }) => void;
}

export const useNavOpenMenusStore = create<NavOpenMenusStore>((set) => ({
  openMenus: {
    "bracket-management": true,
    "result-management": true,
  },
  setOpenMenus: (openMenus) => set({ openMenus }),
}));
