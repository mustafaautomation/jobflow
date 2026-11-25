import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { MapLoader } from "@/components/map-loader";
import { StatusBadge } from "@/components/status-badge";
import { formatWhen } from "@/lib/format";
import { getSession, listJobs } from "@/lib/repo";
import Link from "next/link";

export const metadata = { title: "Map" };

export default function Page() {
  return (
    <Suspense fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-muted" />}>
      <MapPage />
    </Suspense>
  );
}

async function MapPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const jobs = await listJobs(session);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl">Austin map</h1>
        <p className="text-muted-foreground">Seeded coordinates. OpenStreetMap tiles unless NEXT_PUBLIC_MAPTILER_KEY is set.</p>
      </div>
      <MapLoader jobs={jobs} />
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {jobs.map((job) => (
          <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={job.id}>
            <div>
              <Link className="font-medium hover:underline" href={`/jobs/${job.id}`}>{job.customerName}</Link>
              <p className="text-muted-foreground">{formatWhen(job.windowStart)} · {job.address}</p>
            </div>
            <StatusBadge status={job.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
