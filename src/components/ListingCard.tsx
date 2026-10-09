import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, formatAgo, formatKm, priceLabel, type RankedListing } from "@/lib/data";
import { cn } from "@/lib/utils";
import { TrustRing } from "./TrustRing";
import { ListingImage } from "./ListingImage";
import { CategoryTag, LiveBadge } from "./CategoryTag";

export function navigateUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/directions?route=;${lat},${lng}#map=17/${lat}/${lng}`;
}

export function ListingCard({ listing, variant = "row", className }: { listing: RankedListing; variant?: "row" | "compact"; className?: string }) {
  const price = priceLabel(listing);
  const isVendor = listing.category === "vendor";
  const compact = variant === "compact";

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-card", compact ? "w-64 shrink-0" : "", className)}>
      <Link to="/listing/$id" params={{ id: listing.id }} className={cn("flex gap-3 p-3", compact && "flex-col")}>
        <div className="relative shrink-0">
          <ListingImage src={listing.photos[0]} alt={listing.name} category={listing.category} className={cn("rounded-xl", compact ? "h-32 w-full" : "h-24 w-24")} />
          {isVendor && listing.vendor?.live && (
            <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-card/90 px-1.5 py-0.5 text-[10px] font-bold text-live">
              <span className="h-1.5 w-1.5 rounded-full bg-live live-pulse" /> LIVE
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight">{listing.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <CategoryTag category={listing.category} />
                {listing.verified && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
            </div>
            <TrustRing score={listing.score} />
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-star text-star" /><b className="text-foreground">{listing.rating}</b> ({listing.reviewCount})</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{formatKm(listing.km)}</span>
            {price && <span className="font-semibold text-foreground">{price}</span>}
            {isVendor && listing.vendor && !listing.vendor.live && <span>Seen {formatAgo(listing.vendor.lastUpdatedMins)}</span>}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t px-3 py-2">
        {isVendor && listing.vendor && <LiveBadge live={listing.vendor.live} />}
        <div className="flex-1" />
        {isVendor ? (
          <Button asChild size="sm" className="h-10 rounded-full px-5">
            <a href={navigateUrl(listing.lat, listing.lng)} target="_blank" rel="noreferrer">Navigate</a>
          </Button>
        ) : (
          <Button asChild size="sm" className="h-10 rounded-full px-5">
            <Link to="/listing/$id" params={{ id: listing.id }} search={{ action: true }}>{CATEGORY_META[listing.category].action}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
