import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/shells";
import { getSession, listJobs } from "@/lib/repo";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading your visits…</p>}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "customer") redirect("/dashboard");
  const jobs = await listJobs(session);
  return <PortalShell name={session.user.name} shop={jobs[0]?.tenantName || "Your shop"}>{children}</PortalShell>;
}
