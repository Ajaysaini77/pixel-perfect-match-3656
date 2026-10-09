import type { ReactNode } from "react";
import { X } from "lucide-react";

export function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 z-[1000] animate-in slide-in-from-bottom-8 fade-in rounded-t-3xl border-t bg-background p-3 pt-2 shadow-card">
      <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted" />
      <button onClick={onClose} aria-label="Close" className="absolute right-3 top-2 grid h-9 w-9 place-items-center rounded-full bg-muted">
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
