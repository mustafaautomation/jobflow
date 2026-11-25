import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WeekCalendar } from "@/components/calendar-board";
import { weekDays } from "@/lib/format";
import { getSession, listJobs, listTechnicians } from "@/lib/repo";

export const metadata = { title: "Calendar" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the week…</p>}>
      <Calendar />
    </Suspense>
  );
}

async function Calendar() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const [jobs, technicians] = await Promise.all([listJobs(session), listTechnicians(session)]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl">Week</h1>
        <p className="text-muted-foreground">Drag a visit to another day or another technician. Times stay in America/Chicago.</p>
      </div>
      <WeekCalendar days={weekDays(new Date())} jobs={jobs} readOnly={session.demo} technicians={technicians} />
    </div>
  );
}
