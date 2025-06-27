import { create } from "zustand";

interface ExpandStore {
  isExpand: boolean;
  setIsExpand: (isExpand: boolean) => void;
}

export const useExpandStore = create<ExpandStore>((set) => ({
  isExpand: false,
  setIsExpand: (isExpand) => set({ isExpand }),
}));
