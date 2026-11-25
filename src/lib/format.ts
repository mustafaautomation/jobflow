import type { JobStatus, PlanId } from "@/lib/types";
import { TIME_ZONE } from "@/lib/types";

export const STATUS_LABEL: Record<JobStatus, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  en_route: "En route",
  on_site: "On site",
  complete: "Complete",
  invoiced: "Invoiced",
};

export const STATUS_ORDER: JobStatus[] = [
  "requested",
  "scheduled",
  "en_route",
  "on_site",
  "complete",
  "invoiced",
];

export const PLANS: Record<
  PlanId,
  { name: string; priceCents: number; techLimit: number | null; detail: string }
> = {
  starter: {
    name: "Starter",
    priceCents: 4900,
    techLimit: 3,
    detail: "Booking page, dispatch board, and customer portal for a crew of three.",
  },
  pro: {
    name: "Pro",
    priceCents: 14900,
    techLimit: null,
    detail: "Unlimited technicians, reminders, the live map, and AI job summaries.",
  },
};

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function zonedYmd(date: Date, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${month}-${day}`;
}

function timeZoneOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

export function atZone(ymd: string, hour: number, minute: number, timeZone = TIME_ZONE) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const offset = timeZoneOffsetMs(guess, timeZone);
  const first = new Date(guess.getTime() - offset);
  const offset2 = timeZoneOffsetMs(first, timeZone);
  return offset2 === offset ? first : new Date(guess.getTime() - offset2);
}

export function wallTime(now: Date, dayOffset: number, hour: number, minute: number, timeZone = TIME_ZONE) {
  return atZone(addDaysYmd(zonedYmd(now, timeZone), dayOffset), hour, minute, timeZone);
}

export function mondayYmd(now: Date, timeZone = TIME_ZONE) {
  const ymd = zonedYmd(now, timeZone);
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDaysYmd(ymd, delta);
}

export function weekDays(now: Date, timeZone = TIME_ZONE) {
  const start = mondayYmd(now, timeZone);
  return Array.from({ length: 7 }, (_, index) => addDaysYmd(start, index));
}

export function sameZonedDay(iso: string, now: Date, timeZone = TIME_ZONE) {
  return zonedYmd(new Date(iso), timeZone) === zonedYmd(now, timeZone);
}

export function inCurrentWeek(iso: string, now: Date, timeZone = TIME_ZONE) {
  const ymd = zonedYmd(new Date(iso), timeZone);
  const start = mondayYmd(now, timeZone);
  const end = addDaysYmd(start, 6);
  return ymd >= start && ymd <= end;
}

export function tomorrowYmd(now: Date, timeZone = TIME_ZONE) {
  return addDaysYmd(zonedYmd(now, timeZone), 1);
}

export function formatTime(iso: string, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatWhen(iso: string, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatLongDate(now: Date, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

export function formatWeekday(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function clockOf(iso: string, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function pinNear(address: string) {
  let hash = 0;
  for (let index = 0; index < address.length; index += 1) {
    hash = (hash * 33 + address.charCodeAt(index)) >>> 0;
  }
  return {
    lat: 30.27 + ((hash % 800) / 800 - 0.5) * 0.14,
    lng: -97.74 + (((hash >> 8) % 800) / 800 - 0.5) * 0.16,
  };
}

export function homeFor(role: string) {
  if (role === "technician") return "/tech";
  if (role === "customer") return "/portal";
  if (role === "superadmin") return "/admin";
  return "/dashboard";
}

export function isOffice(role: string) {
  return role === "owner" || role === "dispatcher";
}
