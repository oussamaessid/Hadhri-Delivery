import SwaggerParser from '@apidevtools/swagger-parser';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const doc=JSON.parse(await readFile('api/openapi.json','utf8'));
await SwaggerParser.validate(structuredClone(doc));
const ids=new Set();let total=0;
for(const methods of Object.values(doc.paths))for(const operation of Object.values(methods)){
 assert.equal(operation['x-implementation-status'],'implemented');
 assert.ok(!ids.has(operation.operationId),'Duplicate operationId');ids.add(operation.operationId);total++;
 assert.ok(operation.responses['400']);assert.ok(operation.responses['409']);
}
assert.deepEqual(JSON.parse(await readFile('public/openapi.json','utf8')),doc);
assert.equal(total,23);
console.log(`OpenAPI valide : ${total} opérations, ${Object.keys(doc.components.schemas).length} schémas.`);
