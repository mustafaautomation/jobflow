export const TIME_ZONE = "America/Chicago";

export type Role = "owner" | "dispatcher" | "technician" | "customer" | "superadmin";

export type PlanId = "starter" | "pro";

export type JobStatus =
  | "requested"
  | "scheduled"
  | "en_route"
  | "on_site"
  | "complete"
  | "invoiced";

export type InvoiceStatus = "none" | "open" | "paid";

export type SummaryProvider = "groq" | "gemini" | "mock";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  trade: string;
  plan: PlanId;
  phone: string;
  email: string;
  address: string;
  timezone: string;
};

export type User = {
  id: string;
  tenantId: string | null;
  role: Role;
  name: string;
  email: string;
  phone: string;
  technicianId: string | null;
  customerId: string | null;
};

export type Technician = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
  color: string;
  skills: string[];
  lat: number;
  lng: number;
};

export type Customer = {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
};

export type Service = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  durationMin: number;
  priceCents: number;
  category: string;
  active: boolean;
};

export type JobNote = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type JobPhoto = {
  id: string;
  url: string;
  createdAt: string;
};

export type Job = {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  technicianId: string | null;
  status: JobStatus;
  reference: string;
  title: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  windowStart: string;
  windowEnd: string;
  priceCents: number;
  invoiceStatus: InvoiceStatus;
  paidAt: string | null;
  summary: string | null;
  summaryProvider: SummaryProvider | null;
  notes: JobNote[];
  photos: JobPhoto[];
  createdAt: string;
};

export type JobView = Job & {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  technicianName: string | null;
  technicianColor: string | null;
  serviceName: string;
  durationMin: number;
  tenantName: string;
};

export type AppNotification = {
  id: string;
  tenantId: string | null;
  userId: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type MessageKind = "assignment" | "reminder" | "booking" | "payment";

export type MessageLog = {
  id: string;
  tenantId: string;
  jobId: string | null;
  channel: "email" | "sms";
  to: string;
  subject: string;
  body: string;
  kind: MessageKind;
  createdAt: string;
};

export type CheckoutSession = {
  id: string;
  tenantId: string;
  jobId: string | null;
  plan: PlanId | null;
  amountCents: number;
  label: string;
  status: "open" | "paid";
  createdAt: string;
};

export type Store = {
  tenants: Tenant[];
  users: User[];
  technicians: Technician[];
  customers: Customer[];
  services: Service[];
  jobs: Job[];
  notifications: AppNotification[];
  messages: MessageLog[];
  checkouts: CheckoutSession[];
};

export type Session = {
  user: User;
  demo: boolean;
};

export type ActionResult =
  | { ok: true; message?: string; url?: string; jobId?: string; reference?: string }
  | { ok: false; error: string };

export type DashboardData = {
  jobsToday: number;
  unassigned: number;
  completedThisWeek: number;
  revenueCents: number;
  todayJobs: JobView[];
  unassignedJobs: JobView[];
  statusCounts: Record<JobStatus, number>;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  trade: string;
  plan: PlanId;
  technicians: number;
  jobs: number;
  openInvoicesCents: number;
};
