import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function inspect() {
  const { data: partners } = await supabase.from('partners').select('*')
  console.log('PARTNERS:', JSON.stringify(partners, null, 2))

  const { data: leads } = await supabase.from('leads').select('id, first_name, last_name, company, segment, status, marketplace_status, source_form, created_at').limit(5)
  console.log('SAMPLE LEADS:', JSON.stringify(leads, null, 2))

  const { data: orders } = await supabase.from('credit_orders').select('*').limit(5)
  console.log('SAMPLE CREDIT ORDERS:', JSON.stringify(orders, null, 2))
}

inspect()
