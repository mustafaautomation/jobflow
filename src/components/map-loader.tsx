"use client";

import dynamic from "next/dynamic";
import type { JobView } from "@/lib/types";

const JobMap = dynamic(() => import("@/components/job-map"), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse rounded-2xl bg-muted" />,
});

export function MapLoader({ jobs }: { jobs: JobView[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
        No visits with coordinates yet.
      </div>
    );
  }
  return <JobMap jobs={jobs} />;
}
