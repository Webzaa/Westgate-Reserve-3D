// Tiny shared store so the mobile enquiry popup, its bottom bar and the
// cinematic journey can coordinate without prop-drilling through Home.
import { useSyncExternalStore } from "react";

interface EnquiryState {
  /** Mobile popup form is open. */
  open: boolean;
  /** The in-journey (wave + doors) form is on screen, so the bottom bar steps aside. */
  inlineFormVisible: boolean;
  // header background change on form enter
  formReached: boolean;
}

let state: EnquiryState = { open: false, inlineFormVisible: false, formReached: false };
const listeners = new Set<() => void>();

function set(patch: Partial<EnquiryState>) {
  const next = { ...state, ...patch };
  if (
    next.open === state.open &&
    next.inlineFormVisible === state.inlineFormVisible &&
    next.formReached === state.formReached
  ) return;
  state = next;
  listeners.forEach((l) => l());
}

export const enquiry = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  open: () => set({ open: true }),
  close: () => set({ open: false }),
  setInlineFormVisible: (inlineFormVisible: boolean) => set({ inlineFormVisible }),
  setFormReached: (formReached: boolean) => set({ formReached }),
};

export function useEnquiry(): EnquiryState {
  return useSyncExternalStore(enquiry.subscribe, enquiry.getSnapshot, enquiry.getSnapshot);
}
