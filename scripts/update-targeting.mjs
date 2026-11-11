import { setTimeout } from 'timers/promises'

const token = process.env.META_MARKETING_TOKEN
const adsetId = '120251604763100465'

if (!token) {
  console.error('❌ Token manquant dans .env.local')
  process.exit(1)
}

async function run() {
  console.log('📡 1. Récupération des codes postaux de la Province de Luxembourg (66xx, 67xx, 68xx, 69xx)...')
  const qList = ['66', '67', '68', '69']
  const luxZips = []
  for (const q of qList) {
    const res = await fetch(`https://graph.facebook.com/v22.0/search?type=adgeolocation&q=${q}&country_code=BE&access_token=${token}`)
    const data = await res.json()
    for (const item of data.data || []) {
      if (item.type === 'zip' && item.name.startsWith(q)) {
        luxZips.push({ key: item.key })
      }
    }
  }
  console.log(`   ✓ ${luxZips.length} codes postaux du Luxembourg belge identifiés.`)

  const newTargeting = {
    geo_locations: {
      regions: [
        { key: '4137', name: 'Wallonia' }
      ],
      location_types: ['home']
    },
    excluded_geo_locations: {
      regions: [
        { key: '296', name: 'région de Bruxelles-Capitale' },
        { key: '4136', name: 'Région flamande' }
      ],
      zips: luxZips,
      countries: ['LU']
    },
    age_min: 30,
    age_max: 64,
    brand_safety_content_filter_levels: [
      'FACEBOOK_RELAXED',
      'AN_RELAXED'
    ],
    targeting_relaxation_types: {
      lookalike: 0,
      custom_audience: 0
    },
    targeting_automation: {
      advantage_audience: 0
    },
    publisher_platforms: [
      'facebook',
      'instagram'
    ]
  }

  console.log('\n🚀 2. Envoi du ciblage géographique strict à Meta Marketing API v22.0...')
  const updateRes = await fetch(`https://graph.facebook.com/v22.0/${adsetId}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targeting: newTargeting
    })
  })

  const updateData = await updateRes.json()
  console.log('Résultat Meta:', JSON.stringify(updateData, null, 2))

  if (updateData.success) {
    console.log('\n✅ 3. Vérification immédiate du ciblage actif...')
    const checkRes = await fetch(`https://graph.facebook.com/v22.0/${adsetId}?access_token=${token}&fields=targeting,name`)
    const checkData = await checkRes.json()
    console.log(`Ensemble de publicités : ${checkData.name}`)
    console.log('Inclusions actives :', JSON.stringify(checkData.targeting?.geo_locations, null, 2))
    console.log('Exclusions actives :', JSON.stringify(checkData.targeting?.excluded_geo_locations, null, 2))
  }
}

run().catch(console.error)
