import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx > 0) {
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    env[key] = val
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

console.log('Connecting to:', supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const tables = [
    'leads',
    'partners',
    'credit_orders',
    'lead_disputes',
    'installer_applications',
    'media_partner_applications',
    'lead_purchases',
    'audit_log',
  ]

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`❌ Table '${table}': error ${error.code} - ${error.message}`)
    } else {
      console.log(`✅ Table '${table}': accessible (count = ${count})`)
    }
  }
}

test().catch(console.error)
