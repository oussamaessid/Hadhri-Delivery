import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';

process.env.SEED_DEMO_DATA = 'true';
const directory = await mkdtemp(join(tmpdir(), 'hadhri-test-stream-'));
const database = basename(directory).replace(/[^a-zA-Z0-9_]/g,'_');
let app, base;
const claims = (uid, email = 'suivi@example.test') => ({uid, email, email_verified: true, name: 'Client Suivi', exp: Math.floor(Date.now() / 1000) + 3600, firebase: {sign_in_provider: 'password'}});
async function verifyToken(token) {
  if(token==='other')return claims('firebase-other','other@example.test');
  if (token === 'valid-suivi') return claims('firebase-suivi');
  throw Object.assign(new Error('Invalid token'), {status: 401});
}

function client() {
  const jar = {};
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(base + path, {method, headers: {cookie: Object.entries(jar).map(([k, v]) => k + '=' + v).join('; '), 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
    for (const raw of r.headers.getSetCookie()) { const [k, v] = raw.split(';')[0].split('='); jar[k] = v; }
    return {status: r.status, data: await r.json()};
  };
  call.jar = jar;
  return call;
}

test('suivi HTTP : le client retrouve le nouveau statut et les autres comptes sont isolés', async () => {
  app = await startServer({dataDir: directory, port: 0, verifyToken, database});
  try {
  base = 'http://127.0.0.1:' + app.server.address().port + '/api/v1';
  const admin = client(), customer = client();
  assert.equal((await admin('/auth/setup', 'POST', {password: 'integration-test-password'})).status, 200);
  assert.equal((await customer('/customer/firebase-session', 'POST', {idToken: 'valid-suivi', phone: '20000111'})).status, 200);
  assert.ok(customer.jar.hadhri_customer, 'session client créée');

  const adminState = await admin('/admin/state');
  const activeMerchants = new Set(adminState.data.state.catalog.restaurants.filter((m) => m.status === 'ACTIVE').map((m) => m.id));
  const product = adminState.data.state.catalog.products.find((p) => p.status === 'ACTIVE' && (p.stock || 0) >= 5 && activeMerchants.has(p.merchantId));
  assert.ok(product, 'produit disponible pour commander');
  const orderInput = {requestId: randomUUID(), lines: [{productId: product.id, quantity: 1}], customer: {name: 'Client Suivi', phone: '20000111', address: '12 avenue Habib Bourguiba, Monastir', notes: ''}};
  const created = await customer('/orders', 'POST', orderInput);
  assert.equal(created.status, 201);
  const orderId = created.data[0].id;

  const snapshot = await admin('/admin/state');
  const record = snapshot.data.state.orders.find((o) => o.id === orderId);
  assert.ok(record, 'commande visible côté admin');
  const patched = await admin('/admin/state', 'PATCH', {revision: snapshot.data.revision, changes: [{kind: 'orders', id: orderId, value: {...record, status: 'CONFIRMED'}}]});
  assert.equal(patched.status, 200);

  const after = await customer('/state');
  const guest=client();
  assert.equal((await guest('/admin/state')).status,401);
  assert.equal((await guest('/state')).data.state.orders.length,0);
  const other=client();
  assert.equal((await other('/customer/firebase-session','POST',{idToken:'other',phone:'20000222'})).status,200);
  assert.equal((await other('/state')).data.state.orders.length,0);
  assert.ok(after.data.state.orders.some((o) => o.id === orderId && o.status === 'CONFIRMED'), 'le client voit le nouveau statut');
  } finally {
  if (app) { await app.close(); app = undefined; }
  await dropDatabase({database});
  await rm(directory, {recursive: true, force: true});
  }
});
