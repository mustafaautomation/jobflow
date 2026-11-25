import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/shells";
import { formatLongDate } from "@/lib/format";
import { getSession, listJobs, listNotifications } from "@/lib/repo";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading the board…</p>}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role === "technician") redirect("/tech");
  if (session.user.role === "customer") redirect("/portal");
  if (session.user.role === "superadmin") redirect("/admin");
  const [notifications, jobs] = await Promise.all([listNotifications(session), listJobs(session)]);
  const shop = jobs[0]?.tenantName ?? "Dispatch";
  return (
    <OpsShell session={session} shop={shop} today={formatLongDate(new Date())} unread={notifications.filter((item) => !item.read).length}>
      {children}
    </OpsShell>
  );
}
