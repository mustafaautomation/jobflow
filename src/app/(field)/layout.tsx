import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FieldShell } from "@/components/shells";
import { formatLongDate } from "@/lib/format";
import { getSession, listJobs } from "@/lib/repo";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Loading today&apos;s run…</p>}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "technician") redirect(session.user.role === "customer" ? "/portal" : "/dashboard");
  const jobs = await listJobs(session);
  const shop = jobs[0]?.tenantName ?? "Your shop";
  return (
    <FieldShell session={session} shop={shop} today={formatLongDate(new Date())}>
      {children}
    </FieldShell>
  );
}
