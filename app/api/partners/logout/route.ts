import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error("[partner-logout] Error signing out:", err)
  }

  const url = new URL("/partenaires/login", request.url)
  return NextResponse.redirect(url, { status: 303 })
}
