import rescertInstallersRaw from "@/lib/data/rescert-wallonie-installateurs.json"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export interface RescertDirectoryEntry {
  id: string
  slug: string
  companyName: string
  certifiedPerson: string
  email: string
  phone: string
  postalCode: string
  city: string
  provinceKey: string
  provinceLabel: string
  category: string
  certified: boolean
}

export interface ProvinceSeoMeta {
  key: string
  label: string
  shortLabel: string
  title: string
  description: string
  mainCities: string[]
}

export const PROVINCE_SEO_META: Record<string, ProvinceSeoMeta> = {
  liege: {
    key: "liege",
    label: "Province de Liège",
    shortLabel: "Liège",
    title: "Installateurs Photovoltaïques Certifiés RESCert en Province de Liège",
    description:
      "Liste officielle des installateurs solaires agréés RESCert en province de Liège (Liège, Verviers, Huy, Waremme, Eupen, Spa). Comparatif et chantiers vérifiés.",
    mainCities: ["Liège", "Verviers", "Huy", "Waremme", "Seraing", "Eupen"],
  },
  hainaut: {
    key: "hainaut",
    label: "Province de Hainaut",
    shortLabel: "Hainaut",
    title: "Installateurs Photovoltaïques Certifiés RESCert en Province de Hainaut",
    description:
      "Liste officielle des installateurs solaires agréés RESCert en province de Hainaut (Charleroi, Mons, Tournai, La Louvière, Mouscron, Nivelles limitrophe).",
    mainCities: ["Charleroi", "Mons", "Tournai", "La Louvière", "Mouscron", "Binche"],
  },
  namur: {
    key: "namur",
    label: "Province de Namur",
    shortLabel: "Namur",
    title: "Installateurs Photovoltaïques Certifiés RESCert en Province de Namur",
    description:
      "Liste officielle des installateurs solaires agréés RESCert en province de Namur (Namur, Gembloux, Dinant, Ciney, Andenne, Philippeville).",
    mainCities: ["Namur", "Gembloux", "Dinant", "Ciney", "Andenne", "Sambreville"],
  },
  brabant_wallon: {
    key: "brabant_wallon",
    label: "Province du Brabant wallon",
    shortLabel: "Brabant wallon",
    title: "Installateurs Photovoltaïques Certifiés RESCert en Brabant wallon",
    description:
      "Liste officielle des installateurs solaires agréés RESCert en Brabant wallon (Wavre, Ottignies-Louvain-la-Neuve, Nivelles, Waterloo, Braine-l'Alleud).",
    mainCities: ["Wavre", "Nivelles", "Ottignies-LLN", "Waterloo", "Braine-l'Alleud", "Jodoigne"],
  },
  bruxelles: {
    key: "bruxelles",
    label: "Région de Bruxelles-Capitale",
    shortLabel: "Bruxelles",
    title: "Installateurs Photovoltaïques Certifiés RESCert à Bruxelles-Capitale",
    description:
      "Liste officielle des installateurs solaires agréés RESCert à Bruxelles-Capitale (Bruxelles, Uccle, Ixelles, Woluwe, Anderlecht, Schaerbeek).",
    mainCities: ["Bruxelles", "Uccle", "Ixelles", "Woluwe-Saint-Lambert", "Anderlecht", "Schaerbeek"],
  },
  luxembourg: {
    key: "luxembourg",
    label: "Province de Luxembourg",
    shortLabel: "Luxembourg",
    title: "Installateurs Photovoltaïques Certifiés RESCert en Province de Luxembourg",
    description:
      "Liste officielle des installateurs solaires agréés RESCert en province de Luxembourg (Arlon, Bastogne, Marche-en-Famenne, Libramont, Virton).",
    mainCities: ["Arlon", "Bastogne", "Marche-en-Famenne", "Libramont", "Virton", "Durbuy"],
  },
}

export function slugifyRescertText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

let cachedDirectory: RescertDirectoryEntry[] | null = null
let cachedBySlug: Map<string, RescertDirectoryEntry> | null = null
let cachedById: Map<string, RescertDirectoryEntry> | null = null

