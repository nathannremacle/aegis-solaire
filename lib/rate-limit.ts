/**
 * Rate limiting par IP (in-memory).
 * Limite le nombre de soumissions de leads par adresse IP (ex. 3/heure).
 */

const WINDOW_MS = 60 * 60 * 1000 // 1 heure
const MAX_REQUESTS_PER_WINDOW = 3

const store = new Map<string, number[]>() // IP → timestamps des requêtes

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

/** Nettoie les entrées expirées pour éviter une fuite mémoire. */
function prune(ip: string) {
  const now = Date.now()
  const timestamps = store.get(ip) ?? []
  const valid = timestamps.filter((t) => now - t < WINDOW_MS)
  if (valid.length === 0) store.delete(ip)
  else store.set(ip, valid)
}

/**
 * Vérifie si l'IP a dépassé la limite. Si non, enregistre la requête.
 * @returns true si la requête est autorisée, false si rate limit dépassé
 */
export function checkRateLimit(request: Request): boolean {
  const ip = getClientIp(request)
  prune(ip)
  const timestamps = store.get(ip) ?? []
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) return false
  timestamps.push(Date.now())
  store.set(ip, timestamps)
  return true
}
