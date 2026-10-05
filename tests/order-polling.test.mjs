import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {configurePush} from '../backend/push.mjs';
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

test('suivi temps réel : le client est prévenu et retrouve le nouveau statut et les autres comptes sont isolés', async () => {
  const pushed = [];
  app = await startServer({dataDir: directory, port: 0, verifyToken, database, push: async (db) => ({...await configurePush(db), notify: async (payload) => { pushed.push(payload); }})});
  try {
  base = 'http://127.0.0.1:' + app.server.address().port + '/api/v1';
  const admin = client(), customer = client();
  assert.equal((await admin('/auth/setup', 'POST', {password: 'integration-test-password'})).status, 200);
  // Push Admin : seule une session administrateur obtient la clé et abonne son navigateur.
  assert.equal((await client()('/admin/push')).status, 401);
  assert.ok((await admin('/admin/push')).data.publicKey.length > 80);
  assert.equal((await admin('/admin/push', 'POST', {endpoint: 'https://push.example.test/abc', keys: {p256dh: 'BKey', auth: 'secret'}})).status, 201);
  assert.equal((await admin('/admin/push', 'POST', {endpoint: 'http://insecure.test/x', keys: {p256dh: 'BKey', auth: 'secret'}})).status, 400);
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
  assert.deepEqual(pushed.map((p) => p.tag), [orderId], 'une notification push par nouvelle commande');
  assert.equal((await customer('/orders', 'POST', orderInput)).status, 201);
  assert.equal(pushed.length, 1, 'une requête rejouée ne renvoie pas de notification');

  // Temps réel : une page ouverte apprend la nouvelle révision dès que le statut est enregistré.
  const events = await fetch(base + '/events');
  assert.equal(events.headers.get('content-type'), 'text/event-stream');
  const reader = events.body.getReader(), decoder = new TextDecoder();
  let pending = '';
  const nextRevision = async () => { while (!/data: \d+\n\n/.test(pending)) pending += decoder.decode((await reader.read()).value); const [, value] = pending.match(/data: (\d+)\n\n/); pending = pending.slice(pending.indexOf('\n\n', pending.indexOf('data: ')) + 2); return Number(value); };
  const initial = await nextRevision();

  const snapshot = await admin('/admin/state');
  const record = snapshot.data.state.orders.find((o) => o.id === orderId);
  assert.ok(record, 'commande visible côté admin');
  const patched = await admin('/admin/state', 'PATCH', {revision: snapshot.data.revision, changes: [{kind: 'orders', id: orderId, value: {...record, status: 'CONFIRMED'}}]});
  assert.equal(patched.status, 200);
  assert.equal(await nextRevision(), initial + 1, 'le flux signale le changement de statut');
  await reader.cancel();

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
