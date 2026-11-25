import "server-only";

import { writeSummary } from "@/lib/ai";
import { atZone, clockOf, pinNear, PLANS } from "@/lib/format";
import { createSupabaseAdmin, createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import type {
  ActionResult,
  Customer,
  JobStatus,
  JobView,
  PlanId,
  Service,
  Session,
  Technician,
  Tenant,
  TenantSummary,
  User,
} from "@/lib/types";
import { TIME_ZONE } from "@/lib/types";
type BookingInput = {
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

type ServiceInput = {
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  category: string;
};

type Row = Record<string, unknown>;

export async function supabaseSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, role, full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  const record = asRow(profile);
  const { data: tech } = await supabase.from("technicians").select("id").eq("user_id", userId).maybeSingle();
  const { data: customer } = await supabase.from("customers").select("id").eq("user_id", userId).maybeSingle();
  return {
    demo: false,
    user: {
      id: String(record.id),
      tenantId: record.tenant_id ? String(record.tenant_id) : null,
      role: record.role as User["role"],
      name: String(record.full_name ?? ""),
      email: String(record.email ?? ""),
      phone: String(record.phone ?? ""),
      technicianId: tech ? String(asRow(tech).id) : null,
      customerId: customer ? String(asRow(customer).id) : null,
    },
  };
}

export async function supabaseListJobs(session: Session): Promise<JobView[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, tenant_id, customer_id, service_id, technician_id, status, reference, title, description, address, lat, lng, window_start, window_end, price_cents, invoice_status, paid_at, summary, summary_provider, created_at, customers(name, phone, email), services(name, duration_min), technicians(name, color), tenants(name), job_notes(id, author_name, body, created_at), job_photos(id, storage_path, created_at)",
    )
    .order("window_start", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const views: JobView[] = [];
  for (const row of rows) views.push(await mapJob(row));
  return views.filter((job) => canSee(session, job));
}

export async function supabaseTechnicians(session: Session): Promise<Technician[]> {
  if (!session.user.tenantId && session.user.role !== "superadmin") return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("technicians").select("id, tenant_id, user_id, name, phone, color, skills, lat, lng");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[])
    .filter((row) => session.user.role === "superadmin" || String(row.tenant_id) === session.user.tenantId)
    .map((row) => ({
      id: String(row.id),
      tenantId: String(row.tenant_id),
      userId: String(row.user_id ?? ""),
      name: String(row.name),
      phone: String(row.phone ?? ""),
      color: String(row.color ?? "#1f6f78"),
      skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
      lat: Number(row.lat ?? 0),
      lng: Number(row.lng ?? 0),
    }));
}

export async function supabaseCustomers(session: Session): Promise<Customer[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, tenant_id, user_id, name, email, phone, address, lat, lng, notes");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[])
    .filter((row) => session.user.role === "superadmin" || String(row.tenant_id) === session.user.tenantId)
    .map(mapCustomer);
}

export async function supabaseServices(session: Session): Promise<Service[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, tenant_id, name, description, duration_min, price_cents, category, active")
    .eq("active", true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[])
    .filter((row) => String(row.tenant_id) === session.user.tenantId)
    .map(mapService);
}

export async function supabaseNotifications(_session: Session) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, tenant_id, user_id, title, body, href, read, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: String(row.id),
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    userId: String(row.user_id),
    title: String(row.title),
    body: String(row.body),
    href: String(row.href),
    read: Boolean(row.read),
    createdAt: String(row.created_at),
  }));
}

export async function supabaseMessages(_session: Session) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("message_logs")
    .select("id, tenant_id, job_id, channel, recipient, subject, body, kind, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    jobId: row.job_id ? String(row.job_id) : null,
    channel: row.channel as "email" | "sms",
    to: String(row.recipient),
    subject: String(row.subject),
    body: String(row.body),
    kind: row.kind as "assignment" | "reminder" | "booking" | "payment",
    createdAt: String(row.created_at),
  }));
}

export async function supabaseMarkRead(session: Session): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id);
  if (error) return fail(error.message);
  return { ok: true };
}

