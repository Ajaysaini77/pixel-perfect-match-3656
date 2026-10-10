"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

export default function MapView({
  items = [],
  facilities = [],
  onlinePlaces = [],
  selected,
  selectedFacility,
  selectedPlace,
  city = "Meerut",
  focusLocation,
  userLocation,
  onSelect,
  onSelectFacility,
  onSelectPlace,
}) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

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
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      mounted = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layersRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !layersRef.current) return;
    import("leaflet").then(L => {
      if (!layersRef.current) return;
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
      facilities.forEach(facility => {
        const marker = L.circleMarker([facility.lat, facility.lng], {
          radius: selectedFacility?.id === facility.id ? 12 : 9,
          color: "#fff",
          weight: 2,
          fillColor: "#2563EB",
          fillOpacity: 1,
        }).addTo(layersRef.current);
        marker.bindTooltip(`${facility.id} · ${facility.city}`, { direction: "top" });
        marker.on("click", () => onSelectFacility(facility));
      });
      onlinePlaces.forEach(place => {
        const marker = L.circleMarker([place.lat, place.lng], {
          radius: selectedPlace?.id === place.id ? 12 : 9,
          color: "#fff",
          weight: 2,
          fillColor: "#7C3AED",
          fillOpacity: 1,
        }).addTo(layersRef.current);
        marker.bindTooltip(`${place.name} · OpenStreetMap`, { direction: "top" });
        marker.on("click", () => onSelectPlace(place));
      });
      if (userLocation) {
        L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#0f766e",
          fillOpacity: 1,
        }).addTo(layersRef.current).bindTooltip("Your current location", { direction: "top" });
      }
    });
  }, [mapReady, items, facilities, onlinePlaces, selected, selectedFacility, selectedPlace, userLocation, onSelect, onSelectFacility, onSelectPlace]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    if (selectedFacility) {
      map.setView([selectedFacility.lat, selectedFacility.lng], 15);
      return;
    }

    if (selectedPlace) {
      map.setView([selectedPlace.lat, selectedPlace.lng], 16);
      return;
    }

    if (focusLocation) {
      map.setView([focusLocation.lat, focusLocation.lng], focusLocation.zoom || 15);
      return;
    }

    if (city === "All cities") {
      const points = [
        ...facilities.map(facility => [facility.lat, facility.lng]),
        ...onlinePlaces.map(place => [place.lat, place.lng]),
        ...items.map(item => [item.lat, item.lng]),
      ];
      if (points.length) map.fitBounds(points, { padding: [36, 36], maxZoom: 12 });
      return;
    }

    const cityCenters = {
      Meerut: [28.9845, 77.7064],
      Delhi: [28.6139, 77.209],
    };
    const center = cityCenters[city];
    if (center) {
      map.setView(center, 12);
      return;
    }
    const points = [
      ...facilities.map(facility => [facility.lat, facility.lng]),
      ...onlinePlaces.map(place => [place.lat, place.lng]),
      ...items.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng)).map(item => [item.lat, item.lng]),
    ];
    if (points.length) map.fitBounds(points, { padding: [36, 36], maxZoom: 14 });
  }, [mapReady, city, focusLocation, facilities, onlinePlaces, items, selectedFacility, selectedPlace]);

  return <div ref={hostRef} className="h-full w-full" aria-label="Map showing nearby listings"/>;
}
