import { useSyncExternalStore } from "react";
import { LISTINGS, type Listing } from "./data";

// Local demo state persisted in localStorage. Swap for Lovable Cloud tables later.

export interface Booking {
  id: string;
  listingId: string;
  kind: "demo" | "borrow";
  date: string;
  time?: string | undefined;
  status: "upcoming" | "completed";
  reviewed: boolean;
}

export interface MyReview {
  id: string;
  listingId: string;
  rating: number;
  text: string;
  photo?: string | undefined;
  date: string;
}

interface State {
  onboarded: boolean;
  loggedIn: boolean;
  phone: string;
  area: string;
  theme: "light" | "dark";
  bookings: Booking[];
  reviews: MyReview[];
  myListings: Listing[];
  vendorLive: Record<string, { live: boolean; at: number }>;
  myVendorId: string;
}

const INITIAL: State = {
  onboarded: false,
  loggedIn: false,
  phone: "",
  area: "Green Park Colony",
  theme: "light",
  bookings: [
    { id: "b-seed", listingId: "res-drill", kind: "borrow", date: "2026-09-28", status: "completed", reviewed: false },
  ],
  reviews: [],
  myListings: [],
  vendorLive: {},
  myVendorId: "v-chai",
};

const KEY = "padosi-state-v1";
let state: State = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  load();
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getState() {
  load();
  return state;
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(getState()),
    () => select(INITIAL),
  );
}

/** All listings including user-created and live-status overrides. */
export function allListings(s: State): Listing[] {
  return [...LISTINGS, ...s.myListings].map((l) => {
    const o = s.vendorLive[l.id];
    if (!l.vendor || !o) return l;
    return { ...l, vendor: { ...l.vendor, live: o.live, lastUpdatedMins: Math.round((Date.now() - o.at) / 60000) } };
  });
}

export const uid = () => Math.random().toString(36).slice(2, 9);

import { useMemo } from "react";
export function useListings(): Listing[] {
  const s = useStore((x) => x);
  return useMemo(() => allListings(s), [s]);
}
