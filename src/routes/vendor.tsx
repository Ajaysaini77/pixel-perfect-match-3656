import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Eye, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { LiveBadge } from "@/components/CategoryTag";
import { formatAgo } from "@/lib/data";
import { setState, useListings, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Vendor dashboard — Padosi" },
      { name: "description", content: "Go live with one tap so nearby customers can find your stall." },
      { property: "og:title", content: "Vendor dashboard — Padosi" },
      { property: "og:description", content: "Go live with one tap so nearby customers can find your stall." },
    ],
  }),
  component: Vendor,
});

function Vendor() {
  const myId = useStore((s) => s.myVendorId);
  const listings = useListings();
  const me = useMemo(() => listings.find((l) => l.id === myId), [listings, myId]);
  if (!me?.vendor) return null;
  const live = me.vendor.live;

  const toggle = () => {
    setState((s) => ({ vendorLive: { ...s.vendorLive, [myId]: { live: !live, at: Date.now() } } }));
    toast.success(live ? "You're offline" : "You're live! Customers nearby can see you.");
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Your stall</p>
        <h1 className="text-2xl font-extrabold">{me.name}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><LiveBadge live={live} /> Updated {formatAgo(me.vendor.lastUpdatedMins)}</div>
      </div>

      <button
        onClick={toggle}
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[2.5rem] text-center shadow-card transition-transform active:scale-95",
          live ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <MapPin className="h-16 w-16" />
        <span className="font-display text-4xl font-extrabold">{live ? "Go offline" : "I'm here"}</span>
        <span className="text-sm opacity-80">{live ? "Tap when you pack up" : "Tap to share your location"}</span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <Eye className="h-5 w-5 text-primary" />
          <p className="mt-2 font-display text-3xl font-extrabold">{live ? 48 : 31}</p>
          <p className="text-sm text-muted-foreground">Views today</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-2 font-display text-3xl font-extrabold">{live ? 17 : 0}</p>
          <p className="text-sm text-muted-foreground">Customers nearby</p>
        </div>
      </div>
      <Link to="/listing/$id" params={{ id: me.id }} className="block text-center text-sm font-semibold text-primary">See my public page</Link>
    </div>
  );
}
