"use client";

import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --------------------------
// DEFAULT & CUSTOM ICONS
// --------------------------

const verifiedIcon = new L.Icon({
  iconUrl: "/leaflet/green.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const fakeIcon = new L.Icon({
  iconUrl: "/leaflet/red.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const expiredIcon = new L.Icon({
  iconUrl: "/leaflet/orange.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const fallbackIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// --------------------------
// TYPE
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
// COMPONENT
// --------------------------
export default function ScanMap({ points }: { points: MapPoint[] }) {
  const [filter, setFilter] = useState<"all" | "verified" | "fake" | "expired">("all");

  const filteredPoints = useMemo(() => {
    if (filter === "all") return points;
    return points.filter((p) => p.status === filter);
  }, [points, filter]);

  const center = useMemo(() => {
    if (!filteredPoints.length)
      return { lat: 19.5, lng: 75.5 }; // India
    return {
      lat: filteredPoints[0].latitude,
      lng: filteredPoints[0].longitude,
    };
  }, [filteredPoints]);

  return (
    <div>
      {/* FILTER BUTTONS */}
      <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
        <button
          onClick={() => setFilter("all")}
          style={btn(filter === "all")}
        >
          All
        </button>

        <button
          onClick={() => setFilter("verified")}
          style={btn(filter === "verified", "#22c55e")}
        >
          Verified
        </button>

        <button
          onClick={() => setFilter("fake")}
          style={btn(filter === "fake", "#ef4444")}
        >
          Fake
        </button>

        <button
          onClick={() => setFilter("expired")}
          style={btn(filter === "expired", "#f97316")}
        >
          Expired
        </button>
      </div>

      {/* MAP */}
      <div
        style={{
          height: 400,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredPoints.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={
                p.status === "verified"
                  ? verifiedIcon
                  : p.status === "expired"
                  ? expiredIcon
                  : p.status === "fake"
                  ? fakeIcon
                  : fallbackIcon
              }
            >
              <Popup>
                <div style={{ fontSize: "0.8rem" }}>
                  <div>
                    <strong>Batch:</strong> {p.batch_code}
                  </div>
                  <div>
                    <strong>Status:</strong> {p.status}
                  </div>
                  <div>
                    <strong>Location:</strong>{" "}
                    {p.city || "-"}, {p.state || "-"}, {p.country || "-"}
                  </div>
                  <div>
                    <strong>ISP:</strong> {p.isp || "-"}
                  </div>
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

// --------------------------
// BUTTON STYLE HELPER
// --------------------------

function btn(active: boolean, color?: string): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 8,
    cursor: "pointer",
    border: active ? `2px solid ${color || "white"}` : "1px solid gray",
    background: active ? (color ? `${color}22` : "#ffffff22") : "transparent",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: 600,
    transition: "0.2s",
  };
}
