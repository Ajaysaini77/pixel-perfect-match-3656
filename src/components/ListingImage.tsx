import { useState } from "react";
import { BookOpen, Package, Store } from "lucide-react";
import type { Category } from "@/lib/data";
import { cn } from "@/lib/utils";

const ICON = { resource: Package, tutor: BookOpen, vendor: Store };

export function ListingImage({ src, alt, category, className }: { src?: string; alt: string; category: Category; className?: string }) {
  const [broken, setBroken] = useState(!src);
  const Icon = ICON[category];
  if (broken)
    return (
      <div className={cn("grid place-items-center bg-primary-soft text-primary", className)}>
        <Icon className="h-8 w-8" />
      </div>
    );
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={cn("object-cover", className)} />;
}
