"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export default function MapView({ items = [], selected, onSelect }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);

  useEffect(() => {
    let map;
    let mounted = true;
    import("leaflet").then(L => {
      if (!mounted || !hostRef.current || mapRef.current) return;
      map = L.map(hostRef.current).setView([28.9845, 77.7064], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      layersRef.current = L.layerGroup().addTo(map);
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      mounted = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layersRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;
    import("leaflet").then(L => {
      layersRef.current.clearLayers();
      items.forEach(item => {
        const colors = { tutor: "#0F9D8A", resource: "#D97706", vendor: "#EA580C" };
        const marker = L.circleMarker([item.lat, item.lng], {
          radius: selected?.id === item.id ? 11 : 8,
          color: "#fff",
          weight: 2,
          fillColor: colors[item.type] || "#0F9D8A",
          fillOpacity: 1,
        }).addTo(layersRef.current);
        marker.bindTooltip(item.name, { direction: "top" });
        marker.on("click", () => onSelect(item));
      });
    });
  }, [items, selected, onSelect]);

  return <div ref={hostRef} className="h-full w-full" aria-label="Map showing nearby listings"/>;
}
