"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { StatusBadge } from "@/components/status-badge";
import { formatTime } from "@/lib/format";
import type { JobView } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const colors: Record<string, string> = {
  requested: "#78716c",
  scheduled: "#0369a1",
  en_route: "#b45309",
  on_site: "#6d28d9",
  complete: "#047857",
  invoiced: "#c4622d",
};

function pin(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(20,32,43,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function JobMap({ jobs }: { jobs: JobView[] }) {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const tiles = key
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${key}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = key
    ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  useEffect(() => {
    // Leaflet measures the container after layout.
  }, []);

  return (
    <MapContainer center={[30.28, -97.74]} className="h-[520px] w-full rounded-2xl" scrollWheelZoom={false} zoom={11}>
      <TileLayer attribution={attribution} url={tiles} />
      {jobs.map((job) => (
        <Marker icon={pin(colors[job.status] || "#c4622d")} key={job.id} position={[job.lat, job.lng]}>
          <Popup>
            <div className="space-y-1">
              <StatusBadge status={job.status} />
              <p className="font-medium">{job.customerName}</p>
              <p>{formatTime(job.windowStart)} · {job.title}</p>
              <Link className="underline" href={`/jobs/${job.id}`}>
                Open visit
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
