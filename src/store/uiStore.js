import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  wizardDraft: null,
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  saveWizardDraft: (draft) => set({ wizardDraft: draft }),
  clearWizardDraft: () => set({ wizardDraft: null }),
}))

