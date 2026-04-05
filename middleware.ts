import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware de sécurité global
 * - Injection des headers de sécurité (HSTS, CSP, Frame Options, etc.)
 * - Protection CSRF pour les API d'administration
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // 1. Headers de sécurité standard
  // HSTS : Force HTTPS (uniquement en prod)
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
  // Note: On autorise Google GTM/Analytics et Supabase par défaut.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googletagmanager.com *.google-analytics.com *.crisp.chat *.intercom.io;
    style-src 'self' 'unsafe-inline' *.crisp.chat;
    img-src 'self' blob: data: *.supabase.co *.googletagmanager.com *.google-analytics.com *.crisp.chat;
    font-src 'self' data: *.crisp.chat;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' *.supabase.co *.google-analytics.com *.googletagmanager.com *.vercel-insights.com *.crisp.chat wss://client.relay.crisp.chat;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, " ").trim()

  response.headers.set("Content-Security-Policy", cspHeader)

  // 3. Protection CSRF pour le panel ADMIN
  // On vérifie que toute requête de mutation (POST, PUT, DELETE) vers /api/admin/*
  // possède un header personnalisé 'x-admin-request' pour empêcher les soumissions cross-site simples.
  const isPublicMediaPartnerRegister = pathname === "/api/media-partners/register"

  const isProtectedApi =
    pathname.startsWith("/api/admin") ||
    (pathname.startsWith("/api/media-partners") && !isPublicMediaPartnerRegister) ||
    pathname.startsWith("/api/partners")

  if (isProtectedApi) {
    const method = request.method
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const csrfHeader = request.headers.get("x-admin-request")
      const origin = request.headers.get("origin")
      const host = request.headers.get("host")

      if (!csrfHeader) {
        return new NextResponse(
          JSON.stringify({ error: "Sécurité : Header de requête manquant (CSRF prevention)" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }

      if (origin && host) {
        const originUrl = new URL(origin)
        if (originUrl.host !== host) {
          return new NextResponse(
            JSON.stringify({ error: "Sécurité : Origine non autorisée (CSRF prevention)" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        }
      }
    }
  }

  return response
}

// On définit sur quelles routes le middleware doit s'exécuter
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
