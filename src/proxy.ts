import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, and common static asset extensions
     * - api/debug-env (TEMPORARY — a no-secrets diagnostic route, removed after use)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/debug-env|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
