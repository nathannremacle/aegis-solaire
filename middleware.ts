import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const EXPRESS_PARTNER_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXPRESS_TOKEN_HEX_REGEX = /^[0-9a-f]{32}$/i

/**
 * Middleware de sécurité global
 * - Injection des headers de sécurité (HSTS, CSP, Frame Options, etc.)
 * - Protection CSRF pour les API d'administration et partenaires
 * - Propagation transparente du jeton d'accès express partenaire depuis les e-mails
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let expressCookieValue: string | null = null
  const requestHeaders = new Headers(request.headers)

  if (pathname.startsWith("/partenaires")) {
    const partnerParam = request.nextUrl.searchParams.get("partner")?.trim() || ""
    const tokenParam = request.nextUrl.searchParams.get("token")?.trim() || ""
    if (
      EXPRESS_PARTNER_UUID_REGEX.test(partnerParam) &&
      EXPRESS_TOKEN_HEX_REGEX.test(tokenParam)
    ) {
      expressCookieValue = `${partnerParam}.${tokenParam}`
      requestHeaders.set("x-aegis-express-partner", expressCookieValue)
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (expressCookieValue) {
    response.cookies.set("aegis_partner_express", expressCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
  }

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
    img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://img.youtube.com https://i.ytimg.com https://*.googletagmanager.com https://*.google-analytics.com https://*.facebook.com;
    font-src 'self' data:;
    frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://calendly.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://www.facebook.com;
    frame-ancestors 'none';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://vitals.vercel-insights.com https://*.facebook.com https://connect.facebook.net https://*.a.run.app https://*.on.aws;
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
