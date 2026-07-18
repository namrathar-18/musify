import { create } from 'zustand';

let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, kind }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 3500);
  },
}));

// Convenience for non-component call sites
export const toast = (message, kind) => useToastStore.getState().push(message, kind);