function buildDirectoryCache(): RescertDirectoryEntry[] {
  if (cachedDirectory) return cachedDirectory

  const rawList = Array.isArray(rescertInstallersRaw) ? rescertInstallersRaw : []
  const usedSlugs = new Set<string>()
  const result: RescertDirectoryEntry[] = []

  for (const item of rawList as Array<Record<string, unknown>>) {
    const id = String(item.id || "").trim()
    const companyName = String(item.companyName || "Installateur RESCert").trim()
    const city = String(item.city || "Wallonie").trim()
    const postalCode = String(item.postalCode || "").trim()
    const provinceKey = String(item.provinceKey || "liege").trim()
    const provinceLabel = String(item.provinceLabel || "Wallonie").trim()

    const companyPart = slugifyRescertText(companyName) || "installateur"
    const cityPart = slugifyRescertText(city)
    const cpPart = slugifyRescertText(postalCode)
    const baseSlug = [companyPart, cityPart, cpPart].filter(Boolean).join("-")

    let slug = baseSlug
    if (!slug || usedSlugs.has(slug)) {
      const idSuffix = slugifyRescertText(id.replace(/^rescert-/i, "")) || String(result.length + 1)
      slug = `${baseSlug || "installateur"}-${idSuffix}`
    }
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${result.length + 1}`
    }
    usedSlugs.add(slug)

    result.push({
      id,
      slug,
      companyName,
      certifiedPerson: String(item.certifiedPerson || companyName).trim(),
      email: String(item.email || "").trim().toLowerCase(),
      phone: String(item.phone || "").trim(),
      postalCode,
      city,
      provinceKey,
      provinceLabel,
      category: String(item.category || "Systèmes solaires photovoltaïques").trim(),
      certified: item.certified !== false,
    })
  }

  cachedDirectory = result
  cachedBySlug = new Map(result.map((r) => [r.slug, r]))
  cachedById = new Map(result.map((r) => [r.id, r]))
  return result
}

export function getAllRescertInstallers(): RescertDirectoryEntry[] {
  return buildDirectoryCache()
}

export function getRescertInstallerBySlug(slug: string): RescertDirectoryEntry | null {
  buildDirectoryCache()
  return cachedBySlug?.get(String(slug || "").trim().toLowerCase()) ?? null
}

export function getRescertInstallerById(id: string): RescertDirectoryEntry | null {
  buildDirectoryCache()
  return cachedById?.get(String(id || "").trim()) ?? null
}

export function getRescertInstallersByProvince(provinceKey: string): RescertDirectoryEntry[] {
  const key = String(provinceKey || "").trim().toLowerCase()
  return buildDirectoryCache().filter((entry) => entry.provinceKey === key)
}

export function getNearbyRescertInstallers(
  installer: RescertDirectoryEntry,
  limit = 6
): RescertDirectoryEntry[] {
  return buildDirectoryCache()
    .filter((entry) => entry.id !== installer.id && entry.provinceKey === installer.provinceKey)
    .slice(0, limit)
}

export interface PartnerVerificationStatus {
  isVerifiedPartner: boolean
  partnerId: string | null
  segment: string | null
}

/**
 * Vérifie côté serveur si l'installateur RESCERT dispose d'un compte partenaire actif
 * sur Aegis Solaire (sans jamais exposer d'e-mail privé côté client).
 */
export async function getPartnerVerificationStatusForInstaller(
  installer: Pick<RescertDirectoryEntry, "email" | "companyName">
): Promise<PartnerVerificationStatus> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { isVerifiedPartner: false, partnerId: null, segment: null }
  }

  try {
    const supabase = createServiceRoleClient()
    if (installer.email) {
      const { data } = await supabase
        .from("partners")
        .select("id, segment, is_test")
        .eq("email", installer.email.toLowerCase().trim())
        .maybeSingle()

      if (data && !data.is_test) {
        return {
          isVerifiedPartner: true,
          partnerId: data.id,
          segment: data.segment || null,
        }
      }
    }

    const cleanName = installer.companyName.trim()
    if (cleanName.length >= 3) {
      const { data } = await supabase
        .from("partners")
        .select("id, segment, is_test")
        .ilike("company_name", cleanName)
        .limit(1)
        .maybeSingle()

      if (data && !data.is_test) {
        return {
          isVerifiedPartner: true,
          partnerId: data.id,
          segment: data.segment || null,
        }
      }
    }
  } catch {
    // Tolérant lors du build statique ou si Supabase indisponible
  }

  return { isVerifiedPartner: false, partnerId: null, segment: null }
}
