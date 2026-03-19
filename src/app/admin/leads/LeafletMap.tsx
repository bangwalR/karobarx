"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom coloured icons by source
const makeIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; border: 3px solid white;
      transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

const SOURCE_ICONS: Record<string, ReturnType<typeof makeIcon>> = {};
const getSourceIcon = (source: string) => {
  if (!SOURCE_ICONS[source]) {
    const colors: Record<string, string> = {
      instagram: "#e1306c",
      facebook: "#1877f2",
      whatsapp: "#25d366",
      website: "#f97316",
      manual: "#6b7280",
    };
    SOURCE_ICONS[source] = makeIcon(colors[source] || "#6b7280");
  }
  return SOURCE_ICONS[source];
};

// Business location — Nehru Place, Delhi
const BUSINESS_CENTER: [number, number] = [28.5494, 77.2517];

// Delhi area bounding box for random placement of leads without location
const DELHI_BOUNDS = {
  minLat: 28.4, maxLat: 28.88,
  minLng: 76.84, maxLng: 77.35,
};

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) / 4294967296);
  };
}

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  location?: string | null;
}

interface Stats {
  total: number;
  new: number;
  converted: number;
  bySource: { instagram: number; facebook: number; whatsapp: number; website: number };
}

interface Props {
  leads: Lead[];
  stats: Stats | null;
}

export default function LeafletMap({ leads, stats }: Props) {
  return (
    <div className="relative">
      <MapContainer
        center={BUSINESS_CENTER}
        zoom={11}
        style={{ height: "440px", width: "100%", background: "#1a1a2e" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Business location marker */}
        <Marker
          position={BUSINESS_CENTER}
          icon={L.divIcon({
            className: "",
            html: `<div style="
              width: 36px; height: 36px; border-radius: 50%;
              background: linear-gradient(135deg,#f97316,#dc2626);
              border: 3px solid white; display:flex; align-items:center; justify-content:center;
              box-shadow: 0 2px 8px rgba(249,115,22,0.6);
              font-size:16px; color:white; font-weight:bold;
            ">🏪</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -20],
          })}
        >
          <Popup>
            <div style={{ fontFamily: "sans-serif", minWidth: "140px" }}>
              <strong>MobileHub Delhi</strong><br />
              <span style={{ color: "#666", fontSize: "12px" }}>Nehru Place</span>
            </div>
          </Popup>
        </Marker>

        {/* Lead markers */}
        {leads.map((lead) => {
          const rand = seededRandom(lead.id);
          // If lead has a location, we show it in the popup but still place near Delhi
          // (real geocoding would require a geocode API call per lead)
          const lat = DELHI_BOUNDS.minLat + rand() * (DELHI_BOUNDS.maxLat - DELHI_BOUNDS.minLat);
          const lng = DELHI_BOUNDS.minLng + rand() * (DELHI_BOUNDS.maxLng - DELHI_BOUNDS.minLng);

          return (
            <Marker key={lead.id} position={[lat, lng]} icon={getSourceIcon(lead.source)}>
              <Popup>
                <div style={{ fontFamily: "sans-serif", minWidth: "160px" }}>
                  <strong>{lead.name || lead.phone || "Unknown"}</strong><br />
                  {lead.email && <span style={{ fontSize: "12px", color: "#555" }}>{lead.email}<br /></span>}
                  {lead.phone && <span style={{ fontSize: "12px", color: "#555" }}>{lead.phone}<br /></span>}
                  {lead.location && <span style={{ fontSize: "12px", color: "#888" }}>📍 {lead.location}<br /></span>}
                  <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "#f3f4f6", display: "inline-block", marginTop: "4px" }}>
                    {lead.source} • {lead.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Radius circle around business */}
        <Circle
          center={BUSINESS_CENTER}
          radius={15000}
          pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.04, weight: 1 }}
        />
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-14 right-2 z-10 bg-gray-900/90 border border-gray-700 rounded-xl p-3 text-xs space-y-1.5">
        <p className="font-semibold text-gray-300 mb-2">Lead Sources</p>
        {[
          { source: "instagram", color: "#e1306c", label: "Instagram" },
          { source: "facebook", color: "#1877f2", label: "Facebook" },
          { source: "whatsapp", color: "#25d366", label: "WhatsApp" },
          { source: "website", color: "#f97316", label: "Website" },
          { source: "manual", color: "#6b7280", label: "Manual" },
        ].map((s) => (
          <div key={s.source} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: s.color }} />
            <span className="text-gray-300">{s.label}</span>
          </div>
        ))}
        <div className="border-t border-gray-700 pt-1.5 mt-1">
          <div className="flex items-center gap-2">
            <span>🏪</span>
            <span className="text-gray-300">MobileHub</span>
          </div>
        </div>
      </div>

      <p className="absolute bottom-2 left-3 text-xs text-gray-500 z-10">
        Markers are approximate • Enrich leads for exact location
      </p>
    </div>
  );
}
