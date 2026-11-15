import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PARTNER_EXPRESS_COOKIE_NAME } from "@/lib/partner-auth"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error("[partner-logout] Error signing out:", err)
  }

  const url = new URL("/partenaires/login", request.url)
  const response = NextResponse.redirect(url, { status: 303 })
  response.cookies.delete(PARTNER_EXPRESS_COOKIE_NAME)
  return response
}
