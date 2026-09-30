"use client";

import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/mock-data";

export function RealMap({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !ref.current || mapRef.current) return;

        const map = L.map(ref.current, {
          center: [-22.97, -43.28],
          zoom: 12,
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: true,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
            maxZoom: 16,
          }
        ).addTo(map);

        points.forEach((p) => {
          const worst =
            p.connectors.find((c) => c.status === "offline") ||
            p.connectors.find((c) => c.status === "in_use") ||
            p.connectors.find((c) => c.status === "reserved") ||
            p.connectors.find((c) => c.status === "free");
          const color =
            worst?.status === "free"
              ? "#16a34a"
              : worst?.status === "offline"
                ? "#9ca3af"
                : "#111111";

          L.circleMarker([p.lat, p.lon], {
            radius: 9,
            color,
            weight: 2,
            opacity: 1,
            fillColor: "#ffffff",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(`${p.name}\n${p.neighborhood}`, {
              direction: "top",
              offset: [0, -4],
            });
        });

        map.fitBounds(
          // @ts-ignore
          L.latLngBounds(points.map((p) => [p.lat, p.lon])).pad(0.25),
          { animate: false }
        );

        mapRef.current = map;
        setReady(true);
      } catch {
        // ignore double-init in Strict Mode
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
    };
  }, [points]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-[6px] border border-black/10 bg-[#f8f9fa]">
      <div ref={ref} className="absolute inset-0" />
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f8f9fa] text-[13px] text-black/55">
          Carregando mapa...
        </div>
      ) : null}
    </div>
  );
}
