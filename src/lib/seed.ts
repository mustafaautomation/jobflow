import { wallTime } from "@/lib/format";
import { TENANT, USER } from "@/lib/ids";
import type { Job, JobNote, Store } from "@/lib/types";

/**
 * Cedar HVAC demo facts. Keep supabase/seed.sql aligned when you change names,
 * prices, or the four-technician crew.
 */
export function buildSeed(now: Date): Store {
  const slot = (day: number, hour: number, minute: number, durationMin: number) => {
    const start = wallTime(now, day, hour, minute);
    return {
      windowStart: start.toISOString(),
      windowEnd: new Date(start.getTime() + durationMin * 60_000).toISOString(),
    };
  };

  const tenants = [
    {
      id: TENANT.cedar,
      slug: "cedar-hvac",
      name: "Cedar HVAC",
      trade: "HVAC",
      plan: "pro" as const,
      phone: "(512) 555-0148",
      email: "dispatch@cedarhvac.example",
      address: "2400 E Oltorf St, Austin, TX",
      timezone: "America/Chicago",
    },
    {
      id: TENANT.summit,
      slug: "summit-plumbing",
      name: "Summit Plumbing",
      trade: "Plumbing",
      plan: "starter" as const,
      phone: "(512) 555-0194",
      email: "office@summitplumbing.example",
      address: "1206 E 6th St, Austin, TX",
      timezone: "America/Chicago",
    },
  ];

  const technicians = [
    { id: "1", tenantId: TENANT.cedar, userId: USER.luis, name: "Luis Ortega", phone: "(512) 555-0171", color: "#c4622d", skills: ["Airflow", "Installs"], lat: 30.24, lng: -97.77 },
    { id: "2", tenantId: TENANT.cedar, userId: USER.priya, name: "Priya Shah", phone: "(512) 555-0172", color: "#1f6f78", skills: ["Commercial", "RTU"], lat: 30.272, lng: -97.742 },
    { id: "3", tenantId: TENANT.cedar, userId: USER.jonah, name: "Jonah Brooks", phone: "(512) 555-0173", color: "#b45309", skills: ["Heating", "Furnaces"], lat: 30.26, lng: -97.7 },
    { id: "4", tenantId: TENANT.cedar, userId: USER.amina, name: "Amina Farouk", phone: "(512) 555-0174", color: "#3657c9", skills: ["Controls", "Thermostats"], lat: 30.34, lng: -97.74 },
    { id: "5", tenantId: TENANT.summit, userId: USER.owen, name: "Owen Grant", phone: "(512) 555-0188", color: "#0f766e", skills: ["Drains", "Water heaters"], lat: 30.263, lng: -97.726 },
  ];

  const users = [
    user(USER.dana, TENANT.cedar, "owner", "Dana Okonkwo", "dana@cedarhvac.example", "(512) 555-0140", null, null),
    user(USER.marcus, TENANT.cedar, "dispatcher", "Marcus Hale", "marcus@cedarhvac.example", "(512) 555-0142", null, null),
    user(USER.luis, TENANT.cedar, "technician", "Luis Ortega", "luis@cedarhvac.example", "(512) 555-0171", "1", null),
    user(USER.priya, TENANT.cedar, "technician", "Priya Shah", "priya@cedarhvac.example", "(512) 555-0172", "2", null),
    user(USER.jonah, TENANT.cedar, "technician", "Jonah Brooks", "jonah@cedarhvac.example", "(512) 555-0173", "3", null),
    user(USER.amina, TENANT.cedar, "technician", "Amina Farouk", "amina@cedarhvac.example", "(512) 555-0174", "4", null),
    user(USER.elena, TENANT.cedar, "customer", "Elena Vasquez", "elena@vasquez.example", "(512) 555-2201", null, "1"),
    user(USER.jordan, TENANT.cedar, "customer", "Jordan Rivera", "jordan@rivera.example", "(512) 555-2206", null, "6"),
    user(USER.lena, TENANT.summit, "dispatcher", "Lena Cho", "lena@summitplumbing.example", "(512) 555-0190", null, null),
    user(USER.owen, TENANT.summit, "technician", "Owen Grant", "owen@summitplumbing.example", "(512) 555-0188", "5", null),
    user(USER.admin, null, "superadmin", "Quvantic Admin", "platform@jobflow.example", "(512) 555-0100", null, null),
  ];

  const customers = [
    customer("1", TENANT.cedar, USER.elena, "Elena Vasquez", "elena@vasquez.example", "(512) 555-2201", "1842 Barton Hills Dr, Austin, TX", 30.251, -97.788, "Upstairs zone runs warm by midafternoon."),
    customer("2", TENANT.cedar, null, "Northloop Dental", "office@northloopdental.example", "(512) 555-2202", "5412 Avenue F, Austin, TX", 30.318, -97.724, "Front desk prefers arrival before patients at 8."),
    customer("3", TENANT.cedar, null, "Chris Patel", "chris@patel.example", "(512) 555-2203", "1104 Salina St, Austin, TX", 30.259, -97.723, "Limit switch tripped twice last week."),
    customer("4", TENANT.cedar, null, "Helen Cho", "helen@cho.example", "(512) 555-2204", "908 W Mary St, Austin, TX", 30.246, -97.759, "Outdoor fan hums and does not spin."),
    customer("5", TENANT.cedar, null, "Marco Diaz", "marco@diaz.example", "(512) 555-2205", "4510 Avenue G, Austin, TX", 30.309, -97.726, "Replacing a mercury thermostat."),
    customer("6", TENANT.cedar, USER.jordan, "Jordan Rivera", "jordan@rivera.example", "(512) 555-2206", "1710 W North Loop Blvd, Austin, TX", 30.3185, -97.741, "Filter was overdue. Wants a maintenance plan."),
    customer("7", TENANT.cedar, null, "Soo-jin Kim", "soojin@kim.example", "(512) 555-2207", "2208 S Lamar Blvd, Austin, TX", 30.2465, -97.769, "Dust on every return after the remodel."),
    customer("8", TENANT.cedar, null, "Pat Baker", "pat@baker.example", "(512) 555-2208", "3801 Govalle Ave, Austin, TX", 30.262, -97.704, "Addition needs a 2-ton mini-split."),
    customer("9", TENANT.cedar, null, "Elena Ortiz", "elena.ortiz@example.com", "(512) 555-2209", "614 W Annie St, Austin, TX", 30.247, -97.755, "No heat this morning. Space heaters in the bedrooms."),
    customer("10", TENANT.cedar, null, "Ruth Ellis", "ruth@ellis.example", "(512) 555-2210", "1604 Hartford Rd, Austin, TX", 30.299, -97.771, "Annual maintenance, gate code 1948."),
    customer("11", TENANT.cedar, null, "Andre Greene", "facilities@greeneco.example", "(512) 555-2211", "816 Congress Ave, Austin, TX", 30.27, -97.742, "RTU-2 short cycles after lunch."),
    customer("12", TENANT.cedar, null, "Nina Park", "nina@park.example", "(512) 555-2212", "4109 Sinclair Ave, Austin, TX", 30.298, -97.704, "Garage apartment has no cooling."),
    customer("13", TENANT.cedar, null, "Hoa Nguyen", "hoa@nguyen.example", "(512) 555-2213", "2010 S 3rd St, Austin, TX", 30.243, -97.758, "Returns were sealed with plastic during painting."),
    customer("14", TENANT.cedar, null, "Camila Soto", "camila@soto.example", "(512) 555-2214", "5603 Roosevelt Ave, Austin, TX", 30.319, -97.73, "Blower is loud and the airflow is weak."),
    customer("15", TENANT.cedar, null, "Erin Walsh", "erin@walshretail.example", "(512) 555-2215", "1201 S Congress Ave, Austin, TX", 30.25, -97.749, "Sales floor warms up when the door stays open."),
    customer("21", TENANT.summit, null, "Miles Adler", "miles@adler.example", "(512) 555-3301", "807 E 3rd St, Austin, TX", 30.262, -97.734, "Kitchen sink backs up after the dishwasher runs."),
    customer("22", TENANT.summit, null, "Bluebonnet Cafe", "manager@bluebonnetcafe.example", "(512) 555-3302", "410 E 43rd St, Austin, TX", 30.305, -97.72, "Water heater is lukewarm by the lunch rush."),
    customer("23", TENANT.summit, null, "Helena Ruiz", "helena@ruiz.example", "(512) 555-3303", "1411 Newton St, Austin, TX", 30.274, -97.72, "Supply line weeps under the hall bath."),
  ];

  const services = [
    service("1", TENANT.cedar, "No-cool diagnostic", "Find why the system stopped cooling and quote the repair.", 90, 14900, "Cooling"),
    service("2", TENANT.cedar, "Furnace repair", "Heat failure, short cycling, or a burner that will not stay lit.", 120, 22000, "Heating"),
    service("3", TENANT.cedar, "Seasonal tune-up", "Clean, measure, and write up a system that should make it through the season.", 75, 12900, "Maintenance"),
    service("4", TENANT.cedar, "Duct cleaning", "Source removal for a house that has been opened up or remodeled.", 180, 39900, "Airflow"),
    service("5", TENANT.cedar, "Thermostat install", "Replace the control and confirm the equipment stages correctly.", 60, 18900, "Controls"),
    service("6", TENANT.cedar, "Mini-split install", "Single-zone ductless install, including the pad and line set.", 240, 320000, "Install"),
    service("7", TENANT.cedar, "Capacitor replacement", "Outdoor unit hums, fan does not start.", 60, 21000, "Cooling"),
    service("8", TENANT.cedar, "Commercial RTU inspection", "Rooftop unit inspection for a small retail or clinic space.", 120, 48000, "Commercial"),
    service("9", TENANT.cedar, "Blower motor", "Weak airflow or a motor that growls on startup.", 150, 64000, "Airflow"),
    service("21", TENANT.summit, "Drain clearing", "A single fixture that will not empty.", 60, 17500, "Drains"),
    service("22", TENANT.summit, "Water heater service", "Not enough hot water for the morning or the lunch service.", 90, 24000, "Water heaters"),
    service("23", TENANT.summit, "Leak repair", "A supply or drain that is actively wetting the cabinet.", 75, 21000, "Leaks"),
  ];

  const note = (id: string, authorName: string, body: string, createdAt: string): JobNote => ({
    id,
    authorName,
    body,
    createdAt,
  });

  const jobs: Job[] = [
    makeJob("101", "1", "1", "1", "en_route", "No-cool, upstairs bedroom", "The outdoor unit hums and the fan is not spinning.", slot(0, 8, 0, 90), [note("n101", "Elena Vasquez", "Upstairs is 80°F. Downstairs is fine.", slot(0, 7, 10, 0).windowStart)]),
    makeJob("102", "2", "3", "2", "scheduled", "Clinic tune-up before patients", "Check both split systems and replace the filters.", slot(0, 9, 30, 75)),
    makeJob("103", "3", "2", "3", "on_site", "Furnace short cycles", "Limit switch has tripped twice. Filter is packed.", slot(0, 10, 0, 120), [note("n103", "Jonah Brooks", "Filter is collapsed. Checking the high limit before I condemn the board.", slot(0, 10, 20, 0).windowStart)]),
    makeJob("104", "4", "7", null, "requested", "Capacitor, fan will not start", "Customer can hear the compressor try.", slot(0, 13, 0, 60)),
    makeJob("105", "5", "5", "4", "scheduled", "Thermostat swap", "Old mercury stat. Customer is home after 2.", slot(0, 14, 0, 60)),
    makeJob("106", "6", "3", "1", "complete", "Spring tune-up", "Replaced the 16x25x1 filter. Static is back in range.", slot(0, 7, 0, 75), [note("n106", "Luis Ortega", "Replaced the 16x25x1. Delta T is 18°.", slot(0, 7, 40, 0).windowStart)], "open"),
    makeJob("107", "7", "4", "4", "invoiced", "Duct cleaning after remodel", "Source removal on the returns that were sealed during painting.", slot(-1, 9, 0, 180), [], "paid"),
    makeJob("108", "8", "6", "2", "scheduled", "Garage mini-split", "2-ton single zone. Pad is poured.", slot(1, 8, 0, 240)),
    makeJob("109", "9", "2", null, "requested", "No heat this morning", "Space heaters are in the bedrooms. Please call before arriving.", slot(1, 9, 0, 120)),
    makeJob("110", "10", "3", "3", "invoiced", "Fall maintenance", "Gate code 1948. Dog is friendly and loud.", slot(-2, 11, 0, 75), [], "paid"),
    makeJob("111", "11", "8", "3", "scheduled", "RTU-2 short cycles", "Rooftop access from the Congress Ave stair.", slot(2, 8, 30, 120)),
    makeJob("112", "12", "6", "1", "scheduled", "Apartment mini-split", "Line set path is agreed. HOA quiet hours end at 9.", slot(1, 13, 0, 240)),
    makeJob("113", "13", "4", "2", "complete", "Duct cleaning, Bouldin", "Returns were taped shut during the interior paint.", slot(-1, 13, 0, 180), [], "open"),
    makeJob("114", "14", "9", "4", "scheduled", "Blower motor", "Airflow is weak and the motor growls on startup.", slot(3, 10, 0, 150)),
    makeJob("115", "15", "8", null, "scheduled", "Sales-floor RTU inspection", "Door stays open. Confirm the unit can keep up.", slot(0, 15, 0, 120)),
    makeJob("201", "21", "21", "5", "scheduled", "Kitchen drain", "Backs up when the dishwasher drains.", slot(0, 11, 0, 60), [], "none", TENANT.summit),
    makeJob("202", "22", "22", "5", "en_route", "Cafe water heater", "Lukewarm by 11. They need hot water before lunch.", slot(0, 9, 0, 90), [], "none", TENANT.summit),
    makeJob("203", "23", "23", null, "requested", "Hall bath supply leak", "Cabinet floor is wet. Shutoff is in the hall closet.", slot(1, 14, 0, 75), [], "none", TENANT.summit),
  ];

  const notifications = [
    { id: "n1", tenantId: TENANT.cedar, userId: USER.marcus, title: "Helen Cho is still unassigned", body: "Capacitor replacement requested for 1:00 PM today.", href: "/board", read: false, createdAt: wallTime(now, 0, 7, 40).toISOString() },
    { id: "n2", tenantId: TENANT.cedar, userId: USER.marcus, title: "Luis is en route", body: "Elena Vasquez, Barton Hills. Outdoor fan is not spinning.", href: "/jobs/101", read: false, createdAt: wallTime(now, 0, 7, 55).toISOString() },
    { id: "n3", tenantId: TENANT.cedar, userId: USER.luis, title: "First stop is Barton Hills", body: "Elena Vasquez at 8:00. Upstairs zone only.", href: "/tech/101", read: false, createdAt: wallTime(now, 0, 6, 30).toISOString() },
    { id: "n4", tenantId: TENANT.cedar, userId: USER.dana, title: "Two invoices are open", body: "Rivera tune-up and Nguyen duct cleaning are complete and unpaid.", href: "/dashboard", read: true, createdAt: wallTime(now, 0, 8, 5).toISOString() },
    { id: "n5", tenantId: TENANT.summit, userId: USER.lena, title: "Helena Ruiz requested a leak call", body: "Tomorrow afternoon. No technician yet.", href: "/board", read: false, createdAt: wallTime(now, 0, 8, 15).toISOString() },
  ];

  const messages = [
    { id: "m1", tenantId: TENANT.cedar, jobId: "101", channel: "sms" as const, to: "(512) 555-2201", subject: "Technician en route", body: "Luis Ortega from Cedar HVAC is on the way to 1842 Barton Hills Dr. This is a mock text.", kind: "assignment" as const, createdAt: wallTime(now, 0, 7, 50).toISOString() },
    { id: "m2", tenantId: TENANT.cedar, jobId: "101", channel: "email" as const, to: "elena@vasquez.example", subject: "Luis is headed to Barton Hills", body: "Your 8:00 no-cool visit is en route. Luis Ortega will call if the gate is locked. Mock email, nothing was sent.", kind: "assignment" as const, createdAt: wallTime(now, 0, 7, 50).toISOString() },
    { id: "m3", tenantId: TENANT.cedar, jobId: "108", channel: "sms" as const, to: "(512) 555-2208", subject: "Tomorrow's install", body: "Reminder: Priya Shah arrives tomorrow at 8:00 for the garage mini-split. Mock text.", kind: "reminder" as const, createdAt: wallTime(now, -1, 16, 0).toISOString() },
    { id: "m4", tenantId: TENANT.summit, jobId: "202", channel: "sms" as const, to: "(512) 555-3302", subject: "Plumber en route", body: "Owen Grant from Summit Plumbing is on the way for the water heater. Mock text.", kind: "assignment" as const, createdAt: wallTime(now, 0, 8, 40).toISOString() },
  ];

  return {
    tenants,
    users,
    technicians,
    customers,
    services,
    jobs,
    notifications,
    messages,
    checkouts: [],
  };
}