export async function supabaseTenantSummaries(): Promise<TenantSummary[]> {
  const admin = adminOrThrow();
  const { data, error } = await admin.from("tenants").select("id, name, slug, trade, plan");
  if (error) throw new Error(error.message);
  const tenants = (data ?? []) as unknown as Row[];
  const summaries: TenantSummary[] = [];
  for (const tenant of tenants) {
    const id = String(tenant.id);
    const [{ count: techs }, { count: jobs }, { data: invoices }] = await Promise.all([
      admin.from("technicians").select("id", { count: "exact", head: true }).eq("tenant_id", id),
      admin.from("jobs").select("id", { count: "exact", head: true }).eq("tenant_id", id),
      admin.from("jobs").select("price_cents").eq("tenant_id", id).eq("invoice_status", "open"),
    ]);
    summaries.push({
      id,
      name: String(tenant.name),
      slug: String(tenant.slug),
      trade: String(tenant.trade),
      plan: tenant.plan as TenantSummary["plan"],
      technicians: techs ?? 0,
      jobs: jobs ?? 0,
      openInvoicesCents: ((invoices ?? []) as unknown as Row[]).reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0),
    });
  }
  return summaries;
}

export async function supabasePublicCatalog(slug: string): Promise<{ tenant: Tenant; services: Service[] } | null> {
  const admin = adminOrThrow();
  const { data: tenantRow } = await admin.from("tenants").select("*").eq("slug", slug).maybeSingle();
  if (!tenantRow) return null;
  const tenant = mapTenant(asRow(tenantRow));
  const { data } = await admin.from("services").select("*").eq("tenant_id", tenant.id).eq("active", true);
  return { tenant, services: ((data ?? []) as unknown as Row[]).map(mapService) };
}

export async function supabaseBooking(input: BookingInput): Promise<ActionResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: "Public booking needs SUPABASE_SECRET_KEY on the server." };
  }
  const catalog = await supabasePublicCatalog(input.slug);
  if (!catalog) return { ok: false, error: "That shop does not take requests here." };
  const service = catalog.services.find((item) => item.id === input.serviceId);
  if (!service) return { ok: false, error: "Choose a service from the list." };
  const admin = createSupabaseAdmin();
  const point = pinNear(input.address);
  const { data: existing } = await admin
    .from("customers")
    .select("id, user_id")
    .eq("tenant_id", catalog.tenant.id)
    .eq("email", input.email)
    .maybeSingle();
  let customerId = existing ? String(asRow(existing).id) : "";
  if (!customerId) {
    const inserted = await admin
      .from("customers")
      .insert({
        tenant_id: catalog.tenant.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        lat: point.lat,
        lng: point.lng,
        notes: "",
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) return fail(inserted.error?.message);
    customerId = String(asRow(inserted.data).id);
  }
  const hour = input.window === "afternoon" ? 13 : 8;
  const start = atZone(input.day, hour, 0, catalog.tenant.timezone || TIME_ZONE);
  const created = await admin
    .from("jobs")
    .insert({
      tenant_id: catalog.tenant.id,
      customer_id: Number(customerId),
      service_id: Number(service.id),
      status: "requested",
      reference: `JF-${Date.now().toString().slice(-6)}`,
      title: service.name,
      description: input.notes || service.description,
      address: input.address,
      lat: point.lat,
      lng: point.lng,
      window_start: start.toISOString(),
      window_end: new Date(start.getTime() + service.durationMin * 60_000).toISOString(),
      price_cents: service.priceCents,
      invoice_status: "none",
    })
    .select("id, reference")
    .single();
  if (created.error || !created.data) return fail(created.error?.message);
  const job = asRow(created.data);
  await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    app_metadata: { role: "customer", tenant_id: catalog.tenant.id },
    user_metadata: { full_name: input.name },
  });
  return { ok: true, jobId: String(job.id), reference: String(job.reference), message: "Request received." };
}

export async function supabaseAssign(session: Session, jobId: string, technicianId: string | null): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const patch = technicianId
    ? { technician_id: Number(technicianId), status: "scheduled" }
    : { technician_id: null, status: "requested" };
  const { data, error } = await supabase.from("jobs").update(patch).eq("id", Number(jobId)).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return { ok: false, error: "That job is not on this workspace." };
  return { ok: true, message: "Assignment saved." };
}

