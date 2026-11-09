import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const marketingToken = process.env.META_MARKETING_TOKEN
const adAccountId = 'act_1596485538374624'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuration Supabase manquante dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function monitor() {
  console.log('====================================================================')
  console.log('🚀 MONITORING AUTONOME — META ADS & LEAD ENGINE AEGIS SOLAIRE')
  console.log(`🕒 Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Brussels' })}`)
  console.log('====================================================================\n')

  // 1. État officiel Meta Ads (API Graph v22.0)
  if (marketingToken) {
    try {
      console.log('📡 1. STATUT OFFICIEL DES CAMPAGNES & ANNONCES META')
      console.log('----------------------------------------------------')
      
      // Campagnes
      const campRes = await fetch(`https://graph.facebook.com/v22.0/${adAccountId}/campaigns?access_token=${marketingToken}&fields=id,name,status,daily_budget`)
      const campData = await campRes.json()
      if (campData.data && campData.data.length > 0) {
        for (const c of campData.data) {
          const budgetEur = c.daily_budget ? (parseInt(c.daily_budget) / 100).toFixed(2) + ' €/jour' : 'N/D'
          console.log(`   • Campagne : ${c.name}`)
          console.log(`     - ID : ${c.id}`)
          console.log(`     - Statut : [${c.status}]`)
          console.log(`     - Budget alloué : ${budgetEur}`)
        }
      }

      // Annonces (Ads)
      const adsRes = await fetch(`https://graph.facebook.com/v22.0/${adAccountId}/ads?access_token=${marketingToken}&fields=id,name,status,effective_status`)
      const adsData = await adsRes.json()
      if (adsData.data && adsData.data.length > 0) {
        console.log(`\n   • Publicités en diffusion :`)
        for (const ad of adsData.data) {
          console.log(`     - ${ad.name} : Statut = ${ad.status} (${ad.effective_status})`)
        }
      }

      // Insights par publicité
      const insRes = await fetch(`https://graph.facebook.com/v22.0/${adAccountId}/insights?access_token=${marketingToken}&level=ad&fields=ad_id,ad_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type&date_preset=maximum`)
      const insData = await insRes.json()
      console.log(`\n   • Métriques financières & engagement Meta :`)
      if (insData.data && insData.data.length > 0) {
        for (const row of insData.data) {
          const spend = parseFloat(row.spend || 0)
          const leads = row.actions?.find(a => a.action_type === 'lead')?.value || 0
          const cpl = leads > 0 ? (spend / leads).toFixed(2) + ' €' : 'N/A'
          console.log(`     > [${row.ad_name}]`)
          console.log(`       - Dépenses : ${spend.toFixed(2)} € | Impressions : ${row.impressions} | Clics : ${row.clicks}`)
          console.log(`       - CTR : ${parseFloat(row.ctr || 0).toFixed(2)} % | CPC : ${parseFloat(row.cpc || 0).toFixed(2)} € | CPL Meta : ${cpl}`)
        }
      } else {
        console.log(`     (Campagne fraîchement validée : premières impressions et dépenses en attente d'enregistrement)`)
      }
    } catch (e) {
      console.warn('⚠️ Erreur lecture Meta Marketing API:', e.message)
    }
  }

  // 2. Télémétrie Entonnoir Supabase (Funnel steps par publicité)
  console.log('\n📊 2. TÉLÉMÉTRIE ENTONNOIR EN TEMPS RÉEL (Base de données Supabase)')
  console.log('----------------------------------------------------')
  const { data: funnelEvents } = await supabase
    .from('funnel_step_events')
    .select('step_number, step_name, utm_content, province, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const pub1Events = (funnelEvents || []).filter(e => e.utm_content === 'visuel1_table_devis')
  const pub2Events = (funnelEvents || []).filter(e => e.utm_content === 'visuel2_maison_comparez')
  const pub3Events = (funnelEvents || []).filter(e => e.utm_content === 'visuel3_audit_comparer' || e.utm_content === 'PUB_3_VISUEL_AUDIT_COMPARER')

  console.log(`   • Pub 1 (Visuel Devis - visuel1_table_devis)       : ${pub1Events.length} étape(s) franchie(s)`)
  console.log(`   • Pub 2 (Visuel Maison - visuel2_maison_comparez)  : ${pub2Events.length} étape(s) franchie(s)`)
  console.log(`   • Pub 3 (Visuel Comparer - visuel3_audit_comparer) : ${pub3Events.length} étape(s) franchie(s)`)

  // 3. Fiches Prospects complètes (Leads)
  console.log('\n📋 3. PROSPECTS (LEADS) QUALIFIÉS REÇUS')
  console.log('----------------------------------------------------')
  const { data: leads } = await supabase
    .from('leads')
    .select('id, created_at, qualification_metadata, status, postal_code, city, annual_bill_eur, estimated_power_kwc, phone')
    .order('created_at', { ascending: false })
    .limit(20)

  const metaLeads = (leads || []).filter(l => {
    const q = l.qualification_metadata
    return q && (q.utm_source === 'meta' || q.utm_source === 'facebook' || q.source === 'meta' || q.utm_content)
  })

  console.log(`   • Total leads générés via Meta Ads : ${metaLeads.length}`)
  if (metaLeads.length > 0) {
    for (const l of metaLeads) {
      const pub = l.qualification_metadata?.utm_content || 'direct'
      console.log(`     - [${l.created_at.slice(0, 16)}] Lead ${l.id.slice(0, 8)}... | ${l.city || 'Ville'} (${l.postal_code || 'CP'}) | Puissance: ${l.estimated_power_kwc || '?'} kWc | Pub: ${pub}`)
    }
  }

  console.log('\n====================================================================')
  console.log('🛡️ RÈGLES DE PILOTAGE AUTOMATIQUE (KILL / SCALE)')
  console.log('   • Dépense < 25 € / pub : Laisser tourner (apprentissage)')
  console.log('   • Dépense > 25 € & CTR < 0.8% sans lead : Pause recommandée')
  console.log('   • CPL < 25 € : Annonce performante à maintenir')
  console.log('====================================================================')
}

monitor().catch(console.error)
