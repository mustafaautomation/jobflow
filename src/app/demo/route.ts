import { connection } from "next/server";
import { redirect } from "next/navigation";
import { USER } from "@/lib/ids";
import { writeSession } from "@/lib/session";

export async function GET() {
  await connection();
  await writeSession({ userId: USER.marcus, role: "dispatcher", demo: true });
  redirect("/dashboard");
}
