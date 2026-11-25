"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/format";
import {
  addNote,
  addPhoto,
  assignJob,
  confirmMockPayment,
  confirmMockPlan,
  confirmStripeJobPayment,
  confirmStripePlan,
  createBooking,
  createService,
  findMockUser,
  getSession,
  inviteTechnician,
  markNotificationsRead,
  moveJob,
  openJobCheckout,
  openPlanCheckout,
  sendReminders,
  summarize,
  updateStatus,
  type BookingInput,
} from "@/lib/repo";
import { clearSessionCookie, writeSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult, JobStatus, PlanId } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (isSupabaseConfigured()) {
    if (!password) return { ok: false, error: "Enter the password for this Supabase user." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: "That email and password did not match." };
    const session = await getSession();
    redirect(homeFor(session?.user.role ?? "dispatcher"));
  }
  const user = findMockUser(email);
  if (!user) return { ok: false, error: "No workspace user matches that email." };
  await writeSession({ userId: user.id, role: user.role, demo: false });
  redirect(homeFor(user.role));
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  await clearSessionCookie();
  redirect("/");
}

export async function bookAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input: BookingInput = {
    slug: String(formData.get("slug") ?? ""),
    serviceId: String(formData.get("serviceId") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    day: String(formData.get("day") ?? ""),
    window: formData.get("window") === "afternoon" ? "afternoon" : "morning",
    notes: String(formData.get("notes") ?? ""),
  };
  const session = await getSession();
  const result = await createBooking(session, input);
  if (result.ok) refresh();
  return result;
}

export async function assignJobAction(jobId: string, technicianId: string | null): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const result = await assignJob(session, jobId, technicianId);
  if (result.ok) refresh();
  return result;
}

export async function assignFormAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const technicianId = String(formData.get("technicianId") ?? "");
  return assignJobAction(String(formData.get("jobId") ?? ""), technicianId || null);
}

export async function moveJobAction(jobId: string, technicianId: string | null, ymd: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const result = await moveJob(session, jobId, technicianId, ymd);
  if (result.ok) refresh();
  return result;
}

export async function statusFormAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const jobId = String(formData.get("jobId") ?? "");
  const status = String(formData.get("status") ?? "") as JobStatus;
  const result = await updateStatus(session, jobId, status);
  refresh();
  const next = String(formData.get("returnTo") ?? `/jobs/${jobId}`);
  redirect(result.ok ? next : `${next}?error=${encodeURIComponent(result.error)}`);
}

export async function statusDirectAction(jobId: string, status: JobStatus): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const result = await updateStatus(session, jobId, status);
  if (result.ok) refresh();
  return result;
}

export async function noteFormAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const result = await addNote(session, String(formData.get("jobId") ?? ""), String(formData.get("body") ?? ""));
  if (result.ok) refresh();
  return result;
}

export async function photoFormAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const file = formData.get("photo");
  if (!(file instanceof File)) return { ok: false, error: "Choose a photo first." };
  const result = await addPhoto(session, String(formData.get("jobId") ?? ""), file);
  if (result.ok) refresh();
  return result;
}

export async function summarizeFormAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await summarize(session, jobId);
  refresh();
  const next = String(formData.get("returnTo") ?? `/jobs/${jobId}`);
  redirect(result.ok ? next : `${next}?error=${encodeURIComponent(result.error)}`);
}

export async function serviceFormAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const dollars = Number(formData.get("price"));
  const result = await createService(session, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    durationMin: Number(formData.get("durationMin")),
    priceCents: Number.isFinite(dollars) ? Math.round(dollars * 100) : -1,
    category: String(formData.get("category") ?? "General"),
  });
  if (result.ok) refresh();
  return result;
}

export async function inviteFormAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const result = await inviteTechnician(session, {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (result.ok) refresh();
  return result;
}

export async function remindAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const result = await sendReminders(session);
  if (result.ok) refresh();
  return result;
}

export async function readNotificationsAction() {
  const session = await getSession();
  if (!session) redirect("/login");
  await markNotificationsRead(session);
  refresh();
}

export async function checkoutFormAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await openJobCheckout(session, String(formData.get("jobId") ?? ""));
  if (!result.ok) redirect(`/portal?error=${encodeURIComponent(result.error)}`);
  redirect(result.url || "/portal");
}

export async function confirmPayFormAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await confirmMockPayment(session, String(formData.get("sessionId") ?? ""));
  refresh();
  if (!result.ok) redirect(`/pay/${String(formData.get("sessionId") ?? "")}?error=${encodeURIComponent(result.error)}`);
  redirect(result.url || "/portal");
}

export async function planFormAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const plan = formData.get("plan") === "starter" ? "starter" : "pro";
  const result = await openPlanCheckout(session, plan as PlanId);
  if (!result.ok) redirect(`/billing?error=${encodeURIComponent(result.error)}`);
  redirect(result.url || "/billing");
}

export async function confirmPlanFormAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await confirmMockPlan(session, String(formData.get("sessionId") ?? ""));
  refresh();
  if (!result.ok) redirect(`/billing?error=${encodeURIComponent(result.error)}`);
  redirect(result.url || "/billing");
}

export async function applyStripeJobPayment(jobId: string, stripeSessionId: string) {
  const session = await getSession();
  if (!session) return;
  const result = await confirmStripeJobPayment(session, jobId, stripeSessionId);
  if (result.ok) refresh();
}

export async function applyStripePlanPayment(stripeSessionId: string) {
  const session = await getSession();
  if (!session) return;
  const result = await confirmStripePlan(session, stripeSessionId);
  if (result.ok) refresh();
}
