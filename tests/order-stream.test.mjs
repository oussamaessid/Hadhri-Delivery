import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';

process.env.SEED_DEMO_DATA = 'true';
const directory = await mkdtemp(join(tmpdir(), 'hadhri-stream-test-'));
const database = basename(directory).replace(/[^a-zA-Z0-9_]/g,'_');
let app, base, wsBase;
const claims = (uid, email = 'suivi@example.test') => ({uid, email, email_verified: true, name: 'Client Suivi', exp: Math.floor(Date.now() / 1000) + 3600, firebase: {sign_in_provider: 'password'}});
async function verifyToken(token) {
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

const nextMessage = (ws, timeoutMs = 8000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Aucun message reçu à temps')), timeoutMs);
  ws.once('message', (data) => { clearTimeout(timer); resolve(JSON.parse(String(data))); });
  ws.once('error', (e) => { clearTimeout(timer); reject(e); });
});

test('suivi commande en temps réel : le client reçoit le changement de statut sans recharger', async () => {
  app = await startServer({dataDir: directory, port: 0, verifyToken, database});
  try {
  base = 'http://127.0.0.1:' + app.server.address().port + '/api/v1';
  wsBase = 'ws://127.0.0.1:' + app.server.address().port + '/api/v1';
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

  const ws = new WebSocket(wsBase + '/customer/stream', {headers: {cookie: 'hadhri_customer=' + customer.jar.hadhri_customer}});
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const incoming = nextMessage(ws);

  const snapshot = await admin('/admin/state');
  const record = snapshot.data.state.orders.find((o) => o.id === orderId);
  assert.ok(record, 'commande visible côté admin');
  const patched = await admin('/admin/state', 'PATCH', {revision: snapshot.data.revision, changes: [{kind: 'orders', id: orderId, value: {...record, status: 'CONFIRMED'}}]});
  assert.equal(patched.status, 200);

  const message = await incoming;
  assert.equal(message.type, 'order-status');
  assert.equal(message.orders[0].id, orderId);
  assert.equal(message.orders[0].status, 'CONFIRMED');
  ws.terminate();

  const after = await customer('/state');
  assert.ok(after.data.state.orders.some((o) => o.id === orderId && o.status === 'CONFIRMED'), 'le client voit le nouveau statut');
  } finally {
  if (app) { await app.close(); app = undefined; }
  await dropDatabase({database});
  await rm(directory, {recursive: true, force: true});
  }
});

test('le flux client refuse les connexions sans session', async () => {
  const dir2 = await mkdtemp(join(tmpdir(), 'hadhri-stream-rejet-'));
  const database2 = basename(dir2).replace(/[^a-zA-Z0-9_]/g,'_');
  const app2 = await startServer({dataDir: dir2, port: 0, verifyToken, database: database2});
  const url = 'ws://127.0.0.1:' + app2.server.address().port + '/api/v1/customer/stream';
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => reject(new Error('Connexion aurait dû être refusée')));
    ws.once('close', () => resolve());
    ws.once('error', () => resolve());
    setTimeout(() => reject(new Error('Rejet trop lent')), 8000);
  });
  await app2.close();
  await dropDatabase({database: database2});
  await rm(dir2, {recursive: true, force: true});
});
