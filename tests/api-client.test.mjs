import test from 'node:test';
import assert from 'node:assert/strict';
import {requestJson} from '../lib/api.ts';

test('API handles successful JSON and preserves caller headers', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer test');
    return Response.json({ok:true});
  });
  assert.deepEqual(await requestJson('/api', {headers:new Headers({Authorization:'Bearer test'})}), {ok:true});
});
test('empty gateway errors produce a readable service error', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', {status:502}));
  await assert.rejects(requestJson('/api'), /service est temporairement indisponible/);
});
test('HTML error pages do not expose parsing errors or markup', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Bad gateway</html>', {status:503}));
  await assert.rejects(requestJson('/api'), /service est temporairement indisponible/);
});
test('server validation errors are preserved', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({error:'Mot de passe incorrect'}, {status:401}));
  await assert.rejects(requestJson('/api'), /Mot de passe incorrect/);
});
test('204 responses need no JSON body', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, {status:204}));
  assert.equal(await requestJson('/api'), undefined);
});
test('an empty success response is not silently accepted', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(''));
  await assert.rejects(requestJson('/api'), /réponse du service est invalide/);
});
test('network failures provide a connection message', async t => {
  t.mock.method(globalThis, 'fetch', async () => {throw new TypeError('Failed to fetch')});
  await assert.rejects(requestJson('/api'), /Connexion au service impossible/);
});
test('intentional cancellation is preserved', async t => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async () => {throw controller.signal.reason});
  await assert.rejects(requestJson('/api', {signal:controller.signal}), {name:'AbortError'});
});
