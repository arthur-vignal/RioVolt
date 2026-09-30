"use client";

import { useEffect, useRef, useState } from "react";
import type { Point, Connector } from "@/lib/mock-data";

/**
 * Mapa real com Leaflet + tile layer Esri.
 *
 * Popup de cada hub mostra:
 *   - nome + bairro
 *   - lista de conectores com status (Livre / Reservado / Em uso / Offline)
 *   - se em uso: estimativa "carregando XkWh de YkWh, livre em ~Zmin"
 *     calculada a partir de (now - startedAt) * potencia_kW
 */

type ChargeInfo = {
  startedAt: number; // epoch ms
  kwhTarget: number; // kwh planejado pra essa reserva
};

function fmtMin(min: number): string {
  if (min < 1) return "agora";
  if (min < 60) return `~${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `~${h}h` : `~${h}h${m}min`;
}

/** Estima o kwh carregado a partir do tempo desde startedAt. */
function estimateLoadedKwh(
  startedAtMs: number,
  powerKw: number,
  maxKwh: number
): number {
  const elapsedH = (Date.now() - startedAtMs) / (1000 * 60 * 60);
  if (elapsedH <= 0) return 0;
  return Math.min(maxKwh, powerKw * elapsedH);
}

function buildPopupHtml(
  point: Point,
  chargeByConnector: Record<string, ChargeInfo>
): string {
  const rows = point.connectors
    .map((c) => {
      const id = c.id;
      const status = c.status;
      const statusText =
        status === "free"
          ? "Livre"
          : status === "reserved"
          ? "Reservado"
          : status === "in_use"
          ? "Em uso"
          : "Fora de serviço";
      const statusColor =
        status === "free"
          ? "#16a34a"
          : status === "offline"
          ? "#9ca3af"
          : "#111";

      let detail = "";
      if (status === "in_use" && chargeByConnector[id]) {
        const ch = chargeByConnector[id];
        const loaded = estimateLoadedKwh(ch.startedAt, c.powerKw, ch.kwhTarget);
        const remaining = Math.max(0, ch.kwhTarget - loaded);
        const minLeft = (remaining / c.powerKw) * 60;
        const pct = Math.min(100, (loaded / ch.kwhTarget) * 100);
        detail = `<br/><div style="margin-top:4px;font-size:11px;color:#444">
          <div style="background:#eee;height:5px;border-radius:3px;overflow:hidden">
            <div style="background:#16a34a;width:${pct.toFixed(0)}%;height:100%"></div>
          </div>
          <div style="margin-top:3px">carregando ${loaded.toFixed(1)} / ${ch.kwhTarget} kWh · <strong>livre em ${fmtMin(minLeft)}</strong></div>
        </div>`;
      } else if (status === "reserved") {
        detail = `<br/><div style="margin-top:4px;font-size:11px;color:#666">próxima reserva programada</div>`;
      } else if (status === "offline" && c.note) {
        detail = `<br/><div style="margin-top:4px;font-size:11px;color:#9ca3af">${c.note}</div>`;
      }
      return `
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor}"></span>
          <span style="flex:1">conector ${id.slice(-2)} · ${c.kind} · ${c.powerKw}kW</span>
          <strong>${statusText}</strong>
        </div>
        ${detail}
      `;
    })
    .join("");

  return `
    <div style="font-family:inherit;min-width:240px">
      <div style="font-weight:600;font-size:13px">${point.name}</div>
      <div style="font-size:11px;color:#666">${point.neighborhood} · ${point.openHours}</div>
      <div style="font-size:11px;color:#444;margin-top:4px">${point.address}</div>
      <div style="margin-top:8px;border-top:1px solid #eee;padding-top:6px">
        ${rows}
      </div>
    </div>
  `;
}

export function RealMap({
  points,
  chargeByConnector = {},
}: {
  points: Point[];
  chargeByConnector?: Record<string, ChargeInfo>;
}) {
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
          const worst: Connector | undefined =
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

          const marker = L.circleMarker([p.lat, p.lon], {
            radius: 9,
            color,
            weight: 2,
            opacity: 1,
            fillColor: "#ffffff",
            fillOpacity: 1,
          }).addTo(map);

          // Tooltip simples no hover
          marker.bindTooltip(`${p.name}\n${p.neighborhood}`, {
            direction: "top",
            offset: [0, -4],
          });

          // Popup com lista de conectores
          marker.bindPopup(buildPopupHtml(p, chargeByConnector), {
            maxWidth: 280,
            closeButton: true,
            autoPan: true,
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
  }, [points, JSON.stringify(chargeByConnector)]);

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