function user(
  id: string,
  tenantId: string | null,
  role: Store["users"][number]["role"],
  name: string,
  email: string,
  phone: string,
  technicianId: string | null,
  customerId: string | null,
): Store["users"][number] {
  return { id, tenantId, role, name, email, phone, technicianId, customerId };
}

function customer(
  id: string,
  tenantId: string,
  userId: string | null,
  name: string,
  email: string,
  phone: string,
  address: string,
  lat: number,
  lng: number,
  notes: string,
): Store["customers"][number] {
  return { id, tenantId, userId, name, email, phone, address, lat, lng, notes };
}

function service(
  id: string,
  tenantId: string,
  name: string,
  description: string,
  durationMin: number,
  priceCents: number,
  category: string,
): Store["services"][number] {
  return { id, tenantId, name, description, durationMin, priceCents, category, active: true };
}

function makeJob(
  id: string,
  customerId: string,
  serviceId: string,
  technicianId: string | null,
  status: Job["status"],
  title: string,
  description: string,
  window: { windowStart: string; windowEnd: string },
  notes: JobNote[] = [],
  invoice: Job["invoiceStatus"] | "auto" = "auto",
  tenantId: string = TENANT.cedar,
): Job {
  const prices: Record<string, number> = {
    "1": 14900,
    "2": 22000,
    "3": 12900,
    "4": 39900,
    "5": 18900,
    "6": 320000,
    "7": 21000,
    "8": 48000,
    "9": 64000,
    "21": 17500,
    "22": 24000,
    "23": 21000,
  };
  const invoiceStatus =
    invoice === "auto" ? (status === "invoiced" ? "paid" : status === "complete" ? "open" : "none") : invoice;
  const customer = customerId;
  return {
    id,
    tenantId,
    customerId: customer,
    serviceId,
    technicianId,
    status,
    reference: `JF-${id}`,
    title,
    description,
    address: "",
    lat: 0,
    lng: 0,
    ...window,
    priceCents: prices[serviceId] ?? 0,
    invoiceStatus,
    paidAt: invoiceStatus === "paid" ? window.windowEnd : null,
    summary: null,
    summaryProvider: null,
    notes,
    photos: [],
    createdAt: window.windowStart,
  };
}

export function hydrateJobAddresses(store: Store) {
  for (const job of store.jobs) {
    const person = store.customers.find((item) => item.id === job.customerId);
    if (!person) continue;
    job.address = person.address;
    job.lat = person.lat;
    job.lng = person.lng;
  }
  return store;
}
