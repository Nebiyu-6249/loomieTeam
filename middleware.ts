import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the admin session alive, and nothing else.
 *
 * Supabase access tokens are short-lived. Without something refreshing them on
 * the way past, an administrator gets signed out mid-edit, and Server
 * Components cannot do the refreshing themselves because they cannot write
 * cookies. So the refresh happens here, where the response is still being
 * built, and the rest of the application reads an already-current session.
 *
 * ── This is not the access control ───────────────────────────────────────
 * Middleware runs before the route and is the wrong place to decide who may
 * see what: it is easy to write a matcher that misses a path, and a mistake
 * here is invisible until somebody finds it. Every admin page calls
 * requireAdmin() for itself, every admin action re-checks, and the database
 * enforces the same rules again through row level security. This file exists
 * so the session is fresh when those checks run — it is not one of them.
 *
 * Cheap when unconfigured: no Supabase, no client, no work.
 */

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        // Written to both: the request so anything downstream in this pass
        // sees the new token, and the response so the browser keeps it.
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // The call itself is the point — it refreshes an expiring token as a side
  // effect. The answer is deliberately not used to decide anything here.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  /**
   * Admin routes only.
   *
   * Public pages read content with a cookie-free client and have no session to
   * refresh, so running this on them would add a round trip to every request
   * and stop them being cacheable for nothing.
   */
  matcher: ["/admin/:path*"],
};
