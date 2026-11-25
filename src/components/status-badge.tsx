import { STATUS_LABEL } from "@/lib/format";
import type { JobStatus } from "@/lib/types";
import { cn } from "cn";

const tones: Record<JobStatus, string> = {
  requested: "bg-stone-200 text-stone-800",
  scheduled: "bg-sky-100 text-sky-950",
  en_route: "bg-amber-100 text-amber-950",
  on_site: "bg-violet-100 text-violet-950",
  complete: "bg-emerald-100 text-emerald-950",
  invoiced: "bg-orange-100 text-orange-950",
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
