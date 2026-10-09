import { CATEGORY_META, type Category } from "@/lib/data";
import { cn } from "@/lib/utils";

export type CatFilter = Category | "all";

export function CategoryTabs({ value, onChange }: { value: CatFilter; onChange: (v: CatFilter) => void }) {
  const opts: { v: CatFilter; label: string }[] = [
    { v: "all", label: "All" },
    ...(Object.keys(CATEGORY_META) as Category[]).map((c) => ({ v: c, label: CATEGORY_META[c].plural })),
  ];
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist">
      {opts.map((o) => (
        <button
          key={o.v}
          role="tab"
          aria-selected={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
            value === o.v ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
