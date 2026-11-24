import fs from "node:fs"
import path from "node:path"

const dataPath = path.resolve(process.cwd(), "lib/data/rescert-wallonie-installateurs.json")
const outDir = path.resolve(process.cwd(), "scripts/output")
const outFile = path.join(outDir, "rescert-quotas-sprint-120.csv")

const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"))
const items = Array.isArray(raw) ? raw : raw.installateurs || raw.items || []

const PROVINCE_KEYS = ["liege", "hainaut", "namur", "brabant_wallon", "bruxelles", "luxembourg"]

function normalizeProvince(val) {
  const s = String(val || "").toLowerCase()
  if (s.includes("liège") || s.includes("liege")) return "liege"
  if (s.includes("hainaut")) return "hainaut"
  if (s.includes("namur")) return "namur"
  if (s.includes("brabant")) return "brabant_wallon"
  if (s.includes("bruxelles") || s.includes("brussels")) return "bruxelles"
  if (s.includes("luxembourg")) return "luxembourg"
  return "other"
}

function isBelgianMobile(phone) {
  const clean = String(phone || "").replace(/[\s.-]/g, "")
  return /^(\+324|04|00324)\d{7,8}$/.test(clean)
}

const selected = []
for (const prov of PROVINCE_KEYS) {
  const pool = items
    .filter((item) => item.provinceKey === prov || normalizeProvince(item.provinceLabel || item.province) === prov)
    .filter((item) => item.email && String(item.email).includes("@"))
    .sort((a, b) => {
      const aMob = isBelgianMobile(a.phone) ? 1 : 0
      const bMob = isBelgianMobile(b.phone) ? 1 : 0
      return bMob - aMob
    })
    .slice(0, 20)

  for (const item of pool) {
    selected.push({
      province: prov,
      company: item.companyName || "",
      contact: item.certifiedPerson || "",
      email: item.email || "",
      phone: item.phone || "",
      postalCode: item.postalCode || "",
      city: item.city || "",
      vat: item.vat || item.bce || "",
    })
  }
}

fs.mkdirSync(outDir, { recursive: true })
const csvLines = [
  "province,company,contact,email,phone,postal_code,city,vat",
  ...selected.map((r) =>
    [r.province, r.company, r.contact, r.email, r.phone, r.postalCode, r.city, r.vat]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  ),
]
fs.writeFileSync(outFile, csvLines.join("\n"), "utf8")
console.log(`Exported ${selected.length} RESCERT targets to ${outFile}`)
