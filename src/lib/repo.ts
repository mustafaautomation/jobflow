import "server-only";

import { headers } from "next/headers";
import { writeSummary } from "@/lib/ai";
import {
  atZone,
  clockOf,
  inCurrentWeek,
  isOffice,
  pinNear,
  PLANS,
  sameZonedDay,
  tomorrowYmd,
  zonedYmd,
} from "@/lib/format";
import { getStore, persistStore } from "@/lib/store";
import { readSessionPayload } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createStripeJobCheckout, createStripePlanCheckout, paidStripeSession, paymentsMode } from "@/lib/payments";
import {
  supabaseAssign,
  supabaseBooking,
  supabaseCreateService,
  supabaseInvite,
  supabaseListJobs,
  supabaseMove,
  supabaseNote,
  supabasePhoto,
  supabasePublicCatalog,
  supabaseReminders,
  supabaseServices,
  supabaseSession,
  supabaseSetPlanFromStripe,
  supabaseStatus,
  supabaseSummarize,
  supabaseCreateMockCheckout,
  supabaseGetCheckout,
  supabaseConfirmCheckout,
  supabasePlanCheckout,
  markSupabaseJobPaid,
} from "@/lib/supabase/data";
import type {
  ActionResult,
  Customer,
  DashboardData,
  Job,
  JobStatus,
  JobView,
  PlanId,
  Service,
  Session,
  Store,
  Technician,
  TenantSummary,
  User,
} from "@/lib/types";
import { TIME_ZONE } from "@/lib/types";

const SHOWCASE = new Set(["elena@vasquez.example", "jordan@rivera.example"]);

export async function getSession(): Promise<Session | null> {
  const payload = await readSessionPayload();
  if (payload?.demo) {
    const user = getStore().users.find((item) => item.id === payload.userId);
    return user ? { user, demo: true } : null;
  }
  if (isSupabaseConfigured()) return supabaseSession();
  if (!payload) return null;
  const user = getStore().users.find((item) => item.id === payload.userId);
  return user ? { user, demo: false } : null;
}

