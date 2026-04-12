import { create } from "zustand";

/**
 * Global store for tree ↔ omnisearch / relationship-finder communication.
 */
interface TreeStore {
  /** Person ID that the tree should center on */
  treeFocusId: string | null;
  /** Person ID whose node should pulse-highlight for 2 s */
  highlightPersonId: string | null;
  /** Set of person IDs that form a relationship path (highlighted in gold) */
  pathPersonIds: Set<string>;
  /** Whether the omnisearch palette is open */
  omnisearchOpen: boolean;

  setTreeFocus: (id: string) => void;
  clearHighlight: () => void;
  setPath: (ids: string[], focusId?: string) => void;
  clearPath: () => void;
  setOmnisearchOpen: (open: boolean) => void;
  toggleOmnisearch: () => void;
}

export const useTreeStore = create<TreeStore>((set) => ({
  treeFocusId: null,
  highlightPersonId: null,
  pathPersonIds: new Set<string>(),
  omnisearchOpen: false,

  setTreeFocus: (id) =>
    set({ treeFocusId: id, highlightPersonId: id }),

  clearHighlight: () =>
    set({ highlightPersonId: null }),

  setPath: (ids, focusId) =>
    set({
      pathPersonIds: new Set(ids),
      treeFocusId: focusId ?? ids[0] ?? null,
      highlightPersonId: null,
    }),

  clearPath: () =>
    set({ pathPersonIds: new Set<string>() }),

  setOmnisearchOpen: (open) => set({ omnisearchOpen: open }),

  toggleOmnisearch: () =>
    set((state) => ({ omnisearchOpen: !state.omnisearchOpen })),
}));
