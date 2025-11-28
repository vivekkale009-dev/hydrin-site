"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";

// ======================================================================
// SAFE LEAFLET LOAD (no `window` on server)
// ======================================================================
let Leaflet: typeof import("leaflet") | null = null;

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Leaflet = require("leaflet");
}

const createLeafletIcon = (url: string) => {
  if (typeof window === "undefined" || !Leaflet) return null;
  return new Leaflet.Icon({
    iconUrl: url,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const verifiedIcon = createLeafletIcon("/leaflet/green.png");
const fakeIcon = createLeafletIcon("/leaflet/red.png");
const expiredIcon = createLeafletIcon("/leaflet/orange.png");

// ======================================================================
// Dynamic imports to avoid SSR crash. Typed as `any` to shut TS up.
// ======================================================================
const MapContainer: any = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer: any = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker: any = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup: any = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

// ======================================================================
// TYPES
// ======================================================================
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

// ======================================================================
// COMPONENT
// ======================================================================
export default function ScanMap({ points }: { points: MapPoint[] }) {
  const [filter, setFilter] = useState("all");

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

  const getIcon = (status: string) =>
    status === "verified"
      ? verifiedIcon
      : status === "expired"
      ? expiredIcon
      : fakeIcon;

  return (
    <div style={{ width: "100%", marginTop: "20px" }}>
      {/* FILTER BUTTONS */}
      <div style={{ marginBottom: 10, display: "flex", gap: 10 }}>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("verified")}>Verified</button>
        <button onClick={() => setFilter("expired")}>Expired</button>
        <button onClick={() => setFilter("fake")}>Fake</button>
      </div>

      {/* MAP */}
      <div style={{ height: 400, width: "100%", overflow: "hidden" }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={5}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {filteredPoints.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={getIcon(p.status) || undefined} // guard in case icons are null during first render
            >
              <Popup>
                <strong>Batch:</strong> {p.batch_code}
                <br />
                <strong>Status:</strong> {p.status}
                <br />
                <strong>Location:</strong> {p.city}, {p.state}, {p.country}
                <br />
                <strong>ISP:</strong> {p.isp}
                <br />
                <strong>Time:</strong>{" "}
                {new Date(p.created_at).toLocaleString()}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
