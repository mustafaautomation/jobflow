import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { JobBoard } from "@/components/board";
import { getSession, listJobs, listTechnicians } from "@/lib/repo";

export const metadata = { title: "Board" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading jobs…</p>}>
      <Board />
    </Suspense>
  );
}

async function Board() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const [jobs, technicians] = await Promise.all([listJobs(session), listTechnicians(session)]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl">Job board</h1>
        <p className="text-muted-foreground">Drag a visit onto a technician, or use Assign on an unassigned card.</p>
      </div>
      <JobBoard jobs={jobs} readOnly={session.demo} technicians={technicians} />
    </div>
  );
}
