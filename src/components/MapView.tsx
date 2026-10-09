import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RankedListing } from "@/lib/data";

interface Props {
  listings: RankedListing[];
  center: { lat: number; lng: number };
  radiusKm: number;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
}

export default function MapView({ listings, center, radiusKm, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const circle = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(m);
    L.marker([center.lat, center.lng], { icon: L.divIcon({ className: "", html: '<div class="padosi-me"></div>', iconSize: [18, 18] }) }).addTo(m);
    circle.current = L.circle([center.lat, center.lng], { radius: radiusKm * 1000, color: "currentColor", weight: 1, fillOpacity: 0.06, className: "text-primary" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", () => onSelect(null));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!circle.current || !map.current) return;
    circle.current.setRadius(radiusKm * 1000);
    map.current.fitBounds(circle.current.getBounds(), { padding: [10, 10] });
  }, [radiusKm]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    listings.forEach((l) => {
      const live = l.category === "vendor" && l.vendor?.live;
      const html = `<div style="position:relative;width:30px;height:30px"><div class="padosi-pin ${l.category} ${selectedId === l.id ? "selected" : ""}"></div>${live ? '<span class="padosi-live-dot"></span>' : ""}</div>`;
      const mk = L.marker([l.lat, l.lng], { icon: L.divIcon({ className: "", html, iconSize: [30, 30], iconAnchor: [15, 30] }), title: l.name });
      mk.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect(l.id);
      });
      g.addLayer(mk);
    });
  }, [listings, selectedId, onSelect]);

  return <div ref={el} className="h-full w-full" />;
}
