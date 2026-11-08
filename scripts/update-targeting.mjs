import { setTimeout } from 'timers/promises'

const token = process.env.META_MARKETING_TOKEN
const adsetId = '120251604763100465'

if (!token) {
  console.error('❌ Token manquant')
  process.exit(1)
}

async function run() {
  console.log('⏳ Pause de 20s pour respecter le rate-limit Meta (1 call / 30s)...')
  await setTimeout(20000)

  console.log('📡 Lecture du ciblage actuel...')
  const res = await fetch(`https://graph.facebook.com/v22.0/${adsetId}?access_token=${token}&fields=targeting,name`)
  const data = await res.json()

  if (data.error) {
    console.error('Erreur lecture:', data.error)
    return
  }

  const current = data.targeting
  console.log(`Ciblage actuel pour ${data.name}:`)
  console.log(`- Âge min: ${current.age_min}, Âge max: ${current.age_max}`)
  console.log(`- Advantage Audience: ${current.targeting_automation?.advantage_audience}`)

  const newTargeting = {
    geo_locations: current.geo_locations,
    brand_safety_content_filter_levels: current.brand_safety_content_filter_levels,
    age_min: 30,
    age_max: 64,
    targeting_automation: {
      advantage_audience: 0
    }
  }

  console.log('\n🚀 Application du verrouillage strict 30-64 ans (Audience d’origine sans élargissement)...')
  const updateRes = await fetch(`https://graph.facebook.com/v22.0/${adsetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      targeting: newTargeting
    })
  })

  const updateData = await updateRes.json()
  console.log('Résultat de la mise à jour:', JSON.stringify(updateData, null, 2))

  if (updateData.success) {
    console.log('✅ Succès ! Vérification du nouveau ciblage en direct...')
    const checkRes = await fetch(`https://graph.facebook.com/v22.0/${adsetId}?access_token=${token}&fields=targeting`)
    const checkData = await checkRes.json()
    console.log('Nouveau ciblage appliqué:', JSON.stringify(checkData.targeting, null, 2))
  }
}

run()

