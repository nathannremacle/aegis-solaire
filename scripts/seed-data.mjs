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

async function seed() {
  console.log('🚀 Début de l\'injection des données de test Aegis Solaire...')

  // 1. Partenaires Installateurs
  console.log('\n--- 1. Partenaires Installateurs ---')
  const partnersData = [
    {
      company_name: 'Solaris Wallonie SRL',
      email: 'contact@solaris-wallonie.be',
      phone: '+32 470 12 34 56',
      credits: 42,
      segment: 'BOTH',
      target_provinces: ['liege', 'namur', 'brabant-wallon'],
      min_facture: 5000,
      is_test: false,
    },
    {
      company_name: 'EcoToit Énergie SPRL',
      email: 'pro@ecotoit-energie.be',
      phone: '+32 471 98 76 54',
      credits: 3, // < 5 cr. -> Déclenche l'alerte À Risque
      segment: 'B2C',
      target_provinces: ['hainaut', 'namur'],
      min_facture: 0,
      is_test: false,
    },
    {
      company_name: 'Ardenne Watts SA',
      email: 'direction@ardenne-watts.be',
      phone: '+32 81 22 33 44',
      credits: 18,
      segment: 'B2B',
      target_provinces: ['luxembourg', 'namur', 'liege'],
      min_facture: 10000,
      is_test: false,
    },
  ]

  const partnerMap = {}

  for (const p of partnersData) {
    const { data: existing } = await supabase
      .from('partners')
      .select('id, company_name, email')
      .eq('email', p.email)
      .maybeSingle()

    if (existing) {
      console.log(`ℹ️ Partenaire déjà existant : ${existing.company_name} (${existing.id})`)
      partnerMap[p.company_name] = existing.id
      // Update credits and provinces
      await supabase.from('partners').update({
        credits: p.credits,
        segment: p.segment,
        target_provinces: p.target_provinces,
        is_test: false,
      }).eq('id', existing.id)
    } else {
      const { data: inserted, error } = await supabase
        .from('partners')
        .insert(p)
        .select()
        .single()
      if (error) {
        console.error(`❌ Erreur création partenaire ${p.company_name}:`, error)
      } else {
        console.log(`✅ Partenaire créé : ${inserted.company_name} (${inserted.id})`)
        partnerMap[p.company_name] = inserted.id
      }
    }
  }

  // 2. Leads de test pour chaque formulaire
  console.log('\n--- 2. Leads de Test multi-formulaires ---')
  const leadsData = [
    // A. Formulaire B2B (Simulateur ROI) - File de Triage
    {
      first_name: 'Marc',
      last_name: 'Lefebvre',
      company: 'Brasserie des Fagnes SA',
      job_title: 'Directeur Général',
      email: 'm.lefebvre@brasseriedesfagnes.be',
      phone: '+32 470 55 44 33',
      segment: 'B2B',
      source_form: 'b2b_simulator',
      postal_code: '5660',
      city: 'Couvin',
      province: 'namur',
      site_address: 'Route des Fagnes 12',
      surface_area: 2400,
      surface_type: 'toiture',
      roof_material: 'bac_acier',
      annual_electricity_bill: 48000,
      status: 'new',
      marketplace_status: 'pending_review',
      credit_cost: 5,
      lead_score: 88,
      ownership_status: 'owner',
      timeframe: 'immediate',
      project_driver: 'reduce_bill',
      admin_notes: 'Audit toiture photovoltaïque 2 400 m² bac acier. Décideur direct.',
    },
    // B. Formulaire B2C (Résidentiel Devis Landing) - File de Triage
    {
      first_name: 'Jean-François',
      last_name: 'Dubois',
      company: 'Particulier',
      job_title: 'Propriétaire',
      email: 'jf.dubois.test@gmail.com',
      phone: '+32 472 88 99 00',
      segment: 'B2C',
      source_form: 'b2c_devis_landing',
      postal_code: '1300',
      city: 'Wavre',
      province: 'brabant-wallon',
      site_address: 'Chaussée de Namur 45',
      surface_area: 140,
      surface_type: 'toiture',
      roof_material: 'tuiles',
      annual_electricity_bill: 2600,
      status: 'new',
      marketplace_status: 'pending_review',
      credit_cost: 2,
      lead_score: 74,
      ownership_status: 'owner',
      timeframe: 'immediate',
      admin_notes: 'Maison 4 façades, orientation Sud-Est, compteur bidirectionnel prêt.',
    },
    // C. Formulaire Webinaire - Décideur RSE
    {
      first_name: 'Sophie',
      last_name: 'Renard',
      company: 'Chocolaterie Mosane SA',
      job_title: 'Directrice RSE & Développement Durable',
      email: 's.renard@chocolaterie-mosane.be',
      phone: '+32 479 11 22 33',
      segment: 'B2B',
      source_form: 'webinar_upsell',
      postal_code: '4000',
      city: 'Liège',
      province: 'liege',
      site_address: 'Quai des Ardennes 88',
      surface_area: 1800,
      surface_type: 'toiture',
      roof_material: 'plat_epdm',
      annual_electricity_bill: 36000,
      status: 'new',
      marketplace_status: 'pending_review',
      credit_cost: 5,
      lead_score: 82,
      ownership_status: 'owner',
      timeframe: 'immediate',
      admin_notes: 'Inscrite au webinaire entreprises. Projet d\'autoconsommation industrielle.',
    },
    // D. Cas d'alerte de Risque (Hors Wallonie & Tél suspect)
    {
      first_name: 'Philippe',
      last_name: 'Vandamme',
      company: 'Immo Bruxelles',
      job_title: 'Gérant',
      email: 'p.vandamme@immo-bxl.be',
      phone: '0470000000', // Tél invalide
      segment: 'B2B',
      source_form: 'b2b_simulator',
      postal_code: '1000', // Hors Wallonie !
      city: 'Bruxelles',
      province: 'bruxelles',
      site_address: 'Avenue Louise 120',
      surface_area: 600,
      surface_type: 'toiture',
      roof_material: 'bac_acier',
      annual_electricity_bill: 12000,
      status: 'NEEDS_HUMAN_REVIEW',
      marketplace_status: 'pending_review',
      credit_cost: 5,
      lead_score: 35,
      ownership_status: 'tenant_unauthorized',
      admin_notes: 'Alerte : Code postal 1000 hors région wallonne et numéro factice.',
    },
    // E. Lead disponible sur la Marketplace pour tester l'achat ou attribution directe
    {
      first_name: 'Baudouin',
      last_name: 'de Wasseige',
      company: 'Scierie des Ardennes',
      job_title: 'Directeur d\'Exploitation',
      email: 'b.dewasseige@scierie-ardennes.be',
      phone: '+32 84 31 12 45',
      segment: 'B2B',
      source_form: 'b2b_simulator',
      postal_code: '6900',
      city: 'Marche-en-Famenne',
      province: 'luxembourg',
      site_address: 'Zone Industrielle 4',
      surface_area: 3200,
      surface_type: 'toiture',
      roof_material: 'bac_acier',
      annual_electricity_bill: 55000,
      status: 'qualified',
      marketplace_status: 'available',
      credit_cost: 5,
      lead_score: 92,
      ownership_status: 'owner',
      timeframe: 'immediate',
      admin_notes: 'Hangar de stockage bois. Grande toiture prête pour centrale 250 kWc.',
    },
    // F. Lead Acheté avec Litige
    {
      first_name: 'Patrick',
      last_name: 'Claessens',
      company: 'Particulier',
      job_title: 'Propriétaire',
      email: 'patrick.claessens.test@skynet.be',
      phone: '+32 475 00 11 22',
      segment: 'B2C',
      source_form: 'b2c_simulator',
      postal_code: '4500',
      city: 'Huy',
      province: 'liege',
      site_address: 'Rue des Meuniers 18',
      surface_area: 90,
      surface_type: 'toiture',
      roof_material: 'tuiles',
      annual_electricity_bill: 1800,
      status: 'qualified',
      marketplace_status: 'sold_out',
      credit_cost: 2,
      lead_score: 65,
      ownership_status: 'owner',
      timeframe: 'immediate',
      admin_notes: 'Projet résidentiel 6 kWc.',
    },
  ]

  const leadMap = {}

  for (const l of leadsData) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name')
      .eq('email', l.email)
      .maybeSingle()

    if (existing) {
      console.log(`ℹ️ Lead déjà existant : ${l.first_name} ${l.last_name || ''} (${existing.id})`)
      leadMap[l.email] = existing.id
      // Update fields to guarantee fresh state
      await supabase.from('leads').update(l).eq('id', existing.id)
    } else {
      const { data: inserted, error } = await supabase
        .from('leads')
        .insert(l)
        .select()
        .single()
      if (error) {
        console.error(`❌ Erreur création lead ${l.first_name} ${l.last_name}:`, error)
      } else {
        console.log(`✅ Lead créé : ${inserted.first_name} ${inserted.last_name || ''} (${inserted.id}) - ${inserted.source_form}`)
        leadMap[l.email] = inserted.id
      }
    }
  }

  // 3. Commandes de crédits SEPA
  console.log('\n--- 3. Commandes de crédits SEPA (Finances) ---')
  const ecoToitId = partnerMap['EcoToit Énergie SPRL']
  const solarisId = partnerMap['Solaris Wallonie SRL']

  const creditOrdersData = [
    {
      partner_id: ecoToitId,
      pack_id: 'pack_20',
      pack_name: 'Pack Rechargement 20 crédits',
      credits: 20,
      price_htva: 380.00,
      vat_amount: 79.80,
      price_ttc: 459.80,
      transfer_reference: 'ORDER-2026-9812',
      status: 'pending',
      notes: 'Commande passée par virement bancaire SEPA pour reconstituer le solde.',
    },
    {
      partner_id: solarisId,
      pack_id: 'pack_50',
      pack_name: 'Pack Professionnel 50 crédits',
      credits: 50,
      price_htva: 750.00,
      vat_amount: 157.50,
      price_ttc: 907.50,
      transfer_reference: 'ORDER-2026-4421',
      status: 'paid',
      validated_at: new Date().toISOString(),
      notes: 'Extrait bancaire BNP #204 rapproché.',
    },
  ]

  for (const o of creditOrdersData) {
    if (!o.partner_id) continue
    const { data: existing } = await supabase
      .from('credit_orders')
      .select('id, transfer_reference')
      .eq('transfer_reference', o.transfer_reference)
      .maybeSingle()

    if (existing) {
      console.log(`ℹ️ Commande de crédits déjà existante : ${o.transfer_reference}`)
    } else {
      const { data: inserted, error } = await supabase
        .from('credit_orders')
        .insert(o)
        .select()
        .single()
      if (error) {
        console.error(`❌ Erreur création commande ${o.transfer_reference}:`, error)
      } else {
        console.log(`✅ Commande de crédits créée : ${inserted.transfer_reference} (${inserted.status})`)
      }
    }
  }

  // 4. Achat de Lead & Litige d'arbitrage 24h SLA
  console.log('\n--- 4. Achat de lead & Litige en attente (Arbitrage) ---')
  const disputedLeadId = leadMap['patrick.claessens.test@skynet.be']

  if (solarisId && disputedLeadId) {
    // Vérifier l'achat
    let purchaseId = null
    const { data: existingPurchase } = await supabase
      .from('lead_purchases')
      .select('id')
      .eq('lead_id', disputedLeadId)
      .eq('partner_id', solarisId)
      .maybeSingle()

    if (existingPurchase) {
      purchaseId = existingPurchase.id
      console.log(`ℹ️ Achat existant pour le lead litige : ${purchaseId}`)
    } else {
      const { data: purchase, error: pErr } = await supabase
        .from('lead_purchases')
        .insert({
          lead_id: disputedLeadId,
          partner_id: solarisId,
          credits_spent: 2,
          purchased_at: new Date(Date.now() - 3600000 * 8).toISOString(), // Il y a 8 heures
        })
        .select()
        .single()

      if (pErr) {
        console.error('❌ Erreur création achat:', pErr)
      } else {
        purchaseId = purchase.id
        console.log(`✅ Achat créé : ${purchaseId} (2 crédits)`)
      }
    }

    // Créer le litige en attente
    if (purchaseId) {
      const { data: existingDispute } = await supabase
        .from('lead_disputes')
        .select('id')
        .eq('purchase_id', purchaseId)
        .maybeSingle()

      if (existingDispute) {
        console.log(`ℹ️ Litige déjà existant : ${existingDispute.id}`)
      } else {
        const { data: dispute, error: dErr } = await supabase
          .from('lead_disputes')
          .insert({
            purchase_id: purchaseId,
            lead_id: disputedLeadId,
            partner_id: solarisId,
            reason: 'wrong_number',
            details: 'Numéro constamment occupé ou non attribué. L\'installateur a tenté de joindre le prospect 6 fois à des heures distinctes sur 48h sans aucun succès. Demande d\'application de la Garantie Qualité 48h.',
            status: 'pending',
            created_at: new Date(Date.now() - 3600000 * 3).toISOString(), // Il y a 3h (SLA restant = 21h)
          })
          .select()
          .single()

        if (dErr) {
          console.error('❌ Erreur création litige:', dErr)
        } else {
          console.log(`✅ Litige créé : #${dispute.id.slice(0, 8)} (${dispute.reason})`)
        }
      }
    }
  }

  // 5. Candidature installateur en attente
  console.log('\n--- 5. Candidature Installateur (Vérification RESCERT) ---')
  const { data: existingApp } = await supabase
    .from('installer_applications')
    .select('id, email')
    .eq('email', 'contact@ardennes-solaire.be')
    .maybeSingle()

  if (existingApp) {
    console.log(`ℹ️ Candidature déjà existante : ${existingApp.id}`)
  } else {
    const { data: app, error: aErr } = await supabase
      .from('installer_applications')
      .insert({
        company_name: 'Ardennes Solaire SPRL',
        siret: 'BE 0789.123.456',
        first_name: 'Laurent',
        last_name: 'Lambert',
        job_title: 'Administrateur Délégué',
        email: 'contact@ardennes-solaire.be',
        phone: '+32 473 66 77 88',
        rescert_ref: 'RESCERT-2025-W-184',
        regions: ['luxembourg', 'namur'],
        status: 'pending',
      })
      .select()
      .single()

    if (aErr) {
      console.error('❌ Erreur création candidature:', aErr)
    } else {
      console.log(`✅ Candidature installateur créée : ${app.company_name} (${app.id})`)
    }
  }

  console.log('\n🎉 Injection des données de test terminée avec succès !')
}

seed().catch(console.error)
