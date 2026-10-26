import fs from 'node:fs';
import { createHmac } from 'node:crypto';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const secret = env.SUPABASE_SERVICE_ROLE_KEY;
const id = '2faf2f84-d94f-4861-9f52-48c9e7181d76';
const email = 'mrnathanrem@gmail.com';
const payload = id.toLowerCase().trim() + ':' + email.toLowerCase().trim();
const token = createHmac('sha256', secret).update(payload).digest('hex');

const localUrl = 'http://localhost:3001/api/installateurs/verify-email?id=' + id + '&token=' + token;
console.log('Testing local verification URL:', localUrl);

const res = await fetch(localUrl, { redirect: 'manual' });
console.log('Status code:', res.status);
console.log('Location header:', res.headers.get('location'));
