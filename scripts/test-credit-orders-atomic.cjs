// Requires an isolated local PostgreSQL server on port 55432 (see docs/AUDIT-FIXES.md).
const { Client } = require('pg')
const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const assert = require('node:assert/strict')
const { test, before, after } = require('node:test')
const database = `aegis_test_${randomUUID().replaceAll('-', '')}`
const config = { host: '127.0.0.1', port: 55432, user: 'postgres', database }
let admin, db
const partner = randomUUID()
async function connection() { const c = new Client(config); await c.connect(); return c }
async function order() {
  const id = randomUUID()
  await db.query(`INSERT INTO credit_orders(id,partner_id,pack_id,pack_name,credits,price_htva,vat_amount,price_ttc,transfer_reference)
    VALUES($1,$2,'pack_10','Test',10,100,21,121,($1::uuid)::text)`, [id, partner])
  return id
}
async function settle(c, id, payment = null) {
  return (await c.query(`SELECT settle_credit_order($1,$2,$3,$4,$5) AS result`,
    [id, payment ? 'mollie' : 'bank_transfer', payment, payment ? 121 : null, payment ? 'EUR' : null])).rows[0].result
}
before(async () => {
  admin = new Client({ ...config, database: 'postgres' }); await admin.connect()
  await admin.query(`CREATE DATABASE ${database}`)
  db = await connection()
  await db.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
  END $$;
  CREATE TABLE partners(id uuid PRIMARY KEY, credits integer NOT NULL DEFAULT 0, updated_at timestamptz);
  CREATE TABLE credit_transactions(id uuid DEFAULT gen_random_uuid(),partner_id uuid,amount integer,type text,reference text);
  CREATE FUNCTION current_partner_id() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';`)
  for (const name of ['022_credit_orders.sql', '030_mollie_payment_integration.sql']) {
    await db.query(readFileSync(`${__dirname}/${name}`, 'utf8'))
  }
  await db.query('GRANT SELECT,INSERT,UPDATE,DELETE ON credit_orders TO authenticated,anon')
  const migration = readFileSync(`${__dirname}/031_atomic_credit_orders.sql`, 'utf8')
  await db.query(migration)
  await db.query(migration) // Repeatable migration.
  await db.query('INSERT INTO partners(id) VALUES($1)', [partner])
})
after(async () => {
  await db?.end()
  if (admin) { await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`); await admin.end() }
})
test('concurrent Mollie callbacks credit once and produce one ledger entry', async () => {
  const id = await order(), clients = await Promise.all(Array.from({ length: 8 }, connection))
  try {
    const results = await Promise.all(clients.map(c => settle(c, id, `tr_${id}`)))
    assert.equal(results.filter(r => !r.alreadyPaid).length, 1)
    const ledger = await db.query('SELECT count(*)::int AS n,sum(amount)::int AS amount FROM credit_transactions WHERE reference=$1', [`order:${id}`])
    assert.deepEqual(ledger.rows[0], { n: 1, amount: 10 })
  } finally { await Promise.all(clients.map(c => c.end())) }
})
test('manual validation racing with Mollie credits once', async () => {
  const id = await order(), c = await connection()
  try {
    const results = await Promise.all([settle(db, id), settle(c, id, `tr_${id}`)])
    assert.equal(results.filter(r => !r.alreadyPaid).length, 1)
  } finally { await c.end() }
})
test('paid orders cannot be cancelled and cancelled orders cannot be paid', async () => {
  const paid = await order(); await settle(db, paid)
  await assert.rejects(db.query('SELECT cancel_credit_order($1)', [paid]), /Paid orders/)
  const cancelled = await order(); await db.query('SELECT cancel_credit_order($1)', [cancelled])
  await assert.rejects(settle(db, cancelled), /not payable/)
})
test('settlement racing with cancellation leaves a consistent ledger', async () => {
  const id = await order(), c = await connection()
  try {
    await Promise.allSettled([settle(db, id), c.query('SELECT cancel_credit_order($1)', [id])])
    const { rows: [result] } = await db.query(`SELECT status,(SELECT count(*)::int FROM credit_transactions WHERE reference=$1) AS n FROM credit_orders WHERE id=$2`, [`order:${id}`, id])
    assert.equal(result.n, result.status === 'paid' ? 1 : 0)
  } finally { await c.end() }
})
test('mismatched amounts and reused payment IDs fail without partial credit', async () => {
  const id = await order()
  await assert.rejects(db.query("SELECT settle_credit_order($1,'mollie','tr_wrong',1,'EUR')", [id]), /does not match/)
  const before = (await db.query('SELECT credits FROM partners WHERE id=$1', [partner])).rows[0].credits
  const first = await order(), second = await order()
  await settle(db, first, 'tr_unique')
  await assert.rejects(settle(db, second, 'tr_unique'), /unique/)
  assert.equal((await db.query('SELECT credits FROM partners WHERE id=$1', [partner])).rows[0].credits, before + 10)
  assert.equal((await db.query('SELECT status FROM credit_orders WHERE id=$1', [second])).rows[0].status, 'pending')
})
test('anonymous and authenticated roles cannot mutate orders or call settlement RPCs', async () => {
  for (const role of ['anon','authenticated']) {
    await db.query(`SET ROLE ${role}`)
    try {
      await assert.rejects(db.query("UPDATE credit_orders SET status='pending'"), /permission denied/)
      await assert.rejects(db.query("SELECT settle_credit_order(gen_random_uuid(),'bank_transfer')"), /permission denied/)
      await assert.rejects(db.query('SELECT cancel_credit_order(gen_random_uuid())'), /permission denied/)
    } finally { await db.query('RESET ROLE') }
  }
})
