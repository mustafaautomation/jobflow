import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USER_PASSWORD;

if (!url || !key || !password) {
  console.log("Skipping Supabase seed. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and SEED_USER_PASSWORD.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const cedar = "11111111-1111-4111-8111-111111111111";
const summit = "22222222-2222-4222-8222-222222222222";

const people = [
  ["dana@cedarhvac.example", "Dana Okonkwo", "owner", cedar],
  ["marcus@cedarhvac.example", "Marcus Hale", "dispatcher", cedar],
  ["luis@cedarhvac.example", "Luis Ortega", "technician", cedar],
  ["priya@cedarhvac.example", "Priya Shah", "technician", cedar],
  ["jonah@cedarhvac.example", "Jonah Brooks", "technician", cedar],
  ["amina@cedarhvac.example", "Amina Farouk", "technician", cedar],
  ["elena@vasquez.example", "Elena Vasquez", "customer", cedar],
  ["jordan@rivera.example", "Jordan Rivera", "customer", cedar],
  ["lena@summitplumbing.example", "Lena Cho", "dispatcher", summit],
  ["owen@summitplumbing.example", "Owen Grant", "technician", summit],
  ["platform@jobflow.example", "Quvantic Admin", "superadmin", null],
];

for (const [email, name, role, tenantId] of people) {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, tenant_id: tenantId },
    user_metadata: { full_name: name },
  });
  if (created.error && !created.error.message.toLowerCase().includes("already")) {
    console.error(email, created.error.message);
    process.exit(1);
  }
  console.log(created.error ? `exists ${email}` : `created ${email}`);
}

console.log("Auth users are ready. Link technicians.user_id and customers.user_id to profiles if you loaded seed rows separately.");
