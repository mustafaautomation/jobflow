import { getSession, listJobs } from "@/lib/repo";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  const jobs = await listJobs(session);
  return Response.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      tenantId: job.tenantId,
      customerName: job.customerName,
      status: job.status,
      reference: job.reference,
    })),
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (session.demo) return Response.json({ error: "Demo mode is read-only." }, { status: 403 });
  return Response.json({ error: "Create visits from the booking page." }, { status: 405 });
}
