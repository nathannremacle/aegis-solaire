import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"

/**
 * Configuration du rate limiting.
 * Aligné sur la protection anti-spam (ex. 3 soumissions par heure par IP).
 */
const WINDOW_MS = 60 * 60 * 1000 // 1 heure
const MAX_REQUESTS_PER_WINDOW = 3

// 1. Initialisation Upstash Redis (si les clés sont présentes)
const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

let upstashRatelimit: Ratelimit | null = null

if (url && token) {
  try {
    const redis = new Redis({
      url,
      token,
    })
    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, "1 h"),
      analytics: true,
      prefix: "aegis_ratelimit",
    })
  } catch (e) {
    console.error("Failed to initialize Upstash Ratelimit:", e)
  }
}

// 2. Fallback in-memory (pour le développement ou si Redis est absent)
const memoryStore = new Map<string, number[]>()

function getClientIp(request: Request): string {
  // En environnement Next.js / Vercel, request.ip est injecté par le middleware ou la plateforme
  const nextRequest = request as any
  if (nextRequest.ip) return nextRequest.ip

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

function pruneMemory(ip: string) {
  const now = Date.now()
  const timestamps = memoryStore.get(ip) ?? []
  const valid = timestamps.filter((t) => now - t < WINDOW_MS)
  if (valid.length === 0) memoryStore.delete(ip)
  else memoryStore.set(ip, valid)
}

/**
 * Vérifie si l'IP a dépassé la limite globale.
 * Utilise Upstash Redis en priorité, fallback in-memory sinon.
 */
export async function checkRateLimit(request: Request): Promise<boolean> {
  const ip = getClientIp(request)

  if (upstashRatelimit) {
    try {
      const { success } = await upstashRatelimit.limit(ip)
      return success
    } catch (e) {
      console.error("Upstash Ratelimit error, falling back to memory:", e)
      // On continue vers le fallback en mémoire
    }
  }

  // Fallback in-memory
  pruneMemory(ip)
  const timestamps = memoryStore.get(ip) ?? []
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) return false
  timestamps.push(Date.now())
  memoryStore.set(ip, timestamps)
  return true
}
