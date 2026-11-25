import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InviteForm, RemindButton } from "@/components/forms";
import { StatusBadge } from "@/components/status-badge";
import { formatTime, money } from "@/lib/format";
import { getDashboard, getSession, listTechnicians } from "@/lib/repo";

export const metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading today…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const [data, technicians] = await Promise.all([getDashboard(session), listTechnicians(session)]);
  const stats = [
    ["stat-jobs-today", "Jobs today", String(data.jobsToday)],
    ["stat-unassigned", "Unassigned", String(data.unassigned)],
    ["stat-completed", "Completed this week", String(data.completedThisWeek)],
    ["stat-revenue", "Revenue this week", money(data.revenueCents)],
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Today&apos;s dispatch</h1>
          <p className="text-muted-foreground">Open work, crew, and money collected this week.</p>
        </div>
        <RemindButton disabled={session.demo} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([id, label, value]) => (
          <article className="rounded-2xl border border-border bg-card p-4" data-testid={id} key={id}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section>
          <h2 className="font-medium">On the schedule</h2>
          {data.todayJobs.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No visits fall on today&apos;s Austin date.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
              {data.todayJobs.map((job) => (
                <li className="flex items-center justify-between gap-3 px-4 py-3" key={job.id}>
                  <div>
                    <Link className="font-medium hover:underline" href={`/jobs/${job.id}`}>{job.customerName}</Link>
                    <p className="text-sm text-muted-foreground">{formatTime(job.windowStart)} · {job.title} · {job.technicianName ?? "Unassigned"}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">Unassigned</h2>
            {data.unassignedJobs.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Every open visit has a technician.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data.unassignedJobs.map((job) => (
                  <li key={job.id}>
                    <Link className="hover:underline" href={`/jobs/${job.id}`}>{job.customerName}</Link>
                    <span className="text-muted-foreground"> · {job.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="mt-4 inline-block text-sm underline" href="/board">Open the board</Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-medium">Crew</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {technicians.map((tech) => (
                <li key={tech.id}>{tech.name} · {tech.skills.join(", ")}</li>
              ))}
            </ul>
            {session.user.role === "owner" ? (
              <div className="mt-4 border-t border-border pt-4">
                <InviteForm disabled={session.demo} />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
