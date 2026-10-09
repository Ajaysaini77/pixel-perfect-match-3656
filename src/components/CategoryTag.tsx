import { CATEGORY_META, type Category } from "@/lib/data";
import { cn } from "@/lib/utils";

const TONE: Record<Category, string> = {
  resource: "bg-cat-resource/15 text-cat-resource",
  tutor: "bg-cat-tutor/15 text-cat-tutor",
  vendor: "bg-cat-vendor/15 text-cat-vendor",
};

export function CategoryTag({ category, className }: { category: Category; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", TONE[category], className)}>
      {CATEGORY_META[category].label}
    </span>
  );
}

export function LiveBadge({ live, className }: { live: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", live ? "bg-live/15 text-live" : "bg-muted text-muted-foreground", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-live live-pulse" : "bg-muted-foreground")} />
      {live ? "Live now" : "Offline"}
    </span>
  );
}
