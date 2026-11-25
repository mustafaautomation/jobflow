"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { moveJobAction } from "@/lib/actions";
import { formatTime, formatWeekday, zonedYmd } from "@/lib/format";
import type { JobView, Technician } from "@/lib/types";
import { TIME_ZONE } from "@/lib/types";
import { cn } from "cn";

export function WeekCalendar({
  jobs,
  technicians,
  days,
  readOnly,
}: {
  jobs: JobView[];
  technicians: Technician[];
  days: string[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const rows = [{ id: "none", name: "Unassigned", color: "#78716c" }, ...technicians.map((tech) => ({ id: tech.id, name: tech.name, color: tech.color }))];

  async function onDragEnd(event: DragEndEvent) {
    if (readOnly || !event.over) return;
    const rawId = String(event.active.id);
    const jobId = rawId.startsWith("caljob:") ? rawId.slice("caljob:".length) : rawId;
    const [kind, techId, ymd] = String(event.over.id).split(":");
    if (kind !== "cal" || !ymd) return;
    const result = await moveJobAction(jobId, techId === "none" ? null : techId, ymd);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message || "Moved");
      router.refresh();
    }
  }

  return (
    <DndContext onDragEnd={onDragEnd} sensors={sensors}>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <div className="grid min-w-[880px] grid-cols-[160px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-r border-border p-3 text-xs uppercase tracking-wide text-muted-foreground">Crew</div>
          {days.map((day) => (
            <div className="border-b border-border p-3 text-sm font-medium" key={day}>
              {formatWeekday(day)}
            </div>
          ))}
          {rows.map((row) => (
            <div className="contents" key={row.id}>
              <div className="border-r border-b border-border p-3 text-sm">
                <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: row.color }} />
                {row.name}
              </div>
              {days.map((day) => (
                <Cell day={day} jobs={jobs.filter((job) => (job.technicianId ?? "none") === row.id && zonedYmd(new Date(job.windowStart), TIME_ZONE) === day)} key={`${row.id}-${day}`} readOnly={readOnly} techId={row.id} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  );
}

function Cell({
  techId,
  day,
  jobs,
  readOnly,
}: {
  techId: string;
  day: string;
  jobs: JobView[];
  readOnly: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cal:${techId}:${day}`, disabled: readOnly });
  return (
    <div className={cn("min-h-24 border-b border-border p-1", isOver && "bg-primary/10")} ref={setNodeRef}>
      <div className="space-y-1">
        {jobs.map((job) => (
          <CalendarChip job={job} key={job.id} readOnly={readOnly} />
        ))}
      </div>
    </div>
  );
}

function CalendarChip({ job, readOnly }: { job: JobView; readOnly: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `caljob:${job.id}`, disabled: readOnly });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style}>
      <div className="rounded-lg bg-muted px-2 py-1">
        <button className="text-[11px] text-muted-foreground" type="button" {...listeners} {...attributes}>
          {formatTime(job.windowStart)}
        </button>
        <Link className="block truncate text-xs font-medium hover:underline" href={`/jobs/${job.id}`}>
          {job.customerName}
        </Link>
        <StatusBadge className="mt-1" status={job.status} />
      </div>
    </div>
  );
}