export async function supabaseMove(session: Session, jobId: string, technicianId: string | null, ymd: string): Promise<ActionResult> {
  const jobs = await supabaseListJobs(session);
  const job = jobs.find((item) => item.id === jobId);
  if (!job) return { ok: false, error: "That job is not on this workspace." };
  const clock = clockOf(job.windowStart);
  const duration = new Date(job.windowEnd).getTime() - new Date(job.windowStart).getTime();
  const start = atZone(ymd, clock.hour, clock.minute);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      window_start: start.toISOString(),
      window_end: new Date(start.getTime() + duration).toISOString(),
      technician_id: technicianId ? Number(technicianId) : job.technicianId ? Number(job.technicianId) : null,
      status: job.status === "requested" && technicianId ? "scheduled" : job.status,
    })
    .eq("id", Number(jobId));
  if (error) return fail(error.message);
  return { ok: true, message: "Visit moved." };
}

export async function supabaseStatus(session: Session, jobId: string, status: JobStatus): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const patch: Row = { status };
  if (status === "complete") patch.invoice_status = "open";
  const { data, error } = await supabase.from("jobs").update(patch).eq("id", Number(jobId)).select("id");
  if (error) return fail(error.message);
  if (!data?.length) return { ok: false, error: "That job is not on this workspace." };
  return { ok: true, message: "Status updated." };
}

export async function supabaseNote(session: Session, jobId: string, body: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("job_notes").insert({
    job_id: Number(jobId),
    tenant_id: session.user.tenantId,
    author_name: session.user.name,
    body,
  });
  if (error) return fail(error.message);
  return { ok: true, message: "Note saved." };
}

export async function supabasePhoto(session: Session, jobId: string, file: File): Promise<ActionResult> {
  if (!isSupabaseAdminConfigured() || !session.user.tenantId) {
    return { ok: false, error: "Photo upload needs SUPABASE_SECRET_KEY and the job-photos bucket." };
  }
  const path = `${session.user.tenantId}/${jobId}/${crypto.randomUUID()}`;
  const admin = createSupabaseAdmin();
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await admin.storage.from("job-photos").upload(path, bytes, { contentType: file.type || "image/jpeg" });
  if (uploaded.error) return fail(uploaded.error.message);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("job_photos").insert({
    job_id: Number(jobId),
    tenant_id: session.user.tenantId,
    storage_path: path,
  });
  if (error) return fail(error.message);
  return { ok: true, message: "Photo attached." };
}

export async function supabaseSummarize(session: Session, jobId: string): Promise<ActionResult> {
  const jobs = await supabaseListJobs(session);
  const job = jobs.find((item) => item.id === jobId);
  if (!job) return { ok: false, error: "That job is not on this workspace." };
  const result = await writeSummary({
    title: job.title,
    service: job.serviceName,
    status: job.status,
    description: job.description,
    notes: job.notes.map((note) => `${note.authorName}: ${note.body}`).join("\n"),
  });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("jobs")
    .update({ summary: result.text, summary_provider: result.provider })
    .eq("id", Number(jobId));
  if (error) return fail(error.message);
  return { ok: true, message: "Summary saved." };
}

export async function supabaseCreateService(session: Session, input: ServiceInput): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("services").insert({
    tenant_id: session.user.tenantId,
    name: input.name.trim(),
    description: input.description.trim(),
    duration_min: input.durationMin,
    price_cents: input.priceCents,
    category: input.category.trim() || "General",
    active: true,
  });
  if (error) return fail(error.message);
  return { ok: true, message: `${input.name.trim()} is on the booking page.` };
}

