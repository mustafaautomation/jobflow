import "server-only";

import { cookies } from "next/headers";
import { COOKIE, signSession, verifySession, type SessionPayload } from "@/lib/session-token";

const MAX_AGE = 60 * 60 * 24 * 14;

export async function readSessionPayload() {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE)?.value);
}

export async function writeSession(payload: Omit<SessionPayload, "exp">) {
  const token = await signSession({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
