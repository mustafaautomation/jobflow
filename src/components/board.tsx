"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { AssignForm } from "@/components/forms";
import { StatusBadge } from "@/components/status-badge";
import { assignJobAction } from "@/lib/actions";
import { formatTime, money } from "@/lib/format";
import type { JobView, Technician } from "@/lib/types";
import { cn } from "cn";

export function JobBoard({
  jobs,
  technicians,
  readOnly,
}: {
  jobs: JobView[];
  technicians: Technician[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const filtered = jobs.filter((job) => {
    const haystack = `${job.customerName} ${job.title} ${job.address} ${job.reference}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const lanes = [
    { id: "unassigned", name: "Unassigned", jobs: filtered.filter((job) => !job.technicianId) },
    ...technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      jobs: filtered.filter((job) => job.technicianId === tech.id),
    })),
  ];

  async function onDragEnd(event: DragEndEvent) {
    if (readOnly || !event.over) return;
    const jobId = String(event.active.id);
    const overId = String(event.over.id);
    if (!overId.startsWith("tech:")) return;
    const technicianId = overId.slice(5);
    const result = await assignJobAction(jobId, technicianId === "unassigned" ? null : technicianId);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message || "Assigned");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <input
        aria-label="Search jobs"
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search customer, address, or reference"
        value={query}
      />
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <p className="font-medium">No visits match that search.</p>
          <p className="mt-1 text-sm text-muted-foreground">Clear the search to see the full board.</p>
        </div>
      ) : (
        <DndContext onDragEnd={onDragEnd} sensors={sensors}>
          <div className="flex gap-3 overflow-x-auto pb-2" data-testid="board">
            {lanes.map((lane) => (
              <Lane key={lane.id} laneId={lane.id} name={lane.name} readOnly={readOnly} technicians={technicians}>
                {lane.jobs.map((job) => (
                  <JobCard job={job} key={job.id} readOnly={readOnly} technicians={technicians} />
                ))}
              </Lane>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}

function Lane({
  laneId,
  name,
  children,
  readOnly,
  technicians,
}: {
  laneId: string;
  name: string;
  children: React.ReactNode;
  readOnly: boolean;
  technicians: Technician[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `tech:${laneId}`, disabled: readOnly });
  const color = technicians.find((tech) => tech.id === laneId)?.color;
  return (
    <section
      className={cn("w-72 shrink-0 rounded-2xl bg-muted/70 p-2", isOver && "ring-2 ring-primary")}
      data-testid={`lane-${laneId}`}
      ref={setNodeRef}
    >
      <header className="flex items-center gap-2 px-2 py-2">
        <span className="size-2.5 rounded-full" style={{ background: color || "#78716c" }} />
        <h2 className="text-sm font-medium">{name}</h2>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function JobCard({
  job,
  technicians,
  readOnly,
}: {
  job: JobView;
  technicians: Technician[];
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: readOnly,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <article
      className={cn("rounded-xl border border-border bg-card p-3 shadow-sm", isDragging && "opacity-70")}
      data-testid={`job-${job.id}`}
      ref={setNodeRef}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          aria-label={`Drag ${job.customerName}`}
          className="cursor-grab text-xs text-muted-foreground"
          type="button"
          {...listeners}
          {...attributes}
        >
          {formatTime(job.windowStart)}
        </button>
        <StatusBadge status={job.status} />
      </div>
      <Link className="mt-2 block font-medium hover:underline" href={`/jobs/${job.id}`}>
        {job.customerName}
      </Link>
      <p className="text-sm text-muted-foreground">{job.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{job.address}</p>
      <p className="mt-2 text-sm tabular-nums">{money(job.priceCents)}</p>
      {!job.technicianId ? (
        <div className="mt-3">
          <AssignForm customerName={job.customerName} disabled={readOnly} jobId={job.id} technicians={technicians} />
        </div>
      ) : null}
    </article>
  );
}