export async function supabaseInvite(session: Session, input: { name: string; email: string; phone: string }): Promise<ActionResult> {
  if (!isSupabaseAdminConfigured()) return { ok: false, error: "Invites need SUPABASE_SECRET_KEY." };
  const admin = createSupabaseAdmin();
  const { count } = await admin.from("technicians").select("id", { count: "exact", head: true }).eq("tenant_id", session.user.tenantId);
  const { data: tenantRow } = await admin.from("tenants").select("plan").eq("id", session.user.tenantId).single();
  const plan = tenantRow ? (asRow(tenantRow).plan as PlanId) : "starter";
  const limit = PLANS[plan].techLimit;
  if (limit !== null && (count ?? 0) >= limit) {
    return { ok: false, error: "Starter includes 3 technicians. Move to Pro to add another." };
  }
  const created = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    app_metadata: { role: "technician", tenant_id: session.user.tenantId },
    user_metadata: { full_name: input.name },
  });
  if (created.error || !created.data.user) return fail(created.error?.message);
  const point = pinNear(input.email);
  const { error } = await admin.from("technicians").insert({
    tenant_id: session.user.tenantId,
    user_id: created.data.user.id,
    name: input.name,
    phone: input.phone,
    color: "#1f6f78",
    skills: ["General"],
    lat: point.lat,
    lng: point.lng,
  });
  if (error) return fail(error.message);
  return { ok: true, message: `${input.name} can sign in with ${input.email}.` };
}

export async function supabaseReminders(_session: Session): Promise<ActionResult> {
  if (!isSupabaseAdminConfigured()) return { ok: false, error: "Reminders need SUPABASE_SECRET_KEY." };
  return { ok: true, message: "Reminder queue is ready. Connect a messaging provider when you leave mock mode." };
}

export async function supabaseCreateMockCheckout(job: JobView) {
  const admin = adminOrThrow();
  const { data, error } = await admin
    .from("checkout_sessions")
    .insert({
      tenant_id: job.tenantId,
      job_id: Number(job.id),
      amount_cents: job.priceCents,
      label: job.serviceName,
      status: "open",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not open checkout.");
  return String(asRow(data).id);
}

export async function supabaseGetCheckout(session: Session, checkoutId: string) {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("checkout_sessions").select("*").eq("id", checkoutId).maybeSingle();
  if (!data) return null;
  const row = asRow(data);
  const jobs = await supabaseListJobs(session);
  const job = jobs.find((item) => item.id === String(row.job_id));
  if (!job) return null;
  return {
    checkout: {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      jobId: String(row.job_id),
      plan: (row.plan as PlanId | null) ?? null,
      amountCents: Number(row.amount_cents),
      label: String(row.label ?? job.serviceName),
      status: row.status as "open" | "paid",
      createdAt: String(row.created_at),
    },
    job,
  };
}

export async function supabaseConfirmCheckout(session: Session, checkoutId: string): Promise<ActionResult> {
  const found = await supabaseGetCheckout(session, checkoutId);
  if (!found?.checkout.jobId) return { ok: false, error: "This checkout is not on your account." };
  await markSupabaseJobPaid(found.checkout.jobId);
  if (isSupabaseAdminConfigured()) {
    await createSupabaseAdmin().from("checkout_sessions").update({ status: "paid" }).eq("id", checkoutId);
  }
  return { ok: true, url: `/portal/${found.checkout.jobId}?paid=1`, message: "Payment recorded." };
}

export async function markSupabaseJobPaid(jobId: string): Promise<ActionResult> {
  if (!isSupabaseAdminConfigured()) return { ok: false, error: "SUPABASE_SECRET_KEY is required to record payment." };
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("jobs")
    .update({ status: "invoiced", invoice_status: "paid", paid_at: new Date().toISOString() })
    .eq("id", Number(jobId));
  if (error) return fail(error.message);
  return { ok: true, message: "Payment recorded." };
}

export async function supabaseConfirmPlan(session: Session, plan: PlanId): Promise<ActionResult> {
  const admin = adminOrThrow();
  const { error } = await admin.from("tenants").update({ plan }).eq("id", session.user.tenantId);
  if (error) return fail(error.message);
  return { ok: true, url: "/billing?upgraded=1", message: `${PLANS[plan].name} is active.` };
}

export async function supabaseSetPlanFromStripe(session: Session, plan: PlanId) {
  return supabaseConfirmPlan(session, plan);
}

export async function supabasePlanCheckout(session: Session, plan: PlanId) {
  const admin = adminOrThrow();
  const { data, error } = await admin
    .from("checkout_sessions")
    .insert({
      tenant_id: session.user.tenantId,
      plan,
      amount_cents: PLANS[plan].priceCents,
      label: `Jobflow ${PLANS[plan].name}`,
      status: "open",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message || "Could not open plan checkout." };
  return { ok: true as const, url: `/billing/mock/${String(asRow(data).id)}` };
}

function adminOrThrow() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("SUPABASE_SECRET_KEY is not set.");
  }
  return createSupabaseAdmin();
}

function fail(message?: string): ActionResult {
  return { ok: false, error: message || "The database rejected that change." };
}

function asRow(value: unknown): Row {
  if (value && typeof value === "object") return value as Row;
  return {};
}

function canSee(session: Session, job: JobView) {
  if (session.user.role === "superadmin") return true;
  if (job.tenantId !== session.user.tenantId) return false;
  if (session.user.role === "owner" || session.user.role === "dispatcher") return true;
  if (session.user.role === "technician") return job.technicianId === session.user.technicianId;
  return job.customerId === session.user.customerId;
}

function mapCustomer(row: Row): Customer {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    userId: row.user_id ? String(row.user_id) : null,
    name: String(row.name),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    notes: String(row.notes ?? ""),
  };
}

