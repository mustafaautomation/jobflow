import { connection } from "next/server";
import { runtimeMode } from "@/lib/repo";

export async function GET() {
  await connection();
  return Response.json({ ok: true, ...runtimeMode() });
}
