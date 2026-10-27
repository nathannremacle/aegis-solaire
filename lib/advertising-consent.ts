export const CONSENT_COOKIE = "aegis_cookie_consent"
export const CONSENT_EVENT = "aegis-consent-changed"

export function hasAdvertisingConsent(value: string | undefined): boolean {
  return value === "granted"
}

export function readAdvertisingConsent(): string | undefined {
  if (typeof document === "undefined") return undefined
  return document.cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))?.split("=")[1]
}

export function subscribeToConsent(listener: () => void) {
  window.addEventListener(CONSENT_EVENT, listener)
  return () => window.removeEventListener(CONSENT_EVENT, listener)
}

export function saveAdvertisingConsent(accepted: boolean) {
  const wasGranted = hasAdvertisingConsent(readAdvertisingConsent())
  document.cookie = `${CONSENT_COOKIE}=${accepted ? "granted" : "denied"}; path=/; max-age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
  if (!accepted) {
    window.fbq?.("consent", "revoke")
    window.gtag?.("consent", "update", {
      ad_storage: "denied", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    })
    // Delete accessible advertising cookies, including cookies set on a parent domain.
    for (const part of document.cookie.split(";")) {
      const name = part.trim().split("=")[0]
      if (!/^(_fbp|_fbc|_ga|_gid|_gcl_)/.test(name)) continue
      document.cookie = `${name}=; Max-Age=0; path=/`
      const labels = location.hostname.split(".")
      for (let i = 0; i < labels.length - 1; i++) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${labels.slice(i).join(".")}`
      }
    }
  }
  window.dispatchEvent(new Event(CONSENT_EVENT))
  // Unmounting script tags cannot unload SDKs already running in memory.
  if (wasGranted && !accepted) window.location.reload()
}