function mapService(row: Row): Service {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    durationMin: Number(row.duration_min ?? 60),
    priceCents: Number(row.price_cents ?? 0),
    category: String(row.category ?? "General"),
    active: row.active !== false,
  };
}

function mapTenant(row: Row): Tenant {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    trade: String(row.trade ?? "HVAC"),
    plan: (row.plan as Tenant["plan"]) || "starter",
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    address: String(row.address ?? ""),
    timezone: String(row.timezone ?? TIME_ZONE),
  };
}

async function mapJob(row: Row): Promise<JobView> {
  const customer = one(row.customers);
  const service = one(row.services);
  const tech = one(row.technicians);
  const tenant = one(row.tenants);
  const notes = many(row.job_notes).map((note) => ({
    id: String(note.id),
    authorName: String(note.author_name ?? "Crew"),
    body: String(note.body ?? ""),
    createdAt: String(note.created_at),
  }));
  const photos = [];
  for (const photo of many(row.job_photos)) {
    photos.push({
      id: String(photo.id),
      url: await signedPhoto(String(photo.storage_path ?? "")),
      createdAt: String(photo.created_at),
    });
  }
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    customerId: String(row.customer_id),
    serviceId: String(row.service_id),
    technicianId: row.technician_id ? String(row.technician_id) : null,
    status: row.status as JobView["status"],
    reference: String(row.reference),
    title: String(row.title),
    description: String(row.description ?? ""),
    address: String(row.address ?? ""),
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    windowStart: String(row.window_start),
    windowEnd: String(row.window_end),
    priceCents: Number(row.price_cents ?? 0),
    invoiceStatus: (row.invoice_status as JobView["invoiceStatus"]) || "none",
    paidAt: row.paid_at ? String(row.paid_at) : null,
    summary: row.summary ? String(row.summary) : null,
    summaryProvider: (row.summary_provider as JobView["summaryProvider"]) ?? null,
    notes,
    photos,
    createdAt: String(row.created_at),
    customerName: String(customer?.name ?? "Customer"),
    customerPhone: String(customer?.phone ?? ""),
    customerEmail: String(customer?.email ?? ""),
    technicianName: tech?.name ? String(tech.name) : null,
    technicianColor: tech?.color ? String(tech.color) : null,
    serviceName: String(service?.name ?? row.title),
    durationMin: Number(service?.duration_min ?? 60),
    tenantName: String(tenant?.name ?? "Shop"),
  };
}

function one(value: unknown): Row | null {
  if (Array.isArray(value)) return value[0] ? asRow(value[0]) : null;
  if (value && typeof value === "object") return value as Row;
  return null;
}

function many(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asRow(item));
}

async function signedPhoto(path: string) {
  if (!path || !isSupabaseAdminConfigured()) return "";
  const signed = await createSupabaseAdmin().storage.from("job-photos").createSignedUrl(path, 60 * 30);
  return signed.data?.signedUrl ?? "";
}