export function loginDirectory(): User[] {
  if (isSupabaseConfigured()) return [];
  return getStore()
    .users.filter((item) => item.role !== "customer" || SHOWCASE.has(item.email))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findMockUser(email: string) {
  const needle = email.trim().toLowerCase();
  return getStore().users.find((item) => item.email.toLowerCase() === needle) ?? null;
}

function memoryBackend(session: Session | null) {
  if (session?.demo) return true;
  return !isSupabaseConfigured();
}

export async function requestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "localhost:43123";
  const proto = headerStore.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function listJobs(session: Session): Promise<JobView[]> {
  if (!memoryBackend(session)) return supabaseListJobs(session);
  return visibleJobs(getStore(), session).map((job) => toView(getStore(), job)).sort(byWindow);
}

export async function getJob(session: Session, id: string) {
  const jobs = await listJobs(session);
  return jobs.find((job) => job.id === id) ?? null;
}

export async function getDashboard(session: Session): Promise<DashboardData> {
  const jobs = await listJobs(session);
  const now = new Date();
  const statusCounts: DashboardData["statusCounts"] = {
    requested: 0,
    scheduled: 0,
    en_route: 0,
    on_site: 0,
    complete: 0,
    invoiced: 0,
  };
  for (const job of jobs) statusCounts[job.status] += 1;
  const todayJobs = jobs.filter((job) => sameZonedDay(job.windowStart, now));
  const unassignedJobs = jobs.filter(
    (job) => !job.technicianId && job.status !== "complete" && job.status !== "invoiced",
  );
  return {
    jobsToday: todayJobs.length,
    unassigned: unassignedJobs.length,
    completedThisWeek: jobs.filter(
      (job) => (job.status === "complete" || job.status === "invoiced") && inCurrentWeek(job.windowStart, now),
    ).length,
    revenueCents: jobs
      .filter((job) => job.invoiceStatus === "paid" && job.paidAt && inCurrentWeek(job.paidAt, now))
      .reduce((sum, job) => sum + job.priceCents, 0),
    todayJobs: todayJobs.sort(byWindow),
    unassignedJobs: unassignedJobs.sort(byWindow),
    statusCounts,
  };
}

export async function listServices(session: Session) {
  if (!session.user.tenantId) return [];
  if (!memoryBackend(session)) return supabaseServices(session);
  return getStore().services.filter((service) => service.tenantId === session.user.tenantId && service.active);
}

export async function listTechnicians(session: Session): Promise<Technician[]> {
  if (!memoryBackend(session)) {
    const { supabaseTechnicians } = await import("@/lib/supabase/data");
    return supabaseTechnicians(session);
  }
  if (!session.user.tenantId) return [];
  return getStore().technicians.filter((tech) => tech.tenantId === session.user.tenantId);
}

export async function listCustomers(session: Session): Promise<Customer[]> {
  if (!memoryBackend(session)) {
    const { supabaseCustomers } = await import("@/lib/supabase/data");
    return supabaseCustomers(session);
  }
  if (session.user.role === "customer") {
    return getStore().customers.filter((customer) => customer.id === session.user.customerId);
  }
  if (!session.user.tenantId) return getStore().customers;
  return getStore().customers.filter((customer) => customer.tenantId === session.user.tenantId);
}

export async function listNotifications(session: Session) {
  if (!memoryBackend(session)) {
    const { supabaseNotifications } = await import("@/lib/supabase/data");
    return supabaseNotifications(session);
  }
  return getStore()
    .notifications.filter((item) => item.userId === session.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listMessages(session: Session) {
  if (!memoryBackend(session)) {
    const { supabaseMessages } = await import("@/lib/supabase/data");
    return supabaseMessages(session);
  }
  if (session.user.role === "superadmin") return getStore().messages;
  if (!isOffice(session.user.role) || !session.user.tenantId) return [];
  return getStore()
    .messages.filter((item) => item.tenantId === session.user.tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listTenantSummaries(session: Session): Promise<TenantSummary[]> {
  if (session.user.role !== "superadmin") return [];
  if (!memoryBackend(session)) {
    const { supabaseTenantSummaries } = await import("@/lib/supabase/data");
    return supabaseTenantSummaries();
  }
  return getStore().tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    trade: tenant.trade,
    plan: tenant.plan,
    technicians: getStore().technicians.filter((tech) => tech.tenantId === tenant.id).length,
    jobs: getStore().jobs.filter((job) => job.tenantId === tenant.id).length,
    openInvoicesCents: getStore()
      .jobs.filter((job) => job.tenantId === tenant.id && job.invoiceStatus === "open")
      .reduce((sum, job) => sum + job.priceCents, 0),
  }));
}

export async function publicCatalog(slug: string, session: Session | null) {
  if (memoryBackend(session)) {
    const tenant = getStore().tenants.find((item) => item.slug === slug);
    if (!tenant) return null;
    return {
      tenant,
      services: getStore().services.filter((service) => service.tenantId === tenant.id && service.active),
    };
  }
  return supabasePublicCatalog(slug);
}

export async function createBooking(session: Session | null, input: BookingInput): Promise<ActionResult> {
  if (session?.demo) return readOnly();
  const error = validateBooking(input);
  if (error) return { ok: false, error };
  if (!memoryBackend(session)) return supabaseBooking(input);
  const store = getStore();
  const tenant = store.tenants.find((item) => item.slug === input.slug);
  if (!tenant) return { ok: false, error: "That shop does not take requests here." };
  const service = store.services.find((item) => item.id === input.serviceId && item.tenantId === tenant.id && item.active);
  if (!service) return { ok: false, error: "Choose a service from the list." };
  if (input.day < zonedYmd(new Date(), tenant.timezone)) {
    return { ok: false, error: "Pick today or a later date." };
  }
  const existingUser = store.users.find((item) => item.email.toLowerCase() === input.email);
  if (existingUser && existingUser.tenantId && existingUser.tenantId !== tenant.id) {
    return { ok: false, error: "That email already belongs to another shop. Use a different email." };
  }
  if (existingUser && existingUser.role !== "customer") {
    return { ok: false, error: "That email belongs to a crew account. Use the customer's email." };
  }
  let customer = store.customers.find(
    (item) => item.tenantId === tenant.id && item.email.toLowerCase() === input.email,
  );
  if (!customer) {
    customer = {
      id: nextId(store.customers.map((item) => item.id), 100),
      tenantId: tenant.id,
      userId: existingUser?.id ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      ...pinNear(input.address),
      notes: "",
    };
    store.customers.push(customer);
  } else {
    customer.name = input.name;
    customer.phone = input.phone;
    customer.address = input.address;
    Object.assign(customer, pinNear(input.address));
  }
  if (!existingUser) {
    const created: User = {
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      role: "customer",
      name: input.name,
      email: input.email,
      phone: input.phone,
      technicianId: null,
      customerId: customer.id,
    };
    store.users.push(created);
    customer.userId = created.id;
  } else if (!customer.userId) {
    existingUser.customerId = customer.id;
    customer.userId = existingUser.id;
  }
  const hour = input.window === "afternoon" ? 13 : 8;
  const start = atZone(input.day, hour, 0, tenant.timezone);
  const jobId = nextId(store.jobs.map((item) => item.id), 1000);
  const job: Job = {
    id: jobId,
    tenantId: tenant.id,
    customerId: customer.id,
    serviceId: service.id,
    technicianId: null,
    status: "requested",
    reference: `JF-${jobId}`,
    title: service.name,
    description: input.notes || service.description,
    address: customer.address,
    lat: customer.lat,
    lng: customer.lng,
    windowStart: start.toISOString(),
    windowEnd: new Date(start.getTime() + service.durationMin * 60_000).toISOString(),
    priceCents: service.priceCents,
    invoiceStatus: "none",
    paidAt: null,
    summary: null,
    summaryProvider: null,
    notes: input.notes
      ? [{ id: crypto.randomUUID(), authorName: input.name, body: input.notes, createdAt: new Date().toISOString() }]
      : [],
    photos: [],
    createdAt: new Date().toISOString(),
  };
  store.jobs.push(job);
  const office = store.users.filter((item) => item.tenantId === tenant.id && isOffice(item.role));
  for (const person of office) {
    store.notifications.unshift({
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      userId: person.id,
      title: `New request ${job.reference}`,
      body: `${customer.name} asked for ${service.name}.`,
      href: "/board",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  pushMessage(store, {
    tenantId: tenant.id,
    jobId: job.id,
    channel: "email",
    to: customer.email,
    subject: `${tenant.name} received ${job.reference}`,
    body: `We have your request for ${service.name} on ${input.day}. A dispatcher will assign a technician. This confirmation is mocked and was not emailed.`,
    kind: "booking",
  });
  pushMessage(store, {
    tenantId: tenant.id,
    jobId: job.id,
    channel: "sms",
    to: customer.phone,
    subject: job.reference,
    body: `${tenant.name} received ${job.reference} for ${service.name}. We'll text again when a technician is assigned. Mock SMS.`,
    kind: "booking",
  });
  persistStore(store);
  return { ok: true, jobId: job.id, reference: job.reference, message: "Request received." };
}

export async function assignJob(session: Session, jobId: string, technicianId: string | null): Promise<ActionResult> {
  const denied = denyWrite(session, "office");
  if (denied) return denied;
  if (!memoryBackend(session)) return supabaseAssign(session, jobId, technicianId);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  if (!technicianId) {
    job.technicianId = null;
    if (job.status === "scheduled") job.status = "requested";
    persistStore(store);
    return { ok: true, message: "Technician cleared." };
  }
  const tech = store.technicians.find((item) => item.id === technicianId && item.tenantId === job.tenantId);
  if (!tech) return { ok: false, error: "That technician is not on this crew." };
  job.technicianId = tech.id;
  if (job.status === "requested") job.status = "scheduled";
  notifyAssignment(store, job, tech);
  persistStore(store);
  return { ok: true, message: `Assigned to ${tech.name}.` };
}

export async function moveJob(session: Session, jobId: string, technicianId: string | null, ymd: string): Promise<ActionResult> {
  const denied = denyWrite(session, "office");
  if (denied) return denied;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return { ok: false, error: "That day is not on the calendar." };
  if (!memoryBackend(session)) return supabaseMove(session, jobId, technicianId, ymd);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  const tenant = store.tenants.find((item) => item.id === job.tenantId);
  const zone = tenant?.timezone || TIME_ZONE;
  const clock = clockOf(job.windowStart, zone);
  const duration = new Date(job.windowEnd).getTime() - new Date(job.windowStart).getTime();
  const start = atZone(ymd, clock.hour, clock.minute, zone);
  job.windowStart = start.toISOString();
  job.windowEnd = new Date(start.getTime() + Math.max(duration, 30 * 60_000)).toISOString();
  if (technicianId) {
    const tech = store.technicians.find((item) => item.id === technicianId && item.tenantId === job.tenantId);
    if (!tech) return { ok: false, error: "That technician is not on this crew." };
    job.technicianId = tech.id;
    if (job.status === "requested") job.status = "scheduled";
    notifyAssignment(store, job, tech);
  }
  persistStore(store);
  return { ok: true, message: "Visit moved." };
}

export async function updateStatus(session: Session, jobId: string, status: JobStatus): Promise<ActionResult> {
  const denied = denyWrite(session, "field");
  if (denied) return denied;
  if (status === "invoiced") return { ok: false, error: "Invoiced is set when the customer pays." };
  if (!memoryBackend(session)) return supabaseStatus(session, jobId, status);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  if (session.user.role === "technician") {
    if (job.technicianId !== session.user.technicianId) return missingJob();
    const allowed: Partial<Record<JobStatus, JobStatus>> = {
      scheduled: "en_route",
      en_route: "on_site",
      on_site: "complete",
    };
    if (allowed[job.status] !== status) {
      return { ok: false, error: "Move the visit one step at a time." };
    }
  } else if (!isOffice(session.user.role)) {
    return { ok: false, error: "You cannot change this visit." };
  }
  job.status = status;
  if (status === "complete" && job.invoiceStatus === "none") job.invoiceStatus = "open";
  persistStore(store);
  return { ok: true, message: "Status updated." };
}

export async function addNote(session: Session, jobId: string, body: string): Promise<ActionResult> {
  const denied = denyWrite(session, "field");
  if (denied) return denied;
  const text = body.trim();
  if (text.length < 2) return { ok: false, error: "Write a note the next person can use." };
  if (text.length > 2000) return { ok: false, error: "Keep the note under 2,000 characters." };
  if (!memoryBackend(session)) return supabaseNote(session, jobId, text);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  if (session.user.role === "customer") return { ok: false, error: "Notes are for the crew." };
  job.notes.push({
    id: crypto.randomUUID(),
    authorName: session.user.name,
    body: text,
    createdAt: new Date().toISOString(),
  });
  persistStore(store);
  return { ok: true, message: "Note saved." };
}

export async function addPhoto(session: Session, jobId: string, file: File): Promise<ActionResult> {
  const denied = denyWrite(session, "field");
  if (denied) return denied;
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo first." };
  if (file.size > 900_000) return { ok: false, error: "Photos need to be under 900 KB in this workspace." };
  if (file.type && !file.type.startsWith("image/")) return { ok: false, error: "Upload a JPEG, PNG, or WEBP." };
  if (!memoryBackend(session)) return supabasePhoto(session, jobId, file);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  if (session.user.role === "customer") return { ok: false, error: "Photos are for the crew." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
  job.photos.push({ id: crypto.randomUUID(), url, createdAt: new Date().toISOString() });
  persistStore(store);
  return { ok: true, message: "Photo attached." };
}

export async function summarize(session: Session, jobId: string): Promise<ActionResult> {
  const denied = denyWrite(session, "field");
  if (denied) return denied;
  if (!memoryBackend(session)) return supabaseSummarize(session, jobId);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  const view = toView(store, job);
  const result = await writeSummary({
    title: job.title,
    service: view.serviceName,
    status: job.status,
    description: job.description,
    notes: job.notes.map((note) => `${note.authorName}: ${note.body}`).join("\n"),
  });
  job.summary = result.text;
  job.summaryProvider = result.provider;
  persistStore(store);
  return { ok: true, message: result.provider === "mock" ? "Summary drafted locally." : "Summary saved." };
}

export async function createService(session: Session, input: ServiceInput): Promise<ActionResult> {
  const denied = denyWrite(session, "office");
  if (denied) return denied;
  if (input.name.trim().length < 2) return { ok: false, error: "Name the service." };
  if (input.durationMin < 15 || input.durationMin > 480) {
    return { ok: false, error: "Duration needs to be between 15 minutes and 8 hours." };
  }
  if (input.priceCents < 0 || input.priceCents > 2_000_000) return { ok: false, error: "Enter a price the crew can invoice." };
  if (!memoryBackend(session)) return supabaseCreateService(session, input);
  const store = getStore();
  const service: Service = {
    id: nextId(store.services.map((item) => item.id), 30),
    tenantId: session.user.tenantId || "",
    name: input.name.trim(),
    description: input.description.trim(),
    durationMin: input.durationMin,
    priceCents: input.priceCents,
    category: input.category.trim() || "General",
    active: true,
  };
  store.services.push(service);
  persistStore(store);
  return { ok: true, message: `${service.name} is on the booking page.` };
}

export async function inviteTechnician(session: Session, input: { name: string; email: string; phone: string }): Promise<ActionResult> {
  const denied = denyWrite(session, "office");
  if (denied) return denied;
  if (session.user.role !== "owner") return { ok: false, error: "Only the owner can add a technician." };
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (name.length < 2 || !email.includes("@") || phone.length < 7) {
    return { ok: false, error: "Name, email, and phone are required." };
  }
  if (!memoryBackend(session)) return supabaseInvite(session, { name, email, phone });
  const store = getStore();
  const tenant = store.tenants.find((item) => item.id === session.user.tenantId);
  if (!tenant) return { ok: false, error: "This workspace has no shop." };
  const count = store.technicians.filter((item) => item.tenantId === tenant.id).length;
  const limit = PLANS[tenant.plan].techLimit;
  if (limit !== null && count >= limit) {
    return { ok: false, error: "Starter includes 3 technicians. Move to Pro to add another." };
  }
  if (store.users.some((item) => item.email.toLowerCase() === email)) {
    return { ok: false, error: "That email is already on a Jobflow workspace." };
  }
  const techId = nextId(store.technicians.map((item) => item.id), 10);
  const userId = crypto.randomUUID();
  store.users.push({
    id: userId,
    tenantId: tenant.id,
    role: "technician",
    name,
    email,
    phone,
    technicianId: techId,
    customerId: null,
  });
  store.technicians.push({
    id: techId,
    tenantId: tenant.id,
    userId,
    name,
    phone,
    color: "#1f6f78",
    skills: ["General"],
    ...pinNear(email),
  });
  persistStore(store);
  return { ok: true, message: `${name} can sign in with ${email}.` };
}

export async function sendReminders(session: Session): Promise<ActionResult> {
  const denied = denyWrite(session, "office");
  if (denied) return denied;
  if (!memoryBackend(session)) return supabaseReminders(session);
  const store = getStore();
  const tenant = store.tenants.find((item) => item.id === session.user.tenantId);
  if (!tenant) return { ok: false, error: "This workspace has no shop." };
  const target = tomorrowYmd(new Date(), tenant.timezone);
  const today = zonedYmd(new Date(), tenant.timezone);
  let count = 0;
  for (const job of store.jobs) {
    if (job.tenantId !== tenant.id || !job.technicianId) continue;
    if (job.status !== "scheduled" && job.status !== "en_route") continue;
    if (zonedYmd(new Date(job.windowStart), tenant.timezone) !== target) continue;
    const already = store.messages.some(
      (item) => item.jobId === job.id && item.kind === "reminder" && item.createdAt.slice(0, 10) === today,
    );
    if (already) continue;
    const view = toView(store, job);
    const tech = store.technicians.find((item) => item.id === job.technicianId);
    pushMessage(store, {
      tenantId: tenant.id,
      jobId: job.id,
      channel: "sms",
      to: view.customerPhone,
      subject: "Visit reminder",
      body: `Reminder from ${tenant.name}: ${view.technicianName ?? "Your technician"} is scheduled tomorrow for ${view.serviceName}. Mock SMS.`,
      kind: "reminder",
    });
    pushMessage(store, {
      tenantId: tenant.id,
      jobId: job.id,
      channel: "email",
      to: view.customerEmail,
      subject: `Tomorrow: ${view.serviceName}`,
      body: `${tenant.name} has ${view.technicianName ?? "a technician"} scheduled tomorrow. Mock email, nothing was sent.`,
      kind: "reminder",
    });
    if (tech) {
      const techUser = store.users.find((item) => item.id === tech.userId);
      if (techUser) {
        store.notifications.unshift({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          userId: techUser.id,
          title: "Tomorrow's reminder queued",
          body: `${view.customerName} · ${view.serviceName}`,
          href: `/tech/${job.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    count += 1;
  }
  persistStore(store);
  return { ok: true, message: count ? `Queued reminders for ${count} visits.` : "Tomorrow's assigned visits already have reminders." };
}

export async function markNotificationsRead(session: Session): Promise<ActionResult> {
  if (session.demo) return readOnly();
  if (!memoryBackend(session)) {
    const { supabaseMarkRead } = await import("@/lib/supabase/data");
    return supabaseMarkRead(session);
  }
  const store = getStore();
  for (const item of store.notifications) {
    if (item.userId === session.user.id) item.read = true;
  }
  persistStore(store);
  return { ok: true };
}

export async function openJobCheckout(session: Session, jobId: string): Promise<ActionResult> {
  const denied = denyWrite(session, "pay");
  if (denied) return denied;
  if (!memoryBackend(session)) {
    const job = await getJob(session, jobId);
    if (!job) return missingJob();
    if (job.invoiceStatus === "paid") return { ok: false, error: "This visit is already paid." };
    if (job.status !== "complete" && job.status !== "invoiced") {
      return { ok: false, error: "Payment opens after the technician completes the visit." };
    }
    const origin = await requestOrigin();
    const url = await createStripeJobCheckout({
      origin,
      jobId: job.id,
      tenantId: job.tenantId,
      amountCents: job.priceCents,
      title: `${job.tenantName} · ${job.serviceName}`,
      email: job.customerEmail,
    });
    if (url) return { ok: true, url };
    const checkoutId = await supabaseCreateMockCheckout(job);
    return { ok: true, url: `/pay/${checkoutId}` };
  }
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  if (session.user.role === "technician") return { ok: false, error: "Technicians do not collect payment in the app." };
  if (job.invoiceStatus === "paid") return { ok: false, error: "This visit is already paid." };
  if (job.status !== "complete" && job.status !== "invoiced") {
    return { ok: false, error: "Payment opens after the technician completes the visit." };
  }
  const origin = await requestOrigin();
  const stripeUrl = await createStripeJobCheckout({
    origin,
    jobId: job.id,
    tenantId: job.tenantId,
    amountCents: job.priceCents,
    title: `${toView(store, job).tenantName} · ${toView(store, job).serviceName}`,
    email: toView(store, job).customerEmail,
  });
  if (stripeUrl) return { ok: true, url: stripeUrl };
  const checkout = {
    id: crypto.randomUUID(),
    tenantId: job.tenantId,
    jobId: job.id,
    plan: null,
    amountCents: job.priceCents,
    label: toView(store, job).serviceName,
    status: "open" as const,
    createdAt: new Date().toISOString(),
  };
  store.checkouts.push(checkout);
  persistStore(store);
  return { ok: true, url: `/pay/${checkout.id}` };
}

export async function getCheckout(session: Session, checkoutId: string) {
  if (!memoryBackend(session)) return supabaseGetCheckout(session, checkoutId);
  const checkout = getStore().checkouts.find((item) => item.id === checkoutId);
  if (!checkout?.jobId) return null;
  const job = ownedJob(getStore(), session, checkout.jobId);
  if (!job) return null;
  return { checkout, job: toView(getStore(), job) };
}

export async function confirmMockPayment(session: Session, checkoutId: string): Promise<ActionResult> {
  const denied = denyWrite(session, "pay");
  if (denied) return denied;
  if (!memoryBackend(session)) return supabaseConfirmCheckout(session, checkoutId);
  const store = getStore();
  const checkout = store.checkouts.find((item) => item.id === checkoutId);
  if (!checkout?.jobId) return { ok: false, error: "This checkout is no longer open." };
  const job = ownedJob(store, session, checkout.jobId);
  if (!job) return { ok: false, error: "This invoice is not on your account." };
  if (checkout.status === "paid" || job.invoiceStatus === "paid") {
    return { ok: true, url: `/portal/${job.id}?paid=1`, message: "Already paid." };
  }
  settleJob(store, job);
  checkout.status = "paid";
  persistStore(store);
  return { ok: true, url: `/portal/${job.id}?paid=1`, message: "Payment recorded." };
}

export async function confirmStripeJobPayment(session: Session, jobId: string, stripeSessionId: string): Promise<ActionResult> {
  if (session.demo) return readOnly();
  const paid = await paidStripeSession(stripeSessionId);
  if (!paid || paid.metadata?.jobId !== jobId) return { ok: false, error: "Stripe has not marked this invoice paid." };
  if (!memoryBackend(session)) return markSupabaseJobPaid(jobId);
  const store = getStore();
  const job = ownedJob(store, session, jobId);
  if (!job) return missingJob();
  if (job.invoiceStatus !== "paid") settleJob(store, job);
  persistStore(store);
  return { ok: true, message: "Payment recorded." };
}

export async function openPlanCheckout(session: Session, plan: PlanId): Promise<ActionResult> {
  const denied = denyWrite(session, "owner");
  if (denied) return denied;
  if (!memoryBackend(session)) {
    const origin = await requestOrigin();
    const url = await createStripePlanCheckout({
      origin,
      plan,
      tenantId: session.user.tenantId || "",
      email: session.user.email,
    });
    if (url) return { ok: true, url };
    return supabasePlanCheckout(session, plan);
  }
  const store = getStore();
  const tenant = store.tenants.find((item) => item.id === session.user.tenantId);
  if (!tenant) return { ok: false, error: "This workspace has no shop." };
  const origin = await requestOrigin();
  const stripeUrl = await createStripePlanCheckout({
    origin,
    plan,
    tenantId: tenant.id,
    email: session.user.email,
  });
  if (stripeUrl) return { ok: true, url: stripeUrl };
  const checkout = {
    id: crypto.randomUUID(),
    tenantId: tenant.id,
    jobId: null,
    plan,
    amountCents: PLANS[plan].priceCents,
    label: `Jobflow ${PLANS[plan].name}`,
    status: "open" as const,
    createdAt: new Date().toISOString(),
  };
  store.checkouts.push(checkout);
  persistStore(store);
  return { ok: true, url: `/billing/mock/${checkout.id}` };
}

export async function getPlanCheckout(session: Session, checkoutId: string) {
  if (!memoryBackend(session)) return null;
  const checkout = getStore().checkouts.find((item) => item.id === checkoutId && item.plan);
  if (!checkout || checkout.tenantId !== session.user.tenantId) return null;
  return checkout;
}

export async function confirmMockPlan(session: Session, checkoutId: string): Promise<ActionResult> {
  const denied = denyWrite(session, "owner");
  if (denied) return denied;
  const store = getStore();
  const checkout = store.checkouts.find((item) => item.id === checkoutId);
  if (!checkout?.plan || checkout.tenantId !== session.user.tenantId) {
    return { ok: false, error: "That plan checkout is not on this workspace." };
  }
  const tenant = store.tenants.find((item) => item.id === session.user.tenantId);
  if (!tenant) return { ok: false, error: "This workspace has no shop." };
  tenant.plan = checkout.plan;
  checkout.status = "paid";
  persistStore(store);
  return { ok: true, url: "/billing?upgraded=1", message: `${PLANS[checkout.plan].name} is active.` };
}

export async function confirmStripePlan(session: Session, stripeSessionId: string): Promise<ActionResult> {
  if (session.demo) return readOnly();
  if (session.user.role !== "owner") return { ok: false, error: "Only the owner can change the plan." };
  const paid = await paidStripeSession(stripeSessionId);
  const plan = paid?.metadata?.plan;
  if (!paid || (plan !== "starter" && plan !== "pro")) return { ok: false, error: "Stripe has not completed this subscription." };
  if (paid.metadata?.tenantId && paid.metadata.tenantId !== session.user.tenantId) {
    return { ok: false, error: "That subscription belongs to another shop." };
  }
  if (!memoryBackend(session)) return supabaseSetPlanFromStripe(session, plan);
  const tenant = getStore().tenants.find((item) => item.id === session.user.tenantId);
  if (!tenant) return { ok: false, error: "This workspace has no shop." };
  tenant.plan = plan;
  persistStore(getStore());
  return { ok: true, message: `${PLANS[plan].name} is active.` };
}

export async function markJobPaidFromWebhook(jobId: string) {
  if (isSupabaseConfigured()) return markSupabaseJobPaid(jobId);
  const store = getStore();
  const job = store.jobs.find((item) => item.id === jobId);
  if (!job || job.invoiceStatus === "paid") return;
  settleJob(store, job);
  persistStore(store);
}

export function runtimeMode() {
  return {
    data: isSupabaseConfigured() ? "supabase" : "mock",
    payments: paymentsMode(),
    messaging: "mock",
    ai: process.env.GROQ_API_KEY ? "groq" : process.env.GEMINI_API_KEY ? "gemini" : "mock",
    maps: process.env.NEXT_PUBLIC_MAPTILER_KEY ? "maptiler" : "osm",
  } as const;
}

export type BookingInput = {
  slug: string;
  serviceId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  day: string;
  window: "morning" | "afternoon";
  notes: string;
};

export type ServiceInput = {
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  category: string;
};

function validateBooking(input: BookingInput) {
  if (input.name.trim().length < 2) return "Enter the name we should put on the work order.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "Enter a real email so we can send the confirmation.";
  if (input.phone.trim().length < 7) return "Enter a phone number the technician can call.";
  if (input.address.trim().length < 6) return "Enter the street address for the visit.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return "Choose a date.";
  return null;
}

function denyWrite(session: Session, scope: "office" | "field" | "pay" | "owner"): ActionResult | null {
  if (session.demo) return readOnly();
  if (scope === "office" && !isOffice(session.user.role)) {
    return { ok: false, error: "Only the owner or dispatcher can do that." };
  }
  if (scope === "owner" && session.user.role !== "owner") {
    return { ok: false, error: "Only the owner can change the plan." };
  }
  if (scope === "field" && session.user.role === "customer") {
    return { ok: false, error: "That action is for the crew." };
  }
  if (scope === "pay" && session.user.role === "technician") {
    return { ok: false, error: "Technicians do not collect payment in the app." };
  }
  return null;
}

function readOnly(): ActionResult {
  return { ok: false, error: "Demo mode is read-only. Open a working workspace to change the board." };
}

function missingJob(): ActionResult {
  return { ok: false, error: "That job is not on this workspace." };
}

function visibleJobs(store: Store, session: Session) {
  if (session.user.role === "superadmin") return store.jobs;
  const mine = store.jobs.filter((job) => job.tenantId === session.user.tenantId);
  if (isOffice(session.user.role)) return mine;
  if (session.user.role === "technician") return mine.filter((job) => job.technicianId === session.user.technicianId);
  if (session.user.role === "customer") return mine.filter((job) => job.customerId === session.user.customerId);
  return [];
}

function ownedJob(store: Store, session: Session, jobId: string) {
  return visibleJobs(store, session).find((job) => job.id === jobId) ?? null;
}

function toView(store: Store, job: Job): JobView {
  const customer = store.customers.find((item) => item.id === job.customerId);
  const tech = store.technicians.find((item) => item.id === job.technicianId);
  const service = store.services.find((item) => item.id === job.serviceId);
  const tenant = store.tenants.find((item) => item.id === job.tenantId);
  return {
    ...job,
    customerName: customer?.name ?? "Customer",
    customerPhone: customer?.phone ?? "",
    customerEmail: customer?.email ?? "",
    technicianName: tech?.name ?? null,
    technicianColor: tech?.color ?? null,
    serviceName: service?.name ?? job.title,
    durationMin: service?.durationMin ?? 60,
    tenantName: tenant?.name ?? "Shop",
  };
}

function byWindow(a: JobView, b: JobView) {
  return a.windowStart.localeCompare(b.windowStart);
}

function nextId(ids: string[], floor: number) {
  return String(ids.reduce((current, id) => Math.max(current, Number(id) || 0), floor) + 1);
}

function notifyAssignment(store: Store, job: Job, tech: Technician) {
  const view = toView(store, job);
  const techUser = store.users.find((item) => item.id === tech.userId);
  const customer = store.customers.find((item) => item.id === job.customerId);
  const now = new Date().toISOString();
  if (techUser) {
    store.notifications.unshift({
      id: crypto.randomUUID(),
      tenantId: job.tenantId,
      userId: techUser.id,
      title: `Assigned ${job.reference}`,
      body: `${view.customerName} · ${view.serviceName}`,
      href: `/tech/${job.id}`,
      read: false,
      createdAt: now,
    });
  }
  if (customer?.userId) {
    store.notifications.unshift({
      id: crypto.randomUUID(),
      tenantId: job.tenantId,
      userId: customer.userId,
      title: `${tech.name} is assigned`,
      body: `${view.serviceName} · ${job.reference}`,
      href: `/portal/${job.id}`,
      read: false,
      createdAt: now,
    });
  }
  pushMessage(store, {
    tenantId: job.tenantId,
    jobId: job.id,
    channel: "sms",
    to: tech.phone,
    subject: `Assignment ${job.reference}`,
    body: `${view.tenantName}: you are assigned to ${view.customerName} for ${view.serviceName}. Mock SMS.`,
    kind: "assignment",
  });
  pushMessage(store, {
    tenantId: job.tenantId,
    jobId: job.id,
    channel: "email",
    to: view.customerEmail,
    subject: `${tech.name} is assigned to ${job.reference}`,
    body: `${view.tenantName} assigned ${tech.name} to your ${view.serviceName} visit. Mock email, nothing was sent.`,
    kind: "assignment",
  });
}

function settleJob(store: Store, job: Job) {
  job.status = "invoiced";
  job.invoiceStatus = "paid";
  job.paidAt = new Date().toISOString();
  const view = toView(store, job);
  const office = store.users.filter((item) => item.tenantId === job.tenantId && isOffice(item.role));
  for (const person of office) {
    store.notifications.unshift({
      id: crypto.randomUUID(),
      tenantId: job.tenantId,
      userId: person.id,
      title: `${job.reference} paid`,
      body: `${view.customerName} paid ${view.serviceName}.`,
      href: `/jobs/${job.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  pushMessage(store, {
    tenantId: job.tenantId,
    jobId: job.id,
    channel: "email",
    to: view.customerEmail,
    subject: `Receipt ${job.reference}`,
    body: `Payment received for ${view.serviceName}. Mock receipt, nothing was emailed.`,
    kind: "payment",
  });
}

function pushMessage(
  store: Store,
  input: Omit<Store["messages"][number], "id" | "createdAt">,
) {
  store.messages.unshift({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
}
