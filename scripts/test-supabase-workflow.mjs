import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testWorkflow() {
  console.log('1. Checking connection to Supabase...');
  const { data: apps, error } = await supabase.from('installer_applications').select('*').limit(2);
  if (error) {
    console.error('Supabase connection error:', error);
    return;
  }
  console.log('✅ Connected. Found applications:', apps.length);

  // Pick or create test application
  let testApp = apps[0];
  if (!testApp) {
    console.log('Creating a test installer application...');
    const { data: created, error: createErr } = await supabase.from('installer_applications').insert({
      company_name: 'Test Solaire SPRL',
      siret: '0123456789',
      first_name: 'Nathan',
      last_name: 'Test',
      job_title: 'Gérant',
      email: 'test@aegis-solaire.be',
      phone: '+32495000000',
      rescert_ref: 'RESCERT-TEST-99',
      regions: ['Liège', 'Namur'],
      status: 'pending'
    }).select().single();
    if (createErr) {
      console.error('Create error:', createErr);
      return;
    }
    testApp = created;
  }

  console.log('2. Target application ID:', testApp.id, 'Email:', testApp.email);

  // Generate token
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const payload = testApp.id.toLowerCase().trim() + ':' + testApp.email.toLowerCase().trim();
  const token = createHmac('sha256', secret).update(payload).digest('hex');
  console.log('3. Generated Token:', token);

  // Verify token
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const isValid = expected === token;
  console.log('4. Verification check:', isValid ? '✅ PASS' : '❌ FAIL');

  // Test updating record
  const nowIso = new Date().toISOString();
  const verifiedTag = '[EMAIL_VÉRIFIÉ: ' + nowIso + ']';
  const existingNotes = testApp.admin_notes || '';
  const updatedNotes = existingNotes.includes('[EMAIL_VÉRIFIÉ:') ? existingNotes : (existingNotes ? existingNotes + ' | ' + verifiedTag : verifiedTag);

  const { error: updateErr } = await supabase.from('installer_applications').update({
    admin_notes: updatedNotes
  }).eq('id', testApp.id);

  if (updateErr) {
    console.error('Update error:', updateErr);
  } else {
    console.log('5. ✅ Updated installer application admin_notes successfully with tag:', verifiedTag);
  }

  const { data: verifiedRow } = await supabase.from('installer_applications').select('id, email, admin_notes, status').eq('id', testApp.id).single();
  console.log('6. Verified DB row:', verifiedRow);
}

testWorkflow();
