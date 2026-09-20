import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBackup,decodeBackup} from '../backend/backup-crypto.mjs';
test('encrypted backup restores exactly and hides customer data',()=>{const data={customer:'Private Client',orders:[1,2]},key='ab'.repeat(32),encoded=encodeBackup(data,key);assert.ok(!encoded.includes('Private Client'));assert.deepEqual(decodeBackup(encoded,key),data);assert.throws(()=>decodeBackup(encoded,'cd'.repeat(32)));const changed=JSON.parse(encoded);changed.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>decodeBackup(JSON.stringify(changed),key));});
test('invalid backup keys fail and historical backups remain readable',()=>{assert.throws(()=>encodeBackup({},'short'));assert.deepEqual(decodeBackup('{"orders":[]}'),{orders:[]});});
