import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, publishableKey, supabaseUrl } from "@/lib/supabase/env";

export async function refreshSupabase(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return { response, hasUser: false };

  const supabase = createServerClient(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { response, hasUser: Boolean(data?.claims?.sub) };
}
