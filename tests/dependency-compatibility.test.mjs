import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';

// gaxios 6 uses uuid.v4 for multipart boundaries. Keep this integration check
// while its uuid dependency is overridden to the patched CommonJS release.
test('Google HTTP client sends multipart bodies with the patched UUID dependency', async () => {
 const require=createRequire(import.meta.url);
 const storageRequire=createRequire(require.resolve('@google-cloud/storage'));
 const {Gaxios}=storageRequire('gaxios');
 let received;
 const server=createServer(async(req,res)=>{
  const chunks=[]; for await(const chunk of req)chunks.push(chunk);
  received={type:req.headers['content-type'],body:Buffer.concat(chunks).toString()};
  res.setHeader('Content-Type','application/json');res.end('{"ok":true}');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const result=await new Gaxios().request({url:`http://127.0.0.1:${server.address().port}`,method:'POST',noProxy:['127.0.0.1'],multipart:[{headers:{'Content-Type':'text/plain'},content:'dependency-check'}]});
  assert.equal(result.data.ok,true);
  const boundary=received.type.split('boundary=')[1];
  assert.match(boundary,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.ok(received.body.includes(boundary));
  assert.ok(received.body.includes('dependency-check'));
 } finally {await new Promise(resolve=>server.close(resolve));}
});
