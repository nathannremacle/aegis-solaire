/**
 * Non-regression verification suite for partner onboarding, email verification,
 * login, and anti-duplicate registration invariants.
 *
 * Usage:
 *   node scripts/verify-partner-onboarding.mjs [baseUrl]
 *   Default baseUrl: https://aegissolaire.com
 */

import fs from "node:fs"
import assert from "node:assert/strict"
import { createClient } from "@supabase/supabase-js"

function loadEnvLocal() {
  if (!fs.existsSync(".env.local")) return
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const val = match[2].trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const BASE_URL = (process.argv[2] || "https://aegissolaire.com").replace(/\/$/, "")
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  console.log(`\n[verify:onboarding] Target: ${BASE_URL}`)

  let testPartnerEmail = "info@solarity.be"

  // 1. Database invariant checks
  if (SUPABASE_URL && SERVICE_ROLE) {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
    const [{ data: partners, error: pErr }, { data: apps, error: aErr }] = await Promise.all([
      supabase.from("partners").select("id,email,company_name"),
      supabase.from("installer_applications").select("id,email,status"),
    ])
    assert.ifError(pErr)
    assert.ifError(aErr)

    const partnerEmails = new Set((partners || []).map((p) => p.email.toLowerCase().trim()))
    if (partners && partners.length > 0) {
      const realPartner = partners.find((p) => !p.email.endsWith("@aegissolaire-pro.be"))
      if (realPartner) testPartnerEmail = realPartner.email
    }

    // No approved partner email should also have a lingering pending application
    const pendingForPartners = (apps || []).filter(
      (a) => a.status === "pending" && partnerEmails.has((a.email || "").toLowerCase().trim())
    )
    assert.equal(
      pendingForPartners.length,
      0,
      `Found pending applications for already-active partners: ${JSON.stringify(pendingForPartners)}`
    )
    console.log("  ✓ DB invariants: 0 pending duplicates on active partners")
  } else {
    console.log("  ! Skipping DB invariants (missing SUPABASE env)")
  }

  // 2. Approved partner must NEVER be locked out on /partenaires/verification-requise
  const lockRes = await fetch(
    `${BASE_URL}/partenaires/verification-requise?email=${encodeURIComponent(testPartnerEmail)}`,
    { redirect: "manual" }
  )
  assert.equal(
    lockRes.status,
    307,
    `Expected 307 redirect for approved partner on /partenaires/verification-requise, got ${lockRes.status}`
  )
  const lockLocation = lockRes.headers.get("location") || ""
  assert.ok(
    lockLocation.includes("/partenaires/dashboard"),
    `Expected redirect to /partenaires/dashboard, got ${lockLocation}`
  )
  console.log(`  ✓ /partenaires/verification-requise redirects approved partner (${testPartnerEmail}) -> /partenaires/dashboard`)

  // 3. /partenaires/verification must show "Compte Partenaire Validé" for approved partners
  const verifApprovedRes = await fetch(
    `${BASE_URL}/partenaires/verification?status=success&email=${encodeURIComponent(testPartnerEmail)}`
  )
  assert.equal(verifApprovedRes.status, 200)
  const verifApprovedHtml = await verifApprovedRes.text()
  assert.ok(
    verifApprovedHtml.includes("Compte Partenaire Validé"),
    "Expected 'Compte Partenaire Validé' for approved partner on /partenaires/verification"
  )
  assert.ok(
    !verifApprovedHtml.includes("Audit technique en cours"),
    "Must NOT display 'Audit technique en cours' for approved partner"
  )
  assert.ok(
    verifApprovedHtml.includes("/partenaires/dashboard"),
    "Expected direct /partenaires/dashboard CTA on /partenaires/verification"
  )
  console.log("  ✓ /partenaires/verification displays active status + dashboard CTA for approved partner")

  // 4. /partenaires/verification must still show pending audit steps for unapproved applicant
  const verifPendingRes = await fetch(
    `${BASE_URL}/partenaires/verification?status=success&email=candidat-non-valide-test@example.com`
  )
  assert.equal(verifPendingRes.status, 200)
  const verifPendingHtml = await verifPendingRes.text()
  assert.ok(
    verifPendingHtml.includes("Audit technique en cours"),
    "Expected 'Audit technique en cours' for pending applicant on /partenaires/verification"
  )
  console.log("  ✓ /partenaires/verification displays audit pending status for non-approved applicant")

  // 5. Auth pages respond 200
  for (const path of ["/partenaires/login", "/partenaires/definir-mot-de-passe"]) {
    const res = await fetch(`${BASE_URL}${path}`)
    assert.equal(res.status, 200, `Expected 200 on ${path}, got ${res.status}`)
  }
  console.log("  ✓ /partenaires/login & /partenaires/definir-mot-de-passe return 200")

  // 6. Registration validation rejects malformed payload cleanly with 400
  const regBadRes = await fetch(`${BASE_URL}/api/installateurs/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid" }),
  })
  assert.equal(regBadRes.status, 400, `Expected 400 on invalid register payload, got ${regBadRes.status}`)
  console.log("  ✓ POST /api/installateurs/register rejects invalid payload with 400")

  console.log("[verify:onboarding] ALL CHECKS PASSED\n")
}

run().catch((err) => {
  console.error("[verify:onboarding] FAILED:", err)
  process.exit(1)
})
