"use client";

import { useEffect, useRef } from "react";
import type { Point, Connector } from "@/lib/mock-data";

/**
 * Mapa real com Leaflet + tile layer Esri.
 *
 * Popup de cada hub mostra:
 *   - nome + bairro
 *   - lista de conectores com status (Livre / Reservado / Em uso / Offline)
 *   - se em uso: estimativa "carregando XkWh de YkWh, livre em ~Zmin"
 *     calculada a partir de (now - startedAt) * potencia_kW
 *
 * Bug que estava aqui antes: o effect que cria o mapa e o effect que cria
 * os markers dependiam de estados diferentes. Quando `points` chegava
 * ([] → Point[]) o effect do mapa rodava async (await do leaflet) e o effect
 * dos markers rodava sincronamente no mesmo tick — encontrava `mapRef =
 * null` e saía sem criar nada. Depois o mapa era criado mas nada
 * re-disparava.
 *
 * Solução: UM effect que inicializa tudo quando points chega pela primeira
 * vez, e um SEPARADO que só re-renderiza markers quando points muda (mas
 * só roda SE o mapa já existe). Pra evitar race condition, o segundo
 * effect escuta `points` E também `mapRef.current` indireto via callback
 * que é acionado quando init termina.
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
  maxKwh: number,
): number {
  const elapsedH = (Date.now() - startedAtMs) / (1000 * 60 * 60);
  if (elapsedH <= 0) return 0;
  return Math.min(maxKwh, powerKw * elapsedH);
}

function buildPopupHtml(
  point: Point,
  chargeByConnector: Record<string, ChargeInfo>,
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
  const layerRef = useRef<any>(null);
  // Guarda os pontos atuais numa ref pra usar dentro do callback de init.
  const pointsRef = useRef<Point[]>(points);
  const chargesRef = useRef<Record<string, ChargeInfo>>(chargeByConnector);

  // Mantém as refs sincronizadas com as props sem disparar o effect de init.
  useEffect(() => {
    pointsRef.current = points;
    chargesRef.current = chargeByConnector;
    // Se o mapa já tá criado, só re-renderiza os markers (não recria mapa).
    if (mapRef.current && layerRef.current) {
      renderMarkers(mapRef.current, layerRef.current, points, chargeByConnector);
    }
  }, [points, chargeByConnector]);

  // Effect único de inicialização: roda UMA vez quando o componente monta.
  // (Strict Mode pode chamar cleanup + setup, mas a guarda de mapRef evita
  // criar mapa duplicado.)
  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !ref.current || mapRef.current) return;

        const map = L.map(ref.current, {
          center: [-22.97, -43.205],
          zoom: 12,
          minZoom: 11,
          maxZoom: 17,
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
          },
        ).addTo(map);

        const layer = L.layerGroup().addTo(map);

        // Marca como pronto ANTES de renderizar markers pra evitar race.
        mapRef.current = map;
        layerRef.current = layer;

        // Renderiza os markers que já chegaram (pointsRef fica atualizada
        // via effect de sincronização acima).
        if (pointsRef.current.length > 0) {
          renderMarkers(
            map,
            layer,
            pointsRef.current,
            chargesRef.current,
          );
        }
      } catch {
        // ignore double-init in Strict Mode
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup geral quando o componente desmonta.
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-[260px] w-full overflow-hidden rounded-[6px] border border-black/10 bg-[#f8f9fa] sm:h-[420px]">
      <div ref={ref} className="absolute inset-0" />
    </div>
  );
}

/** Renderiza markers + ajusta viewport pra caber todos. Async pq Leaflet
 *  foi carregado via dynamic import (não tem global `L`). */
async function renderMarkers(
  map: any,
  layer: any,
  points: Point[],
  chargeByConnector: Record<string, ChargeInfo>,
) {
  if (!map || !layer || points.length === 0) return;
  const L = (await import("leaflet")).default;

  layer.clearLayers();

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
    }).addTo(layer);

    marker.bindTooltip(`${p.name}\n${p.neighborhood}`, {
      direction: "top",
      offset: [0, -4],
    });

    marker.bindPopup(buildPopupHtml(p, chargeByConnector), {
      maxWidth: 280,
      closeButton: true,
      autoPan: true,
    });
  });

  map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])).pad(0.2), {
    animate: false,
  });
}