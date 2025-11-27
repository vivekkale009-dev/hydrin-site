"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo, useState } from "react";

// custom icons
const verifiedIcon = new L.Icon({
  iconUrl: "/leaflet/green.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const fakeIcon = new L.Icon({
  iconUrl: "/leaflet/red.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const expiredIcon = new L.Icon({
  iconUrl: "/leaflet/orange.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// dynamic import for SSR-safety
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

// --------------------------
// TYPES
// --------------------------
export type MapPoint = {
  id: number;
  batch_code: string;
  status: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  country: string | null;
  isp: string | null;
  created_at: string;
};

// --------------------------
// MAP COMPONENT
// --------------------------
export default function ScanMap({ points }: { points: MapPoint[] }) {
  const [filter, setFilter] = useState<"all" | "verified" | "fake" | "expired">(
    "all"
  );

  // filter points  
  const filteredPoints = useMemo(() => {
    if (filter === "all") return points;
    return points.filter((p) => p.status === filter);
  }, [filter, points]);

  const center = useMemo(() => {
    if (!filteredPoints.length) return { lat: 19.5, lng: 75.5 };
    return {
      lat: filteredPoints[0].latitude,
      lng: filteredPoints[0].longitude,
    };
  }, [filteredPoints]);

  return (
    <div style={{ width: "100%" }}>
      {/* FILTER BUTTONS */}
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        {["all", "verified", "fake", "expired"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #666",
              cursor: "pointer",
              background: filter === f ? "#2563eb" : "#1f2937",
              color: "white",
              fontSize: "0.8rem",
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div
        style={{
          height: 500,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {filteredPoints.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={
                p.status === "verified"
                  ? verifiedIcon
                  : p.status === "expired"
                  ? expiredIcon
                  : fakeIcon
              }
            >
              <Popup>
                <div style={{ fontSize: "0.8rem" }}>
                  <div><strong>Batch:</strong> {p.batch_code}</div>
                  <div><strong>Status:</strong> {p.status}</div>
                  <div>
                    <strong>Location:</strong> {p.city || "-"}, {p.state || "-"},{" "}
                    {p.country || "-"}
                  </div>
                  <div><strong>ISP:</strong> {p.isp || "-"}</div>
                  <div>
                    <strong>Time:</strong>{" "}
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
