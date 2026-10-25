import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware de sécurité global
 * - Injection des headers de sécurité (HSTS, CSP, Frame Options, etc.)
 * - Protection CSRF pour les API d'administration et partenaires
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // 1. Headers de sécurité standard
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }

  // Anti-Clickjacking
  response.headers.set("X-Frame-Options", "DENY")
  // Anti-MIME-Sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")
  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // 2. Content Security Policy (CSP)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://img.youtube.com https://i.ytimg.com https://*.googletagmanager.com https://*.google-analytics.com https://www.facebook.com;
    font-src 'self' data:;
    frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://calendly.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://vitals.vercel-insights.com https://*.facebook.com https://connect.facebook.net;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, " ").trim()

  response.headers.set("Content-Security-Policy", cspHeader)

  // 3. Protection CSRF pour le panel ADMIN et API partenaires mutantes
  const isPublicMediaPartnerRegister = pathname === "/api/media-partners/register"
  const isPublicPartnerCreditsOrder = pathname === "/api/partners/credits/order"

  const isProtectedApi =
    pathname.startsWith("/api/admin") ||
    (pathname.startsWith("/api/media-partners") && !isPublicMediaPartnerRegister)

  if (isProtectedApi) {
    const method = request.method
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const csrfHeader = request.headers.get("x-admin-request")
      if (!csrfHeader) {
        return NextResponse.json(
          { error: "Action non autorisée (Header CSRF manquant)." },
          { status: 403 }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
}
